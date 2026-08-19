/* What the search box throws away, said twice: once as loss, once as
   what a conversation keeps. */

import { SITE } from '../../content/index.js';
import { fill } from '../dom.js';

export function initLoss() {
  const L = SITE.loss;
  const attrHTML = L.attrs.map(a => `<span class="attr">${a}</span>`).join("");
  fill("loss", `
  <div class="lossbox lossbox--bad" id="lossbad">
    <div class="lossbox__k">${L.badLabel}</div>
    <div class="sent">"${L.sentence}"</div>
    <div class="attrs">${attrHTML}</div>
    <div class="kw">${L.keyword}</div>
    <p style="font-size:14.5px;color:var(--muted);margin:16px 0 0">${L.badNote}</p>
  </div>
  <div class="lossbox lossbox--good">
    <div class="lossbox__k">${L.goodLabel}</div>
    <div class="sent">"${L.sentence}"</div>
    <div class="attrs">${attrHTML}</div>
    <div class="kw">All eight signals reach the catalog.</div>
    <p style="font-size:14.5px;color:var(--muted);margin:16px 0 0">${L.goodNote}</p>
  </div>`);
}
