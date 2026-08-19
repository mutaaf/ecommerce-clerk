/* Category chips. Rendered into every [data-mount="chips"] on the page,
   so the hero and the conversation section stay in step by construction. */

import { SITE } from '../../content/index.js';
import { $$, mounts } from '../dom.js';
import { on, EVT } from '../bus.js';
import { category, setCategory } from '../state.js';

function paint() {
  const boxes = mounts("chips");
  if (!boxes.length) return;
  const active = category();
  const html = SITE.demos.map((d, i) =>
    `<button class="chip" type="button" data-cat="${i}" aria-pressed="${i === active}">${d.chip}</button>`).join("");
  boxes.forEach(b => { b.innerHTML = html; });
  $$("[data-cat]").forEach(b => b.onclick = () => setCategory(+b.dataset.cat, true));
}

function clear() {
  $$("[data-cat]").forEach(c => c.setAttribute("aria-pressed", "false"));
}

export function initChips() {
  if (!mounts("chips").length) return;
  on(EVT.category, paint);
  on(EVT.custom, clear);
  paint();
}
