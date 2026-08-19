/* Row level pixel diff between two full page screenshots, so a layout
   regression reports as a y range rather than a feeling. */
import { chromium } from 'playwright';
const [a, b] = process.argv.slice(2);
const browser = await chromium.launch();
const p = await (await browser.newContext()).newPage();
const out = await p.evaluate(async ([a, b]) => {
  const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  const [ia, ib] = await Promise.all([load(a), load(b)]);
  const px = img => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0); return c.getContext('2d').getImageData(0, 0, img.width, img.height).data; };
  const [pa, pb] = [px(ia), px(ib)];
  const h = Math.min(ia.height, ib.height), w = Math.min(ia.width, ib.width);
  const rows = [];
  for (let y = 0; y < h; y++) {
    let bad = 0;
    for (let x = 0; x < w; x += 3) {
      const i = (y * ia.width + x) * 4, j = (y * ib.width + x) * 4;
      if (Math.abs(pa[i] - pb[j]) + Math.abs(pa[i+1] - pb[j+1]) + Math.abs(pa[i+2] - pb[j+2]) > 24) bad++;
    }
    if (bad > w / 300) rows.push(y);
  }
  const ranges = [];
  rows.forEach(y => {
    const last = ranges[ranges.length - 1];
    if (last && y - last[1] < 40) last[1] = y; else ranges.push([y, y]);
  });
  return { sizes: [`${ia.width}x${ia.height}`, `${ib.width}x${ib.height}`], ranges };
}, [`data:image/png;base64,${(await import('fs')).readFileSync(a,'base64')}`,
    `data:image/png;base64,${(await import('fs')).readFileSync(b,'base64')}`]);
console.log(out.sizes.join('  vs  '));
console.log(out.ranges.length ? out.ranges.map(r => `y ${r[0]}-${r[1]}`).join('\n') : 'no differing rows');
await browser.close();
