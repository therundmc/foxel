// Numbers more than one feature relies on. A number only one feature uses lives in that feature's file.
export const WALK_SPEED = 9;
export const FETCH_RUN_SPEED = 38;
export const FETCH_WALK_SPEED = 12;
/** Farther than this from where it is heading, it runs instead of walking. */
export const FETCH_FAR = 20;
export const FETCH_MAX_MS = 20_000;
export const AWAIT_MS = 9000;
export const ASK_BREAK_MS = 6000;
export const CHASE_FLIP_MS = 280;
/** How close to the mouth the ball must come to be caught. */
export const CATCH_RADIUS = 4;
/** How close to the nose a ball on the ground must be to be picked up or nudged. */
export const NOSE_REACH = 3;
/** Its mood at or under which it is out of sorts: listless, and in no mood for your pointer. */
const SHUNS_UNDER = -0.2;

/**
 * Its mood by degrees, from furious (-3) through annoyed (-1), even (0) and cheerful (1) to delighted (2): what
 * shows by its head and in its eyes goes by these. The first step down is where it is out of sorts.
 */
export type MoodLevel = -3 | -2 | -1 | 0 | 1 | 2;
const MOOD_STEPS: readonly (readonly [number, MoodLevel])[] = [
  [-0.7, -3],
  [-0.45, -2],
  [SHUNS_UNDER, -1],
];
export function moodLevel(mood: number): MoodLevel {
  const down = MOOD_STEPS.find(([under]) => mood <= under);
  return down ? down[1] : mood >= 0.7 ? 2 : mood >= 0.4 ? 1 : 0;
}

