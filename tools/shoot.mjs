/* Screenshots at the three widths that matter, plus a console error
   report. Usage: node tools/shoot.mjs <label> [width,width,...] */

import { chromium } from 'playwright';
import fs from 'fs';

const BASE   = process.env.BASE || 'http://localhost:8123';
const label  = process.argv[2] || 'current';
const widths = (process.argv[3] || '1440,900,390').split(',').map(Number);
const PAGES  = [
  { id: 'merchant', url: '/index.html' },
  { id: 'platform', url: '/platform.html' }
];

const dir = `shots/${label}`;
fs.mkdirSync(dir, { recursive: true });

const browser = await chromium.launch();
const problems = [];

for (const page of PAGES) {
  for (const w of widths) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: w < 500 ? 844 : 900 },
      deviceScaleFactor: 2,
      reducedMotion: 'reduce'          /* deterministic: everything painted at once */
    });
    const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error') problems.push(`${page.id} @${w}: console ${m.text()}`); });
    p.on('pageerror', e => problems.push(`${page.id} @${w}: pageerror ${e.message}`));
    await p.goto(BASE + page.url, { waitUntil: 'networkidle' });
    await p.waitForTimeout(2800);   /* let the hero settle on its verdict */

    /* Walk the page so the scroll reveals actually fire: counters, bars and
       the falling attributes are all IntersectionObserver driven, and a
       fullPage capture on its own never triggers them. */
    await p.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 90));
      }
      window.scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 400));
    });

    /* horizontal overflow is the failure that hides in a full page shot */
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (over > 0) problems.push(`${page.id} @${w}: page scrolls ${over}px horizontally`);

    await p.screenshot({ path: `${dir}/${page.id}-${w}.png`, fullPage: true });
    if (page.id === 'merchant') {
      const hero = await p.$('header.hero');
      await hero.screenshot({ path: `${dir}/hero-${w}.png` });
    }
    await ctx.close();
  }
}
await browser.close();

fs.writeFileSync(`${dir}/report.txt`, problems.join('\n') || 'no console errors, no horizontal overflow');
console.log(problems.length ? problems.join('\n') : 'clean: no console errors, no horizontal overflow');
