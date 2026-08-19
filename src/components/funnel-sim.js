/* Four numbers the merchant already knows, and the only line we ever
   bill sitting at the bottom of the funnel they produce. */

import { SITE } from '../../content/index.js';
import { $, swap, money } from '../dom.js';

export function initFunnelSim() {
  if (!swap("calc", `
<div class="sim">
  <div>
    ${SITE.knobs.map(k => `
      <div class="knob">
        <div class="knob__h"><span class="knob__l">${k.label}</span><span class="knob__v" id="v_${k.id}"></span></div>
        <input type="range" id="k_${k.id}" min="${k.min}" max="${k.max}" step="${k.step}" value="${k.val}" aria-label="${k.label}">
      </div>`).join("")}
    <div class="terms">
      <div class="knob__l">Founding terms</div>
      <div class="price">1%<small> of attributed revenue</small></div>
      <ul>
        <li><b>$0</b><span>setup and implementation</span></li>
        <li><b>$0</b><span>monthly platform fee</span></li>
        <li><b>$0</b><span>if the AI generates nothing</span></li>
      </ul>
    </div>
  </div>
  <div>
    <div class="funnel" id="funnel"></div>
    <div class="split">
      <div class="split__r split__r--keep"><span class="split__k">Monthly AI attributed GMV</span><span class="split__v" id="gmvOut"></span></div>
      <div class="split__r"><span class="split__k">You pay us</span><span class="split__v" id="payOut"></span></div>
      <div class="split__r"><span class="split__k">A typical fixed price app still bills</span><span class="split__v" id="saasOut"></span></div>
    </div>
    <p class="mono" id="calcNote" style="font-size:12.5px;color:var(--muted);margin-top:18px"></p>
  </div>
</div>`)) return;

  const knobValues = () => {
    const k = {};
    SITE.knobs.forEach(x => { k[x.id] = +$("#k_" + x.id).value; });
    return k;
  };

  const calc = () => {
    const k = knobValues();
    SITE.knobs.forEach(x => { $("#v_" + x.id).textContent = x.fmt(k[x.id]); });

    const stages = SITE.funnel.map(f => ({ k: f.k, n: Math.round(f.from(k)), c: f.c }));
    const top = stages[0].n || 1;
    $("#funnel").innerHTML = stages.map(st => {
      const pct = Math.max(16, Math.round(st.n / top * 100));
      return `<div class="step" style="width:${pct}%;background:var(--${st.c});color:var(--on-${st.c})">
        <span>${st.k}</span><b>${st.n.toLocaleString()}<small> /mo</small></b></div>`;
    }).join("");

    const orders = stages[stages.length - 1].n;
    const gmv = orders * k.aov, pay = gmv * SITE.takeRate;
    $("#gmvOut").textContent  = money(gmv);
    $("#payOut").textContent  = money(pay, pay < 100 ? 2 : 0);
    $("#saasOut").textContent = money(SITE.saasComparison);
    $("#calcNote").textContent = gmv === 0
      ? "At zero attributed revenue your invoice is zero. A fixed price app still bills " + money(SITE.saasComparison) + " this month."
      : money(pay * 12) + " a year to us, against " + money(gmv * 12) + " a year of revenue that did not exist before.";
  };

  SITE.knobs.forEach(x => $("#k_" + x.id).addEventListener("input", calc));
  calc();
}
