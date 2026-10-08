import type { Animation, Overlay } from '../../frames';
import { outlined } from '../../grid';
import { anim } from '../pose';

const SIT = { body: 'sit' } as const;

// Yarn ball, 7 pixels across: rounded, with a lighter turn and a darker one.
const BALL = outlined([
  '..VVV..',
  '.VZVVV.',
  'VVZVVVV',
  'VZVVIVV',
  'VVVVVIV',
  '.VIVVV.',
  '..VVV..',
]);
// A loose end trailing from the ball.
const TAIL_END = outlined(['VV.', '.VV', '..V']);
// Strands around the body: a band, a second lower one, a loop over an ear.
const BAND = outlined(['.VVVVVVVVV.', 'VVZVVVVIVVV', '.VVVVVVVVV.']);
const BAND_LOW = outlined(['VVVVVVVVVV', '.VIVVVVZVV', '..VVVVVV..']);
const EAR_LOOP = outlined(['.VV.', 'V..V', '.VV.']);
// A strand fallen apart and a loose one the paw holds.
const SCRAP = outlined(['VV', '.V']);
const STRAND_UP = outlined(['V', 'V', 'V', 'V']);

const wrapped = (xs: number, y: number): Overlay[] => [
  { x: 11 + xs, y, glyph: BAND, mirrors: true },
  { x: 11 + xs, y: y + 4, glyph: BAND_LOW, mirrors: true },
];
const at = (x: number, y: number, glyph: Overlay['glyph']): Overlay => ({ x, y, glyph, mirrors: true });
const BODY_Y = 17;
const EAR: Overlay = at(18, 0, EAR_LOOP);
const BALL_NEXT = (x: number, y = 21): Overlay => ({ x, y, glyph: BALL, mirrors: true });

export const tangleAnims = {
  // The ball rolls in, it pats it, and the yarn wraps it before it understands.
  tangleIn: anim([
    [{ ...SIT, eye: 'open', tail: 'sitA' }, 200],
    [{ ...SIT, eye: 'wide', tail: 'sitA', props: [BALL_NEXT(40)] }, 200],
    [{ ...SIT, eye: 'wide', head: [1, 1], tail: 'sitB', props: [BALL_NEXT(34)] }, 200],
    [{ ...SIT, eye: 'down', head: [1, 2], paw: 'tapNear', tail: 'sitA', props: [BALL_NEXT(30, 22)] }, 220],
    [{ ...SIT, eye: 'happy', head: [1, 2], paw: 'tapFar', tail: 'sitB', props: [BALL_NEXT(29, 22)] }, 220],
    [{ ...SIT, eye: 'down', head: [1, 2], paw: 'tapNear', tail: 'sitA', props: [BALL_NEXT(30, 22), at(22, 25, TAIL_END)] }, 220],
    [{ ...SIT, eye: 'wide', head: [0, 0], tail: 'sitB', props: [BALL_NEXT(30, 22), ...wrapped(0, BODY_Y).slice(0, 1)] }, 220],
    [{ ...SIT, eye: 'wide', mouth: 'open', ears: 'back', tail: 'sitA', props: [BALL_NEXT(29, 22), ...wrapped(0, BODY_Y), EAR] }, 300],
  ]),
  // Wrapped up, it tugs at a strand, which will not give, and sighs.
  tangled: anim([
    [{ ...SIT, eye: 'down', ears: 'back', tail: 'sitA', props: [BALL_NEXT(29, 22), ...wrapped(0, BODY_Y), EAR] }, 400],
    [{ ...SIT, eye: 'down', ears: 'back', paw: 'tapNear', head: [1, 2], tail: 'sitB', props: [BALL_NEXT(29, 22), ...wrapped(0, BODY_Y), EAR, at(25, 18, STRAND_UP)] }, 260],
    [{ ...SIT, eye: 'closed', ears: 'back', paw: 'tapNear', head: [2, 3], bob: 1, tail: 'sitB', props: [BALL_NEXT(29, 22), ...wrapped(0, BODY_Y + 1), EAR, at(25, 19, STRAND_UP)] }, 260],
    [{ ...SIT, eye: 'down', ears: 'back', paw: 'tapNear', head: [1, 2], tail: 'sitA', props: [BALL_NEXT(29, 22), ...wrapped(0, BODY_Y), EAR, at(25, 18, STRAND_UP)] }, 240],
    [{ ...SIT, eye: 'down', ears: 'back', head: [0, 1], mouth: 'flat', tail: 'sitA', props: [BALL_NEXT(29, 22), ...wrapped(0, BODY_Y), EAR] }, 300],
    [{ ...SIT, eye: 'closed', ears: 'back', head: [0, 1], bob: 1, mouth: 'flat', tail: 'sitA', extras: ['sniffB'], props: [BALL_NEXT(29, 22), ...wrapped(0, BODY_Y + 1), EAR] }, 500],
    [{ ...SIT, eye: 'down', ears: 'back', mouth: 'flat', tail: 'sitB', props: [BALL_NEXT(29, 22), ...wrapped(0, BODY_Y), EAR] }, 440],
  ]),
  // It wriggles out, the yarn slips off, the ball rolls away; relieved, tail wagging.
  untangle: anim([
    [{ ...SIT, eye: 'down', ears: 'back', mouth: 'flat', tail: 'sitB', props: [BALL_NEXT(29, 22), ...wrapped(0, BODY_Y), EAR] }, 200],
    [{ ...SIT, eye: 'closed', ears: 'back', head: [-1, 0], tail: 'sitA', props: [BALL_NEXT(29, 22), ...wrapped(-1, BODY_Y), EAR] }, 180],
    [{ ...SIT, eye: 'closed', ears: 'back', head: [1, 0], tail: 'sitB', props: [BALL_NEXT(29, 22), ...wrapped(1, BODY_Y), { ...EAR, y: -1 }] }, 180],
    [{ ...SIT, eye: 'closed', head: [-1, 0], tail: 'sitA', props: [BALL_NEXT(30, 22), ...wrapped(-1, BODY_Y + 1), at(14, 0, EAR_LOOP)] }, 180],
    [{ ...SIT, eye: 'closed', head: [1, 1], tail: 'sitB', props: [BALL_NEXT(31, 22), at(9, 24, BAND_LOW), at(14, 21, SCRAP)] }, 180],
    [{ ...SIT, eye: 'wide', tail: 'sitA', props: [BALL_NEXT(35, 22), at(7, 27, BAND_LOW), at(13, 26, SCRAP)] }, 200],
    [{ ...SIT, eye: 'happy', tail: 'sitB', props: [BALL_NEXT(41, 22), at(7, 28, SCRAP)] }, 220],
    [{ ...SIT, eye: 'closed', mouth: 'open', head: [0, 1], bob: 1, tail: 'sitA', extras: ['sniffA'], props: [BALL_NEXT(48, 22)] }, 300],
    [{ ...SIT, eye: 'happy', tail: 'wagL' }, 200],
    [{ ...SIT, eye: 'happy', tail: 'wagR' }, 200],
    [{ ...SIT, eye: 'happy', tail: 'wagL' }, 120],
  ]),
} satisfies Record<string, Animation>;
