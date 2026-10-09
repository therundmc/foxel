import type { Glyph } from './frames';

// What floats by its head and says how its day is going, the way comics do it. Bad days: a scribbled little
// cloud that grows and darkens, a vein of temper, a flash in the worst of them. Good days: a twinkle, then notes.

/** The cloud over its head, from a wisp to a storm. */
export const GLOOM: readonly Glyph[] = [
  ['.ee.', 'eDDe', '.ee.'],
  ['..ee...', '.eDDee.', 'eDeeDDe', '.eDDDe.', '..eee..'],
  ['..DDD....', '.DEEDDD..', 'DEDDEEED.', 'DEEEDDED.', '.DDEEED..', '...DDD...'],
];
/** What the storm lets go of now and then. */
export const BOLT: Glyph = ['.S.', 'SS.', '.SS', '.S.'];
/** The vein that throbs at its temple: small, then standing out. */
export const TEMPER: readonly Glyph[] = [
  ['A.A', '...', 'A.A'],
  ['AA.AA', 'A...A', '.....', 'A...A', 'AA.AA'],
];
/** A glint of good humour: coming, then there. */
export const TWINKLE: readonly Glyph[] = [['H'], ['.H.', 'HHH', '.H.']];
/** A note of the tune it has in its head. */
export const NOTE: Glyph = ['..XX', '..Xx', '..X.', 'XXX.', 'XXX.'];
