/* Same shots from the pre split single file, so "what broke" is measured
   rather than remembered. */
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = 'http://localhost:8123';
fs.mkdirSync('shots/baseline', { recursive: true });
const browser = await chromium.launch();
for (const w of [1440, 900, 390]) {
  const ctx = await browser.newContext({ viewport:{width:w,height:w<500?844:900}, deviceScaleFactor:2, reducedMotion:'reduce' });
  const p = await ctx.newPage();
  await p.goto(BASE + '/.baseline/index.html', { waitUntil:'networkidle' });
  await p.waitForTimeout(600);
  await p.screenshot({ path:`shots/baseline/merchant-${w}.png`, fullPage:true });
  await (await p.$('header.hero')).screenshot({ path:`shots/baseline/hero-${w}.png` });
  await p.goto(BASE + '/.baseline/index.html#/platform', { waitUntil:'networkidle' });
  await p.waitForTimeout(600);
  await p.screenshot({ path:`shots/baseline/platform-${w}.png`, fullPage:true });
  await ctx.close();
}
await browser.close();
console.log('baseline captured');
