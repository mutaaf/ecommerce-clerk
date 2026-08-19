/* Measures the three things the hero can get wrong: mismatched before
   and after panels, the screenshot frame collapsing on a mobile stack,
   and the widget shrinking below a readable size. */

import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:8123';
const URL  = process.argv[2] || '/index.html';

const browser = await chromium.launch();
for (const w of [1440, 1100, 900, 700, 390]) {
  const ctx = await browser.newContext({ viewport:{width:w,height:900}, deviceScaleFactor:1, reducedMotion:'reduce' });
  const p = await ctx.newPage();
  await p.goto(BASE + URL, { waitUntil:'networkidle' });
  await p.waitForTimeout(2600);
  const m = await p.evaluate(() => {
    const box = s => { const n = document.querySelector(s); if (!n) return null;
      const r = n.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; };
    const font = s => { const n = document.querySelector(s); return n ? parseFloat(getComputedStyle(n).fontSize) : null; };
    const cols = [...document.querySelectorAll('.ba__col')].map(c => Math.round(c.getBoundingClientRect().height));
    const frameBody = document.querySelector('.frame__body');
    const widget = document.querySelector('.widget');
    return {
      cols,
      void:   box('.void'),
      frame:  box('.frame'),
      body:   box('.frame__body'),
      widget: box('.widget'),
      slack:  frameBody && widget ? Math.round(frameBody.getBoundingClientRect().width - widget.getBoundingClientRect().width) : null,
      msg:    font('.widget__thread .msg__b'),
      meta:   font('.widget__thread .prod__m'),
      parse:  font('.widget__thread .parse span'),
      url:    font('.frame__url'),
      voidTail: (() => { const v = document.querySelector('.void'); const f = document.querySelector('.void__f');
        if (!v || !f) return null;
        return Math.round(v.getBoundingClientRect().bottom - f.getBoundingClientRect().bottom); })()
    };
  });
  console.log(`\n=== ${w}px`);
  console.log(`  columns          ${m.cols.join('  vs  ')}   (delta ${Math.abs((m.cols[0]||0)-(m.cols[1]||0))}px)`);
  console.log(`  void card        ${m.void.w} x ${m.void.h}`);
  console.log(`  frame            ${m.frame.w} x ${m.frame.h}`);
  console.log(`  frame body       ${m.body.w} x ${m.body.h}`);
  console.log(`  widget           ${m.widget.w} x ${m.widget.h}   slack in frame ${m.slack}px`);
  console.log(`  widget type      msg ${m.msg}px · meta ${m.meta}px · parse ${m.parse}px · url ${m.url}px`);
  await ctx.close();
}
await browser.close();
