import type { BuddyMemory } from '../../shared/protocol';
import type { Buddy } from './buddy';
import { AFTER_OPEN_MS } from './features/contemplate';

/** The wait before the next contemplation runs down by itself: it is the same memory until it shifts by this much. */
const VISTA_SLACK_MS = 60_000;

/** A need noted longer ago than this has passed: it does not sulk this morning over yesterday's lunch. */
const PASSED_AFTER_MS = 4 * 3_600_000;

/** Its toys lying still in the view, and where. One that is moving, or in a hand or a mouth, is noted once it has come to rest. */
function lying(b: Buddy): NonNullable<BuddyMemory['toys']> {
  const { ball, plushes } = b.world;
  const toys: NonNullable<BuddyMemory['toys']> = {};
  if (ball.resting) {
    toys.ball = Math.round(ball.x);
  }
  for (const toy of Object.values(plushes)) {
    if (toy.landed) {
      toys[toy.kind] = Math.round(toy.x);
    }
  }
  return toys;
}

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
    dream: b.contemplate.dream,
    lastVista: b.contemplate.last,
    mouseFriend: b.visitors.mouseFriend,
    toys: lying(b),
    stage: b.world.stage,
    collected: { ...b.world.album.finds },
    mound: b.world.mound.x === undefined ? undefined : Math.round(b.world.mound.x),
    treat: b.world.treat.landed ? { x: Math.round(b.world.treat.centerX), stage: b.world.treat.stage, facing: b.world.treat.facing } : undefined,
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
    a.dream === b.dream &&
    a.lastVista === b.lastVista &&
    a.mouseFriend === b.mouseFriend &&
    JSON.stringify(a.toys ?? {}) === JSON.stringify(b.toys ?? {}) &&
    a.stage === b.stage &&
    JSON.stringify(a.collected ?? {}) === JSON.stringify(b.collected ?? {}) &&
    a.mound === b.mound &&
    JSON.stringify(a.treat) === JSON.stringify(b.treat) &&
    Math.abs(a.savedAt + a.vistaInMs - (b.savedAt + b.vistaInMs)) < VISTA_SLACK_MS
  );
}

/** Picks up where it left off, hungrier by the time that went by. */
export function recall(b: Buddy, memory: BuddyMemory, now: number): void {
  const since = Math.max(0, now - memory.savedAt);
  if (since < PASSED_AFTER_MS) {
    if (memory.hungryForMs !== undefined) {
      b.meals.hungry = true;
      b.meals.hungerMs = memory.hungryForMs + since;
    }
    b.meals.thirsty = memory.thirsty;
    b.rest.breakWanted = memory.breakWanted;
    b.rest.breakAsks = memory.breakAsks;
  }
  b.intro.greeted = { ...memory.greeted };
  b.contemplate.dream = memory.dream;
  b.contemplate.last = memory.lastVista;
  b.visitors.mouseFriend = memory.mouseFriend === true;
  // Its toys are where it left them, for the day: by the next morning they are back in the chest.
  // What has come into its life so far, and what its box of keepsakes holds: for good.
  const { ball, plushes, album, mound, width, height } = b.world;
  b.world.stage = memory.stage ?? -1;
  album.pictures = b.world.stage + 1;
  Object.assign(album.finds, memory.collected);
  if (b.world.stage >= 0 && ball.state === 'mouth' && b.state === 'intro') {
    // It was coming in with its ball as for a first meeting: it is not one.
    ball.state = 'none';
  }
  const sameDay = new Date(memory.savedAt).toDateString() === new Date(now).toDateString();
  const toys = sameDay ? (memory.toys ?? {}) : {};
  if (sameDay && memory.treat && !b.world.treat.active) {
    b.world.treat.rest(memory.treat.x, memory.treat.stage, memory.treat.facing, width);
  }
  if (sameDay && memory.mound !== undefined && !mound.there) {
    mound.restore(memory.mound);
  }
  if (toys.ball !== undefined && ball.state === 'none') {
    ball.place(toys.ball, 0, width, height);
    ball.launch(0, 0);
  }
  for (const toy of Object.values(plushes)) {
    const x = toys[toy.kind];
    if (x !== undefined && toy.state === 'none') {
      toy.rest(x, width);
    }
  }
  // A memory noted by a view from before contemplations knows nothing of the wait.
  b.contemplate.waitMs = Math.max(AFTER_OPEN_MS, (memory.vistaInMs ?? 0) - since);
}
