import { outlined } from '../../grid';
import type { Animation } from '../../frames';
import { anim, STEP_A, STEP_B, type Pose } from '../pose';

// A little round lens (pale blue glass, brown rim) with a short handle at its lower left.
const LENS = outlined([
  '..tttt..',
  '.twwwwt.',
  '.tWwwwt.',
  '.twwwwt.',
  '.twwwwt.',
  '..tttt..',
  '.d......',
  'd.......',
]);

// Glyph is 10x10 once outlined: x, y is its top-left corner.
const lens = (x: number, y: number, behind?: true): NonNullable<Pose['props']> => [
  { x, y, glyph: LENS, mirrors: true, behind },
];

const SNIFF = { eye: 'down', mouth: 'flat' } as const;

export const detectiveAnims = {
  // It pulls the glass out from behind its shoulder and holds it up before its muzzle.
  detectiveIn: anim([
    [{ eye: 'open' }, 150],
    [{ head: [0, 1], props: lens(14, 22, true) }, 170],
    [{ head: [0, 1], eye: 'down', props: lens(20, 17) }, 170],
    [{ head: [1, 2], eye: 'wide', mouth: 'open', props: lens(25, 11) }, 260],
    [{ head: [1, 4], ...SNIFF, props: lens(26, 15) }, 250],
  ]),
  // Sniffs along the ground, stops to peer through the glass, looks up puzzled, sniffs on.
  detective: anim([
    [{ head: [1, 4], ...SNIFF, legs: STEP_A, extras: ['sniffA'], props: lens(26, 15) }, 300],
    [{ head: [1, 5], ...SNIFF, legs: STEP_B, extras: ['sniffB'], props: lens(26, 17) }, 300],
    [{ head: [1, 4], ...SNIFF, legs: STEP_A, extras: ['sniffA'], props: lens(26, 15) }, 300],
    [{ head: [1, 5], ...SNIFF, extras: ['sniffB'], props: lens(26, 17) }, 300],
    [{ head: [2, 4], eye: 'wide', mouth: 'flat', pitch: 1, props: lens(24, 11) }, 300],
    [{ head: [2, 4], eye: 'wide', mouth: 'flat', pitch: 1, tail: 'wagL', props: lens(23, 9) }, 440],
    [{ head: [0, 0], eye: 'up', mouth: 'flat', ears: 'back', props: lens(25, 19) }, 400],
    [{ head: [0, 0], eye: 'open', mouth: 'flat', tail: 'wagR', props: lens(25, 19) }, 260],
    [{ head: [1, 3], ...SNIFF, legs: STEP_B, props: lens(26, 15) }, 220],
    [{ head: [1, 4], ...SNIFF, props: lens(26, 15) }, 220],
  ]),
  // It drops the glass behind its back, out of sight, and stands tall again.
  detectiveOut: anim([
    [{ head: [1, 3], ...SNIFF, props: lens(26, 15) }, 150],
    [{ head: [1, 2], props: lens(21, 19) }, 170],
    [{ head: [0, 1], props: lens(14, 23, true) }, 170],
    [{ head: [0, 1], props: lens(8, 25, true) }, 150],
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
