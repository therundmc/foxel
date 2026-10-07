import { ANIMATIONS } from '../../sprites/fox/animations';
import { SPRITE_SIZE, totalDuration } from '../../sprites/frames';
import type { Buddy } from '../buddy';
import type { Feature } from '../state';
import { startHunt, type Prey } from './hunt';

/** How long between two butterflies, and how long one stays when nothing chases it. */
const BUTTERFLY_GAP_MS = [4 * 60_000, 9 * 60_000] as const;
const BUTTERFLY_STAY_S = [9, 16] as const;
const BIRD_GAP_MS = [7 * 60_000, 15 * 60_000] as const;
const BIRD_STAY_S = [6, 10] as const;
/** The first ones do not show up the moment the view opens. */
const FIRST_BUTTERFLY_MS = 2 * 60_000;
const FIRST_BIRD_MS = 5 * 60_000;
/** A bird only comes down where it can land well away from the fox. */
const LAND_MIN_WIDTH = 110;
const LAND_AWAY = [38, 80] as const;
/** Otherwise, and half of the time anyway, it just flies across, above its head. */
const LAND_CHANCE = 0.55;
const CROSS_HEIGHT = [34, 46] as const;
/** How often it cannot resist going after one, when it has nothing better to do. */
const CHASE_CHANCE: Record<Prey, number> = { bug: 0.5, bird: 0.65 };
/** It lets a visitor settle before making up its mind. */
const CONSIDER_AFTER_MS = 1800;
/** The mouse that made friends with it drops by: a first time soon after, then once in a long while. */
const HELLO_SOON_MS = [4 * 60_000, 9 * 60_000] as const;
const HELLO_GAP_MS = [18 * 60_000, 40 * 60_000] as const;
const HELLO_MIN_WIDTH = 96;
/** How far ahead of its nose the mouse stops, and how long the two of them make of it. */
const HELLO_GAP = 9;
const HELLO_WAVE_MS = totalDuration(ANIMATIONS.wave) * 2;
const HELLO_LOVE_MS = 1500;
const HELLO_MAX_MS = 20_000;

const pick = (b: Buddy, [min, max]: readonly [number, number]): number => b.between(min, max);

export class VisitorsMemory {
  butterflyInMs = FIRST_BUTTERFLY_MS;
  birdInMs = FIRST_BIRD_MS;
  /** How long each visitor has been around, and whether it already decided to go after it or let it be. */
  readonly seenMs: Record<Prey, number> = { bug: 0, bird: 0 };
  readonly decided: Record<Prey, boolean> = { bug: false, bird: false };
  /** A mouse once ended up on its head, and they have been friends since. */
  mouseFriend = false;
  helloInMs = Infinity;
  /** While the mouse is saying hello: how long it has been sitting there. */
  helloMs = 0;
}

/** The mouse it pounced on took it well: from now on it drops by to say hello. */
export function befriendMouse(b: Buddy): void {
  b.visitors.mouseFriend = true;
  b.visitors.helloInMs = pick(b, HELLO_SOON_MS);
}

/** The mouse scurries in and sits up in front of its nose; it is not hunted, it is greeted. */
export function startHello(b: Buddy): void {
  const { mouse, width } = b.world;
  b.visitors.helloMs = 0;
  b.enter('mouseHello', HELLO_MAX_MS);
  // Entering a state sends any mouse packing, so this one is let in afterwards.
  const ahead = b.x + b.noseOffset() + b.dir * HELLO_GAP;
  mouse.enter(b.dir === -1, b.dir === 1 ? ahead : ahead - mouse.box.w, width);
}

function updateHello(b: Buddy, dt: number, dtMs: number): boolean {
  const m = b.visitors;
  const { mouse } = b.world;
  b.fall(dt);
  if (!mouse.active) {
    b.enterNext('sit');
    return true;
  }
  if (!mouse.sitting) {
    return false;
  }
  m.helloMs += dtMs;
  if (m.helloMs < HELLO_WAVE_MS + HELLO_LOVE_MS) {
    return false;
  }
  // It goes back the way it came.
  mouse.flee(b.dir);
  b.enterNext('sit');
  return true;
}


