/* The merchant page. It argues before it demos: thesis and before/after,
   the losses, why it happens, the playable conversation, what changes,
   the fit test, the dashboard, the simulator, platforms, seats, the
   pilot, FAQ, CTA. That order was tested; do not move the demo up. */

import { bind } from '../boot.js';
import { observeAll } from '../reveal.js';
import { initChrome } from '../components/chrome.js';
import { initChips } from '../components/chips.js';
import { initPanel } from '../components/demo-panel.js';
import { initAsk } from '../components/ask.js';
import { initHero } from '../components/hero.js';
import { initSeats } from '../components/seats.js';
import { initPlatforms } from '../components/platforms.js';
import { initLoss } from '../components/loss.js';
import { initFit } from '../components/fit.js';
import { initCards } from '../components/cards.js';
import { initDashboard } from '../components/dashboard.js';
import { initFunnelSim } from '../components/funnel-sim.js';
import { initPilot } from '../components/pilot.js';
import { initFaq } from '../components/faq.js';
import { initCta } from '../components/cta.js';

bind();
initChrome("home");

initChips();      /* order matters: chips, then panel, then hero, so a */
initPanel();      /* category change repaints them in that sequence   */
initAsk();
initHero();

initSeats();
initPlatforms();
initLoss();
initFit();
initCards();
initDashboard();
initFunnelSim();
initPilot();
initFaq("faqHome");
initCta();

observeAll();
