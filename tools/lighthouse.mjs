/* Lighthouse over both pages. Mobile preset by default, `desktop` as an
   argument for the desktop preset. */

import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import fs from 'fs';

const BASE  = process.env.BASE || 'http://localhost:8123';
const PAGES = [['merchant', '/index.html'], ['platform', '/platform.html']];
const desktop = process.argv[2] === 'desktop';

/* Budgets. The three that are a matter of correctness are held at 100.
   Performance is a measurement, and a CI runner is a noisier machine than
   a laptop, so it gets a floor rather than a target. Override with
   MIN_PERF=... when you want to tighten or loosen it. */
const BUDGET = {
  performance:     Number(process.env.MIN_PERF ?? 80),
  accessibility:   100,
  'best-practices': 100,
  seo:             100
};
const missed = [];

const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });
fs.mkdirSync('shots/lighthouse', { recursive: true });

for (const [name, url] of PAGES) {
  const res = await lighthouse(BASE + url, {
    port: chrome.port,
    output: 'json',
    logLevel: 'error',
    formFactor: desktop ? 'desktop' : 'mobile',
    screenEmulation: desktop
      ? { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false }
      : { mobile: true,  width: 390,  height: 844, deviceScaleFactor: 2, disabled: false },
    throttling: desktop
      ? { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 }
      : undefined,
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo']
  });
  const lhr = res.lhr;
  const suffix = desktop ? 'desktop' : 'mobile';
  fs.writeFileSync(`shots/lighthouse/${name}-${suffix}.json`, JSON.stringify(lhr));
  console.log(`\n=== ${name} (${suffix})`);
  for (const [k, c] of Object.entries(lhr.categories)) {
    const score = Math.round(c.score * 100);
    const floor = BUDGET[k];
    const ok = floor === undefined || score >= floor;
    if (!ok) missed.push(`${name} (${suffix}) ${c.title}: ${score}, budget ${floor}`);
    console.log(`  ${ok ? ' ' : '!'} ${String(score).padStart(3)}  ${c.title}${ok ? '' : `   under budget ${floor}`}`);
  }
  const failed = Object.values(lhr.audits)
    .filter(a => a.score !== null && a.score < 1 && a.scoreDisplayMode !== 'informative')
    .sort((a, b) => a.score - b.score);
  failed.forEach(a => console.log(`     [${a.score.toFixed(2)}] ${a.id}: ${a.title}${a.displayValue ? ': ' + a.displayValue : ''}`));
}
await chrome.kill();

if (missed.length) {
  console.error('\nunder budget:');
  missed.forEach(m => console.error('  ' + m));
  process.exit(1);
}
console.log('\nall categories within budget');
