/* Platform picker, the detail card under it, and the adapter contract.
   Both pages mount whichever of these they need. */

import { SITE } from '../../content/index.js';
import { $, $$, fill } from '../dom.js';

const STATUS = {
  live:    { l: "Live today",      k: "y" },
  build:   { l: "In build",        k: "m" },
  generic: { l: "Generic adapter", k: "n" }
};

let plat = 0;

function tabs() {
  fill("plats", SITE.platforms.map((p, i) =>
    `<button class="plat" type="button" data-plat="${i}" data-status="${p.status}" aria-pressed="${i === plat}"><span class="dot"></span>${p.name}</button>`
  ).join(""));
}

function detail() {
  const p = SITE.platforms[plat];
  const st = STATUS[p.status];
  fill("platbox", `
    <div class="platbox">
      <div class="platbox__h">
        <div class="card__h"><h3>${p.name}</h3><span class="pill pill--${st.k}">${st.l}</span></div>
        <p>${p.blurb}</p>
      </div>
      ${p.rows.map(r => `<div class="prow"><b>${r[0]}</b><span>${r[1]}</span></div>`).join("")}
    </div>`);
}

function paint() {
  tabs();
  detail();
  const badge = $("#panelPlat");
  if (badge) badge.textContent = SITE.platforms[plat].badge || "";
  $$("[data-plat]").forEach(b => {
    b.onclick = () => { plat = +b.dataset.plat; paint(); };
  });
}

export function initPlatforms() {
  paint();

  const AC = SITE.adapterContract;
  fill("contract", [
    { t: "What each adapter owns", pill: "per platform", k: "m", items: AC.owns },
    { t: "What is written once",   pill: "shared",       k: "y", items: AC.shared }
  ].map(c => `
    <div class="card">
      <div class="card__h"><h3>${c.t}</h3><span class="pill pill--${c.k}">${c.pill}</span></div>
      <ul class="list">${c.items.map(i => `<li>${i}</li>`).join("")}</ul>
    </div>`).join(""));

  fill("methods", `
    <div class="card">
      <div class="card__h"><h3>The adapter interface</h3></div>
      <p style="margin-bottom:14px">Implement these and the platform is supported. Nothing else in the system needs to know which store it is talking to.</p>
      <div class="tool__g">${AC.methods.map(m => `<code>${m}</code>`).join("")}</div>
    </div>`);
}
