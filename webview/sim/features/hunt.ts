import { NOSE_HEIGHT } from '../../sprites/fox/anchors';
import type { AnimName } from '../../sprites/fox/animations';
import type { Buddy } from '../buddy';
import { clamp } from '../math';
import type { Bird } from '../props/bird';
import type { Bug } from '../props/bug';
import type { Feature } from '../state';

type HuntPhase = 'spot' | 'stalk' | 'wiggle' | 'leap' | 'catch' | 'miss';
/** What it goes after: a butterfly, which it sometimes gets, or a bird on the ground, which it never does. */
export type Prey = 'bug' | 'bird';

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
  prey: Prey = 'bug';
  phase: HuntPhase = 'spot';
  phaseMs = 0;
  willCatch = false;
  leapFrom = 0;
  leapTo = 0;
  leapHeight = 0;
}

const preyOf = (b: Buddy): Bug | Bird => b.world[b.hunt.prey];

/** Goes after the butterfly that is around (one flutters in if there is none), or the bird on the ground. */
export function startHunt(b: Buddy, prey: Prey = 'bug'): void {
  const { bug, width, height, random } = b.world;
  if (prey === 'bug') {
    if (bug.around) {
      bug.linger();
    } else {
      bug.spawn(width, height, random);
    }
  } else {
    // The bird goes on pecking, none the wiser, until it pounces.
    b.world.bird.freeze();
  }
  b.hunt.prey = prey;
  setPhase(b, 'spot');
  b.faceX(preyOf(b).centerX, 0);
  b.enter('hunt', HUNT_MAX_MS);
}

function updateHunt(b: Buddy, dtMs: number): void {
  b.hunt.phaseMs += dtMs;
  const prey = preyOf(b);
  const waiting = b.hunt.phase === 'spot' || b.hunt.phase === 'stalk' || b.hunt.phase === 'wiggle';
  if (waiting && !prey.around) {
    setPhase(b, 'miss');
    return;
  }
  switch (b.hunt.phase) {
    case 'spot':
      b.faceX(prey.centerX, 0);
      if (b.hunt.phaseMs >= SPOT_MS) {
        setPhase(b, 'stalk');
      }
      break;
    case 'stalk': {
      const target = clamp(b.noseTargetFor(prey.centerX) - b.dir * STALK_GAP, 0, b.maxX);
      const step = (STALK_SPEED * dtMs) / 1000;
      if (!b.approach(target, step) || b.hunt.phaseMs >= STALK_MAX_MS) {
        prey.freeze();
        setPhase(b, 'wiggle');
      }
      break;
    }
    case 'wiggle':
      b.faceX(prey.centerX, 0);
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
          prey.caught();
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
  const prey = preyOf(b);
  b.hunt.willCatch = b.hunt.prey === 'bug' && b.world.random() < CATCH_CHANCE;
  b.hunt.leapFrom = b.x;
  b.hunt.leapTo = b.noseTargetFor(prey.centerX);
  b.hunt.leapHeight = clamp(prey.centerY - NOSE_HEIGHT, 3, Math.max(3, b.maxY));
  if (!b.hunt.willCatch) {
    prey.flee(b.dir);
  }
  setPhase(b, 'leap');
}

function setPhase(b: Buddy, phase: HuntPhase): void {
  b.hunt.phase = phase;
  b.hunt.phaseMs = 0;
}

// A butterfly flutters by or a bird lands: it spots it, stalks it, wiggles and pounces.
export const huntFeature = {
  states: {
    hunt: {
      nightDamped: true,
      next: [['sit', 40], ['idle', 30], ['walk', 30]],
      begin: startHunt,
      update: (b, _dt, dtMs) => updateHunt(b, dtMs),
      anim: (b) => ({ anim: HUNT_ANIM[b.hunt.phase], elapsed: b.hunt.phaseMs }),
      finish(b) {
        preyOf(b).flee(b.dir);
        b.enterNext(b.pickNext());
      },
      focus(b) {
        const prey = preyOf(b);
        return prey.active ? { x: prey.centerX, y: prey.centerY } : undefined;
      },
    },
  },
  interrupted(b) {
    if (b.state === 'hunt') {
      preyOf(b).flee(b.dir);
    }
  },
} satisfies Feature;
