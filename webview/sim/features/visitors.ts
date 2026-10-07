import { SPRITE_SIZE } from '../../sprites/frames';
import type { Buddy } from '../buddy';
import type { Feature } from '../state';
import { startHunt, type Prey } from './hunt';

/** How long between two butterflies, and how long one stays when nothing chases it. */
const BUTTERFLY_GAP_MS = [50_000, 130_000] as const;
const BUTTERFLY_STAY_S = [9, 16] as const;
const BIRD_GAP_MS = [90_000, 240_000] as const;
const BIRD_STAY_S = [6, 10] as const;
/** The first ones do not show up the moment the view opens. */
const FIRST_BUTTERFLY_MS = 25_000;
const FIRST_BIRD_MS = 70_000;
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

export class VisitorsMemory {
  butterflyInMs = FIRST_BUTTERFLY_MS;
  birdInMs = FIRST_BIRD_MS;
  /** How long each visitor has been around, and whether it already decided to go after it or let it be. */
  readonly seenMs: Record<Prey, number> = { bug: 0, bird: 0 };
  readonly decided: Record<Prey, boolean> = { bug: false, bird: false };
}

const pick = (b: Buddy, [min, max]: readonly [number, number]): number => b.between(min, max);

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
  states: {},
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
  },
} satisfies Feature;
