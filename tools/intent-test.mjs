/* Drives the hero input through all four paths the endpoint can take and
   asserts the visitor never sees an error and never waits past the budget. */

import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:8123';
const SENTENCE = "My daughter is 11, has wide feet, plays indoor netball twice a week, and I want to stay under $90";
const BUDGET = 2000;

const browser = await chromium.launch();
const results = [];

async function run(name, install) {
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, reducedMotion:'reduce' });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  if (install) await install(p);
  await p.goto(BASE + '/index.html', { waitUntil:'networkidle' });
  await p.waitForTimeout(1500);
  await p.fill('#askInput', SENTENCE);
  const t0 = Date.now();
  await p.click('#askGo');
  /* the panel resets and echoes the typed sentence back the moment a
     reading lands, so that is the number the visitor actually waits */
  await p.waitForFunction(
    s => document.querySelector('#thread .msg--c .msg__b')?.textContent.startsWith(s.slice(0, 40)),
    SENTENCE, { timeout: 15000 });
  const ms = Date.now() - t0;
  await p.waitForSelector('#thread .parse span', { timeout: 15000 });
  const signals = await p.$$eval('#thread .parse span', ns => ns.map(n => n.textContent));
  const note = await p.$eval('#askNote', n => n.textContent);
  const visibleError = /error|failed|sorry|unavailable/i.test(await p.innerText('.clerkgrid'));
  /* an aborted request is logged by the browser, not by the page: only
     count what the page itself put on the console */
  const pageErrors = errors.filter(e => !/Failed to load resource|net::ERR/.test(e));
  results.push({ name, ms, signals, note, visibleError, errors: pageErrors, network: errors.length - pageErrors.length });
  await ctx.close();
}

/* 1. the endpoint is not configured (no key), what a fresh clone does */
await run('unconfigured (no key)');

/* 2. the model answers */
await run('model answers', p => p.route('**/api/parse-intent', r => r.fulfill({
  status: 200, contentType: 'application/json',
  body: JSON.stringify({ signals: ['looking for: netball shoes','age: 11','fit: wide','frequency: twice a week','budget: under $90'] })
})));

/* 3. the model is slow, so the budget has to win */
await run('model too slow (5s)', p => p.route('**/api/parse-intent', async r => {
  await new Promise(res => setTimeout(res, 5000));
  r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ signals: ['too late'] }) });
}));

/* 4. the call fails outright */
await run('network failure', p => p.route('**/api/parse-intent', r => r.abort('failed')));

await browser.close();

let bad = 0;
for (const r of results) {
  const late = r.ms > BUDGET + 900;
  const ok = !r.visibleError && !r.errors.length && r.signals.length && !late;
  if (!ok) bad++;
  console.log(`\n${ok ? 'PASS' : 'FAIL'}  ${r.name}  answered in ${r.ms}ms`);
  console.log(`      signals: ${r.signals.join(' | ')}`);
  console.log(`      note:    ${r.note}`);
  if (r.network) console.log(`      (${r.network} browser network log line, deliberate in this case)`);
  if (r.errors.length) console.log(`      console: ${r.errors.join(' ; ')}`);
}
process.exit(bad ? 1 : 0);
