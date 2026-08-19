/* The hero argument: the same customer on the store as it is today, and
   on the store with a clerk. Both panels read the same demo, so the
   question going unanswered on the left is the one answered on the right. */

import { SITE } from '../../content/index.js';
import { $, reduce } from '../dom.js';
import { on, EVT } from '../bus.js';
import { category, setCategory } from '../state.js';
import { bubble } from './bubble.js';

const VERDICTS = [
  "No answer. They close the tab.",
  "Nobody replies. They buy it somewhere else.",
  "Four hundred results, no help. Gone.",
  "The search box has no idea what they meant.",
  "One question stood between them and an order.",
  "Straight to a competitor who picks up the phone."
];

let auto = true, timers = [];
let voidEl, voidText, voidAns, voidFoot, afterThread, afterFoot, frameUrl, baEl;

/* Each category writes a different amount into the widget, so cycling
   through them reflows everything below the hero. Hold the block at the
   tallest it has been, and let a resize start the measurement again. */
let tallest = 0;
function holdHeight() {
  if (!baEl) return;
  const h = baEl.getBoundingClientRect().height;
  if (h > tallest) { tallest = h; baEl.style.minHeight = Math.ceil(h) + "px"; }
}

/* the solution, rendered as the widget a customer would actually see */
function paintAfter() {
  if (!afterThread) return;
  const d = SITE.demos[category()];
  const parseTurn = d.turns.find(t => t.parse);
  const prodTurn  = d.turns.find(t => t.products);
  const cartTurn  = d.turns.find(t => t.cart);

  if (frameUrl) frameUrl.textContent = d.store.toLowerCase().replace(/[^a-z0-9]+/g, "") + ".com";
  afterThread.innerHTML = "";
  afterThread.append(bubble({ who: "c", text: d.turns[0].text }));
  afterThread.append(bubble({ who: "a", text: parseTurn.text, parse: parseTurn.parse }));
  afterThread.append(bubble({ who: "a", text: prodTurn.text, products: prodTurn.products }));
  afterFoot.innerHTML = `<span>Cart built · handed to your checkout</span><b>${cartTurn.cart.total}</b>`;
}

function paint() {
  timers.forEach(clearTimeout);
  timers = [];
  if (!voidEl) return;
  const d = SITE.demos[category()];
  const line = d.turns[0].text;
  const signals = (d.turns.find(t => t.parse)?.parse || []).length;
  const verdict = VERDICTS[category() % VERDICTS.length];

  paintAfter();
  holdHeight();
  voidEl.classList.remove("gone");
  voidAns.innerHTML = "";
  voidFoot.innerHTML = `That sentence had <b>${signals} things</b> in it. Your search box used none of them.`;

  const show = () => {
    voidAns.innerHTML = '<div class="dots"><i></i><i></i><i></i></div>';
    timers.push(setTimeout(() => {
      voidEl.classList.add("gone");
      voidAns.innerHTML = `<span class="verdict"><span class="x">&times;</span><b>${verdict}</b></span>`;
      if (auto && !reduce) timers.push(setTimeout(() => {
        setCategory((category() + 1) % SITE.demos.length);
      }, 3400));
    }, 1900));
  };

  if (reduce) { voidText.textContent = '"' + line + '"'; show(); return; }
  voidText.innerHTML = '<span class="q">"</span><span class="t"></span>';
  const t = voidText.querySelector(".t");
  let i = 0;
  const tick = () => {
    t.textContent = line.slice(0, ++i);
    if (i < line.length) timers.push(setTimeout(tick, 20));
    else { t.insertAdjacentHTML("afterend", '<span class="q">"</span>'); timers.push(setTimeout(show, 600)); }
  };
  tick();
}

export function initHero() {
  voidEl = document.querySelector(".void");
  if (!voidEl) return;
  baEl = document.querySelector(".ba");
  voidText    = $("#voidText");
  voidAns     = $("#voidAns");
  voidFoot    = $("#voidFoot");
  afterThread = $("#afterThread");
  afterFoot   = $("#afterFoot");
  frameUrl    = $("#frameUrl");

  on(EVT.category, ({ user }) => { if (user) auto = false; paint(); });

  /* stop cycling once the visitor scrolls past, so the full conversation
     below does not restart while they are reading it. Only after they
     have actually seen it: on a short window the panel can start out of
     view, and killing the timers then leaves the hero stuck on its
     typing dots. */
  let seen = false;
  new IntersectionObserver(es => {
    es.forEach(e => {
      if (e.isIntersecting) { seen = true; return; }
      if (!seen) return;
      auto = false;
      timers.forEach(clearTimeout);
    });
  }, { threshold: .15 }).observe(voidEl);

  paint();

  addEventListener("resize", () => {
    tallest = 0;
    if (baEl) baEl.style.minHeight = "";
    holdHeight();
  });
}
