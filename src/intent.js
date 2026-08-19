/* Reading the sentence a visitor types into the hero.

   The real path is a model call behind a serverless function, keyed from
   the environment on the server. The scripted path below is what the page
   shipped with, and it stays: it is what answers when the call fails or
   runs long, which on a stage or a bad hotel wifi is most of the time.
   The visitor is never shown an error and never waits more than two
   seconds for either answer. */

import { SITE } from '../content/index.js';

const ENDPOINT = '/api/parse-intent';
const BUDGET_MS = 2000;

/* ---------- scripted: regex rules from content/signals.js ---------- */
export function extract(text) {
  const out = [];
  SITE.signals.forEach(sig => {
    const m = text.match(sig.re);
    if (m) out.push(sig.fmt(m));
  });
  const words = text.toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").split(/\s+/)
    .filter(w => w.length > 2 && !SITE.stop.includes(w) && !/^\d+$/.test(w));
  const subject = [...new Set(words)].slice(0, 3);
  if (subject.length) out.unshift("looking for: " + subject.join(" "));
  return out;
}

/* ---------- the real thing, with the clock running ---------- */
async function callModel(text, signal) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
    signal
  });
  if (!res.ok) throw new Error('parse-intent ' + res.status);
  const data = await res.json();
  if (!Array.isArray(data.signals) || !data.signals.length) throw new Error('no signals');
  return data.signals.map(String);
}

/* Returns { signals, source }. Never rejects, never returns nothing:
   whatever happens upstream, the panel has something to render. */
export async function readIntent(text) {
  const scripted = extract(text);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BUDGET_MS);

  try {
    const signals = await callModel(text, controller.signal);
    return { signals, source: 'model' };
  } catch {
    return { signals: scripted, source: 'scripted' };
  } finally {
    clearTimeout(timer);
  }
}
