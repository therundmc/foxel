import { ANIMATIONS } from '../../sprites/fox/animations';
import { SPRITE_SIZE, frameAt, totalDuration } from '../../sprites/frames';
import type { PlushKind } from '../../sprites/props';
import type { Buddy } from '../buddy';
import type { Plush } from '../props/plush';
import type { AnimRef, Feature } from '../state';
import { carryInMouth, noseTo } from './mouth';
import { tookBreak } from './rest';
import { SHUNS_UNDER } from '../tuning';
import { has } from '../unlocks';
import { wantBack } from './rummage';
import { bonk } from './bonk';
import { settle } from './plushSettle';
import { TrickMemory, pickTrick, startTrick, trickAnim, updateTrick } from './toyTricks';

/** The throw: when in the animation the toy leaves its mouth, how hard it goes up, how far to the side it can aim. */
const TOSS_MS = totalDuration(ANIMATIONS.toyToss);
const TOSS_AT = 180;
/** No two throws alike: it goes up this hard at least and this much more at most, and this far to the side at most. */
const TOSS_UP = 62;
const TOSS_UP_MORE = 34;
const TOSS_ASIDE = 6;
const TOSS_ASIDE_MORE = 42;
const HALF_HEARTED = 0.75;
/** How far under the middle of its head its mouth is. */
const MOUTH_UNDER_HEAD = 5.5;
/** A toy coming down within its reach, it jumps and catches: how long the jump lasts, how high, and what is within reach. */
const LEAP_MS = 420;
const LEAP_HEIGHT = 9;
const LEAP_UNDER = 24;
const LEAP_NEAR = 7;
const CATCH_NEAR = 9;
/** How long it sees stars after a toy has landed on its head. */
const DAZED_MS = 1400;
/** Throws of its own that nobody caught before it settles down with the toy; catches of yours in a row that make it cheer. */
const MISSES = 2;
const CHEER_EVERY = 3;
const CHEER_MS = 900;
/**
 * The game, step by step: it runs after the toy (`chase`), jumps for it if it can (`leap`), shows off with it (`trick`), throws it up
 * (`toss`) and watches it go (`gaze`). Catch it and it waits for your throw (`ready`), cheering now and then; let
 * it fall a couple of times and it settles down with it (`settle`). A toy that lands on its head leaves it seeing
 * stars for a moment (`dazed`). One that lies right under it, where its nose cannot go, it pulls out with a paw (`paw`).
 */
type Phase = 'chase' | 'paw' | 'leap' | 'trick' | 'toss' | 'gaze' | 'ready' | 'cheer' | 'settle' | 'dazed';

export class PlushMemory {
  /** The soft toy it is busy with. */
  toy: PlushKind = 'teddy';
  phase: Phase = 'chase';
  phaseMs = 0;
  /** Thrown by it and not yet down: taken now, it is a catch. */
  inPlay = false;
  /** Your catches in a row, and its throws that fell since the last of them. */
  rally = 0;
  misses = 0;
  /** Settling down: it has got to the toy, and how many times it has booped it. */
  with = false;
  boops = 0;
  readonly trick = new TrickMemory();
}

const plush = (b: Buddy, kind: PlushKind): Plush => b.world.plushes[kind];

export function phase(b: Buddy, to: Phase): void {
  b.plush.phase = to;
  b.plush.phaseMs = 0;
  b.plush.with = false;
}

export function begin(b: Buddy, kind: PlushKind, at: Phase): void {
  const m = b.plush;
  // One toy at a time: the other one, if it had it in its mouth, it drops.
  Object.values(b.world.plushes).forEach((other) => other.kind !== kind && other.state === 'carried' && other.toss(0, 0));
  m.toy = kind;
  m.inPlay = false;
  m.rally = 0;
  m.misses = 0;
  m.boops = 0;
  phase(b, at);
}

export const playingWith = (b: Buddy, kind: PlushKind): boolean => b.state === 'plush' && b.plush.toy === kind;

/** A soft toy is in your hand, at this point: out of the chest, picked up from where it lay, or caught as it flew. */
export function holdPlush(b: Buddy, kind: PlushKind, x: number, y: number): void {
  const toy = plush(b, kind);
  const m = b.plush;
  const taken = toy.state !== 'held' && toy.state !== 'carried';
  if (toy.state === 'carried') {
    return;
  }
  const caught = taken && playingWith(b, kind) && m.inPlay && !toy.landed;
  toy.hold(x, y, b.world.width, b.world.height);
  if (!taken) {
    return;
  }
  if (caught) {
    // You caught its throw: the game goes on, and every few catches it cheers.
    m.inPlay = false;
    m.misses = 0;
    m.rally++;
    tookBreak(b);
    if (m.rally % CHEER_EVERY === 0 && has(b.world, 'cheers')) {
      b.world.effects.push('confetti');
      phase(b, 'cheer');
      return;
    }
  } else if (!playingWith(b, kind)) {
    begin(b, kind, 'ready');
    b.tryEnter('plush', Infinity);
    return;
  }
  if (m.phase !== 'dazed') {
    phase(b, 'ready');
  }
}

