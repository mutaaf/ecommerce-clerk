/* Nav and footer. One renderer, both pages; the current page is read off
   the body so neither HTML file repeats the markup. */

import { SITE } from '../../content/index.js';
import { fill } from '../dom.js';

export function initChrome(pageId) {
  const other = SITE.pages.find(p => p.id !== pageId) || SITE.pages[0];

  fill("nav", `
  <div class="wrap nav__in">
    <a class="brand" href="${SITE.pages[0].path}"><span class="brand__mark"></span><span>${SITE.brand}</span></a>
    <div class="nav__links">
      ${SITE.pages.map(p =>
        `<a href="${p.path}"${p.id === pageId ? ' aria-current="page"' : ""}>${p.label}</a>`).join("")}
    </div>
    <a class="btn btn--lit btn--sm" href="${SITE.navCta.href}">${SITE.navCta.label}</a>
  </div>`);

  fill("footer", `
  <div class="wrap in">
    <span class="brand"><span class="brand__mark"></span><span>${SITE.brand}</span></span>
    <span class="mono" style="font-size:12px">${SITE.footNote}</span>
    <a href="${other.path}">${other.label}</a>
    <span class="mono" style="margin-left:auto;font-size:12px">${SITE.northStar}</span>
  </div>`);

  const page = SITE.pages.find(p => p.id === pageId);
  if (page) document.title = SITE.brand + ": " + page.title;
}
