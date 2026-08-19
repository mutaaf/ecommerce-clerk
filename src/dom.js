/* Query, build and mount helpers. Every renderer takes its markup to a
   [data-mount] hook, so the same renderer can appear on either page, or
   twice on one page, without knowing about it. */

export const $  = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export const el = (t, c, h) => {
  const n = document.createElement(t);
  if (c) n.className = c;
  if (h != null) n.innerHTML = h;
  return n;
};

export const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
export const money  = (n, d = 0) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export const mount  = (name) => $('[data-mount="' + name + '"]');
export const mounts = (name) => $$('[data-mount="' + name + '"]');

/* Fill every mount point with the same markup. Returns how many it found,
   so a page that does not use a component costs nothing. */
export function fill(name, html) {
  const ns = mounts(name);
  ns.forEach(n => { n.innerHTML = html; });
  return ns.length;
}

/* For components that replace their own hook with a full block. */
export function swap(name, html) {
  const n = mount(name);
  if (!n) return false;
  n.outerHTML = html;
  return true;
}
