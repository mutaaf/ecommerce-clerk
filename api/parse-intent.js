/* POST /api/parse-intent  { text }  ->  { signals: ["budget: $120", ...] }

   Reads the sentence a visitor types into the hero and returns the signals
   a salesperson would have picked up from it. The key never reaches the
   browser: it is read from the environment on the server.

   The browser gives this two seconds and then falls back to the scripted
   parser in src/intent.js, so a live demo never shows an error. This
   handler is written to fail fast rather than hold the connection open. */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

const MAX_CHARS = 400;
const MAX_SIGNALS = 8;

/* This endpoint is public, unauthenticated and costs money per call, so it
   gets a cheap guard. Serverless instances do not share memory, so this
   is best effort rather than a real rate limiter: it stops a browser tab
   in a loop and a casual script, not a distributed one. The real backstop
   is that a refused request is indistinguishable from a slow one to the
   page, which falls back to the scripted parser either way. */
const WINDOW_MS = 60_000;
const PER_WINDOW = 12;
const seen = new Map();

function overLimit(ip) {
  const now = Date.now();
  const hits = (seen.get(ip) ?? []).filter(t => now - t < WINDOW_MS);
  hits.push(now);
  seen.set(ip, hits);
  if (seen.size > 5000) seen.clear();          /* never grow without bound */
  return hits.length > PER_WINDOW;
}

const clientIp = req =>
  (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
  req.socket?.remoteAddress || 'unknown';

const Signals = z.object({
  signals: z.array(z.object({
    label: z.string(),   /* what kind of thing it is: budget, age, fit, use */
    value: z.string()    /* the thing itself, in the customer's own terms   */
  }))
});

const SYSTEM = [
  "You read one sentence from a shopper on an ecommerce store and list the buying signals in it.",
  "A signal is anything a good salesperson would have written down: who it is for, budget, size or fit,",
  "how it will be used, skill level, frequency, timing, an allergy or a thing to avoid, a problem being replaced.",
  "",
  "Rules:",
  "- Only report what the sentence actually says. Never infer a budget, a size or a brand that is not there.",
  "- Keep the customer's own words in the value. Do not translate them into catalog jargon.",
  "- Labels are one or two lowercase words, no punctuation.",
  `- At most ${MAX_SIGNALS} signals, most useful first.`,
  "- The first signal should be labelled \"looking for\" and name the product category if the sentence implies one.",
  "- If the sentence carries no buying signal at all, return an empty list.",
  "Do not include internal or system XML tags in your response."
].join("\n");

export async function parseIntent(text) {
  const client = new Anthropic({ timeout: 4000, maxRetries: 0 });

  const response = await client.messages.parse({
    model: 'claude-opus-5',
    max_tokens: 400,
    system: SYSTEM,
    thinking: { type: 'disabled' },        /* a live demo has a two second budget */
    output_config: {
      effort: 'low',
      format: zodOutputFormat(Signals)
    },
    messages: [{ role: 'user', content: text }]
  });

  const parsed = response.parsed_output;
  if (!parsed) return null;

  return parsed.signals
    .slice(0, MAX_SIGNALS)
    .map(s => `${s.label.trim().toLowerCase()}: ${s.value.trim()}`)
    .filter(s => s.length > 3);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });

  if (overLimit(clientIp(req))) {
    /* Same shape as every other refusal: the page falls back quietly. */
    res.setHeader('retry-after', '60');
    return send(res, 429, { signals: [], reason: 'rate limited' });
  }


  /* No key is a normal state, not a fault: a fresh clone runs the page on
     the scripted parser. Answer 200 with nothing in it so the browser
     falls back quietly instead of logging a failed request. */
  if (!process.env.ANTHROPIC_API_KEY) return send(res, 200, { signals: [], reason: 'unconfigured' });

  let text = '';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    text = String(body?.text ?? '').trim().slice(0, MAX_CHARS);
  } catch {
    return send(res, 400, { error: 'expected JSON with a text field' });
  }
  if (text.length < 12) return send(res, 400, { error: 'too short to read' });

  try {
    const signals = await parseIntent(text);
    if (!signals) return send(res, 502, { error: 'no readable answer' });
    return send(res, 200, { signals });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError)     return send(res, 429, { error: 'rate limited' });
    if (err instanceof Anthropic.AuthenticationError) return send(res, 200, { signals: [], reason: 'unconfigured' });
    if (err instanceof Anthropic.APIError)            return send(res, 502, { error: 'upstream ' + err.status });
    return send(res, 502, { error: 'upstream failure' });
  }
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}
