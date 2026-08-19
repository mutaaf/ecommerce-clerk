/* Which store category is on screen. One number, one event. */

import { emit, EVT } from './bus.js';

let active = 0;

export const category = () => active;

export function setCategory(index, user = false) {
  active = index;
  emit(EVT.category, { index, user });
}
