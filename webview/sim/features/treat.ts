import { BEG_MOUTH_HEIGHT, BEG_MOUTH_X, TREAT_PAWS_X } from '../../sprites/fox/anchors';
import { ANIMATIONS, EAT_RESUME_MS } from '../../sprites/fox/animations';
import { SPRITE_SIZE, frameAt, totalDuration } from '../../sprites/frames';
import type { Buddy } from '../buddy';
import { urge, type Feature } from '../state';
import { FETCH_FAR, FETCH_RUN_SPEED, FETCH_WALK_SPEED } from '../tuning';

const SNACK_MAX_MS = 15_000;
const TAKE_RADIUS = 6;

export class SnackMemory {
  /** How far into the eat animation it is. */
  eatMs = 0;
}

export function giveTreat(b: Buddy, x: number): void {
  if (b.world.treat.active) {
    return;
  }
  b.world.treat.drop(x, b.world.width, b.world.height);
  if (!b.def.offscreen) {
    startSnack(b);
  }
}

export function grabTreat(b: Buddy, x: number, y: number): void {
  if (b.world.treat.state !== 'free') {
    return;
  }
  b.world.treat.hold(x, y, b.world.width, b.world.height);
  startBeg(b);
}

export function moveHeldTreat(b: Buddy, x: number, y: number): void {
  if (b.world.treat.state === 'held') {
    b.world.treat.place(x, y, b.world.width, b.world.height);
  }
}

export function releaseTreat(b: Buddy): void {
  b.world.treat.release();
}

function startBeg(b: Buddy): void {
  b.moving = false;
  b.tryEnter('beg', Infinity);
}

// Sits under the treat in your hand and takes it once it is held to its mouth.
function updateBeg(b: Buddy, dt: number): void {
  b.moving = false;
  b.fall(dt);
  const treat = b.world.treat;
  if (treat.state !== 'held') {
    startSnack(b);
    return;
  }
  const dir = treat.centerX >= b.x + SPRITE_SIZE / 2 ? 1 : -1;
  const target = treat.centerX - b.offsetFor(BEG_MOUTH_X, dir);
  b.running = Math.abs(target - b.x) > FETCH_FAR;
  if (b.walkTo(target, dir, (b.running ? FETCH_RUN_SPEED : FETCH_WALK_SPEED) * dt)) {
    b.moving = true;
    return;
  }
  const mouthX = b.x + b.offsetFor(BEG_MOUTH_X);
  if (Math.hypot(treat.centerX - mouthX, treat.centerY - BEG_MOUTH_HEIGHT) <= TAKE_RADIUS) {
    startEating(b);
  }
}

function startSnack(b: Buddy): void {
  b.moving = false;
  b.tryEnter('snack', SNACK_MAX_MS);
}

function updateSnack(b: Buddy, dt: number): void {
  b.moving = false;
  b.fall(dt);
  const treat = b.world.treat;
  if (treat.state === 'eating') {
    b.snack.eatMs += dt * 1000;
    if (b.snack.eatMs >= totalDuration(ANIMATIONS.eat)) {
      treat.state = 'none';
      b.enter('lie', b.ambientDuration('lie'));
    }
    return;
  }
  if (treat.state === 'held') {
    startBeg(b);
    return;
  }
  if (treat.state !== 'free') {
    b.enterNext('sit');
    return;
  }
  const dir = eatingSide(b);
  if (b.walkTo(treat.centerX - b.offsetFor(TREAT_PAWS_X, dir), dir, FETCH_RUN_SPEED * dt)) {
    b.moving = true;
    return;
  }
  if (treat.landed) {
    startEating(b);
  }
}

// From here the eat frames draw the treat, so it snaps just past the nose.
function startEating(b: Buddy): void {
  const treat = b.world.treat;
  treat.state = 'eating';
  treat.place(b.x + b.offsetFor(TREAT_PAWS_X), 0, b.world.width, b.world.height);
  treat.vy = 0;
  b.snack.eatMs = EAT_RESUME_MS[treat.stage] ?? 0;
  b.enter('snack', totalDuration(ANIMATIONS.eat) + 1000);
}

// Eats facing the treat, unless that would put the treat past the edge of the view.
function eatingSide(b: Buddy): 1 | -1 {
  const centerX = b.world.treat.centerX;
  const towards = centerX >= b.x + SPRITE_SIZE / 2 ? 1 : -1;
  const fits = (dir: 1 | -1): boolean => {
    const x = centerX - b.offsetFor(TREAT_PAWS_X, dir);
    return x >= 0 && x <= b.maxX;
  };
  return fits(towards) || !fits(towards === 1 ? -1 : 1) ? towards : towards === 1 ? -1 : 1;
}

// Interrupted mid-meal: leave what is left on the ground, ready to be finished later.
function putTreatDown(b: Buddy): void {
  const left = frameAt(ANIMATIONS.eat, b.snack.eatMs).treat;
  if (left === undefined) {
    b.world.treat.state = 'none';
    return;
  }
  b.world.treat.state = 'free';
  b.world.treat.stage = left;
  b.world.treat.facing = b.dir;
}

// The bone: begging for it while you hold it, then eating it bite by bite.
export const treatFeature = {
  states: {
    beg: {
      priority: 3,
      gazes: true,
      update: updateBeg,
      anim(b) {
        if (b.moving) {
          return { anim: b.running ? 'run' : 'walk', elapsed: b.elapsed };
        }
        return { anim: 'beg', elapsed: b.elapsed };
      },
    },
    snack: {
      priority: 3,
      update: updateSnack,
      anim(b) {
        if (b.world.treat.state === 'eating') {
          return { anim: 'eat', elapsed: b.snack.eatMs };
        }
        return { anim: b.moving ? 'run' : 'ready', elapsed: b.elapsed };
      },
    },
  },
  urges: [urge((b) => b.world.treat.state === 'held', startBeg), urge((b) => b.world.treat.landed, startSnack)],
  entered(b, state) {
    if (state !== 'snack' && b.world.treat.state === 'eating') {
      putTreatDown(b);
    }
  },
} satisfies Feature;
