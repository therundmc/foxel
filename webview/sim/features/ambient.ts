import type { DayPhase } from '../../../shared/day';
import { ANIMATIONS, JUMP_AIR_MS, JUMP_CROUCH_MS, JUMP_LAND_MS } from '../../sprites/fox/animations';
import { totalDuration } from '../../sprites/frames';
import type { Buddy } from '../buddy';
import type { Feature, Weights } from '../state';
import { CHASE_FLIP_MS, WALK_SPEED } from '../tuning';

const JUMP_MS = JUMP_CROUCH_MS + JUMP_AIR_MS + JUMP_LAND_MS;
const JUMP_HEIGHT = 10;
const LOOK_FLIP_MS = 1600;

/** What follows a state that does not say. */
export const DEFAULT_NEXT: Weights = [['idle', 40], ['sit', 40], ['walk', 20]];

// Extra things it feels like doing at certain times of day, when calm.
export const PHASE_NEXT: Partial<Record<DayPhase, Weights>> = {
  dawn: [['stretch', 12], ['yawn', 12]],
  afternoon: [['doze', 20], ['yawn', 8]],
  evening: [['zoomies', 6], ['mousing', 6]],
  night: [['drowsy', 25], ['yawn', 12]],
};
/** How much less likely the `nightDamped` states get at night. */
export const NIGHT_DAMPING = 0.25;

const between = (min: number, max: number) => (b: Buddy): number => b.between(min, max);
const turnEvery = (ms: number) => (b: Buddy): void => {
  b.dir = Math.floor(b.elapsed / ms) % 2 === 0 ? b.startDir : b.flipped();
};

// What it does on its own. `next` is what a real pet tends to do afterwards: calm down after effort, settle when resting.
export const ambientFeature = {
  states: {
    idle: {
      calm: true,
      restful: true,
      facesTarget: true,
      next: [['walk', 30], ['sit', 25], ['sniff', 12], ['play', 12], ['lookAround', 10], ['hunt', 7], ['leave', 4], ['stretch', 4], ['jump', 3], ['run', 2], ['chaseTail', 1], ['mousing', 5], ['dig', 3], ['glass', 3]],
    },
    walk: {
      speed: WALK_SPEED,
      free: true,
      gazes: true,
      duration: between(4000, 9000),
      next: [['idle', 30], ['sit', 20], ['sniff', 20], ['play', 10], ['lookAround', 10], ['hunt', 7], ['leave', 4], ['jump', 3], ['run', 3], ['mousing', 5]],
    },
    run: {
      speed: 35,
      nightDamped: true,
      duration: between(1500, 2500),
      next: [['idle', 50], ['sit', 30], ['walk', 20]],
    },
    jump: {
      nightDamped: true,
      duration: () => JUMP_MS,
      next: [['idle', 50], ['walk', 50]],
      update(b, dt) {
        const air = (b.elapsed - JUMP_CROUCH_MS) / JUMP_AIR_MS;
        if (air > 0 && air < 1) {
          b.y = 4 * Math.min(JUMP_HEIGHT, b.maxY) * air * (1 - air);
          b.move(WALK_SPEED * dt);
        } else {
          b.y = 0;
        }
      },
    },
    sit: {
      calm: true,
      restful: true,
      facesTarget: true,
      duration: between(6000, 14_000),
      next: [['lie', 30], ['walk', 20], ['groom', 15], ['idle', 15], ['yawn', 10], ['lookAround', 10], ['play', 8], ['glass', 5]],
    },
    lie: {
      calm: true,
      restful: true,
      facesTarget: true,
      duration: between(8000, 20_000),
      next: [['stretch', 30], ['sit', 25], ['idle', 20], ['groom', 10], ['walk', 10]],
    },
    groom: {
      calm: true,
      restful: true,
      duration: () => totalDuration(ANIMATIONS.groom) * 6,
      next: [['sit', 40], ['lie', 30], ['idle', 30]],
    },
    stretch: {
      duration: () => totalDuration(ANIMATIONS.stretch),
      next: [['walk', 50], ['idle', 30], ['sit', 20]],
    },
    yawn: {
      restful: true,
      duration: () => totalDuration(ANIMATIONS.yawn),
      next: [['lie', 50], ['sit', 30], ['idle', 20]],
    },
    sniff: {
      speed: 3,
      calm: true,
      duration: between(3000, 6000),
      next: [['walk', 40], ['idle', 20], ['sit', 20], ['play', 10], ['hunt', 10], ['lookAround', 10], ['dig', 12], ['mousing', 8]],
    },
    chaseTail: {
      nightDamped: true,
      duration: () => CHASE_FLIP_MS * 7,
      next: [['dizzy', 30], ['idle', 40], ['sit', 30]],
      update: turnEvery(CHASE_FLIP_MS),
    },
    lookAround: {
      calm: true,
      duration: () => LOOK_FLIP_MS * 2,
      next: [['walk', 40], ['idle', 30], ['sit', 20], ['play', 12], ['hunt', 10], ['mousing', 6]],
      update: turnEvery(LOOK_FLIP_MS),
    },
    dizzy: {
      duration: () => 1600,
      next: [['sit', 60], ['idle', 40]],
    },
    doze: {
      restful: true,
      duration: between(8000, 14_000),
      next: [['lie', 50], ['sit', 30], ['yawn', 20]],
    },
    drowsy: {
      restful: true,
      duration: between(5000, 9000),
      next: [['lie', 50], ['yawn', 30], ['sit', 20]],
      emote: () => 'moon',
    },
    dig: {
      duration: () => totalDuration(ANIMATIONS.dig),
      next: [['sniff', 40], ['sit', 30], ['idle', 30]],
    },
    glass: {
      nightDamped: true,
      duration: () => totalDuration(ANIMATIONS.glass),
      next: [['sit', 50], ['idle', 30], ['groom', 20]],
    },
  },
} satisfies Feature;
