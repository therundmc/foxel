import type { Reaction } from '../../../shared/protocol';
import { ANIMATIONS } from '../../sprites/fox/animations';
import { SPRITE_SIZE, totalDuration } from '../../sprites/frames';
import type { Buddy } from '../buddy';
import { urge, type AnimRef, type Feature } from '../state';
import { has } from '../unlocks';

/** How long it sulks over something it had to put up with, and how long it holds out when you come back after weeks. */
const SULK_MS = 40_000;
const GRUDGE_MS = 7000;
const MAKE_UP_MS = totalDuration(ANIMATIONS.makeUp);
/** A day this bad and it sulks without being given a reason; it is over it once its mood is back above the second. */
export const LOW = -0.4;
const OVER_IT = -0.15;
/** Days away after which it is beside itself to see you, and after which it needs a moment to forgive you. */
const MISSED_YOU = 2;
const TOO_LONG = 14;
/** Beside itself: how long it bounces about, how high, how fast, before it settles into hearts. */
const OVERJOYED_MS = 4200;
const BOUNCING = 0.6;
const BOUNCE_MS = 360;
const BOUNCE_HEIGHT = 7;
/** Out of sorts, it keeps away from your pointer: when it comes this near, it walks this far off, slowly, and sits with its back to it for a while. */
const SHUN_NEAR = 30;
const SHUN_STEP = 28;
const SHUN_SPEED = 8;
const SHUN_SIT_MS = 5000;
const SHUN_REST_MS = 7000;
/** What it may have left about while you were away: how likely each thing is. */
const BALL_LEFT = 0.7;
const TOY_LEFT = 0.6;

export class BondMemory {
  /** It had to put up with something and has not sulked over it yet. */
  slighted = false;
  /** It has sulked and nobody has made it up to it yet; and somebody just did, while it was busy. */
  sulky = false;
  soothed = false;
  /** It has already sulked over today's low mood. */
  sulkedLow = false;
  /** This sulk ends by itself, with it coming round. */
  forgives = false;
  /** Keeping away from your pointer: where it is walking off to, and how long since it last did. */
  shunTo = 0;
  sinceShunMs = SHUN_REST_MS;
  /** You are back after this many days: the welcome it has not given yet. */
  awayDays: number | undefined;
  /** What happened in your work while its view was out of sight, not played yet. */
  missed: Reaction | undefined;
}

const you = (b: Buddy): number => b.world.pointer?.x ?? b.world.width / 2;
const facing = (b: Buddy, x: number): 1 | -1 => (x >= b.x + SPRITE_SIZE / 2 ? 1 : -1);

/** A meal time went by unfed, or a break it asked for was ignored: it will sulk over it once it has a quiet moment. */
export function slighted(b: Buddy): void {
  b.bond.slighted = true;
}

/** You looked after it. Sulking, it melts; if it had sulked, it comes and makes up once it is free. */
export function cared(b: Buddy): void {
  if (b.state === 'sulk' || b.state === 'shun') {
    makeUp(b);
  } else if (b.bond.sulky) {
    b.bond.soothed = true;
  }
}

/** A stroke or a pat on a sulking fox: that is all it was waiting for. Returns whether it was sulking. */
export function soothe(b: Buddy): boolean {
  if (b.state !== 'sulk' && b.state !== 'shun') {
    return false;
  }
  b.world.effects.push('petted');
  makeUp(b);
  return true;
}

/** You are back after this many days away. */
export function welcomeBack(b: Buddy, days: number): void {
  b.bond.awayDays = days;
}

/** Something happened in your work while its view was out of sight. */
export function missedWhileAway(b: Buddy, reaction: Reaction): void {
  b.bond.missed = reaction;
}

/** What it missed, handed over to be played, once. */
export function takeMissed(b: Buddy): Reaction | undefined {
  const reaction = b.bond.missed;
  b.bond.missed = undefined;
  return reaction;
}

// Its back to you, wherever you are.
function sulk(b: Buddy, ms: number, forgives: boolean): void {
  const m = b.bond;
  m.slighted = false;
  m.sulky = true;
  m.forgives = forgives;
  b.dir = facing(b, you(b)) === 1 ? -1 : 1;
  b.tryEnter('sulk', ms);
}

function makeUp(b: Buddy): void {
  const m = b.bond;
  m.sulky = false;
  m.soothed = false;
  m.slighted = false;
  m.forgives = false;
  b.dir = facing(b, you(b));
  b.enter('makeUp', MAKE_UP_MS);
}

// It lived without you: its ball rolled off somewhere, a soft toy was left lying.
function leaveTraces(b: Buddy): void {
  const { ball, plushes, width, height, random } = b.world;
  if (ball.state === 'none' && random() < BALL_LEFT) {
    ball.place(width * (0.15 + 0.6 * random()), 0, width, height);
    ball.launch(0, 0);
  }
  const toy = random() < 0.5 ? plushes.teddy : plushes.duck;
  if (toy.state === 'none' && random() < TOY_LEFT) {
    toy.rest(width * (0.1 + 0.6 * random()), width);
  }
}

