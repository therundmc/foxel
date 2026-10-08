import type { Animation, Glyph, Overlay } from '../../frames';
import { TUCK, anim } from '../pose';

const SIT = { body: 'sit' } as const;

// The near foreleg raised to its face, drawn over the head: cream toes on top, the forearm coming down to the elbow
// under its chin. Open at the bottom, where it runs into the upper arm the body draws itself (`paw: 'beg'`).
const TOES = ['..KKK..', '.KcccK.', 'KccccK.', 'KOOOOK.'];
const ELBOW = ['....OO.', '....OO.'];
const PAW_OVER_EYE: Glyph = [...TOES, 'KOOOOK.', '.KKOOK.', '..KOOK.', '..KOOOK', '...KOOK', ...ELBOW];
// Two pixels lower, the forearm that much shorter: an eye shows over it.
const PAW_PEEK: Glyph = [...TOES, 'KOOOOK.', '.KKKOOK', '...KOOK', ...ELBOW];
// On its way up or down, still against its chin.
const PAW_AT_CHIN: Glyph = [...TOES, 'KOOOOO.', '.KKKOO.'];

// `top` is where the toes are; the elbow stays where the body puts it.
const arm = (glyph: Glyph, top: number): Overlay[] => [{ x: 19, y: top, glyph, mirrors: true }];

// One drop of sweat: it beads behind its ear and swells, runs down the back of its head, then slips out of sight
// behind its neck.
const BEAD: Glyph = ['C'];
const DROPLET: Glyph = ['.C.', 'CCC'];
const DROP: Glyph = ['.C.', '.C.', 'CCC', 'CwC', '.C.'];
const sweat = (glyph: Glyph, x: number, y: number): Overlay[] => [{ x, y, glyph }];
const sweatGone = (x: number, y: number): Overlay[] => [{ x, y, glyph: DROP, behind: true }];

// A sparkle is born as a dot, opens, and thins out before it is gone.
const SPARK = [
  ['H'],
  ['.H.', 'HHH', '.H.'],
  ['..H..', '..H..', '.HHH.', 'HHHHH', '.HHH.', '..H..', '..H..'],
  ['..H..', '.....', '.....', 'H...H', '.....', '.....', '..H..'],
] as const satisfies readonly Glyph[];
/** A sparkle centred on (x, y), at this moment of its life. */
const spark = (age: number, x: number, y: number): Overlay => {
  const glyph = SPARK[age];
  return { x: x - (glyph[0].length - 1) / 2, y: y - (glyph.length - 1) / 2, glyph };
};

// A tail held high starts a pixel off the rump: this joins the two.
const ROOT: Glyph = ['...OK', 'KOOOO', '.KK..'];
const root = (bob = 0): Overlay => ({ x: 4, y: 17 + bob, glyph: ROOT, mirrors: true });

const GLAD = { eye: 'happy', mouth: 'open' } as const;

