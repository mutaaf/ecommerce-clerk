/* Attribution, stepped. The stepper advances on its own until someone
   clicks a step, which is the point at which they are reading it. */

import { SITE } from '../../content/index.js';
import { $$, fill, reduce } from '../dom.js';

let step = 0, timer = null, auto = true;

export function initChain() {
  if (!fill("chain", SITE.chain.map((n, i) => `
    <button type="button" class="node ${n.end ? "node--end" : ""}" data-step="${i}">
      <div class="node__i">${n.i}</div><h3>${n.t}</h3><p>${n.p}</p><code>${n.c}</code>
      <div class="node__bar"><i></i></div>
    </button>`).join(""))) return;

  const nodes = $$(".node[data-step]");
  const paint = () => {
    nodes.forEach((n, i) => n.setAttribute("aria-current", i === step ? "step" : "false"));
    if (timer) clearTimeout(timer);
    if (auto && !reduce) timer = setTimeout(() => { step = (step + 1) % nodes.length; paint(); }, 4000);
  };
  nodes.forEach(n => n.onclick = () => { auto = false; step = +n.dataset.step; paint(); });
  paint();

  fill("rules", SITE.rules.map(r => `
    <div class="card">
      <div class="card__h"><h3>${r.t}</h3><span class="pill pill--${r.kind}">${r.verdict}</span></div>
      <div class="rule__f">${r.flow.map(f => `<div>${f}</div>`).join("")}</div>
      <p>${r.p}</p>
    </div>`).join(""));
}
