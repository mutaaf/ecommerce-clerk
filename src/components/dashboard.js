/* The one screen a merchant looks at, and the intent bars underneath it.
   Values count up on reveal; see src/reveal.js. */

import { SITE } from '../../content/index.js';
import { fill } from '../dom.js';

export function initDashboard() {
  fill("board", SITE.board.map((t, i) => `
    <div class="tile ${t.hero ? "tile--hero" : ""}">
      <div class="tile__k">${t.k}</div>
      <div class="tile__v" data-count="${i}">${t.pre || ""}0${t.suf || ""}</div>
      ${t.d ? `<div class="tile__d">${t.d}</div>` : ""}
    </div>`).join(""));

  const top = Math.max(...SITE.intents.map(i => i.n));
  fill("bars", SITE.intents.map(b => `
    <div class="bar">
      <div><div class="bar__l">"${b.l}"</div>
        <div class="bar__t"><span class="bar__f" data-w="${Math.round(b.n / top * 100)}"></span></div></div>
      <div class="bar__n">${b.n.toLocaleString()}<br><b>${b.cv}</b></div>
    </div>`).join(""));
}
