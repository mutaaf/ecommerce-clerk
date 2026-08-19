/* The platform page. For the person a merchant forwards this to. */

import { bind } from '../boot.js';
import { observeAll } from '../reveal.js';
import { initChrome } from '../components/chrome.js';
import { initCards } from '../components/cards.js';
import { initArchitecture } from '../components/architecture.js';
import { initPlatforms } from '../components/platforms.js';
import { initChain } from '../components/chain.js';
import { initFaq } from '../components/faq.js';
import { initCta } from '../components/cta.js';

bind();
initChrome("platform");

initCards();
initArchitecture();
initPlatforms();
initChain();
initFaq("faqTech");
initCta();

observeAll();
