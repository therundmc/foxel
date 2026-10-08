import type { Animation, Glyph } from '../../frames';
import { outlined } from '../../grid';
import { anim, type Pose } from '../pose';

const SIT = { body: 'sit' } as const;

// A chubby hourglass, 11 by 13 with its outline: two wooden caps, two glass bulbs that meet at a one-pixel neck.
const SHELL = [
  'TTTTTTTTT',
  '.Wwwwwww.',
  '.wwwwwww.',
  '..wwwww..',
  '...www...',
  '....w....',
  '...www...',
  '..Wwwww..',
  '.wwwwwww.',
  '.wwwwwww.',
  'ttttttttt',
];

/** Lays the letters of `layer` over `base`, which shows through its dots. */
function over(base: Glyph, layer: Glyph): string[] {
  return base.map((row, y) => [...row].map((c, x) => (layer[y]?.[x] ?? '.') === '.' ? c : layer[y][x]).join(''));
}

// Where the sand is, from the top bulb full to the top bulb empty: it sinks above, and heaps up below.
const SAND: readonly Glyph[] = [
  ['', '', '.xxxxxxx.', '..xxxxx..', '...xxx...'],
  ['', '', '.xx...xx.', '..xxxxx..', '...xxx...', '', '', '', '', '...xxx...'],
  ['', '', '', '..xxxxx..', '...xxx...', '', '', '', '', '.xxxxxxx.'],
  ['', '', '', '', '...xxx...', '', '', '', '..xxxxx..', '.xxxxxxx.'],
  ['', '', '', '', '', '', '', '...xxx...', '..xxxxx..', '.xxxxxxx.'],
];
// The thread of sand through the neck, one grain in two: the two pictures alternate, and it trickles.
const THREADS: readonly Glyph[] = [
  ['', '', '', '', '', '....x....', '', '....x....', '', '....x....'],
  ['', '', '', '', '', '', '....x....', '', '....x....'],
];

const upright = (level: number, thread?: number): Glyph =>
  outlined(over(thread === undefined ? SHELL : over(SHELL, THREADS[thread]), SAND[level]));

/** `RUN[level][phase]`: the sand running; the last level has run out. */
const RUN = [0, 1, 2, 3].map((level) => [upright(level, 0), upright(level, 1)]);
const EMPTY = upright(4);
/** Turned over and not running yet: in its mouth, or the instant it lands. */
const FULL = upright(0);

// Turning over, top first and away from the fox: the sand lies in the bulb that was the bottom one.
const TILT_A = outlined([
  '.......TT....',
  '.......wTT...',
  '......WwwTT..',
  '......wwwwTT.',
  '......wwwwwTT',
  '.......wwwwwT',
  '..Www.w.www..',
  'twwwww.......',
  'ttxxxxx......',
  '.ttxxxx......',
  '..ttxxx......',
  '...ttx.......',
  '....tt.......',
]);
const SIDE = outlined([
  'T.........t',
  'TWw.....Wwt',
  'Twww...wwwt',
  'Twwww.wwwwt',
  'Txxxxwwwwwt',
  'Txxxx.wwwwt',
  'Txxx...wwwt',
  'Txx.....wwt',
  'T.........t',
]);
const TILT_B = outlined([
  '....TT.......',
  '...TTW.......',
  '..TTwww......',
  '.TTwwww......',
  'TTxxxxx......',
  'Txxxxx.......',
  '..xxx.x.Www..',
  '.......wwwwwt',
  '......wwwwwtt',
  '......wwwwtt.',
  '......wwwtt..',
  '.......wtt...',
  '.......tt....',
]);

type Prop = NonNullable<Pose['props']>[number];

/** Where it stands on the ground, just in front of the fox's nose. */
const AT_X = 28;
const AT_Y = 18;
const hg = (glyph: Glyph, x = AT_X, y = AT_Y): Prop => ({ x, y, glyph, mirrors: true });
/** Held by the end of its top cap: it follows the head. */
const held = (dx: number, dy: number): Prop => hg(FULL, 26 + dx, 15 + dy);
/** On the far side of the fox, which hides it. */
const hidden = (x: number, y: number): Prop => ({ x, y, glyph: FULL, mirrors: true, behind: true });

// The raised paw of `wave1` stops at x = 27: this patch lengthens it by `n` pixels, to reach what it turns.
const reach = (n: number): Prop => ({
  x: 25,
  y: 20,
  glyph: [`${'K'.repeat(n + 2)}.`, `${'O'.repeat(n)}ccK`, `${'O'.repeat(n)}ccK`, `${'K'.repeat(n + 2)}.`],
  mirrors: true,
});

/** Sitting in front of its hourglass at this sand `level`; frames alternate the `phase` of the thread. */
const watch = (level: number, phase: number, pose: Pose): Pose => ({ ...SIT, ...pose, props: [hg(RUN[level][phase])] });

