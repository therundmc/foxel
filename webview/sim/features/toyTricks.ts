import { SPRITE_SIZE } from '../../sprites/frames';
import type { Buddy } from '../buddy';
import type { Plush } from '../props/plush';
import type { AnimRef } from '../state';
import { carryInMouth, mouthPoint, noseTo } from './mouth';

/**
 * What it does with a toy once it has it, before it throws it: it shakes it, leaps with it and rolls as it lands,
 * bounces it on its nose, or spins round with it. `roll` is how it lands when it has caught one in the air.
 */
export type Trick = 'shake' | 'frolic' | 'juggle' | 'spin' | 'roll';
const SHOWS: readonly Trick[] = ['shake', 'frolic', 'juggle', 'spin'];
/** Now and then it just throws. */
const NO_SHOW = 0.15;

const SHAKE_MS = 720;
/** The leap: a crouch, then up and forward with the toy; the roll that follows, curled up; and getting up proud of itself. */
const CROUCH_MS = 160;
const LEAP_MS = 460;
const LEAP_HEIGHT = 12;
const LEAP_SPEED = 48;
const ROLL_MS = 400;
const ROLL_SPEED = 40;
const PROUD_MS = 520;
/** Room it wants ahead of it for a leap and a roll. */
const RUN_UP = (LEAP_SPEED * LEAP_MS + ROLL_SPEED * ROLL_MS) / 1000;
/** Bouncing it on its nose: how many times, how hard, how near its nose the toy has to come down, how fast it shuffles under it. */
const BOUNCES = 3;
const BOUNCE_UP = 46;
const BOUNCE_MORE = 7;
const BOUNCE_DRIFT = 5;
const BOUNCE_NEAR = 6;
const SHUFFLE = 20;
const BOOP_MS = 200;
/** Spinning round with it: so many half turns, each this long, on little hops. */
const HALF_TURNS = 6;
const HALF_TURN_MS = 110;
const SPIN_HOP = 2;

/** What it remembers of the trick it is at. */
export class TrickMemory {
  now: Trick = 'shake';
  last: Trick | undefined;
  bounces = 0;
  boopMs = 0;
}

/** What it feels like doing with the toy this time: not what it did last, and sometimes nothing. */
export function pickTrick(b: Buddy): Trick | undefined {
  if (b.world.random() < NO_SHOW) {
    return undefined;
  }
  const others = SHOWS.filter((trick) => trick !== b.plush.trick.last);
  return others[Math.floor(b.world.random() * others.length) % others.length];
}

export function startTrick(b: Buddy, toy: Plush, trick: Trick): void {
  const m = b.plush.trick;
  m.now = trick;
  m.last = trick === 'roll' ? m.last : trick;
  m.bounces = 0;
  m.boopMs = 0;
  if (trick === 'frolic' || trick === 'roll') {
    // Toward the side where there is room for it.
    const ahead = b.dir === 1 ? b.maxX - b.x : b.x;
    b.dir = ahead >= RUN_UP ? b.dir : b.flipped();
  } else if (trick === 'juggle') {
    toy.toss(0, BOUNCE_UP);
  }
}

// Curled up and turning over as it goes, then up on its feet.
function roll(b: Buddy, toy: Plush, t: number, dt: number): boolean {
  if (t < ROLL_MS) {
    b.y = 0;
    b.x = Math.min(b.maxX, Math.max(0, b.x + b.dir * ROLL_SPEED * dt));
    b.quarter = 1 + (Math.floor((t / ROLL_MS) * 4) % 4);
    // The toy is somewhere in the ball of fur.
    toy.carry(b.x + SPRITE_SIZE / 2, b.y + 9);
    return false;
  }
  b.quarter = 0;
  carryInMouth(b, toy);
  return t >= ROLL_MS + PROUD_MS;
}

function juggle(b: Buddy, toy: Plush, dt: number, dtMs: number): boolean {
  const m = b.plush.trick;
  m.boopMs = Math.max(0, m.boopMs - dtMs);
  if (toy.state !== 'free' || toy.landed) {
    // Taken from it, or dropped: that is the end of that.
    return true;
  }
  const nose = mouthPoint(b);
  const under = Math.abs(toy.center - nose.x) <= BOUNCE_NEAR;
  if (toy.falling && under && toy.y <= nose.y + 2) {
    if (++m.bounces > BOUNCES) {
      carryInMouth(b, toy);
      return true;
    }
    // Up again, a little higher, and never quite straight.
    toy.toss((b.world.random() - 0.5) * 2 * BOUNCE_DRIFT, BOUNCE_UP + BOUNCE_MORE * m.bounces);
    m.boopMs = BOOP_MS;
  } else if (!under) {
    noseTo(b, toy.center, dt, SHUFFLE);
  }
  return false;
}

/** Goes on with the trick; true once it is over, with the toy in its mouth again unless it lost it on the way. */
export function updateTrick(b: Buddy, toy: Plush, t: number, dt: number, dtMs: number): boolean {
  switch (b.plush.trick.now) {
    case 'shake':
      carryInMouth(b, toy);
      return t >= SHAKE_MS;
    case 'frolic': {
      const inAir = t - CROUCH_MS;
      if (inAir < 0) {
        carryInMouth(b, toy);
        return false;
      }
      if (inAir < LEAP_MS) {
        const p = inAir / LEAP_MS;
        b.y = 4 * Math.min(LEAP_HEIGHT, b.maxY) * p * (1 - p);
        b.x = Math.min(b.maxX, Math.max(0, b.x + b.dir * LEAP_SPEED * dt));
        carryInMouth(b, toy);
        return false;
      }
      return roll(b, toy, inAir - LEAP_MS, dt);
    }
    case 'roll':
      return roll(b, toy, t, dt);
    case 'spin': {
      const turns = Math.floor(t / HALF_TURN_MS);
      if (turns >= HALF_TURNS) {
        b.y = 0;
        b.dir = b.startDir;
        carryInMouth(b, toy);
        return true;
      }
      b.dir = turns % 2 === 0 ? b.startDir : (-b.startDir as 1 | -1);
      b.y = Math.min(SPIN_HOP, b.maxY) * Math.abs(Math.sin((t / HALF_TURN_MS) * Math.PI));
      carryInMouth(b, toy);
      return false;
    }
    case 'juggle':
      return juggle(b, toy, dt, dtMs);
  }
}

export function trickAnim(b: Buddy, t: number): AnimRef {
  const m = b.plush.trick;
  const rolling = (since: number): AnimRef => (since < ROLL_MS ? { anim: 'tumble', elapsed: since } : { anim: 'proud', elapsed: since });
  switch (m.now) {
    case 'shake':
      return { anim: 'toyShake', elapsed: t };
    case 'frolic':
      return t < CROUCH_MS ? { anim: 'pounce', elapsed: 0 } : t < CROUCH_MS + LEAP_MS ? { anim: 'leap', elapsed: t - CROUCH_MS } : rolling(t - CROUCH_MS - LEAP_MS);
    case 'roll':
      return rolling(t);
    case 'spin':
      return { anim: 'ready', elapsed: t };
    case 'juggle':
      return m.boopMs > 0 ? { anim: 'toyBoop', elapsed: 0 } : { anim: b.moving ? 'walk' : 'bubbleWatch', elapsed: b.elapsed };
  }
}
