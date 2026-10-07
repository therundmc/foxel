import { SPRITE_SIZE } from '../../sprites/frames';
import type { Buddy } from '../buddy';
import { urge, type Feature } from '../state';
import { ASK_BREAK_MS, AWAIT_MS, FETCH_MAX_MS, WALK_SPEED } from '../tuning';
import { startLeave } from './play';
import { SIGH, perform } from './touch';

export class RestMemory {
  /** You stopped working: it sleeps as soon as it is done with what it is doing, until you are back. */
  sleepy = false;
  breakWanted = false;
  /** On its way to get the ball to ask for a break with. */
  askingBreak = false;
  /** Break nudges since it last played or slept: the first is a request, the next ones are sighs. */
  breakAsks = 0;
}

// First nudge: fetches its ball and sits by you with a little cup. Ignored ones: flops down and sighs.
export function startBreak(b: Buddy): void {
  if (!b.free && b.state !== 'await') {
    return;
  }
  b.rest.breakWanted = false;
  b.rest.breakAsks++;
  if (b.rest.breakAsks > 1) {
    perform(b, SIGH);
    return;
  }
  b.rest.askingBreak = true;
  if (b.world.ball.state === 'free') {
    b.fetch.playerX = undefined;
    b.tryEnter('fetch', FETCH_MAX_MS);
  } else if (b.world.ball.state === 'none') {
    startLeave(b, 'fetch');
  } else {
    b.rest.askingBreak = false;
    b.tryEnter('askBreak', ASK_BREAK_MS);
  }
}

/** Playing with it is the break it was after: it stops asking, and the extension starts counting again. */
export function tookBreak(b: Buddy): void {
  b.rest.breakWanted = false;
  b.rest.breakAsks = 0;
  b.world.effects.push('played');
}

/** Naps where it is by day; at night it goes to its basket first. */
export function goToSleep(b: Buddy): void {
  if (b.world.phase === 'night') {
    startBedtime(b);
  } else {
    b.tryEnter('sleep', Infinity);
  }
}

// At night it trots to a little basket, puts its nightcap on and curls up there.
export function startBedtime(b: Buddy): void {
  if (b.world.bed === undefined) {
    b.world.bed = b.x + SPRITE_SIZE / 2 < b.world.width / 2 ? 0 : b.maxX;
  }
  b.tryEnter('toBed', Infinity);
}

function updateToBed(b: Buddy, dt: number): void {
  // You came back before it got there.
  if (!b.rest.sleepy) {
    b.enterNext(b.pickNext());
    return;
  }
  const bed = b.world.bed ?? b.x;
  const facing = bed < b.world.width / 2 ? 1 : -1;
  if (!b.walkTo(bed, facing, WALK_SPEED * dt)) {
    b.enter('sleep', Infinity);
  }
}

// Sleep, the basket it sleeps in at night, and asking you to take a break.
export const restFeature = {
  states: {
    sleep: {
      priority: 1,
      restful: true,
      free: true,
      hat: (b) => (b.world.bed !== undefined ? 'nightcap' : 'none'),
    },
    toBed: {
      priority: 1,
      update: updateToBed,
      anim: (b) => ({ anim: 'walk', elapsed: b.elapsed }),
      hat: (b) => (b.world.bed !== undefined ? 'nightcap' : undefined),
    },
    askBreak: {
      priority: 2,
      restful: true,
      gazes: true,
      anim: (b) => ({ anim: 'watch', elapsed: b.elapsed }),
      finish: (b) => b.enter('await', AWAIT_MS),
      emote: () => 'cup',
    },
  },
  urges: [urge((b) => b.rest.sleepy, goToSleep), urge((b) => b.rest.breakWanted, startBreak)],
  // The basket only stays out while it heads there, sleeps and wakes up.
  entered(b, state) {
    if (state !== 'toBed' && state !== 'sleep' && state !== 'stretch') {
      b.world.bed = undefined;
    }
  },
} satisfies Feature;
