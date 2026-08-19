/* Two card shapes cover most of both pages: a titled paragraph, and a
   titled list with a pill. Every grid below is one of the two. */

import { SITE } from '../../content/index.js';
import { fill } from '../dom.js';

const proseCard = c => `
  <div class="card"><div class="card__h"><h3>${c.t}</h3></div><p>${c.p}</p></div>`;

const listCard = c => `
  <div class="card ${c.ok === false ? "card--locked" : ""}">
    <div class="card__h"><h3>${c.t}</h3>${c.pill ? `<span class="pill pill--${c.ok ? "y" : "n"}">${c.pill}</span>` : ""}</div>
    ${c.p ? `<p style="margin-bottom:16px">${c.p}</p>` : ""}
    <ul class="list">${c.items.map(i => `<li>${i}</li>`).join("")}</ul>
  </div>`;

const PROSE = ["pains", "gets", "moat"];
const LISTS = ["guards", "surfaces", "ownership", "safety", "notbuilding", "outcomes"];

export function initCards() {
  PROSE.forEach(k => fill(k, SITE[k].map(proseCard).join("")));
  LISTS.forEach(k => fill(k, SITE[k].map(c => listCard({ ...c, pill: c.pill || c.tag })).join("")));

  fill("stack", SITE.stack.map(s => `
    <div class="card"><div class="card__h"><h3>${s.t}</h3></div>
    <ul class="stacklist">${s.items.map(i => `<li>${i}</li>`).join("")}</ul></div>`).join(""));

  fill("tools", SITE.tools.map(t => `
    <div class="card">
      <div class="card__h"><h3>${t.t}</h3></div>
      <div class="tool__g">${t.items.map(i => `<code>${i}</code>`).join("")}</div>
      ${t.soon ? `<div class="card__n" style="margin:18px 0 0">Later</div><div class="tool__g">${t.soon.map(i => `<code class="soon">${i}</code>`).join("")}</div>` : ""}
    </div>`).join(""));

  fill("flywheel", SITE.flywheel.map(f => `<span>${f}</span>`).join('<i>→</i>') + '<i>↻</i>');

  fill("miles", SITE.miles.map(m => `<div class="mile"><b>${m.b}</b><span>${m.s}</span></div>`).join(""));

  fill("weeks", SITE.weeks.map(w => `
    <div class="week"><div class="week__n">${w.n}</div><h3>${w.t}</h3>
    <ul>${w.items.map(i => `<li>${i}</li>`).join("")}</ul>
    <div class="week__g"><em>Ends with</em>${w.g}</div></div>`).join(""));
}
