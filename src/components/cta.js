/* The pilot request. Opens a pre filled mail draft rather than posting
   anywhere, so there is no account, no card and no backend to trust. */

import { SITE } from '../../content/index.js';
import { $, $$, fill, mount } from '../dom.js';
import { seatsLeft } from './seats.js';

const FIELDS = [
  { k:"store", type:"text",  label:"Store name" },
  { k:"url",   type:"text",  label:"Store URL" },
  { k:"email", type:"email", label:"Email" }
];
const REVENUE = ["Under $1M", "$1M to $5M", "$5M to $20M", "$20M+"];

export function initCta() {
  if (!fill("cta", `
<div class="cta">
  <div>
    <h2>Try it on your own catalog for 30 days.</h2>
    <p>We install it, point it at your real products, and let it sell. No setup fee, no monthly fee. You pay 1% of the orders we can show you it created, and if it creates none you owe nothing and you have lost an hour.</p>
    <p class="mono" style="font-size:12.5px;margin-top:18px">${seatsLeft()} of ${SITE.founding.seats} founding seats open</p>
  </div>
  <div class="form">
    ${FIELDS.map(f => `<input data-field="${f.k}" type="${f.type}" placeholder="${f.label}" aria-label="${f.label}">`).join("")}
    <select data-field="gmv" aria-label="Annual ecommerce revenue">
      <option value="">Annual ecommerce revenue</option>
      ${REVENUE.map(r => `<option>${r}</option>`).join("")}
    </select>
    <button class="btn btn--lit" data-send type="button">Start my 30 days</button>
    <small data-note>Opens a pre filled email. No account, no card, no call required.</small>
  </div>
</div>`)) return;

  const box  = mount("cta");
  const val  = k => $(`[data-field="${k}"]`, box).value.trim();
  const note = $("[data-note]", box);

  $("[data-send]", box).onclick = () => {
    const store = val("store"), url = val("url"), email = val("email"), gmv = val("gmv");
    if (!store || !email) { note.textContent = "Add a store name and an email so we can reply."; return; }
    const body = ["Store: " + store, "URL: " + url, "Email: " + email, "Annual revenue: " + (gmv || "not given"), "", "I'd like a founding merchant seat."].join("\n");
    location.href = "mailto:" + SITE.contact + "?subject=" + encodeURIComponent("Founding seat: " + store) + "&body=" + encodeURIComponent(body);
    note.textContent = "Opening your email client with the details filled in.";
  };
}
