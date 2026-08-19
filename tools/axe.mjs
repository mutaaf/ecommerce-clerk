/* axe-core over both pages, at desktop and phone widths. */

import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const BASE  = process.env.BASE || 'http://localhost:8123';
const PAGES = [['merchant', '/index.html'], ['platform', '/platform.html']];

const browser = await chromium.launch();
let total = 0;

for (const [name, url] of PAGES) {
  for (const w of [1440, 390]) {
    const ctx = await browser.newContext({ viewport:{width:w,height:900}, reducedMotion:'reduce' });
    const p = await ctx.newPage();
    await p.goto(BASE + url, { waitUntil:'networkidle' });
    await p.waitForTimeout(2500);
    const { violations } = await new AxeBuilder({ page: p })
      .withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice'])
      .analyze();
    console.log(`\n=== ${name} @${w}  ${violations.length} violations`);
    violations.forEach(v => {
      total += v.nodes.length;
      console.log(`  [${v.impact}] ${v.id}: ${v.help}  (${v.nodes.length})`);
      v.nodes.slice(0, 3).forEach(n => console.log(`      ${n.target.join(' ')}\n        ${(n.failureSummary||'').split('\n').slice(1,3).join(' | ').trim()}`));
    });
    await ctx.close();
  }
}
await browser.close();
console.log(`\ntotal failing nodes: ${total}`);
process.exit(total ? 1 : 0);
