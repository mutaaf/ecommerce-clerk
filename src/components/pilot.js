/* The 30 day pilot. Four steps down the intent to proof ramp, each one
   saying what we do, what it costs the merchant in time, and the thing
   they can go and check at the end of it.

   The ramp is presentation, so the renderer owns it and content stays
   words. Day 30 itself is two list cards and is rendered by cards.js. */

import { SITE } from '../../content/index.js';
import { fill } from '../dom.js';

/* violet through to green, the same ramp as the funnel */
const TONES = ['stage-2', 'stage-3', 'stage-4', 'stage-5'];

const step = (w, i) => {
  const tone = TONES[i % TONES.length];
  return `
  <div class="pstep">
    <div class="pstep__h">
      <span class="pstep__n" style="background:var(--${tone});color:var(--on-${tone})">${i + 1}</span>
      <span class="pstep__d">${w.n} · ${w.days}</span>
    </div>
    <h3>${w.t}</h3>

    <div class="pstep__k">What we do</div>
    <ul>${w.we.map(x => `<li>${x}</li>`).join("")}</ul>

    <div class="pstep__k">Your part <span class="pstep__t">${w.you.time}</span></div>
    <ul>${w.you.items.map(x => `<li>${x}</li>`).join("")}</ul>

    <div class="pstep__g"><em>You can check</em>${w.ends}</div>
  </div>`;
};

export function initPilot() {
  const p = SITE.pilot;
  if (!fill("pilot", p.weeks.map(step).join(""))) return;

  fill("commitment", `
    <div class="commit">
      <div class="commit__t">${p.commitment.t}</div>
      <div class="commit__f">
        ${p.commitment.facts.map(f => `
          <div><div class="commit__v mono">${f.v}</div><div class="commit__k">${f.k}</div></div>`).join("")}
      </div>
    </div>`);
}
