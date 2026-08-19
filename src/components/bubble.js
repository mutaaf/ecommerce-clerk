/* One conversation turn: text, extracted signals, product cards, cart.
   Used by the full panel and by the hero widget, which is why it is a
   component rather than a function inside either of them. */

import { SITE } from '../../content/index.js';
import { el } from '../dom.js';

export function bubble(turn) {
  const m = el("div", "msg msg--" + turn.who);
  m.append(el("div", "who", turn.who === "c" ? "Customer" : SITE.brand));
  const b = el("div", "msg__b", turn.text || "");
  m.append(b);

  if (turn.parse) {
    const p = el("div", "parse");
    turn.parse.forEach(x => p.append(el("span", null, x)));
    b.append(p);
  }

  if (turn.products) {
    const w = el("div", "prods");
    turn.products.forEach(pr => {
      const c = el("div", "prod" + (pr.best ? " prod--best" : ""));
      const sw = el("div", "prod__sw", pr.i);
      sw.style.background = `var(--${pr.c})`;
      sw.style.color = `var(--on-${pr.c})`;
      c.append(sw);
      const mid = el("div");
      mid.append(el("div", "prod__n", pr.n + (pr.best ? ' <span class="best">best fit</span>' : "")));
      mid.append(el("div", "prod__m", pr.m));
      c.append(mid, el("div", "prod__p", pr.p));
      w.append(c);
    });
    m.append(w);
  }

  if (turn.cart) {
    const c = el("div", "cart");
    c.append(el("div", "cart__r", "<span>" + turn.cart.line + "</span><span>" + turn.cart.price + "</span>"));
    c.append(el("div", "cart__r", "<span>Shipping</span><span>" + turn.cart.ship + "</span>"));
    c.append(el("div", "cart__r cart__r--t", "<span>Cart total</span><span>" + turn.cart.total + "</span>"));
    const go = el("button", "btn btn--lit btn--sm cart__cta", "Checkout on your store →");
    go.type = "button";
    go.onclick = () => alert("In production this opens the merchant's own checkout, on their own platform, with the attribution IDs attached to the order.");
    c.append(go);
    m.append(c);
  }

  return m;
}
