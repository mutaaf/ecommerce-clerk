/* Tabs through every interactive element and reports any that take focus
   without a visible ring. */
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:8123';
const browser = await chromium.launch();
let total = 0;
for (const [name, url] of [['merchant','/index.html'], ['platform','/platform.html']]) {
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, reducedMotion:'reduce' });
  const p = await ctx.newPage();
  await p.goto(BASE + url, { waitUntil:'networkidle' });
  await p.waitForTimeout(2000);
  const bad = [];
  const seen = new Set();
  for (let i = 0; i < 160; i++) {
    await p.keyboard.press('Tab');
    const info = await p.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return null;
      const cs = getComputedStyle(a);
      const w = parseFloat(cs.outlineWidth) || 0;
      /* an input carries no text of its own: name it by its label, or by
         its position, so twelve checkboxes are not counted as one */
      const label = a.closest('label');
      const name = (a.getAttribute('aria-label') || label?.textContent || a.textContent || a.value || '').trim().slice(0, 34);
      const all = [...document.querySelectorAll('a,button,input,select,textarea,summary,[tabindex]')];
      const key = a.tagName + '#' + all.indexOf(a) + '|' + name;
      return { key, tag: a.tagName, ring: w > 0 && cs.outlineStyle !== 'none', shadow: cs.boxShadow };
    });
    if (!info) break;
    if (seen.has(info.key)) continue;
    seen.add(info.key);
    if (!info.ring) bad.push(info.key);
  }
  console.log(`${name}: ${seen.size} focusable, ${bad.length} without a visible ring`);
  bad.forEach(b => console.log('   ' + b));
  total += bad.length;
  await ctx.close();
}
await browser.close();
process.exit(total ? 1 : 0);
