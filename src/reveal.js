/* Scroll reveals: counters, bars, the falling attributes and the
   attribution stepper. One observer, whatever the page happens to hold. */

import { SITE } from '../content/index.js';
import { $$, reduce } from './dom.js';

function countUp(node, cfg) {
  const fmt = v => (cfg.pre || "") + v.toLocaleString("en-US", {
    minimumFractionDigits: cfg.dec || 0, maximumFractionDigits: cfg.dec || 0
  }) + (cfg.suf || "");
  if (reduce) { node.textContent = fmt(cfg.v); return; }
  const dur = 1250, t0 = performance.now();
  const step = now => {
    const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    node.textContent = fmt(cfg.v * e);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting || e.target.dataset.done) return;
    e.target.dataset.done = 1;
    if (e.target.dataset.count != null)   countUp(e.target, SITE.board[+e.target.dataset.count]);
    else if (e.target.dataset.w != null)  e.target.style.width = e.target.dataset.w + "%";
    else if (e.target.id === "lossbad")   setTimeout(() => e.target.classList.add("fell"), 500);
    else e.target.classList.add("in");
  });
}, { threshold: .35 });

export function observeAll() {
  $$("[data-count],[data-w],.node,#lossbad").forEach((n, i) => {
    if (n.classList.contains("node")) n.style.transitionDelay = (i % 4) * 90 + "ms";
    io.observe(n);
  });
}
