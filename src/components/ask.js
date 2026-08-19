/* The visitor writes a sentence one of their own customers has asked
   them, and the panel reads it back. */

import { $ } from '../dom.js';
import { on, emit, EVT } from '../bus.js';
import { readIntent } from '../intent.js';

const DEFAULT_NOTE = "Type something one of your own customers has actually asked you.";
const SHORT_NOTE   = "Give it a full sentence, the way a customer would actually write it.";
const READING_NOTE = "Reading your sentence. Switch back any time with a chip above.";

export function initAsk() {
  const input = $("#askInput"), note = $("#askNote"), go = $("#askGo");
  if (!input || !go) return;

  /* Two seconds is the whole budget. The panel starts typing the sentence
     back straight away so the wait is spent on something, and whichever
     reading arrives first is the one it shows. */
  let pending = 0;
  const ask = async () => {
    const v = input.value.trim();
    if (v.length < 12) { note.textContent = SHORT_NOTE; return; }
    note.textContent = READING_NOTE;
    const turn = ++pending;
    const { signals } = await readIntent(v);
    if (turn !== pending) return;          /* a newer sentence won the race */
    emit(EVT.custom, { text: v, signals });
  };

  go.onclick = ask;
  input.addEventListener("keydown", e => { if (e.key === "Enter") ask(); });
  on(EVT.category, ({ user }) => { if (user) note.textContent = DEFAULT_NOTE; });
}
