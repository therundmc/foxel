import type { AnimName } from '../../sprites/fox/animations';
import { ANIMATIONS } from '../../sprites/fox/animations';
import { SPRITE_SIZE, totalDuration } from '../../sprites/frames';
import type { Buddy } from '../buddy';
import { clamp } from '../math';
import type { Feature } from '../state';
import { REACTION_MS } from './reactions';
import { befriendMouse } from './visitors';

type MousingPhase = 'spot' | 'sneak' | 'lurk' | 'wiggle' | 'leap' | 'friend' | 'miss';

const MOUSING_MAX_MS = 45_000;
/** Narrower than this, there is no room for the grass, the fox and a mouse at a safe distance. */
const MIN_WIDTH = 96;
const GRASS_NEAR = 22;
const GRASS_SPREAD = 14;
const SPOT_MS = 700;
const SNEAK_SPEED = 6;
/** How far ahead of its nose the mouse stops. */
const MOUSE_GAP = 18;
const LURK_MS = 1300;
const WIGGLE_MS = 800;
const LEAP_MS = 650;
const LEAP_HEIGHT = 14;
const CATCH_CHANCE = 0.45;
const FRIEND_MS = totalDuration(ANIMATIONS.mouseFriend) * 2;
const DIVE_MS = totalDuration(ANIMATIONS.dive);
const MISS_MS = DIVE_MS + 2100;

const PHASE_ANIM: Record<Exclude<MousingPhase, 'miss'>, AnimName> = {
  spot: 'alert',
  sneak: 'stalk',
  lurk: 'lurk',
  wiggle: 'wiggle',
  leap: 'leap',
  friend: 'mouseFriend',
};

export class MousingMemory {
  phase: MousingPhase = 'spot';
  phaseMs = 0;
  /** How long the mouse has been sitting there, unaware. */
  watchedMs = 0;
  willCatch = false;
  leapFrom = 0;
  leapTo = 0;
  leapHeight = 0;
}

function setPhase(b: Buddy, phase: MousingPhase): void {
  b.mousing.phase = phase;
  b.mousing.phaseMs = 0;
}

/** Tall grass comes up nearby: it slips in, lies in wait for a mouse and pounces on it like a cat. */
export function startMousing(b: Buddy): void {
  const { grass, width, random } = b.world;
  const center = b.x + SPRITE_SIZE / 2;
  const side = center < width / 2 ? 1 : -1;
  grass.sprout(center + side * (GRASS_NEAR + random() * GRASS_SPREAD), width);
  setPhase(b, 'spot');
  b.faceX(grass.centerX, 0);
  b.enter('mousing', MOUSING_MAX_MS);
}

function updateMousing(b: Buddy, dt: number, dtMs: number): void {
  const m = b.mousing;
  const { grass, mouse, width } = b.world;
  m.phaseMs += dtMs;
  switch (m.phase) {
    case 'spot':
      if (m.phaseMs >= SPOT_MS) {
        setPhase(b, 'sneak');
      }
      break;
    case 'sneak': {
      const hide = clamp(grass.centerX - SPRITE_SIZE / 2, 0, b.maxX);
      if (!b.approach(hide, SNEAK_SPEED * dt)) {
        // It watches the side with more room: that is where the mouse comes from.
        b.dir = b.x + SPRITE_SIZE / 2 < width / 2 ? 1 : -1;
        const ahead = b.x + b.noseOffset() + b.dir * MOUSE_GAP;
        mouse.enter(b.dir === -1, b.dir === 1 ? ahead : ahead - mouse.box.w, width);
        m.watchedMs = 0;
        setPhase(b, 'lurk');
      }
      break;
    }
    case 'lurk':
      if (mouse.sitting) {
        m.watchedMs += dtMs;
      }
      if (m.watchedMs >= LURK_MS) {
        setPhase(b, 'wiggle');
      }
      break;
    case 'wiggle':
      if (m.phaseMs >= WIGGLE_MS) {
        startLeap(b);
      }
      break;
    case 'leap': {
      const p = Math.min(m.phaseMs / LEAP_MS, 1);
      b.x = m.leapFrom + (m.leapTo - m.leapFrom) * p;
      b.y = 4 * m.leapHeight * p * (1 - p);
      if (p >= 1) {
        b.y = 0;
        if (m.willCatch) {
          mouse.caught();
        }
        if (m.willCatch) {
          befriendMouse(b);
        }
        setPhase(b, m.willCatch ? 'friend' : 'miss');
      }
      break;
    }
    case 'friend':
      // The mouse hops off its head and goes on its way; it waves goodbye.
      if (m.phaseMs >= FRIEND_MS) {
        mouse.appear(b.x + b.noseOffset(), b.dir);
        b.enter('wave', REACTION_MS.wave);
      }
      break;
    case 'miss':
      if (m.phaseMs >= MISS_MS) {
        b.enterNext(b.pickNext());
      }
      break;
  }
}

// The mouse is always quicker: either it is gone before the fox lands, or it ends up on the fox's head.
function startLeap(b: Buddy): void {
  const m = b.mousing;
  const { grass, mouse, random } = b.world;
  m.willCatch = random() < CATCH_CHANCE;
  m.leapFrom = b.x;
  m.leapTo = b.noseTargetFor(mouse.centerX);
  m.leapHeight = Math.min(LEAP_HEIGHT, Math.max(3, b.maxY));
  if (!m.willCatch) {
    mouse.flee(b.dir);
  }
  grass.wilt();
  setPhase(b, 'leap');
}

export const mousingFeature = {
  states: {
    mousing: {
      nightDamped: true,
      gazes: true,
      next: [['sit', 40], ['idle', 30], ['walk', 30]],
      available: (b) => b.world.width >= MIN_WIDTH && !b.world.grass.active,
      begin: startMousing,
      update: updateMousing,
      anim(b) {
        const { phase, phaseMs } = b.mousing;
        if (phase !== 'miss') {
          return { anim: PHASE_ANIM[phase], elapsed: phaseMs };
        }
        return phaseMs < DIVE_MS ? { anim: 'dive', elapsed: phaseMs } : { anim: 'puzzled', elapsed: phaseMs - DIVE_MS };
      },
      focus: (b) => (b.world.mouse.active ? { x: b.world.mouse.centerX, y: 2 } : undefined),
    },
  },
  // Whatever cuts the hunt short, the grass goes back down and the mouse makes off.
  entered(b, state) {
    if (state !== 'mousing') {
      b.world.grass.wilt();
      b.world.mouse.flee(b.dir);
    }
  },
} satisfies Feature;
