/* SITE. Single source of truth for both pages.
   Nothing in src/ is content specific. Adding a store category, a
   platform adapter or an FAQ entry is one object in content/, never
   a change to a renderer. */

import * as brand from './brand.js';
import * as funnel from './funnel.js';
import * as signals from './signals.js';
import * as platforms from './platforms.js';
import * as demos from './demos.js';
import * as merchant from './merchant.js';
import * as platformPage from './platform-page.js';

export const SITE = {
  ...brand,
  ...funnel,
  ...signals,
  ...platforms,
  ...demos,
  ...merchant,
  ...platformPage
};
