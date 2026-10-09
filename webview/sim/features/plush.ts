import { ANIMATIONS } from '../../sprites/fox/animations';
import { SPRITE_SIZE, frameAt, totalDuration } from '../../sprites/frames';
import type { PlushKind } from '../../sprites/props';
import type { Buddy } from '../buddy';
import { clamp } from '../math';
import type { Plush } from '../props/plush';
import type { AnimRef, Feature } from '../state';
import { FETCH_FAR, FETCH_RUN_SPEED, FETCH_WALK_SPEED } from '../tuning';
import { tookBreak } from './rest';

/** Where its mouth is from the middle of its head, in a frame; what it carries hangs a little under it. */
const MOUTH = 5.5;
const HANGS = 1;
/** It shakes the toy for this long, more often than not, before it throws it. */
const SHAKE_MS = 720;
const SHAKES = 0.6;
/** The throw: when in the animation the toy leaves its mouth, how hard it goes up, how far to the side it can aim. */
const TOSS_MS = totalDuration(ANIMATIONS.toyToss);
const TOSS_AT = 180;
const TOSS_UP = 74;
const TOSS_UP_MORE = 14;
const TOSS_ASIDE = 30;
/** A toy coming down within its reach, it jumps and catches: how long the jump lasts, how high, and what is within reach. */
const LEAP_MS = 420;
const LEAP_HEIGHT = 9;
const LEAP_UNDER = 24;
const LEAP_NEAR = 7;
const CATCH_NEAR = 9;
/** Throws of its own that nobody caught before it settles down with the toy; catches of yours in a row that make it cheer. */
const MISSES = 2;
const CHEER_EVERY = 3;
const CHEER_MS = 900;
/** Settling down: how long it lies against its teddy; how many times it boops its duck, how long a boop lasts, how the duck hops off. */
const CUDDLE_MS = 4500;
const BOOPS = 3;
const BOOP_MS = 400;
const HOP_SPEED = 16;
const HOP_HEIGHT = 30;

/**
 * The game, step by step: it runs after the toy (`chase`), jumps for it if it can (`leap`), shakes it, throws it up
 * (`toss`) and watches it go (`gaze`). Catch it and it waits for your throw (`ready`), cheering now and then; let
 * it fall a couple of times and it settles down with it (`settle`).
 */
type Phase = 'chase' | 'leap' | 'shake' | 'toss' | 'gaze' | 'ready' | 'cheer' | 'settle';

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
}

const plush = (b: Buddy, kind: PlushKind): Plush => b.world.plushes[kind];

function phase(b: Buddy, to: Phase): void {
  b.plush.phase = to;
  b.plush.phaseMs = 0;
  b.plush.with = false;
}

function begin(b: Buddy, kind: PlushKind, at: Phase): void {
  const m = b.plush;
  m.toy = kind;
  m.inPlay = false;
  m.rally = 0;
  m.misses = 0;
  m.boops = 0;
  phase(b, at);
}

const playingWith = (b: Buddy, kind: PlushKind): boolean => b.state === 'plush' && b.plush.toy === kind;

/** What it carries hangs from its mouth, wherever its head is in the frame it shows. */
export function carryInMouth(b: Buddy, toy: Plush): void {
  const { anim, elapsed } = b.current();
  const [hx, hy] = frameAt(ANIMATIONS[anim], elapsed).head;
  toy.carry(b.x + b.offsetFor(hx + MOUTH), b.y + SPRITE_SIZE - (hy + MOUTH) - HANGS);
}

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
    if (m.rally % CHEER_EVERY === 0) {
      b.world.effects.push('confetti');
      phase(b, 'cheer');
      return;
    }
  } else if (!playingWith(b, kind)) {
    begin(b, kind, 'ready');
    b.tryEnter('plush', Infinity);
    return;
  }
  phase(b, 'ready');
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
  } else if (b.plush.phase !== 'cheer') {
    phase(b, 'chase');
  }
}

/** You put it back in the chest. */
export function stowPlush(b: Buddy, kind: PlushKind): void {
  plush(b, kind).state = 'none';
}

/** The soft toy lying nearest to it, if any. */
function lying(b: Buddy): Plush | undefined {
  return Object.values(b.world.plushes)
    .filter((toy) => toy.landed)
    .sort((one, other) => Math.abs(one.center - b.x) - Math.abs(other.center - b.x))[0];
}