function sendBird(b: Buddy): void {
  const { bird, width, height, random } = b.world;
  const center = b.x + SPRITE_SIZE / 2;
  if (width >= LAND_MIN_WIDTH && random() < LAND_CHANCE) {
    // On the side with more room, far enough not to be under its nose.
    const side = center < width / 2 ? 1 : -1;
    bird.land(center + side * pick(b, LAND_AWAY), pick(b, BIRD_STAY_S), width, height);
  } else {
    bird.cross(random() < 0.5, Math.min(pick(b, CROSS_HEIGHT), height - 8), width);
  }
}

// Whether it goes after a visitor is decided once, a moment after it shows up and only if the fox is at leisure then.
function consider(b: Buddy, prey: Prey, dtMs: number): void {
  const m = b.visitors;
  if (!b.world[prey].around) {
    m.seenMs[prey] = 0;
    m.decided[prey] = false;
    return;
  }
  m.seenMs[prey] += dtMs;
  if (m.decided[prey] || m.seenMs[prey] < CONSIDER_AFTER_MS || !b.def.calm || b.rest.sleepy) {
    return;
  }
  m.decided[prey] = true;
  if (b.world.random() < CHASE_CHANCE[prey]) {
    startHunt(b, prey);
  }
}

// Life passing through: a butterfly fluttering by, a bird crossing the sky or landing to peck. Sometimes it has a go at them.
export const visitorsFeature = {
  states: {
    mouseHello: {
      gazes: true,
      update: updateHello,
      anim(b) {
        const { helloMs } = b.visitors;
        if (!b.world.mouse.sitting) {
          return { anim: 'watch', elapsed: b.elapsed };
        }
        return helloMs < HELLO_WAVE_MS ? { anim: 'wave', elapsed: helloMs } : { anim: 'love', elapsed: helloMs - HELLO_WAVE_MS };
      },
      focus: (b) => (b.world.mouse.active ? { x: b.world.mouse.centerX, y: 2 } : undefined),
    },
  },
  tick(b, dtMs) {
    const m = b.visitors;
    const { bug, bird, phase, scenery, grass, width, height, random } = b.world;
    // Not at night, not over a sky it is contemplating, not into a mouse hunt.
    const quiet = phase === 'night' || scenery.active || grass.active || !b.visible;
    if (!quiet) {
      m.butterflyInMs -= dtMs;
      m.birdInMs -= dtMs;
    }
    if (m.butterflyInMs <= 0 && !quiet) {
      m.butterflyInMs = pick(b, BUTTERFLY_GAP_MS);
      if (!bug.active) {
        bug.visit(width, height, random, pick(b, BUTTERFLY_STAY_S));
      }
    }
    if (m.birdInMs <= 0 && !quiet) {
      m.birdInMs = pick(b, BIRD_GAP_MS);
      if (!bird.active) {
        sendBird(b);
      }
    }
    if (b.state !== 'hunt') {
      consider(b, 'bug', dtMs);
      consider(b, 'bird', dtMs);
    }
    // Its friend the mouse only comes when it is quietly doing nothing, and has the room to run up to it.
    if (m.mouseFriend && !Number.isFinite(m.helloInMs)) {
      m.helloInMs = pick(b, HELLO_GAP_MS);
    }
    if (m.mouseFriend && !quiet && b.def.calm && !b.rest.sleepy) {
      m.helloInMs -= dtMs;
      if (m.helloInMs <= 0 && !b.world.mouse.active && width >= HELLO_MIN_WIDTH) {
        m.helloInMs = pick(b, HELLO_GAP_MS);
        startHello(b);
      }
    }
  },
} satisfies Feature;
