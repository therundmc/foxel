import { NOSE_HEIGHT } from '../../sprites/fox/anchors';
import type { AnimName } from '../../sprites/fox/animations';
import type { Buddy } from '../buddy';
import { clamp } from '../math';
import type { Feature } from '../state';

type HuntPhase = 'spot' | 'stalk' | 'wiggle' | 'leap' | 'catch' | 'miss';

const HUNT_MAX_MS = 30_000;
const SPOT_MS = 900;
const STALK_MAX_MS = 8000;
const STALK_GAP = 14;
const STALK_SPEED = 4;
const WIGGLE_MS = 900;
const LEAP_MS = 600;
const CATCH_MS = 1800;
const MISS_MS = 2200;
const CATCH_CHANCE = 0.45;

const HUNT_ANIM: Record<HuntPhase, AnimName> = {
  spot: 'alert',
  stalk: 'stalk',
  wiggle: 'wiggle',
  leap: 'leap',
  catch: 'proud',
  miss: 'puzzled',
};

export class HuntMemory {
  phase: HuntPhase = 'spot';
  phaseMs = 0;
  willCatch = false;
  leapFrom = 0;
  leapTo = 0;
  leapHeight = 0;
}

export function startHunt(b: Buddy): void {
  b.world.bug.spawn(b.world.width, b.world.height, b.world.random);
  setPhase(b, 'spot');
  b.faceX(b.world.bug.centerX, 0);
  b.enter('hunt', HUNT_MAX_MS);
}

function updateHunt(b: Buddy, dtMs: number): void {
  b.hunt.phaseMs += dtMs;
  const bug = b.world.bug;
  const waiting = b.hunt.phase === 'spot' || b.hunt.phase === 'stalk' || b.hunt.phase === 'wiggle';
  if (waiting && !bug.active) {
    setPhase(b, 'miss');
    return;
  }
  switch (b.hunt.phase) {
    case 'spot':
      b.faceX(bug.centerX, 0);
      if (b.hunt.phaseMs >= SPOT_MS) {
        setPhase(b, 'stalk');
      }
      break;
    case 'stalk': {
      const target = clamp(b.noseTargetFor(bug.centerX) - b.dir * STALK_GAP, 0, b.maxX);
      const step = (STALK_SPEED * dtMs) / 1000;
      if (!b.approach(target, step) || b.hunt.phaseMs >= STALK_MAX_MS) {
        bug.freeze();
        setPhase(b, 'wiggle');
      }
      break;
    }
    case 'wiggle':
      b.faceX(bug.centerX, 0);
      if (b.hunt.phaseMs >= WIGGLE_MS) {
        startLeap(b);
      }
      break;
    case 'leap': {
      const p = Math.min(b.hunt.phaseMs / LEAP_MS, 1);
      b.x = b.hunt.leapFrom + (b.hunt.leapTo - b.hunt.leapFrom) * p;
      b.y = 4 * b.hunt.leapHeight * p * (1 - p);
      if (p >= 1) {
        b.y = 0;
        if (b.hunt.willCatch) {
          bug.caught();
          setPhase(b, 'catch');
        } else {
          setPhase(b, 'miss');
        }
      }
      break;
    }
    case 'catch':
    case 'miss':
      if (b.hunt.phaseMs >= (b.hunt.phase === 'catch' ? CATCH_MS : MISS_MS)) {
        b.enterNext(b.pickNext());
      }
      break;
  }
}

function startLeap(b: Buddy): void {
  b.hunt.willCatch = b.world.random() < CATCH_CHANCE;
  b.hunt.leapFrom = b.x;
  b.hunt.leapTo = b.noseTargetFor(b.world.bug.centerX);
  b.hunt.leapHeight = clamp(b.world.bug.centerY - NOSE_HEIGHT, 3, Math.max(3, b.maxY));
  if (!b.hunt.willCatch) {
    b.world.bug.flee(b.dir);
  }
  setPhase(b, 'leap');
}

function setPhase(b: Buddy, phase: HuntPhase): void {
  b.hunt.phase = phase;
  b.hunt.phaseMs = 0;
}

// A butterfly flutters in; it spots it, stalks it, wiggles and pounces.
export const huntFeature = {
  states: {
    hunt: {
      nightDamped: true,
      next: [['sit', 40], ['idle', 30], ['walk', 30]],
      begin: startHunt,
      update: (b, _dt, dtMs) => updateHunt(b, dtMs),
      anim: (b) => ({ anim: HUNT_ANIM[b.hunt.phase], elapsed: b.hunt.phaseMs }),
      finish(b) {
        b.world.bug.flee(b.dir);
        b.enterNext(b.pickNext());
      },
      focus: (b) => (b.world.bug.active ? { x: b.world.bug.centerX, y: b.world.bug.centerY } : undefined),
    },
  },
  interrupted(b) {
    if (b.state === 'hunt') {
      b.world.bug.flee(b.dir);
    }
  },
} satisfies Feature;
