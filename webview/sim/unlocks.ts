import { SHUNS_UNDER } from './tuning';
import type { World } from './world';

/**
 * Your life together goes by stages. How attached to you it has been at its most says which one it has reached,
 * and each brings something new into its life: a toy, a way of being with you, a trick, a present. Nothing it has
 * reached is taken back. These are the levels of attachment at which each stage begins.
 */
export const STAGES = [0, 0.07, 0.2, 0.35, 0.5, 0.7] as const;
export const LAST_STAGE = STAGES.length - 1;
export const stageFor = (peak: number): number => STAGES.filter((from) => peak >= from).length - 1;

/**
 * What a thing takes to be part of its life at a given moment: the stage reached (for good), and for some the mood
 * of the day (it comes and goes) and, one day, its age.
 */
export interface Needs {
  stage: number;
  /** Its mood has to be at least this. */
  mood?: number;
  /** For when it grows up: how old it has to be. */
  age?: number;
}

/** Not out of sorts: the mood it takes to show off. */
const IN_SPIRITS = SHUNS_UNDER + 0.01;

/**
 * Everything that comes into its life, in the order it comes. To add a toy, a trick, a present or a way of being:
 * one line here, at the stage that suits it, and a `has(world, ...)` where it is used.
 */
export const UNLOCKS = {
  // Stage 0, the first meeting: it comes in with its ball. It is wary of you.
  ball: { stage: 0 },
  // Stage 1, it trusts you: it comes to your pointer, asks to be stroked, takes a pat gladly. Its duck, and the soap.
  trusts: { stage: 1 },
  duck: { stage: 1 },
  bubbles: { stage: 1 },
  // Stage 2, it is fond of you: its teddy; it catches what you throw and shakes it; it brings you what it finds.
  teddy: { stage: 2 },
  catches: { stage: 2 },
  shake: { stage: 2, mood: IN_SPIRITS },
  finds: { stage: 2, mood: 0 },
  overjoyed: { stage: 2 },
  // Stage 3, you are its person: leaps and spins with its toys, and it will not let you put them away.
  frolic: { stage: 3, mood: IN_SPIRITS },
  spin: { stage: 3, mood: IN_SPIRITS },
  fetchesBack: { stage: 3, mood: 0 },
  cheers: { stage: 3, mood: IN_SPIRITS },
  // Stage 4, devoted: it juggles, and draws hearts in the earth for you.
  juggle: { stage: 4, mood: IN_SPIRITS },
  hearts: { stage: 4, mood: 0.2 },
} satisfies Record<string, Needs>;
export type Unlock = keyof typeof UNLOCKS;

/** Whether this is part of its life right now: it has reached the stage, and is in the mood (and of an age) for it. */
export function has(world: World, what: Unlock): boolean {
  const needs: Needs = UNLOCKS[what];
  return world.stage >= needs.stage && world.mood >= (needs.mood ?? -Infinity) && world.age >= (needs.age ?? 0);
}

/** Whether it has reached the stage for this, whatever its mood today: for its things, which do not come and go. */
export const owns = (world: World, what: Unlock): boolean => world.stage >= UNLOCKS[what].stage;
