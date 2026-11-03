import type { Reaction } from '../../../shared/protocol';
import { SPRITE_SIZE } from '../../sprites/frames';
import { fond } from '../affection';
import type { Buddy } from '../buddy';
import { urge, type AnimRef, type Feature } from '../state';

/** Days away after which it is beside itself to see you. */
const MISSED_YOU = 2;
/** Beside itself: how long it bounces about, how high, how fast, before it settles into hearts. */
const OVERJOYED_MS = 4200;
const BOUNCING = 0.6;
const BOUNCE_MS = 360;
const BOUNCE_HEIGHT = 7;

export class BondMemory {
  /** You are back after this many days: the welcome it has not given yet. */
  awayDays: number | undefined;
  /** What happened in your work while its view was out of sight, not played yet. */
  missed: Reaction | undefined;
}

/** You are back after this many days away. */
export function welcomeBack(b: Buddy, days: number): void {
  b.bond.awayDays = days;
}

/** Something happened in your work while its view was out of sight. */
export function missedWhileAway(b: Buddy, reaction: Reaction): void {
  b.bond.missed = reaction;
}

/** What it missed, handed over to be played, once. */
export function takeMissed(b: Buddy): Reaction | undefined {
  const reaction = b.bond.missed;
  b.bond.missed = undefined;
  return reaction;
}

/**
 * The welcome your absence calls for, given once: when it is fond of you and you were gone a few days, it is
 * beside itself. Returns false when its usual hello will do.
 */
export function welcome(b: Buddy): boolean {
  const days = b.bond.awayDays;
  b.bond.awayDays = undefined;
  if (days === undefined || days < MISSED_YOU || !fond(b.world)) {
    return false;
  }
  const you = b.world.pointer?.x ?? b.world.width / 2;
  b.dir = you >= b.x + SPRITE_SIZE / 2 ? 1 : -1;
  b.enter('overjoyed', OVERJOYED_MS);
  return true;
}

function overjoyedAnim(b: Buddy): AnimRef {
  return { anim: b.elapsed < OVERJOYED_MS * BOUNCING ? 'celebrate' : 'love', elapsed: b.elapsed };
}

// What your absences do to it: it greets you as they deserve.
export const bondFeature = {
  states: {
    overjoyed: {
      priority: 2,
      update(b) {
        // It bounces on the spot, then cannot bounce any more.
        const hopping = b.elapsed < OVERJOYED_MS * BOUNCING;
        b.y = hopping ? Math.min(BOUNCE_HEIGHT, b.maxY) * Math.abs(Math.sin((b.elapsed / BOUNCE_MS) * Math.PI)) : 0;
        return true;
      },
      anim: overjoyedAnim,
      next: [['sit', 100]],
    },
  },
  urges: [
    urge(
      (b) => b.bond.awayDays !== undefined,
      (b) => void welcome(b),
    ),
  ],
} satisfies Feature;
