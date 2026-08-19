/* The only cross component wiring. Chips, the conversation panel, the
   hero and the intent box all read the same active category without
   importing each other. */

const subs = new Map();

export function on(evt, fn) {
  if (!subs.has(evt)) subs.set(evt, []);
  subs.get(evt).push(fn);
}

export function emit(evt, payload) {
  (subs.get(evt) || []).forEach(fn => fn(payload));
}

export const EVT = {
  category: "category:change",   /* { index, user } */
  custom:   "intent:custom"      /* { text, signals } */
};
