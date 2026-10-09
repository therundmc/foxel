import type { Glyph } from './frames';

// What shows by its head when its mood changes, the way comics do it. Bad days: a drop, then a little sad cloud
// that lets one fall. Good days: a twinkle, then a note.

/** A drop by its head: a small one, a full one. And the little cloud that hangs over it on its saddest days. */
export const DROP: readonly Glyph[] = [
  ['C', 'C'],
  ['.C.', 'CCC', 'CwC', '.C.'],
];
export const SAD_CLOUD: Glyph = ['.ZZZ..', 'ZZZZZZ', '.ZZZZ.'];
/** A glint of good humour: coming, then there. */
export const TWINKLE: readonly Glyph[] = [['H'], ['.H.', 'HHH', '.H.']];
/** A note of the tune it has in its head. */
export const NOTE: Glyph = ['..XX', '..Xx', '..X.', 'XXX.', 'XXX.'];
