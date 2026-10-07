import type { BuddyMemory } from '../../shared/protocol';
import type { Buddy } from './buddy';
import { AFTER_OPEN_MS } from './features/contemplate';

/** The wait before the next contemplation runs down by itself: it is the same memory until it shifts by this much. */
const VISTA_SLACK_MS = 60_000;

/** What it carries over, as of `now` (ms since the epoch). */
export function remember(b: Buddy, now: number): BuddyMemory {
  return {
    savedAt: now,
    hungryForMs: b.meals.hungry ? b.meals.hungerMs : undefined,
    thirsty: b.meals.thirsty,
    breakWanted: b.rest.breakWanted,
    breakAsks: b.rest.breakAsks,
    greeted: { ...b.intro.greeted },
    vistaInMs: b.contemplate.waitMs,
  };
}

/** Whether two memories hold the same things, whenever they were noted. */
export function sameMemory(a: BuddyMemory, b: BuddyMemory): boolean {
  return (
    (a.hungryForMs === undefined) === (b.hungryForMs === undefined) &&
    a.thirsty === b.thirsty &&
    a.breakWanted === b.breakWanted &&
    a.breakAsks === b.breakAsks &&
    JSON.stringify(a.greeted) === JSON.stringify(b.greeted) &&
    Math.abs(a.savedAt + a.vistaInMs - (b.savedAt + b.vistaInMs)) < VISTA_SLACK_MS
  );
}

/** Picks up where it left off, hungrier by the time that went by. */
export function recall(b: Buddy, memory: BuddyMemory, now: number): void {
  if (memory.hungryForMs !== undefined) {
    b.meals.hungry = true;
    b.meals.hungerMs = memory.hungryForMs + Math.max(0, now - memory.savedAt);
  }
  b.meals.thirsty = memory.thirsty;
  b.rest.breakWanted = memory.breakWanted;
  b.rest.breakAsks = memory.breakAsks;
  b.intro.greeted = { ...memory.greeted };
  // A memory noted by a view from before contemplations knows nothing of the wait.
  b.contemplate.waitMs = Math.max(AFTER_OPEN_MS, (memory.vistaInMs ?? 0) - Math.max(0, now - memory.savedAt));
}
