/* Founding seats. One object in content drives the number, the copy and
   the row of squares. */

import { SITE } from '../../content/index.js';
import { fill } from '../dom.js';

export const seatsLeft = () => SITE.founding.seats - SITE.founding.taken;

export function initSeats() {
  fill("seatCount", String(seatsLeft()));
  fill("seatDots", Array.from({ length: SITE.founding.seats }, (_, i) =>
    `<i class="${i < SITE.founding.taken ? "taken" : ""}"></i>`).join(""));
}
