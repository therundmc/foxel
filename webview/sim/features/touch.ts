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
import { fond } from '../affection';
import type { Buddy } from '../buddy';
import type { BuddyState, Feature } from '../state';
import { CHASE_FLIP_MS, moodLevel } from '../tuning';

const PET_LINGER_MS = 1500;
const CUDDLE_AFTER_MS = 2500;
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
  /** Only when this holds: something it only does for someone it is fond of. */
  when?: (b: Buddy) => boolean;
}

// Several cute reactions per body part, picked at random so touching the same spot stays surprising.
const TOUCH_REACTIONS: Record<TouchZone, readonly TouchReaction[]> = {
  nose: [{ anim: 'boop' }, { anim: 'blep' }, { anim: 'lick' }],
  head: [
    { anim: 'pat', lying: 'patLie', then: 'sit' },
    { anim: 'nuzzle', lying: 'nuzzleLie' },
    { anim: 'tilt' },
    { anim: 'shy', then: 'sit' },
  ],
  back: [
    { anim: 'scratch' },
    { anim: 'playBow', then: 'zoomies' },
    { anim: 'flop', then: 'lie' },
    // It rolls over for a belly rub, but only for you.
    { anim: 'bellyUp', then: 'lie', when: (b) => fond(b.world) },
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
/** Delighted, how often a pat makes it twirl for joy rather than its usual reaction: now and then, no more. */
const OVERJOYED = 0.35;
/** What a double click on it does, and what a pat does on its best days. */
const TWIRL: TouchReaction = { anim: 'twirl', hop: { at: TWIRL_CROUCH_MS, air: TWIRL_AIR_MS, height: 6 }, spinMs: TWIRL_AIR_MS / 4, then: 'sit' };
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
  // Asked afresh: the compiler still believes what the test above found.
  if (stateOf(b) === 'petted') {
    b.world.effects.push('petted');
  }
}

const stateOf = (b: Buddy): BuddyState => b.state;

/**
 * You clicked on a part of its body, `clicks` times in a row: once and it reacts to where it was touched, twice
 * and it twirls for joy, three times and it gets the zoomies.
 */
export function touch(b: Buddy, zone: TouchZone, clicks = 1): void {
  // Clicked again a moment later, it goes on with what it was doing rather than starting over.
  if (clicks === 1 && (b.state === 'touched' || b.state === 'zoomies')) {
    return;
  }
  if (clicks >= 3) {
    b.touch.nextFlipMs = ZOOMIES_FLIP_MIN_MS;
    b.tryEnter('zoomies', ZOOMIES_MS);
    return;
  }
  if (clicks === 2) {
    perform(b, TWIRL);
    return;
  }
  // On its best days a pat is all it takes: it twirls for joy.
  const delighted = moodLevel(b.world.mood) >= 2 && b.world.random() < OVERJOYED;
  perform(b, delighted ? TWIRL : pick(b, zone));
  if (stateOf(b) === 'touched') {
    b.world.effects.push('petted');
  }
}

// One of the reactions of that part of its body, never the same twice in a row.
function pick(b: Buddy, zone: TouchZone): TouchReaction {
  const options = TOUCH_REACTIONS[zone].filter((r) => r.when?.(b) ?? true);
  let pick = Math.floor(b.world.random() * options.length) % options.length;
  if (pick === b.touch.lastVariant[zone] && options.length > 1) {
    pick = (pick + 1) % options.length;
  }
  b.touch.lastVariant[zone] = pick;
  return options[pick];
}

export function perform(b: Buddy, reaction: TouchReaction): void {
  b.touch.lying = b.state === 'lie' || b.state === 'sleep' || b.state === 'petted';
  b.touch.reaction = reaction;
  b.touch.anim = (b.touch.lying && reaction.lying) || reaction.anim;
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
  b.touch.nextFlipMs = ZOOMIES_FLIP_MIN_MS;
  b.enter('zoomies', ZOOMIES_MS);
}

function updateZoomies(b: Buddy): void {
  if (b.elapsed >= b.touch.nextFlipMs) {
    b.dir = b.flipped(b.dir);
    b.touch.nextFlipMs = b.elapsed + ZOOMIES_FLIP_MIN_MS + b.world.random() * ZOOMIES_FLIP_SPREAD_MS;
  }
}

// Petting, clicking a part of its body, and what a double and a triple click set off.
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
        const { lying, reaction } = b.touch;
        if (lying && reaction.lying) {
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
