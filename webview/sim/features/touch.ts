import type { TouchZone } from '../../sprites/fox/anchors';
import {
  ANIMATIONS,
  MORNING_WAVE_MS,
  STARTLE_AIR_MS,
  STARTLE_CROUCH_MS,
  TWIRL_AIR_MS,
  TWIRL_CROUCH_MS,
  type AnimName,
} from '../../sprites/fox/animations';
import { totalDuration } from '../../sprites/frames';
import type { Emote } from '../../sprites/props';
import type { Buddy } from '../buddy';
import type { BuddyState, Feature } from '../state';
import { CHASE_FLIP_MS } from '../tuning';

const PET_LINGER_MS = 1500;
const CUDDLE_AFTER_MS = 2500;
const ZOOMIES_COMBO = 3;
const ZOOMIES_MS = 3200;
const ZOOMIES_FLIP_MIN_MS = 600;
const ZOOMIES_FLIP_SPREAD_MS = 500;

/** A short scripted moment: one animation, optionally with a hop, spins, an emote and what comes after. */
export interface TouchReaction {
  anim: AnimName;
  /** Variant played when it is already lying down; it then stays lying. */
  lying?: AnimName;
  hop?: { at: number; air: number; height: number };
  /** Turns around every `spinMs`, during the hop if there is one. */
  spinMs?: number;
  ms?: number;
  then?: BuddyState;
  emote?: Emote;
  /** The emote only shows from this moment on. */
  emoteFromMs?: number;
}

// Several cute reactions per body part, picked at random so touching the same spot stays surprising.
const TOUCH_REACTIONS: Record<TouchZone, readonly TouchReaction[]> = {
  nose: [{ anim: 'boop' }, { anim: 'blep' }, { anim: 'lick' }],
  head: [
    { anim: 'pat', lying: 'patLie', then: 'sit' },
    { anim: 'nuzzle', lying: 'nuzzleLie' },
    { anim: 'tilt' },
  ],
  back: [
    { anim: 'scratch' },
    { anim: 'playBow', then: 'zoomies' },
    { anim: 'flop', then: 'lie' },
  ],
  paw: [
    { anim: 'shake', then: 'sit' },
    { anim: 'highFive', then: 'sit' },
    { anim: 'twirl', hop: { at: TWIRL_CROUCH_MS, air: TWIRL_AIR_MS, height: 6 }, spinMs: TWIRL_AIR_MS / 4 },
  ],
  tail: [
    { anim: 'chaseTail', spinMs: CHASE_FLIP_MS, ms: CHASE_FLIP_MS * 6, then: 'dizzy' },
    { anim: 'startle', hop: { at: STARTLE_CROUCH_MS, air: STARTLE_AIR_MS, height: 8 } },
    { anim: 'tailPoof' },
  ],
};
const FLOP: TouchReaction = { anim: 'flop', then: 'lie' };
// Moments other features play through `perform`.
export const MORNING: TouchReaction = { anim: 'morning', then: 'sit', emote: 'sun', emoteFromMs: MORNING_WAVE_MS };
export const GOOD_NIGHT: TouchReaction = { anim: 'goodNight', then: 'sit', emote: 'moon' };
export const YUM: TouchReaction = { anim: 'lick', then: 'sit' };
export const SIGH: TouchReaction = { anim: 'sigh', then: 'lie', emote: 'cup' };

export class TouchMemory {
  petMs = 0;
  petIdleMs = 0;
  reaction: TouchReaction = TOUCH_REACTIONS.head[0];
  /** Animation of the reaction being played, and whether it is the lying variant. */
  anim: AnimName = 'pat';
  lying = false;
  /** Clicks received while a reaction plays; enough of them set off the zoomies. */
  combo = 0;
  readonly lastVariant: Partial<Record<TouchZone, number>> = {};
  nextFlipMs = 0;
}

export function pet(b: Buddy): void {
  if (b.state === 'petted') {
    b.touch.petIdleMs = 0;
    return;
  }
  b.touch.petMs = 0;
  b.touch.petIdleMs = 0;
  b.tryEnter('petted', Infinity);
}

