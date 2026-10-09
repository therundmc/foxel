import type { Glyph } from './frames';

// What shows by its head when its mood changes, the way comics do it. Bad days: a vein of temper at its temple.
// Good days: a twinkle, then a note.

/** The vein that throbs at its temple: small, then standing out. */
export const TEMPER: readonly Glyph[] = [
  ['A.A', '...', 'A.A'],
  ['AA.AA', 'A...A', '.....', 'A...A', 'AA.AA'],
];
/** A glint of good humour: coming, then there. */
export const TWINKLE: readonly Glyph[] = [['H'], ['.H.', 'HHH', '.H.']];
/** A note of the tune it has in its head. */
export const NOTE: Glyph = ['..XX', '..Xx', '..X.', 'XXX.', 'XXX.'];