export const hourglassAnims = {
  // It fetches its hourglass from behind itself, sets it down under its nose and settles to watch.
  hourglassIn: anim([
    [{ head: [-1, 0] }, 90],
    [{ ...SIT, bob: 1, away: true, head: [-2, 1], tail: 'sitB' }, 130],
    [{ ...SIT, away: true, head: [-1, 0], tail: 'sitA', props: [hidden(14, 10)] }, 100],
    [{ ...SIT, away: true, head: [0, -1], tail: 'sitB', props: [hidden(17, 7)] }, 100],
    [{ ...SIT, head: [0, -1], eye: 'happy', tail: 'sitB', props: [held(0, -1)] }, 160],
    [{ ...SIT, head: [1, 1], eye: 'down', tail: 'sitA', props: [held(1, 1)] }, 100],
    [{ ...SIT, head: [2, 3], eye: 'closed', mouth: 'open', tail: 'sitA', props: [held(2, 3)] }, 120],
    [{ ...SIT, head: [0, -1], eye: 'happy', tail: 'sitB', props: [hg(RUN[0][1])] }, 130],
    [watch(0, 0, { tail: 'sitA', eye: 'down' }), 380],
  ]),
  // It follows the sand down, gets bored, perks up when the top is empty and turns it over with a paw.
  hourglassWait: anim([
    [watch(0, 0, { tail: 'sitA', eye: 'down' }), 320],
    [watch(0, 1, { tail: 'sitA', eye: 'down', head: [0, 1] }), 260],
    [watch(1, 0, { tail: 'sitB', eye: 'down', head: [0, 2] }), 320],
    [watch(1, 1, { tail: 'sitB', eye: 'down', head: [1, 2] }), 300],
    [watch(1, 0, { tail: 'sitA', head: [0, 0] }), 260],
    [watch(2, 1, { tail: 'sitA', eye: 'sleepy', ears: 'back', head: [0, 1] }), 240],
    [watch(2, 0, { tail: 'sitA', eye: 'closed', ears: 'back', mouth: 'flat', head: [0, 0] }), 140],
    [watch(2, 1, { tail: 'sitB', eye: 'closed', ears: 'back', mouth: 'open', head: [-1, -1] }), 400],
    [watch(2, 0, { tail: 'sitA', eye: 'closed', ears: 'back', head: [0, 1] }), 180],
    [watch(3, 1, { tail: 'sitA', eye: 'up', head: [-1, -1] }), 340],
    [watch(3, 0, { tail: 'sitA', eye: 'down', paw: 'tapNear' }), 90],
    [watch(3, 1, { tail: 'sitA', eye: 'down' }), 130],
    [watch(3, 0, { tail: 'sitB', eye: 'down', paw: 'tapNear' }), 90],
    [watch(3, 1, { tail: 'sitB', eye: 'down', head: [0, 1] }), 220],
    [{ ...SIT, tail: 'sitB', eye: 'wide', head: [0, -1], props: [hg(EMPTY)] }, 300],
    [{ ...SIT, tail: 'sitA', eye: 'wide', head: [-1, 0], paw: 'beg', props: [hg(EMPTY)] }, 120],
    [{ ...SIT, tail: 'sitA', mouth: 'tongue', head: [1, 1], paw: 'wave1', props: [hg(EMPTY), reach(2)] }, 110],
    [{ ...SIT, tail: 'sitB', mouth: 'tongue', paw: 'wave1', props: [hg(TILT_A, 27, 14)] }, 80],
    [{ ...SIT, tail: 'sitB', mouth: 'tongue', eye: 'up', paw: 'wave1', props: [hg(SIDE, 27, 17)] }, 80],
    [{ ...SIT, tail: 'sitB', mouth: 'tongue', paw: 'wave1', props: [hg(TILT_B, 27, 15)] }, 80],
    [{ ...SIT, tail: 'sitA', eye: 'happy', head: [1, 1], paw: 'wave1', props: [hg(FULL), reach(2)] }, 120],
    [watch(0, 1, { tail: 'sitB', eye: 'happy', head: [0, -1], paw: 'beg' }), 200],
  ]),
  // It takes it by the cap, turns its head away and tucks it behind itself.
  hourglassOut: anim([
    [watch(0, 1, { tail: 'sitA', eye: 'down', head: [0, 1] }), 110],
    [{ ...SIT, head: [2, 3], eye: 'closed', mouth: 'open', tail: 'sitA', props: [held(2, 3)] }, 110],
    [{ ...SIT, head: [1, 1], eye: 'happy', tail: 'sitB', props: [held(1, 1)] }, 130],
    [{ ...SIT, head: [0, -1], eye: 'happy', tail: 'sitB', props: [held(0, -1)] }, 100],
    [{ ...SIT, away: true, head: [0, -1], tail: 'sitA', props: [hidden(17, 7)] }, 100],
    [{ ...SIT, away: true, head: [-1, 0], tail: 'sitA', props: [hidden(14, 10)] }, 100],
    [{ ...SIT, bob: 1, away: true, head: [-2, 1], tail: 'sitB' }, 110],
    [{ ...SIT, eye: 'happy', tail: 'sitB' }, 140],
    [{ ...SIT, tail: 'sitA' }, 200],
  ]),
  // Dozed off sitting up: it wakes with a start, looks both ways, shakes it off and is a little sheepish.
  startAwake: anim([
    [{ ...SIT, tail: 'sitA', eye: 'closed', head: [0, 2] }, 260],
    [{ ...SIT, tail: 'sitB', eye: 'closed', head: [0, 3] }, 220],
    [{ ...SIT, bob: -1, tail: 'poof', eye: 'wide', mouth: 'open', head: [0, -2] }, 110],
    [{ ...SIT, bob: -1, tail: 'poof', eye: 'wide', mouth: 'flat', head: [0, -1] }, 130],
    [{ ...SIT, tail: 'sitB', eye: 'wide', mouth: 'flat', head: [-2, 0] }, 170],
    [{ ...SIT, tail: 'sitA', eye: 'wide', mouth: 'flat', head: [2, 0] }, 170],
    [{ ...SIT, tail: 'sitB', eye: 'closed', head: [-1, 0] }, 70],
    [{ ...SIT, tail: 'sitA', eye: 'closed', head: [1, 0] }, 70],
    [{ ...SIT, tail: 'sitB', eye: 'closed', head: [-1, 0] }, 70],
    [{ ...SIT, tail: 'sitA', eye: 'happy', ears: 'back', head: [0, 1] }, 240],
  ]),
} satisfies Record<string, Animation>;
