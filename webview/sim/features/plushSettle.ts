import type { Buddy } from '../buddy';
import type { Plush } from '../props/plush';
import { noseTo } from './mouth';
import { phase } from './plush';
import { tookBreak } from './rest';

/** Settling down: how long it lies against its teddy; how many times it boops its duck, how long a boop lasts, how the duck hops off. */
const CUDDLE_MS = 4500;
const BOOPS = 3;
const BOOP_MS = 400;
const HOP_SPEED = 16;
const HOP_HEIGHT = 30;

// The game winds down: it lies against its teddy for a while, or boops its duck along a few times.
export function settle(b: Buddy, toy: Plush, dt: number): void {
  const m = b.plush;
  if (toy.state === 'held') {
    phase(b, 'ready');
    m.misses = 0;
    return;
  }
  if (!toy.landed) {
    b.faceX(toy.center, 3);
    return;
  }
  if (!m.with) {
    m.with = noseTo(b, toy.center, dt) !== 'going';
    m.phaseMs = 0;
    return;
  }
  if (m.toy === 'teddy') {
    if (m.phaseMs >= CUDDLE_MS) {
      tookBreak(b);
      b.enterNext('lie');
    }
  } else if (m.phaseMs >= BOOP_MS) {
    if (++m.boops >= BOOPS) {
      tookBreak(b);
      b.enterNext('sit');
      return;
    }
    // A boop with its nose, and off it hops: it goes after it again.
    toy.toss((toy.center < b.world.width / 2 ? 1 : -1) * HOP_SPEED, HOP_HEIGHT);
    m.with = false;
  }
}