/**
 * The welcome your absence calls for, given once: beside itself after a few days, a moment of sulking after weeks.
 * Returns false when its usual hello will do (you were only gone for the night).
 */
export function welcome(b: Buddy): boolean {
  const days = b.bond.awayDays;
  b.bond.awayDays = undefined;
  if (days === undefined) {
    return false;
  }
  leaveTraces(b);
  if (days >= TOO_LONG) {
    sulk(b, GRUDGE_MS, true);
    b.enter('sulk', GRUDGE_MS);
  } else if (days >= MISSED_YOU && has(b.world, 'overjoyed')) {
    b.dir = facing(b, you(b));
    b.enter('overjoyed', OVERJOYED_MS);
  } else {
    return false;
  }
  return true;
}

// Your pointer has come too near for the mood it is in.
function crowded(b: Buddy): boolean {
  const p = b.world.shunned;
  return p !== undefined && b.bond.sinceShunMs >= SHUN_REST_MS && Math.abs(p.x - (b.x + SPRITE_SIZE / 2)) <= SHUN_NEAR && p.y <= SPRITE_SIZE + 8;
}

function shun(b: Buddy): void {
  const p = b.world.shunned;
  const away = facing(b, p?.x ?? b.world.width / 2) === 1 ? -1 : 1;
  // Away from it, or past it if the wall is in the way.
  const room = away === 1 ? b.maxX - b.x : b.x;
  b.dir = room >= SHUN_STEP ? away : (-away as 1 | -1);
  b.bond.shunTo = Math.min(b.maxX, Math.max(0, b.x + b.dir * SHUN_STEP));
  b.bond.sinceShunMs = 0;
  b.tryEnter('shun', Infinity);
}

function updateShun(b: Buddy, dt: number): boolean {
  b.fall(dt);
  const left = (b.bond.shunTo - b.x) * b.dir;
  b.moving = left > SHUN_SPEED * dt;
  if (b.moving) {
    b.x += b.dir * SHUN_SPEED * dt;
    b.elapsed = 0;
  } else if (b.elapsed >= SHUN_SIT_MS) {
    b.enterNext('mope');
  }
  return true;
}

function overjoyedAnim(b: Buddy): AnimRef {
  return { anim: b.elapsed < OVERJOYED_MS * BOUNCING ? 'celebrate' : 'love', elapsed: b.elapsed };
}

// What its life with you does to it: it sulks when let down and melts when made up to, and greets you as your absence deserves.
export const bondFeature = {
  states: {
    sulk: {
      priority: 1,
      restful: true,
      finish(b) {
        if (b.bond.forgives) {
          makeUp(b);
        } else {
          b.enterNext('mope');
        }
      },
    },
    makeUp: { priority: 2, next: [['sit', 100]] },
    // It walks off, slowly, and sits down with its back to you.
    shun: {
      priority: 1,
      update: updateShun,
      anim: (b) => (b.moving ? { anim: 'walk', elapsed: b.elapsed } : { anim: 'sulk', elapsed: b.elapsed }),
    },
    mope: {
      duration: () => totalDuration(ANIMATIONS.sigh),
      next: [['lie', 60], ['sit', 40]],
      anim: (b) => ({ anim: 'sigh', elapsed: b.elapsed }),
    },
    overjoyed: {
      priority: 2,
      update(b) {
        // It bounces on the spot, then cannot bounce any more.
        const hopping = b.elapsed < OVERJOYED_MS * BOUNCING;
        b.y = hopping ? Math.min(BOUNCE_HEIGHT, b.maxY) * Math.abs(Math.sin((b.elapsed / BOUNCE_MS) * Math.PI)) : 0;
        return true;
      },
      anim: overjoyedAnim,
      next: [['sit', 100]],
    },
  },
  tick(b, dtMs) {
    b.bond.sinceShunMs += dtMs;
    if (b.world.mood > OVER_IT) {
      b.bond.sulkedLow = false;
    }
  },
  urges: [
    urge(
      (b) => b.bond.awayDays !== undefined,
      (b) => void welcome(b),
    ),
    urge((b) => b.bond.soothed, makeUp),
    urge(crowded, shun),
    urge(
      (b) => b.bond.slighted,
      (b) => sulk(b, SULK_MS, false),
    ),
    urge(
      (b) => !b.bond.sulkedLow && b.world.mood <= LOW,
      (b) => {
        b.bond.sulkedLow = true;
        sulk(b, SULK_MS, false);
      },
    ),
  ],
} satisfies Feature;
