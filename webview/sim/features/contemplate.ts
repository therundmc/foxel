import { vistaAt, type Vista } from '../../../shared/day';
import { ANIMATIONS } from '../../sprites/fox/animations';
import { SPRITE_SIZE, totalDuration } from '../../sprites/frames';
import type { Buddy } from '../buddy';
import { urge, type Feature } from '../state';

const PRELUDE_MS = totalDuration(ANIMATIONS.gazePrelude);
const TURN_MS = totalDuration(ANIMATIONS.gazeTurn);
const AWE_MS = totalDuration(ANIMATIONS.gazeAwe);
const RETURN_MS = totalDuration(ANIMATIONS.gazeReturn);
const SETTLE_MS = totalDuration(ANIMATIONS.gazeSettle);
/** When it has turned its back to us and is looking at the sky. */
const FACING_MS = PRELUDE_MS + TURN_MS;
/** How long it takes its leave of the sky: turning back to us, then lying down. */
const LEAVE_MS = RETURN_MS + SETTLE_MS;
/** There has to be room for a sky. */
const MIN_WIDTH = 64;
/** A moment like this stays special: hours go by before the next one. */
const WAIT_MIN_MS = 2 * 3_600_000;
const WAIT_MAX_MS = 3.5 * 3_600_000;
const FIRST_WAIT_MS = 15 * 60_000;
/** Coming back to a view that was closed, it first settles in, however long it has been. */
export const AFTER_OPEN_MS = 3 * 60_000;
/** Some days, in clouds weather, it rains instead; and some nights it snows. */
const RAIN_CHANCE = 0.3;
const SNOW_CHANCE = 0.3;
/** Under the rain it holds a leaf over its head, until this long after the sky clears. */
const LEAF_DOWN_MS = 7000;

export class ContemplateMemory {
  vista: Vista = 'stars';
  /** When the sky's great moment comes, counted from the moment it sat down. */
  momentAt = 0;
  hadMoment = false;
  /** Time left before it feels like contemplating again. */
  waitMs = FIRST_WAIT_MS;
}

/** Sits down and takes its time over `vista`: a few breaths, then it turns its back to us and watches. */
export function startContemplate(b: Buddy, vista: Vista): void {
  const m = b.contemplate;
  const center = b.x + SPRITE_SIZE / 2;
  // It leans its look to the side with more sky.
  b.dir = center < b.world.width / 2 ? 1 : -1;
  m.vista = vista;
  m.momentAt = FACING_MS + b.between(14_000, 19_000);
  m.hadMoment = false;
  b.enter('contemplate', m.momentAt + AWE_MS + b.between(12_000, 17_000) + LEAVE_MS);
}

function vistaNow(b: Buddy): Vista | undefined {
  const { phase, now, scenery, width } = b.world;
  return phase !== undefined && !scenery.active && width >= MIN_WIDTH ? vistaAt(now) : undefined;
}

// Once in a long while, at the right time of day, the sky is worth stopping for.
function startDueContemplation(b: Buddy): void {
  const vista = vistaNow(b);
  if (vista) {
    b.contemplate.waitMs = b.between(WAIT_MIN_MS, WAIT_MAX_MS);
    const weather = vista === 'clouds' ? (['rain', RAIN_CHANCE] as const) : vista === 'stars' ? (['snow', SNOW_CHANCE] as const) : undefined;
    startContemplate(b, weather && b.world.random() < weather[1] ? weather[0] : vista);
  }
}

export const contemplateFeature = {
  states: {
    contemplate: {
      next: [['lie', 70], ['yawn', 15], ['sit', 15]],
      update(b, dt) {
        b.fall(dt);
        const m = b.contemplate;
        const { scenery } = b.world;
        if (!m.hadMoment && b.elapsed >= m.momentAt) {
          m.hadMoment = true;
          scenery.highlight();
        }
        if (b.duration - b.elapsed < LEAVE_MS) {
          scenery.fade();
        }
      },
      anim(b) {
        const t = b.elapsed;
        const sinceMoment = t - b.contemplate.momentAt;
        const left = b.duration - t;
        if (t < PRELUDE_MS) {
          return { anim: 'gazePrelude', elapsed: t };
        }
        if (t < FACING_MS) {
          return { anim: 'gazeTurn', elapsed: t - PRELUDE_MS };
        }
        if (left < SETTLE_MS) {
          return { anim: 'gazeSettle', elapsed: SETTLE_MS - left };
        }
        if (left < LEAVE_MS) {
          return { anim: 'gazeReturn', elapsed: LEAVE_MS - left };
        }
        if (sinceMoment >= 0 && sinceMoment < AWE_MS) {
          return { anim: 'gazeAwe', elapsed: sinceMoment };
        }
        return { anim: 'gaze', elapsed: sinceMoment < 0 ? t - FACING_MS : sinceMoment - AWE_MS };
      },
      hat(b) {
        const facing = b.elapsed >= FACING_MS && b.duration - b.elapsed >= LEAVE_MS;
        if (!facing) {
          return 'none';
        }
        // A leaf over its head while it rains, a scarf round its neck in the snow.
        const raining = b.contemplate.vista === 'rain' && b.elapsed < b.contemplate.momentAt + LEAF_DOWN_MS;
        return raining ? 'leaf' : b.contemplate.vista === 'snow' ? 'scarf' : 'none';
      },
    },
  },
  urges: [urge((b) => b.contemplate.waitMs <= 0 && vistaNow(b) !== undefined, startDueContemplation)],
  tick(b, dtMs) {
    b.contemplate.waitMs = Math.max(0, b.contemplate.waitMs - dtMs);
  },
  // The sky is only out while it is looking at it.
  entered(b, state) {
    const { scenery } = b.world;
    if (state === 'contemplate') {
      scenery.appear(b.contemplate.vista, b.x + SPRITE_SIZE / 2, b.dir);
    } else {
      scenery.fade();
    }
  },
} satisfies Feature;
