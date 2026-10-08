import { outlined } from '../../grid';
import type { Animation } from '../../frames';
import { anim, STEP_A, STEP_B, type Pose } from '../pose';

// Round lens (rows of 3, 5, 7, 7, 7, 5, 3): dark rim, pale blue glass, a glint, and a handle going down and back.
const LENS_ROWS = [
  '....ddd....',
  '...dWwwwd..',
  '...dWwwwwd.',
  '...dwwwwwd.',
  '...dwwwwwd.',
  '....dwwwd..',
  '....ddd....',
  '...k.......',
  '..k........',
  '.k.........',
  'k..........',
];
// Same glass seen close up: one dark pixel of pupil makes the eye look big behind it.
const LENS = outlined(LENS_ROWS);
const LENS_EYE = outlined(LENS_ROWS.map((r, y) => (y === 3 ? r.replace('wwwww', 'wwEww') : r)));

// x, y is the glyph's top-left corner once outlined (13x13): the lens is centred 8 pixels right and 4 down.
const lens = (x: number, y: number, behind?: true, glyph = LENS): NonNullable<Pose['props']> => [
  { x, y, glyph, mirrors: true, behind },
];

const SNIFF = { eye: 'down', mouth: 'flat' } as const;

// Nose near the ground: the glass is held just in front of and below it.
const NOSE_LOW: Pose = { head: [2, 8], pitch: 2, ...SNIFF };
const NOSE_LOWER: Pose = { head: [2, 9], pitch: 2, ...SNIFF };

export const detectiveAnims = {
  // It pulls the glass out from behind its shoulder and holds it up before its muzzle.
  detectiveIn: anim([
    [{ eye: 'open' }, 150],
    [{ head: [0, 1], props: lens(6, 18, true) }, 170],
    [{ head: [0, 1], eye: 'down', props: lens(14, 14) }, 170],
    [{ head: [1, 2], eye: 'wide', mouth: 'open', props: lens(20, 10) }, 260],
    [{ ...NOSE_LOW, props: lens(23, 19) }, 250],
  ]),
  // Sniffs along the ground, stops to peer through the glass, looks up puzzled, sniffs on.
  detective: anim([
    [{ ...NOSE_LOW, legs: STEP_A, extras: ['sniffA'], props: lens(23, 19) }, 300],
    [{ ...NOSE_LOWER, legs: STEP_B, extras: ['sniffB'], props: lens(23, 20) }, 300],
    [{ ...NOSE_LOW, legs: STEP_A, extras: ['sniffA'], props: lens(23, 19) }, 300],
    [{ ...NOSE_LOWER, extras: ['sniffB'], props: lens(23, 20) }, 300],
    [{ head: [2, 4], eye: 'wide', mouth: 'flat', pitch: 1, props: lens(19, 11, undefined, LENS_EYE) }, 300],
    [{ head: [2, 4], eye: 'wide', mouth: 'flat', pitch: 1, tail: 'wagL', props: lens(19, 12, undefined, LENS_EYE) }, 440],
    [{ head: [0, 0], eye: 'up', mouth: 'flat', ears: 'back', props: lens(20, 16) }, 400],
    [{ head: [0, 0], eye: 'open', mouth: 'flat', tail: 'wagR', props: lens(20, 16) }, 260],
    [{ ...NOSE_LOW, legs: STEP_B, props: lens(23, 18) }, 220],
    [{ ...NOSE_LOW, props: lens(23, 19) }, 220],
  ]),
  // It drops the glass behind its back, out of sight, and stands tall again.
  detectiveOut: anim([
    [{ ...NOSE_LOW, props: lens(23, 19) }, 150],
    [{ head: [1, 2], props: lens(16, 17) }, 170],
    [{ head: [0, 1], props: lens(6, 18, true) }, 170],
    [{ head: [0, 1], props: lens(0, 21, true) }, 150],
    [{ head: [0, 0], eye: 'happy', tail: 'wagL' }, 260],
  ]),
  // A breakpoint: it freezes like a pointer dog, low and stretched, one paw up, tail out straight.
  pointing: anim([
    [{ pitch: 2, bob: 1, head: [2, 2], tail: 'flat', legs: [[-1, 0], [0, 0], [2, 0], [2, 2]], mouth: 'flat' }, 800],
    [{ pitch: 2, bob: 1, head: [2, 2], tail: 'streamA', legs: [[-1, 0], [0, 0], [2, 0], [2, 2]], mouth: 'flat' }, 120],
    [{ pitch: 2, bob: 1, head: [2, 2], tail: 'flat', legs: [[-1, 0], [0, 0], [2, 0], [2, 2]], mouth: 'flat' }, 700],
    [{ pitch: 2, bob: 1, head: [2, 2], tail: 'flat', ears: 'back', legs: [[-1, 0], [0, 0], [2, 0], [2, 2]], mouth: 'flat' }, 380],
  ]),
} satisfies Record<string, Animation>;