/** You let go of it, your hand moving at this speed: it is off after it. */
export function tossPlush(b: Buddy, kind: PlushKind, vx: number, vy: number): void {
  const toy = plush(b, kind);
  if (toy.state !== 'held') {
    return;
  }
  toy.toss(vx, vy);
  if (!playingWith(b, kind)) {
    begin(b, kind, 'chase');
    b.tryEnter('plush', Infinity);
  } else if (b.plush.phase !== 'cheer' && b.plush.phase !== 'dazed') {
    phase(b, 'chase');
  }
}

/** You put it back in the chest. In a playful mood, it will go and get it out again. */
export function stowPlush(b: Buddy, kind: PlushKind): void {
  plush(b, kind).state = 'none';
  wantBack(b, kind);
}

/** It has the toy in its mouth and wants a game: it throws it up for you. */
export function startTossing(b: Buddy, kind: PlushKind): void {
  begin(b, kind, 'toss');
  b.enter('plush', Infinity);
}

/** The soft toy lying nearest to it, if any. */
function lying(b: Buddy): Plush | undefined {
  return Object.values(b.world.plushes)
    .filter((toy) => toy.landed)
    .sort((one, other) => Math.abs(one.center - b.x) - Math.abs(other.center - b.x))[0];
}

/** The paw that pulls out a toy lying under it: how long it takes, when the toy goes, and how it hops out ahead of it. */
const PAW_MS = totalDuration(ANIMATIONS.toyPaw);
const PAW_AT = 270;
const PAW_OUT = 26;
const PAW_UP = 16;

// It has the toy: a trick first, most of the time, then the throw.
function showOff(b: Buddy, toy: Plush, landing: boolean): void {
  const trick = landing ? 'slide' : pickTrick(b);
  phase(b, trick ? 'trick' : 'toss');
  if (trick) {
    b.startDir = b.dir;
    startTrick(b, toy, trick);
  }
}

const mouthHeight = (b: Buddy): number => b.y + SPRITE_SIZE - (frameAt(ANIMATIONS.leap, 0).head[1] + MOUTH_UNDER_HEAD);