/** Runs to where its nose is on the toy; true once it is there. */
function reach(b: Buddy, toy: Plush, dt: number): boolean {
  const target = b.noseTargetFor(toy.center);
  b.running = Math.abs(target - b.x) > FETCH_FAR;
  b.moving = b.approach(target, (b.running ? FETCH_RUN_SPEED : FETCH_WALK_SPEED) * dt);
  return !b.moving;
}

const mouthHeight = (b: Buddy): number => b.y + SPRITE_SIZE - (frameAt(ANIMATIONS.leap, 0).head[1] + MOUTH);

function updatePlush(b: Buddy, dt: number, dtMs: number): void {
  const m = b.plush;
  const toy = plush(b, m.toy);
  const passed = (ms: number): boolean => m.phaseMs >= ms && m.phaseMs - dtMs < ms;
  b.moving = false;
  m.phaseMs += dtMs;
  if (m.phase !== 'leap') {
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
      const there = reach(b, toy, dt);
      const near = Math.abs(b.noseTargetFor(toy.center) - b.x) <= LEAP_NEAR;
      if (!toy.landed) {
        if (near && toy.falling && toy.y < LEAP_UNDER && toy.y > mouthHeight(b) && b.y === 0) {
          phase(b, 'leap');
        }
      } else if (there) {
        if (m.misses >= MISSES) {
          phase(b, 'settle');
        } else {
          carryInMouth(b, toy);
          phase(b, b.world.random() < SHAKES ? 'shake' : 'toss');
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
        phase(b, toy.state === 'carried' ? 'shake' : 'chase');
      }
      break;
    }
    case 'shake':
      if (m.phaseMs >= SHAKE_MS) {
        phase(b, 'toss');
      }
      break;
    case 'toss':
      if (passed(TOSS_AT) && toy.state === 'carried') {
        // Up it goes, toward your pointer if it is around.
        const to = b.world.pointer;
        const aside = to ? clamp((to.x - toy.center) * 1.2, -TOSS_ASIDE, TOSS_ASIDE) : (b.world.random() - 0.5) * TOSS_ASIDE;
        toy.toss(aside, TOSS_UP + TOSS_UP_MORE * b.world.random());
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

// The game winds down: it lies against its teddy for a while, or boops its duck along a few times.
function settle(b: Buddy, toy: Plush, dt: number): void {
  const m = b.plush;
  if (toy.state === 'held') {
    phase(b, 'ready');
    m.misses = 0;
    return;
  }
  if (!toy.landed) {
    b.faceX(toy.center, 3);
    return;
  }
  if (!m.with) {
    m.with = reach(b, toy, dt);
    m.phaseMs = 0;
    return;
  }
  if (m.toy === 'teddy') {
    if (m.phaseMs >= CUDDLE_MS) {
      tookBreak(b);
      b.enterNext('lie');
    }
  } else if (m.phaseMs >= BOOP_MS) {
    if (++m.boops >= BOOPS) {
      tookBreak(b);
      b.enterNext('sit');
      return;
    }
    // A boop with its nose, and the duck hops off: it goes after it again.
    toy.toss((toy.center < b.world.width / 2 ? 1 : -1) * HOP_SPEED, HOP_HEIGHT);
    m.with = false;
  }
}

function plushAnim(b: Buddy): AnimRef {
  const m = b.plush;
  const going: AnimRef = { anim: b.moving ? (b.running ? 'run' : 'walk') : 'watch', elapsed: b.elapsed };
  switch (m.phase) {
    case 'ready':
      return { anim: 'ready', elapsed: b.elapsed };
    case 'cheer':
      return { anim: 'celebrate', elapsed: m.phaseMs };
    case 'leap':
      return { anim: 'leap', elapsed: m.phaseMs };
    case 'shake':
      return { anim: 'toyShake', elapsed: m.phaseMs };
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
  // Called away with the toy in its mouth: it drops it there.
  interrupted(b) {
    const toy = plush(b, b.plush.toy);
    if (b.state === 'plush' && toy.state === 'carried') {
      toy.toss(0, 0);
    }
  },
} satisfies Feature;
