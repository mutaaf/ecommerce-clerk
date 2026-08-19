/* One renderer, two lists. The page says which. */

import { SITE } from '../../content/index.js';
import { fill } from '../dom.js';

export function initFaq(key) {
  fill("faq", SITE[key].map(f => `
    <details class="q"><summary class="q__b">${f.q}</summary><div class="q__a"><p>${f.a}</p></div></details>`).join(""));
}