export const flinchAnims = {
  flinch: anim([
    // The jolt: a squash, then the whole body starts up, ears flat, tail bristling
    [{ ...SIT, bob: 1, head: [0, 1], eye: 'wide', mouth: 'flat', tail: 'sitB' }, 60],
    [{ ...SIT, bob: -1, head: [0, -1], eye: 'wide', mouth: 'open', ears: 'back', tail: 'poof' }, 120],
    [{ ...SIT, head: [-1, 0], eye: 'wide', mouth: 'open', ears: 'back', tail: 'poof' }, 90],
    // Ducks, the paw coming up
    [{ ...SIT, bob: 1, head: [-1, 0], paw: 'beg', eye: 'closed', mouth: 'flat', ears: 'back', tail: 'flat', props: arm(PAW_AT_CHIN, 15) }, 70],
    // Hides its eyes behind its paw
    [{ ...SIT, bob: 1, head: [-1, 2], paw: 'beg', eye: 'closed', mouth: 'flat', ears: 'back', tail: 'streamB', props: arm(PAW_OVER_EYE, 11) }, 90],
    [{ ...SIT, bob: 1, head: [-1, 1], paw: 'beg', eye: 'closed', mouth: 'flat', ears: 'back', tail: 'sitA', props: arm(PAW_OVER_EYE, 10) }, 240],
    [{ ...SIT, bob: 1, head: [-1, 1], paw: 'beg', eye: 'closed', mouth: 'flat', ears: 'back', tail: 'sitB', props: arm(PAW_OVER_EYE, 10) }, 80],
    [{ ...SIT, bob: 1, head: [-1, 1], paw: 'beg', eye: 'closed', mouth: 'flat', ears: 'back', tail: 'sitA', props: arm(PAW_OVER_EYE, 10) }, 200],
    // Peeks over it
    [{ ...SIT, bob: 1, head: [-1, 0], paw: 'beg', eye: 'up', mouth: 'flat', ears: 'back', tail: 'sitA', props: arm(PAW_PEEK, 12) }, 340],
    // Sees it is not so bad: the paw comes down, the ears come back up
    [{ ...SIT, head: [-1, 0], paw: 'beg', mouth: 'flat', ears: 'back', tail: 'sitA', props: arm(PAW_AT_CHIN, 14) }, 80],
    [{ ...SIT, head: [0, -1], mouth: 'flat', tail: 'sitA' }, 200],
    // Sheepish: a glance up at us from under, a little wag, and the drop of sweat that goes with it
    [{ ...SIT, head: [-1, 1], eye: 'up', tail: 'sitB', props: sweat(BEAD, 12, 8) }, 240],
    [{ ...SIT, head: [-1, 1], eye: 'happy', tail: 'sitA', props: sweat(DROPLET, 10, 7) }, 110],
    [{ ...SIT, head: [-1, 1], eye: 'happy', tail: 'sitB', props: sweat(DROP, 10, 6) }, 130],
    [{ ...SIT, head: [-1, 1], eye: 'happy', tail: 'sitA', props: sweat(DROP, 9, 9) }, 90],
    [{ ...SIT, head: [-1, 1], eye: 'happy', tail: 'sitB', props: sweatGone(9, 12) }, 80],
    [{ ...SIT, head: [-1, 1], eye: 'happy', tail: 'sitA', props: sweatGone(9, 14) }, 70],
    [{ ...SIT, eye: 'happy', tail: 'sitB' }, 120],
    [{ ...SIT, tail: 'sitA' }, 200],
  ]),
  tada: anim([
    // Gathers itself: down, and down again, then pushes off
    [{ bob: 1, mouth: 'flat', tail: 'flat' }, 70],
    [{ bob: 2, head: [0, 1], eye: 'closed', mouth: 'flat', ears: 'back', tail: 'streamB' }, 130],
    [{ bob: -1, head: [0, -1], mouth: 'open', tail: 'flat' }, 50],
    // In the air from 250 to 650 ms: legs trailing, tucked at the top, reaching for the ground
    [{ bob: -1, ...GLAD, tail: 'streamA' }, 100],
    [{ legs: TUCK, ...GLAD, tail: 'up' }, 200],
    [{ bob: -1, ...GLAD, tail: 'high', props: [root(-1)] }, 100],
    // Lands: squash, and up again
    [{ bob: 2, head: [0, 1], eye: 'closed', mouth: 'open', tail: 'up' }, 70],
    [{ bob: -1, ...GLAD, tail: 'wagR' }, 80],
    // Whirls its tail: round, round, and a big slow one, a sparkle flying off each time it comes over the top
    [{ bob: 1, ...GLAD, tail: 'wagL' }, 50],
    [{ ...GLAD, tail: 'highL', props: [root()] }, 50],
    [{ ...GLAD, tail: 'highR', props: [root(), spark(0, 9, 0)] }, 70],
    [{ bob: 1, ...GLAD, tail: 'wagR', props: [spark(1, 10, -2)] }, 70],
    [{ bob: 1, ...GLAD, tail: 'wagL', props: [spark(2, 11, -4)] }, 50],
    [{ ...GLAD, tail: 'highL', props: [root(), spark(3, 11, -5)] }, 50],
    [{ ...GLAD, tail: 'highR', props: [root(), spark(0, 9, 0)] }, 70],
    [{ bob: 1, ...GLAD, tail: 'wagR', props: [spark(1, 8, -3)] }, 70],
    [{ bob: 1, ...GLAD, tail: 'wagL', props: [spark(2, 7, -5)] }, 90],
    [{ head: [0, -1], ...GLAD, tail: 'highL', props: [root(), spark(3, 7, -6)] }, 90],
    [{ head: [0, -1], ...GLAD, tail: 'highR', props: [root(), spark(0, 9, 0), spark(0, 30, 4)] }, 150],
    [{ head: [0, -1], ...GLAD, tail: 'wagR', props: [spark(1, 9, -2), spark(1, 31, 2)] }, 110],
    // Settles: the tail swings past and comes to rest
    [{ bob: 1, eye: 'happy', tail: 'wagL', props: [spark(2, 9, -4), spark(2, 32, 0)] }, 90],
    [{ eye: 'happy', tail: 'up', props: [spark(3, 9, -5), spark(3, 32, -1)] }, 90],
    [{ tail: 'up' }, 120],
  ]),
} satisfies Record<string, Animation>;
