/* The fit test. Two columns of signals the owner ticks, and a straight
   answer underneath that changes as they do.

   The scoring is deliberately visible: a strong signal says it counts
   double, a disqualifier says it settles the question on its own. A
   company that asks a merchant to check its arithmetic on the invoice
   should be willing to show its arithmetic here.

   Nothing is sent anywhere. There is no form and no request. */

import { SITE } from '../../content/index.js';
import { $, $$, fill, mount } from '../dom.js';

const STRONG = 2, SUPPORTING = 1, SOFT_AGAINST = -2;
const BAR = 4;   /* two strong, or one strong and two supporting */

const row = (item, side) => `
  <label class="fitrow">
    <input type="checkbox" data-side="${side}"
           data-weight="${side === 'for' ? (item.strong ? STRONG : SUPPORTING) : SOFT_AGAINST}"
           ${item.hard ? 'data-hard="1"' : ''}>
    <span class="fitrow__x">
      <span class="fitrow__t">${item.t}${item.strong ? ' <span class="fitrow__w">counts double</span>' : ''}${item.hard ? ' <span class="fitrow__w fitrow__w--no">on its own, no</span>' : ''}</span>
      <span class="fitrow__d">${item.d}</span>
    </span>
  </label>`;

const column = (col, side) => `
  <div class="fitcol ${side === 'against' ? 'fitcol--no' : ''}">
    <div class="fitcol__h">
      <h3>${col.t}</h3>
      <span class="pill pill--${side === 'for' ? 'y' : 'n'}">${col.pill}</span>
    </div>
    ${col.items.map(i => row(i, side)).join("")}
    ${col.note ? `<p class="fitcol__n">${col.note}</p>` : ""}
  </div>`;

function verdictFor(boxes) {
  const V = SITE.fit.verdicts;
  const ticked = boxes.filter(b => b.checked);
  if (!ticked.length) return { v: V.none, because: null };

  const blocker = ticked.find(b => b.dataset.hard);
  if (blocker) return { v: V.no, because: $('.fitrow__t', blocker.closest('.fitrow')).firstChild.textContent };

  const score = ticked.reduce((t, b) => t + Number(b.dataset.weight), 0);
  if (score >= BAR) return { v: V.yes, because: null };
  if (score >= 1)   return { v: V.maybe, because: null };
  return { v: V.no, because: null };
}

export function initFit() {
  const f = SITE.fit;
  if (!fill("fit", column(f.for, 'for') + column(f.against, 'against'))) return;

  const boxes = $$('.fitrow input');
  const out = mount("fitVerdict");

  const paint = () => {
    const { v, because } = verdictFor(boxes);
    out.innerHTML = `
      <div class="fitout" data-k="${v.k}">
        <div>
          <div class="fitout__k">What we would say</div>
          <p class="fitout__t">${v.t}</p>
          <p class="fitout__p">${v.p}</p>
          ${because ? `<p class="fitout__b">You ticked <b>${because.trim().toLowerCase()}</b>, and that one settles it on its own.</p>` : ""}
        </div>
        ${v.cta ? `<a class="btn btn--proof btn--lg" href="${v.cta.href}">${v.cta.label}</a>` : ""}
      </div>`;
  };

  boxes.forEach(b => b.addEventListener('change', paint));
  paint();
}
