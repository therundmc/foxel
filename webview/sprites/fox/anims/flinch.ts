import type { Animation, Overlay } from '../../frames';
import { outlined } from '../../grid';
import { TUCK, anim } from '../pose';

const SIT = { body: 'sit' } as const;

// A raised paw hiding the eyes, cream pads outward; the arm comes up from the chest.
const PAW_COVER = outlined(['.OOOOO.', 'OOOOOOO', 'OOOOOOO', 'ccccccc']);
const PAW_HALF = outlined(['OOOO', 'OOOO', 'cccc']);
const ARM = outlined(['OO', 'OO', 'OO', 'OO']);

const cover = (x: number, y: number): Overlay[] => [
  { x, y, glyph: PAW_COVER, mirrors: true },
  { x: x + 3, y: y + 4, glyph: ARM, mirrors: true },
];

export const flinchAnims = {
  flinch: anim([
    // Starts: the shock
    [{ ...SIT, bob: 1, eye: 'wide', mouth: 'open', ears: 'back', tail: 'sitA', head: [-1, 1] }, 150],
    // Paw comes up and hides the eyes
    [{ ...SIT, bob: 1, eye: 'closed', mouth: 'flat', ears: 'back', tail: 'sitA', head: [-1, 2], props: cover(21, 11) }, 260],
    [{ ...SIT, bob: 1, eye: 'closed', mouth: 'flat', ears: 'back', tail: 'sitB', head: [-1, 2], props: cover(21, 11), extras: ['sweat'] }, 420],
    [{ ...SIT, bob: 1, eye: 'closed', mouth: 'flat', ears: 'back', tail: 'sitA', head: [-1, 2], props: cover(21, 11), extras: ['sweat'] }, 300],
    // Peeks: paw slides down, one eye shows
    [{ ...SIT, bob: 1, eye: 'open', mouth: 'flat', ears: 'back', tail: 'sitA', head: [0, 2], props: [{ x: 21, y: 13, glyph: PAW_HALF, mirrors: true }] }, 380],
    // Sees it is not so bad
    [{ ...SIT, eye: 'happy', mouth: 'smile', ears: 'up', tail: 'sitB', head: [0, 1] }, 320],
    [{ ...SIT, eye: 'happy', mouth: 'smile', tail: 'sitA', head: [0, 1] }, 310],
    [{ ...SIT, tail: 'sitA' }, 260],
  ]),
  tada: anim([
    [{ bob: 1, eye: 'closed', mouth: 'flat', tail: 'flat' }, 100],
    [{ bob: 1, eye: 'open', tail: 'streamA' }, 80],
    [{ eye: 'happy', mouth: 'open', tail: 'high' }, 70],
    // Airborne 250-650 ms
    [{ legs: TUCK, bob: -1, eye: 'happy', mouth: 'open', tail: 'highL', extras: ['sparkleA'] }, 200],
    [{ legs: TUCK, eye: 'happy', mouth: 'open', tail: 'highR', extras: ['sparkleB'] }, 200],
    [{ bob: 1, eye: 'happy', mouth: 'open', tail: 'poof' }, 110],
    // Tail whirl
    [{ eye: 'happy', mouth: 'open', tail: 'highL', extras: ['sparkleA'] }, 130],
    [{ eye: 'happy', mouth: 'open', tail: 'highR', extras: ['sparkleB'] }, 130],
    [{ eye: 'happy', mouth: 'open', tail: 'wagL', extras: ['sparkleA'] }, 130],
    [{ eye: 'happy', mouth: 'open', tail: 'wagR', extras: ['sparkleB'] }, 130],
    [{ eye: 'happy', mouth: 'open', tail: 'highL', extras: ['sparkleA'] }, 130],
    [{ eye: 'happy', mouth: 'smile', tail: 'highR', extras: ['sparkleB'] }, 130],
    [{ eye: 'happy', tail: 'wagL' }, 170],
    [{ tail: 'up' }, 100],
  ]),
} satisfies Record<string, Animation>;
