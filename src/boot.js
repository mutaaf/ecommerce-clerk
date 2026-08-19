/* Bindings shared by both pages: any [data-bind] node takes its text
   straight from SITE. */

import { SITE } from '../content/index.js';
import { $$ } from './dom.js';

export function bind() {
  $$("[data-bind]").forEach(n => { n.innerHTML = SITE[n.dataset.bind] ?? ""; });
}
