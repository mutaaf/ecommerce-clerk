/* The full conversation, start to cart, plus the ledger beside it that
   says what the conversation did. Replays on category change and takes
   the visitor's own sentence when they write one. */

import { SITE } from '../../content/index.js';
import { $, el, mount, swap, reduce } from '../dom.js';
import { on, EVT } from '../bus.js';
import { category } from '../state.js';
import { bubble } from './bubble.js';

let timers = [];
let thread, stamps, headline;

const PANEL = `
<div class="panel">
  <div class="panel__head">
    <span class="brand__mark" style="width:16px;height:16px;border-radius:5px"></span>
    <span class="panel__store" id="panelStore"></span>
    <span class="panel__plat" id="panelPlat"></span>
    <span class="panel__tag">scripted demo</span>
    <button class="replay" id="replay" type="button">↻ Replay</button>
  </div>
  <div class="thread" id="thread"></div>
  <aside class="ledger"><div class="ledger__t">What this conversation did</div><div id="stamps"></div></aside>
</div>`;

function typeInto(node, text, done) {
  if (!node) { done && done(); return; }
  if (reduce) { node.textContent = '"' + text + '"'; done && done(); return; }
  node.innerHTML = '<span class="q">"</span><span class="t"></span><span class="caret"></span>';
  const t = node.querySelector(".t");
  let i = 0;
  const tick = () => {
    t.textContent = text.slice(0, ++i);
    if (i < text.length) timers.push(setTimeout(tick, 14));
    else {
      const c = node.querySelector(".caret");
      if (c) c.remove();
      t.insertAdjacentHTML("afterend", '<span class="q">"</span>');
      done && done();
    }
  };
  tick();
}

const fee = t => "$" + (parseFloat(String(t).replace(/[^0-9.]/g, "")) * SITE.takeRate).toFixed(2);

function stamp(k, v, win) {
  const s = el("div", "stamp" + (win ? " stamp--win" : ""));
  s.append(el("div", "stamp__k", k), el("div", "stamp__v", v));
  stamps.append(s);
}

function reset() {
  timers.forEach(clearTimeout);
  timers = [];
  thread.innerHTML = "";
  stamps.innerHTML = "";
}

function run() {
  reset();
  const d = SITE.demos[category()];
  const ps = $("#panelStore"); if (ps) ps.textContent = d.store;
  const pn = $("#painOut");    if (pn) pn.textContent = d.pain;
  typeInto(headline, d.turns[0].text);

  let t = reduce ? 0 : d.turns[0].text.length * 14 + 260;
  thread.append(bubble(d.turns[0]));

  d.turns.slice(1).forEach(turn => {
    if (turn.who === "a") {
      timers.push(setTimeout(() => {
        const dots = el("div", "dots", "<i></i><i></i><i></i>");
        thread.append(dots);
        timers.push(setTimeout(() => {
          dots.remove();
          thread.append(bubble(turn));
          if (turn.parse)    stamp("Understood the situation", turn.parse.length + " signals, no filters used");
          if (turn.products) stamp("Recommended from your catalog", turn.products.length + " products, all in stock");
          if (turn.cart) timers.push(setTimeout(() => {
            stamp("Built the cart", d.items + (d.items === 1 ? " item" : " items") + ", your checkout");
            stamp("Order placed", d.order, true);
            stamp("What you pay us", fee(d.order) + " (1% of it)");
          }, 900));
        }, reduce ? 0 : 620));
      }, t));
      t += reduce ? 0 : 1750;
    } else {
      timers.push(setTimeout(() => thread.append(bubble(turn)), t));
      t += reduce ? 0 : 1350;
    }
  });
}

/* Closest scripted category to whatever the visitor typed, so the
   products shown are at least in the right shop. */
function nearestDemo(text) {
  const w = new Set(text.toLowerCase().split(/\W+/));
  let best = 0, score = -1;
  SITE.demos.forEach((d, i) => {
    const hay = d.turns.map(t => t.text).join(" ").toLowerCase().split(/\W+/);
    const n = hay.filter(x => x.length > 3 && w.has(x)).length;
    if (n > score) { score = n; best = i; }
  });
  return best;
}

function runCustom({ text, signals }) {
  reset();
  const near = SITE.demos[nearestDemo(text)];
  const ps = $("#panelStore"); if (ps) ps.textContent = near.store;
  typeInto(headline, text);

  const parsed = signals;
  const t0 = reduce ? 0 : Math.min(text.length * 14, 2200) + 240;

  thread.append(bubble({ who: "c", text }));

  timers.push(setTimeout(() => {
    const dots = el("div", "dots", "<i></i><i></i><i></i>");
    thread.append(dots);
    timers.push(setTimeout(() => {
      dots.remove();
      thread.append(bubble({
        who: "a",
        text: parsed.length > 1
          ? "Here is what I picked up from that. In your store the next step queries your live catalog against these signals."
          : "I can work with that, though a real customer usually gives more to go on. In your store this still queries your live catalog.",
        parse: parsed
      }));
      stamp("Understood the situation", (parsed.length || 0) + " signals, no filters used");
      timers.push(setTimeout(() => {
        const rec = near.turns.find(t => t.products);
        thread.append(bubble({
          who: "a",
          text: "This demo runs on a sample sporting goods catalog, so here is the closest match it holds. Pointed at your catalog, these would be your SKUs, your stock and your prices.",
          products: rec.products
        }));
        stamp("Recommended from the catalog", rec.products.length + " products, all in stock");
      }, reduce ? 0 : 1500));
    }, reduce ? 0 : 900));
  }, t0));
}

export function initPanel() {
  if (!swap("panel", PANEL)) return;
  thread   = $("#thread");
  stamps   = $("#stamps");
  headline = mount("heroLine");
  $("#replay").onclick = run;
  on(EVT.category, run);
  on(EVT.custom, runCustom);
  run();
}