export function touch(b: Buddy, zone: TouchZone): void {
  // Clicking again mid-reaction builds excitement instead of restarting the animation.
  if (b.state === 'touched' || b.state === 'zoomies') {
    b.touch.combo++;
    return;
  }
  const options = TOUCH_REACTIONS[zone];
  let pick = Math.floor(b.world.random() * options.length) % options.length;
  if (pick === b.touch.lastVariant[zone] && options.length > 1) {
    pick = (pick + 1) % options.length;
  }
  b.touch.lastVariant[zone] = pick;
  perform(b, options[pick]);
}

export function perform(b: Buddy, reaction: TouchReaction): void {
  b.touch.lying = b.state === 'lie' || b.state === 'sleep' || b.state === 'petted';
  b.touch.reaction = reaction;
  b.touch.anim = (b.touch.lying && reaction.lying) || reaction.anim;
  b.touch.combo = 0;
  b.tryEnter('touched', reaction.ms ?? totalDuration(ANIMATIONS[b.touch.anim]));
}

function updateTouched(b: Buddy, dt: number): void {
  const { hop, spinMs } = b.touch.reaction;
  const t = b.elapsed;
  if (hop) {
    const p = (t - hop.at) / hop.air;
    b.y = p > 0 && p < 1 ? 4 * Math.min(hop.height, b.maxY) * p * (1 - p) : 0;
  } else {
    b.fall(dt);
  }
  if (spinMs) {
    const from = hop?.at ?? 0;
    const to = hop ? hop.at + hop.air : Infinity;
    const flips = t >= from && t < to ? Math.floor((t - from) / spinMs) : 0;
    b.dir = flips % 2 === 0 ? b.startDir : b.flipped();
  }
}

function startZoomies(b: Buddy): void {
  b.touch.combo = 0;
  b.touch.nextFlipMs = ZOOMIES_FLIP_MIN_MS;
  b.enter('zoomies', ZOOMIES_MS);
}

function updateZoomies(b: Buddy): void {
  if (b.elapsed >= b.touch.nextFlipMs) {
    b.dir = b.flipped(b.dir);
    b.touch.nextFlipMs = b.elapsed + ZOOMIES_FLIP_MIN_MS + b.world.random() * ZOOMIES_FLIP_SPREAD_MS;
  }
}

// Petting, clicking a part of its body, and the zoomies too many clicks set off.
export const touchFeature = {
  states: {
    petted: {
      priority: 3,
      next: [['lie', 60], ['sit', 40]],
      update(b, dt, dtMs) {
        const m = b.touch;
        m.petMs += dtMs;
        m.petIdleMs += dtMs;
        if (m.petIdleMs >= PET_LINGER_MS) {
          b.enterNext(m.petMs >= CUDDLE_AFTER_MS ? 'lie' : 'sit');
          return true;
        }
        b.fall(dt);
        return false;
      },
      anim(b) {
        const { petMs } = b.touch;
        if (petMs >= CUDDLE_AFTER_MS) {
          return { anim: 'cuddle', elapsed: petMs - CUDDLE_AFTER_MS };
        }
        return { anim: 'petted', elapsed: petMs };
      },
    },
    touched: {
      priority: 3,
      update: updateTouched,
      anim: (b) => ({ anim: b.touch.anim, elapsed: b.elapsed }),
      finish(b) {
        const { combo, lying, reaction } = b.touch;
        if (combo >= ZOOMIES_COMBO) {
          startZoomies(b);
        } else if (lying && reaction.lying) {
          b.enterNext('lie');
        } else {
          b.enterNext(reaction.then ?? b.pickNext());
        }
      },
      emote(b) {
        const { emote, emoteFromMs = 0 } = b.touch.reaction;
        return emote && b.elapsed >= emoteFromMs ? emote : undefined;
      },
    },
    zoomies: {
      priority: 3,
      speed: 55,
      begin: startZoomies,
      update: updateZoomies,
      anim: (b) => ({ anim: 'run', elapsed: b.elapsed }),
      finish: (b) => perform(b, FLOP),
    },
  },
} satisfies Feature;
