import type { BuddyMemory } from '../../shared/protocol';
import type { Buddy } from './buddy';

/** What it carries over, as of `now` (ms since the epoch). */
export function remember(b: Buddy, now: number): BuddyMemory {
  return {
    savedAt: now,
    hungryForMs: b.meals.hungry ? b.meals.hungerMs : undefined,
    thirsty: b.meals.thirsty,
    breakWanted: b.rest.breakWanted,
    breakAsks: b.rest.breakAsks,
    greeted: { ...b.intro.greeted },
  };
}

/** Whether two memories hold the same things, whenever they were noted. */
export function sameMemory(a: BuddyMemory, b: BuddyMemory): boolean {
  return (
    (a.hungryForMs === undefined) === (b.hungryForMs === undefined) &&
    a.thirsty === b.thirsty &&
    a.breakWanted === b.breakWanted &&
    a.breakAsks === b.breakAsks &&
    JSON.stringify(a.greeted) === JSON.stringify(b.greeted)
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
}
