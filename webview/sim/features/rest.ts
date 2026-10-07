import { ANIMATIONS } from '../../sprites/fox/animations';
import { SPRITE_SIZE, totalDuration } from '../../sprites/frames';
import type { Buddy } from '../buddy';
import { urge, type Feature } from '../state';
import { ASK_BREAK_MS, AWAIT_MS, FETCH_MAX_MS, WALK_SPEED } from '../tuning';
import { sleepOf } from './contemplate';
import { startLeave } from './play';
import { SIGH, perform } from './touch';

/** Where it stands to pull its basket in or push it out: this far from the basket's place, toward the middle. */
const BESIDE_BASKET = 22;
/** When, in its two tugs, the basket comes half way in and all the way; and in its two shoves, half way out and gone. */
const TUGS_AT = [260, 760] as const;
const SHOVES_AT = [200, 800] as const;
const TUG_MS = totalDuration(ANIMATIONS.tug);
const SHOVE_MS = totalDuration(ANIMATIONS.shove);
const STRETCH_MS = totalDuration(ANIMATIONS.stretch);

/** What it is doing with its basket: on its way to it, moving it, or done with that. */
type BasketStep = 'reach' | 'move' | 'settle';

export class RestMemory {
  /** You stopped working: it sleeps as soon as it is done with what it is doing, until you are back. */
  sleepy = false;
  breakWanted = false;
  /** On its way to get the ball to ask for a break with. */
  askingBreak = false;
  /** Break nudges since it last played or slept: the first is a request, the next ones are sighs. */
  breakAsks = 0;
  /** Going to bed or getting up: where it is with its basket, and for how long it has been moving it. */
  basketStep: BasketStep = 'reach';
  basketMs = 0;
}

/** Gone to sleep, or on its way to bed: a pointer passing through its view does not wake it. */
export function asleep(b: Buddy): boolean {
  return b.state === 'sleep' || b.state === 'toBed';
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

// At night it trots to the edge of its view, pulls a little basket in, puts its nightcap on and curls up there.
export function startBedtime(b: Buddy): void {
  const { basket } = b.world;
  if (!basket.staying) {
    const left = b.x + SPRITE_SIZE / 2 < b.world.width / 2;
    basket.bring(left ? 0 : b.maxX, left ? -1 : 1);
  }
  b.rest.basketStep = basket.x === basket.home ? 'settle' : 'reach';
  b.rest.basketMs = 0;
  b.tryEnter('toBed', Infinity);
}

/** Woken in its basket: it stretches, leaves its nightcap in it and pushes it back out of the view. */
export function wakeUp(b: Buddy): void {
  if (b.state !== 'sleep') {
    return;
  }
  if (b.world.basket.staying) {
    b.rest.basketStep = 'reach';
    b.rest.basketMs = 0;
    b.enter('tidyBed', Infinity);
  } else {
    b.enter('stretch', b.ambientDuration('stretch'));
  }
}

/** Where it stands beside its basket, facing it. */
function besideBasket(b: Buddy): { at: number; facing: 1 | -1 } {
  const { home, outward } = b.world.basket;
  return { at: Math.min(b.maxX, Math.max(0, home - outward * BESIDE_BASKET)), facing: outward };
}

/** Whether `ms` was passed during the last `dtMs` of moving the basket. */
const reached = (b: Buddy, ms: number, dtMs: number): boolean => b.rest.basketMs >= ms && b.rest.basketMs - dtMs < ms;

function updateToBed(b: Buddy, dt: number, dtMs: number): void {
  const m = b.rest;
  const { basket } = b.world;
  // You came back before it got there.
  if (!m.sleepy) {
    b.enterNext(b.pickNext());
    return;
  }
  if (m.basketStep === 'reach') {
    const { at, facing } = besideBasket(b);
    if (!b.walkTo(at, facing, WALK_SPEED * dt)) {
      m.basketStep = 'move';
      m.basketMs = 0;
    }
  } else if (m.basketStep === 'move') {
    // Two tugs: half way in, then to its place.
    m.basketMs += dtMs;
    TUGS_AT.forEach((ms, i) => reached(b, ms, dtMs) && basket.slide((i + 1) / TUGS_AT.length));
    if (m.basketMs >= TUG_MS) {
      m.basketStep = 'settle';
    }
  } else if (!b.walkTo(basket.home, -basket.outward as 1 | -1, WALK_SPEED * dt)) {
    basket.cap = false;
    b.enter('sleep', Infinity);
  }
}

function updateTidyBed(b: Buddy, dt: number, dtMs: number): void {
  const m = b.rest;
  const { basket } = b.world;
  if (b.elapsed < STRETCH_MS) {
    return;
  }
  // The nightcap stays behind, on the cushion.
  basket.cap = basket.active;
  if (m.basketStep === 'reach') {
    const { at, facing } = besideBasket(b);
    if (!b.walkTo(at, facing, WALK_SPEED * dt)) {
      m.basketStep = 'move';
      m.basketMs = 0;
    }
    return;
  }
  // Two shoves: half way out, then out of the view for good.
  m.basketMs += dtMs;
  if (reached(b, SHOVES_AT[0], dtMs)) {
    basket.slide(0.5);
  }
  if (reached(b, SHOVES_AT[1], dtMs)) {
    basket.leave();
  }
  if (m.basketMs >= SHOVE_MS) {
    b.enterNext(b.pickNext());
  }
}

// Sleep, the basket it sleeps in at night, and asking you to take a break.
export const restFeature = {
  states: {
    sleep: {
      priority: 1,
      restful: true,
      free: true,
      anim: (b) => ({ anim: sleepOf(b), elapsed: b.elapsed }),
      hat: (b) => (b.world.basket.staying ? 'nightcap' : 'none'),
    },
    toBed: {
      priority: 1,
      update: updateToBed,
      anim: (b) => (b.rest.basketStep === 'move' ? { anim: 'tug', elapsed: b.rest.basketMs } : { anim: 'walk', elapsed: b.elapsed }),
    },
    tidyBed: {
      priority: 1,
      next: [['sit', 50], ['idle', 30], ['walk', 20]],
      update: updateTidyBed,
      anim(b) {
        if (b.elapsed < STRETCH_MS) {
          return { anim: 'stretch', elapsed: b.elapsed };
        }
        return b.rest.basketStep === 'move' ? { anim: 'shove', elapsed: b.rest.basketMs } : { anim: 'walk', elapsed: b.elapsed };
      },
      // Its nightcap comes off with the stretch.
      hat: (b) => (b.elapsed < STRETCH_MS ? 'nightcap' : 'none'),
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
  // The basket only stays out while it goes to bed, sleeps and tidies up: drawn away from it, it lets it slide off.
  entered(b, state) {
    if (state !== 'toBed' && state !== 'sleep' && state !== 'tidyBed' && b.world.basket.staying) {
      b.world.basket.leave();
    }
  },
} satisfies Feature;
