import type { World } from './world';

// Its affection for you, worked out by the extension from the days you have spent together. It is never shown as
// such: no gauge, no stage, nothing to unlock. It only changes, little by little, how it is with you.

/** After a few good days together it is fond of you: hearts show when it is happy, and it missed you when you were away. */
const FOND = 0.1;
/** After weeks it is devoted: it comes to your pointer readily and lies down by it. */
const DEVOTED = 0.4;

/** Fond of you, and in a mood to show it. */
export const fond = (world: World): boolean => world.attachment >= FOND && world.mood >= 0;

export const devoted = (world: World): boolean => world.attachment >= DEVOTED;
