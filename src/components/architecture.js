/* The stack, top to bottom, with the layers we own marked. A layer with
   a `split` renders two side by side. */

import { SITE } from '../../content/index.js';
import { fill } from '../dom.js';

const layer = l => `
  <div class="layer ${l.ours ? "layer--ours" : ""}">
    <div><div class="layer__n">${l.n}</div><div class="layer__d">${l.d}</div></div>
    ${l.ours ? '<span class="layer__tag">ours</span>' : ""}
  </div>`;

export function initArchitecture() {
  fill("arch", SITE.arch.map((l, i) => {
    const body = l.split
      ? `<div class="layer--split">${l.split.map(layer).join("")}</div>`
      : layer(l);
    return body + (i < SITE.arch.length - 1 ? '<div class="arrow">↓</div>' : "");
  }).join(""));
}
