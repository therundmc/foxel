import type { Buddy } from '../buddy';
import type { Plush } from '../props/plush';
import type { AnimRef } from '../state';
import { carryInMouth, mouthPoint } from './mouth';

/**
 * What it does with a toy once it has it, before it throws it: it shakes it, leaps with it and lands flat on its
 * belly, bounces it on its nose, or spins round with it. `slide` is how it lands when it has caught one in the air.
 */
export type Trick = 'shake' | 'frolic' | 'juggle' | 'spin' | 'slide';
const SHOWS: readonly Trick[] = ['shake', 'frolic', 'juggle', 'spin'];
/** Now and then it just throws. */
const NO_SHOW = 0.15;

const SHAKE_MS = 720;
/**
 * The leap: a crouch, then up and forward with the toy. It comes down flat on its belly and slides, fast at first
 * and slower and slower, lies there a moment pleased with itself, then gets up.
 */
const CROUCH_MS = 160;
const LEAP_MS = 460;
const LEAP_HEIGHT = 12;
const LEAP_SPEED = 48;
const SLIDE_MS = 460;
const SLIDE_SPEED = 80;
const LIE_MS = 400;
const PROUD_MS = 420;
/** Room it wants ahead of it for a leap and a slide. */
const RUN_UP = (LEAP_SPEED * LEAP_MS) / 1000 + (SLIDE_SPEED * SLIDE_MS) / 3000;
/** Bouncing it on its nose, standing still: how many times, how hard, how far off straight, how near its nose the toy has to come down. */
const BOUNCES = 3;
const BOUNCE_UP = 46;
const BOUNCE_MORE = 7;
const BOUNCE_DRIFT = 4;
const BOUNCE_NEAR = 7;
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
  m.last = trick === 'slide' ? m.last : trick;
  m.bounces = 0;
  m.boopMs = 0;
  if (trick === 'frolic' || trick === 'slide') {
    // Toward the side where there is room for it.
    const ahead = b.dir === 1 ? b.maxX - b.x : b.x;
    b.dir = ahead >= RUN_UP ? b.dir : b.flipped();
  } else if (trick === 'juggle') {
    toy.toss(0, BOUNCE_UP);
  }
}

// Flat on its belly and sliding to a stop, a moment lying there, then up on its feet.
function slide(b: Buddy, toy: Plush, t: number, dt: number): boolean {
  if (t < SLIDE_MS) {
    const left = 1 - t / SLIDE_MS;
    b.y = 0;
    b.x = Math.min(b.maxX, Math.max(0, b.x + b.dir * SLIDE_SPEED * left * left * dt));
  }
  carryInMouth(b, toy);
  return t >= SLIDE_MS + LIE_MS + PROUD_MS;
}

function juggle(b: Buddy, toy: Plush, dtMs: number): boolean {
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
      return slide(b, toy, inAir - LEAP_MS, dt);
    }
    case 'slide':
      return slide(b, toy, t, dt);
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
      return juggle(b, toy, dtMs);
  }
}

export function trickAnim(b: Buddy, t: number): AnimRef {
  const m = b.plush.trick;
  const sliding = (since: number): AnimRef => (since < SLIDE_MS + LIE_MS ? { anim: 'bellySlide', elapsed: since } : { anim: 'proud', elapsed: since });
  switch (m.now) {
    case 'shake':
      return { anim: 'toyShake', elapsed: t };
    case 'frolic':
      return t < CROUCH_MS ? { anim: 'pounce', elapsed: 0 } : t < CROUCH_MS + LEAP_MS ? { anim: 'leap', elapsed: t - CROUCH_MS } : sliding(t - CROUCH_MS - LEAP_MS);
    case 'slide':
      return sliding(t);
    case 'spin':
      return { anim: 'ready', elapsed: t };
    case 'juggle':
      return m.boopMs > 0 ? { anim: 'toyBoop', elapsed: 0 } : { anim: 'bubbleWatch', elapsed: b.elapsed };
  }
}
