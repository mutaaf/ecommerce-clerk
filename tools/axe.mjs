/* axe-core over both pages, at desktop and phone widths, and at two
   moments in the page's life.

   The second moment is the point. The hero types a question, waits, and
   then fades it because nobody answered. A single scan at a fixed delay
   never sees the faded state, so a contrast bug can sit there for weeks
   and surface only when Lighthouse happens to sample late. Scanning
   before and after the hero settles makes that deterministic. */

import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const BASE  = process.env.BASE || 'http://localhost:8123';
const PAGES = [['merchant', '/index.html'], ['platform', '/platform.html']];

/* Milliseconds after load. The hero types for about two seconds, waits,
   and has faded by four and a half. */
const MOMENTS = [
  { name: 'still typing ', at: 1200 },
  { name: 'after it fades', at: 4500 }
];

const browser = await chromium.launch();
let total = 0;

for (const [name, url] of PAGES) {
  for (const w of [1440, 390]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await p.goto(BASE + url, { waitUntil: 'networkidle' });

    let waited = 0;
    for (const moment of MOMENTS) {
      await p.waitForTimeout(Math.max(0, moment.at - waited));
      waited = moment.at;

      const { violations } = await new AxeBuilder({ page: p })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
        .analyze();

      console.log(`\n=== ${name} @${w}  ${moment.name}  ${violations.length} violations`);
      violations.forEach(v => {
        total += v.nodes.length;
        console.log(`  [${v.impact}] ${v.id}: ${v.help}  (${v.nodes.length})`);
        v.nodes.slice(0, 3).forEach(n =>
          console.log(`      ${n.target.join(' ')}\n        ${(n.failureSummary || '').split('\n').slice(1, 3).join(' | ').trim()}`));
      });
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`\ntotal failing nodes: ${total}`);
process.exit(total ? 1 : 0);