function updatePlush(b: Buddy, dt: number, dtMs: number): void {
  const m = b.plush;
  const toy = plush(b, m.toy);
  const passed = (ms: number): boolean => m.phaseMs >= ms && m.phaseMs - dtMs < ms;
  b.moving = false;
  m.phaseMs += dtMs;
  if (m.phase !== 'leap' && m.phase !== 'trick') {
    b.fall(dt);
  }
  if (toy.state === 'none') {
    // Back in the chest: the game is over.
    b.enterNext('sit');
    return;
  }
  if (toy.state === 'carried') {
    carryInMouth(b, toy);
  }
  switch (m.phase) {
    case 'ready':
      b.faceX(toy.center, 3);
      if (toy.state !== 'held') {
        phase(b, 'chase');
      }
      break;
    case 'dazed':
      if (m.phaseMs >= DAZED_MS) {
        phase(b, toy.state === 'held' ? 'ready' : 'chase');
      }
      break;
    case 'cheer':
      if (m.phaseMs >= CHEER_MS) {
        phase(b, toy.state === 'held' ? 'ready' : 'chase');
      }
      break;
    case 'chase': {
      if (toy.state === 'held') {
        phase(b, 'ready');
        break;
      }
      const at = noseTo(b, toy.center, dt);
      const near = Math.abs(toy.center - (b.x + b.noseOffset())) <= LEAP_NEAR;
      if (!toy.landed) {
        if (has(b.world, 'catches') && near && toy.falling && toy.y < LEAP_UNDER && toy.y > mouthHeight(b) && b.y === 0) {
          phase(b, 'leap');
        }
      } else if (at === 'under') {
        phase(b, 'paw');
      } else if (at === 'there') {
        if (m.misses >= MISSES) {
          phase(b, 'settle');
        } else {
          carryInMouth(b, toy);
          showOff(b, toy, false);
        }
      }
      break;
    }
    case 'leap': {
      const p = Math.min(1, m.phaseMs / LEAP_MS);
      b.y = 4 * Math.min(LEAP_HEIGHT, b.maxY) * p * (1 - p);
      const mouthX = b.x + b.mouthOffset();
      if (toy.state === 'free' && !toy.landed && Math.abs(toy.center - mouthX) < CATCH_NEAR && Math.abs(toy.y + toy.h / 2 - mouthHeight(b)) < CATCH_NEAR) {
        // Caught in the air.
        carryInMouth(b, toy);
      }
      if (p === 1) {
        b.y = 0;
        // Caught in the air: it comes down flat on its belly and slides.
        if (toy.state === 'carried') {
          showOff(b, toy, true);
        } else {
          phase(b, 'chase');
        }
      }
      break;
    }
    case 'paw':
      if (passed(PAW_AT) && toy.landed) {
        toy.toss(b.dir * PAW_OUT, PAW_UP);
      }
      if (m.phaseMs >= PAW_MS) {
        phase(b, 'chase');
      }
      break;
    case 'trick':
      if (updateTrick(b, toy, m.phaseMs, dt, dtMs)) {
        b.y = 0;
        phase(b, toy.state === 'carried' ? 'toss' : toy.state === 'held' ? 'ready' : 'chase');
      }
      break;
    case 'toss':
      if (passed(TOSS_AT) && toy.state === 'carried') {
        // Up it goes: how high and how far is never the same, but it is toward your pointer if it is around,
        // and never into the wall it stands against.
        const { pointer, random, width } = b.world;
        const walled = toy.center < width * 0.2 ? 1 : toy.center > width * 0.8 ? -1 : 0;
        const side = walled || (pointer ? (pointer.x >= toy.center ? 1 : -1) : random() < 0.5 ? -1 : 1);
        // Out of sorts, it throws without much heart.
        const heart = b.world.mood > SHUNS_UNDER ? 1 : HALF_HEARTED;
        toy.toss(side * (TOSS_ASIDE + TOSS_ASIDE_MORE * random()) * heart, (TOSS_UP + TOSS_UP_MORE * random()) * heart);
        m.inPlay = true;
      }
      if (m.phaseMs >= TOSS_MS) {
        phase(b, 'gaze');
      }
      break;
    case 'gaze':
      b.faceX(toy.center, 3);
      if (toy.landed) {
        // Nobody caught it.
        m.inPlay = false;
        m.rally = 0;
        m.misses++;
        phase(b, 'chase');
      }
      break;
    case 'settle':
      settle(b, toy, dt);
      break;
  }
}

function plushAnim(b: Buddy): AnimRef {
  const m = b.plush;
  const going: AnimRef = { anim: b.moving ? (b.running ? 'run' : 'walk') : 'watch', elapsed: b.elapsed };
  switch (m.phase) {
    case 'ready':
      // Its tail only wags for the throw when it is in the mood.
      return { anim: b.world.mood > SHUNS_UNDER ? 'ready' : 'watch', elapsed: b.elapsed };
    case 'cheer':
      return { anim: 'celebrate', elapsed: m.phaseMs };
    case 'dazed':
      return { anim: 'dizzy', elapsed: m.phaseMs };
    case 'leap':
      return { anim: 'leap', elapsed: m.phaseMs };
    case 'paw':
      return { anim: 'toyPaw', elapsed: m.phaseMs };
    case 'trick':
      return trickAnim(b, m.phaseMs);
    case 'toss':
      return { anim: 'toyToss', elapsed: m.phaseMs };
    case 'gaze':
      return { anim: 'bubbleWatch', elapsed: b.elapsed };
    case 'settle':
      return m.with ? { anim: m.toy === 'teddy' ? 'cuddle' : 'pounce', elapsed: m.phaseMs } : going;
    default:
      return going;
  }
}

// Its soft toys, and the game it plays with them: you throw, it catches or fetches, shakes, throws back up, you catch.
export const plushFeature = {
  states: {
    plush: {
      priority: 2,
      nightDamped: true,
      available: (b) => lying(b) !== undefined,
      begin(b) {
        const toy = lying(b);
        if (toy) {
          begin(b, toy.kind, 'chase');
          b.enter('plush', Infinity);
        } else {
          b.enter('sit', b.ambientDuration('sit'));
        }
      },
      update: updatePlush,
      anim: plushAnim,
    },
  },
  tick: bonk,
  // Called away with the toy in its mouth: it drops it there.
  interrupted(b) {
    const toy = plush(b, b.plush.toy);
    if (b.state === 'plush' && toy.state === 'carried') {
      toy.toss(0, 0);
    }
  },
} satisfies Feature;
