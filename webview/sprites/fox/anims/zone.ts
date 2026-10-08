import type { Animation, Glyph, Overlay } from '../../frames';
import { outlined } from '../../grid';
import { anim, type Pose } from '../pose';

const SIT = { body: 'sit' } as const;

// Where the middle of the sitting head is before a pose moves it: what it wears is placed from there.
const HEAD_X = 21;
const HEAD_Y = 12;
const headOf = (pose: Pose): readonly [number, number] => [
  HEAD_X + (pose.head?.[0] ?? 0),
  HEAD_Y + (pose.head?.[1] ?? 0) + (pose.bob ?? 0),
];
const held = (glyph: Glyph, x: number, y: number): Overlay => ({ x, y, glyph, mirrors: true });
const hidden = (glyph: Glyph, x: number, y: number): Overlay => ({ x, y, glyph, mirrors: true, behind: true });

// ---- The headband ---------------------------------------------------------------------------------------------

// Across the top of the forehead, from one edge of the head to the other: it has no outline of its own, the
// head's does.
const BAND: Glyph = ['AAAAAAAAAAA.', 'aaaaaaaaaaaa'];

// What hangs behind the head: its last two columns are the knot, `row` says which of its rows is the band's.
interface Ends {
  readonly glyph: Glyph;
  readonly row: number;
}
const ends = (row: number, fill: Glyph): Ends => ({ glyph: outlined(fill), row });

// Not tied yet: the two ends hang straight down.
const LOOSE = ends(0, ['...AA', '...aa', '.AaA.', '.AaA.', '.Aaa.', '.A...']);
// Tied, at rest.
const REST = ends(1, ['...A.', '...AA', '..Aaa', '.AaA.', '.AaA.', '.Aaa.', '.Aa..', '.A...']);
// Gathered in a paw behind the head, about to be pulled.
const BUNCH = ends(1, ['..A.', '.AAA', 'AAaa', '.aa.']);
// Pulled tight: both tails out straight.
const SNAP = ends(1, ['.........A.', 'AAAAAAAAAAA', '.AAAAAAAAaa', '........aa.', '..aaaaaaa..', '...aaaaa...']);
// Thrown up as the head comes up.
const WHIP = ends(4, ['A.........', '.AA.......', '.AAAA.....', '...AAAA.A.', '..a..AAAAA', '...aa..Aaa', '...aaaaaa.', '.....aaa..']);
// In the wind: the wave runs outward, from the knot to the tips.
const FLY: readonly Ends[] = [
  ends(2, ['..AA......', 'AAAAA...A.', '.A..AAAAAA', '.....AAAaa', '..aa...aa.', '...aaaaa..', '....aaa...']),
  ends(3, ['A.........', '.AA.......', '.AAA....A.', '...AAAAAAA', '....AAAAaa', '.......aa.', '..aa..aa..', '...aaaa...', '....aa....']),
  ends(2, ['A.........', '.A...AA.A.', '.AAAAAAAAA', '..AAA..Aaa', '.......aa.', '.....aaa..', '..aaaaa...', '...aa.....']),
  ends(2, ['....AA....', 'A..AAAA.A.', '.AAA..AAAA', '.AA....Aaa', '......aaa.', '....aaaa..', '..aaaa....', '...a......']),
];

// The far paw, up behind the head to tie or untie the knot.
const PAW_UP = outlined(['cc', 'cc', 'oo', 'oo', 'oo', 'oo']);
// The band off the head: sticking out from behind the chest, hanging from a paw, across the eyes, falling.
const PEEK = outlined(['AAAAA', 'aaaaa']);
const HANG_BACK = outlined(['..Aa', '..Aa', '.Aa.', '.Aa.', 'Aa..', 'Aa..', 'A...']);
const HANG_FRONT = outlined(['Aa..', 'Aa..', '.Aa.', '.Aa.', '.Aa.', 'Aa..', 'A...']);
const OVER_EYES: Glyph = ['AAAAAAAAAAAAAA', 'aaaaaaaaaaaaaa'];
const SLACK = outlined(['AA.....AA', 'aaAAAAAaa', '..aaaaa..']);
const FALLING = outlined(['.AA...', 'AaaA..', 'a..AAA', '...aaa', '....a.']);
const DRAPE = outlined(['.AAAA.', 'AAaaAA', 'Aa..aA', 'a....a']);

/** The pose with the band on its head and the ends behind it: both follow the head wherever the pose puts it. */
const banded = (pose: Pose, tails: Ends, ...more: Overlay[]): Pose => {
  const [hx, hy] = headOf(pose);
  return {
    ...pose,
    props: [
      // The ends first: their outline stops where the band begins.
      held(tails.glyph, hx - 5 - tails.glyph[0].length, hy - 5 - tails.row - 1),
      held(BAND, hx - 6, hy - 5),
      ...more,
    ],
  };
};

const FOCUS = { ...SIT, eye: 'down', mouth: 'flat', head: [1, 1] } as const;
const NEAR = { ...FOCUS, paw: 'tapNear' } as const;
const FAR = { ...FOCUS, paw: 'tapFar' } as const;

// ---- The lantern ----------------------------------------------------------------------------------------------

// Brass, with a wire handle you can see through, and four rows of glass.
const lamp = (glass: readonly [string, string, string, string]): Glyph => [
  '..KKK..',
  '.KtttK.',
  'Kt...tK',
  'Kt...tK',
  'KTtttkK',
  ...glass.map((row) => `K${row}K`),
  'KTttkkK',
  '.KKKKK.',
];
const DARK = lamp(['eDDDD', 'eDDDD', 'DDDDD', 'DDEDD']);
const FLARE = lamp(['XWWWX', 'WWWWW', 'WWWWW', 'XWWWX']);
const TALL = lamp(['XXWXX', 'XXWXX', 'XWWWX', 'XXWXX']);
const LEAN = lamp(['XXXXX', 'XWXXX', 'XWWXX', 'XXWXX']);
const SQUAT = lamp(['XXXXX', 'XXXXX', 'XXWWX', 'XWWWX']);
const DYING = lamp(['xxxxx', 'xxxxx', 'xxxxW', 'xxxWx']);

// Where it stands, in front of the paws, and where it hangs from the mouth.
const LAMP_X = 26;
const LAMP_Y = 20;
const standing = (glyph: Glyph): Overlay => held(glyph, LAMP_X, LAMP_Y);
const carried = (pose: Pose, glyph: Glyph = DARK): Pose => {
  const [hx, hy] = headOf(pose);
  // Behind the fox: the muzzle closes over the top of the handle.
  return { ...pose, props: [hidden(glyph, hx + 3, hy + 4)] };
};

// Its light: on the ground on both sides, under the chin and down the chest. Brighter with a taller flame.
const light = (ground: number, fox: Glyph): Overlay[] => [
  { x: LAMP_X - ground, y: 30, glyph: ['x' + 'X'.repeat(ground - 1)], mirrors: true },
  { x: LAMP_X + 7, y: 30, glyph: ['X'.repeat(ground - 1) + 'x'], mirrors: true },
  held(fox, 20, 17),
];
const SHINE_BIG: Glyph = ['.XXX', '....', '....', 'X...', 'X...', 'X...', 'X...', 'x...', 'x...'];
const SHINE_MID: Glyph = ['..XX', '....', '....', '....', 'X...', 'X...', 'X...', 'x...', '....'];
const SHINE_LOW: Glyph = ['..X.', '....', '....', '....', '....', 'X...', 'X...', '....', '....'];
const lit = (pose: Pose, glyph: Glyph): Pose => {
  const shine = glyph === TALL ? light(4, SHINE_BIG) : glyph === LEAN ? light(3, SHINE_MID) : light(2, SHINE_LOW);
  return { ...pose, props: [standing(glyph), ...shine] };
};

const SPARK = outlined(['.X.', 'XWX', '.X.']);
const PUFF = outlined(['QQ.', '.QQ']);
const SMOKE: readonly Glyph[] = [
  ['e.', '.e', 'e.'],
  ['.e.', '..e', '.e.', 'e..', '.e.'],
  ['..e', '...', '.e.', '...', 'e..'],
];

const COSY = { ...SIT, eye: 'sleepy', mouth: 'smile' } as const;

export const zoneAnims = {
  zoneIn: anim([
    [{ ...SIT }, 80],
    [{ ...SIT, eye: 'down', head: [0, 1], paw: 'tapNear', props: [hidden(PEEK, 19, 22)] }, 90],
    [{ ...SIT, eye: 'down', head: [0, 1], paw: 'wave1', props: [held(HANG_BACK, 23, 21)] }, 100],
    [{ ...SIT, eye: 'down', head: [-1, -1], paw: 'wave2', tail: 'sitB', props: [held(HANG_FRONT, 26, 17)] }, 120],
    [
      {
        ...SIT,
        eye: 'closed',
        head: [1, 4],
        paw: 'wave2',
        props: [held(LOOSE.glyph, 10, 13), held(OVER_EYES, 15, 14)],
      },
      90,
    ],
    [banded({ ...SIT, eye: 'closed', head: [1, 2], paw: 'beg' }, BUNCH), 90],
    [banded({ ...SIT, eye: 'closed', mouth: 'flat', ears: 'back', head: [2, 1], paw: 'beg' }, SNAP), 130],
    [banded({ ...SIT, eye: 'wide', head: [0, -1], tail: 'sitB' }, WHIP), 90],
    [banded({ ...SIT, tail: 'sitB' }, FLY[3]), 250],
    [banded(NEAR, FLY[0]), 100],
  ]),
  inTheZone: anim([
    [banded({ ...NEAR, bob: 1 }, FLY[0]), 90],
    [banded(FAR, FLY[1]), 70],
    [banded(NEAR, FLY[2]), 70],
    [banded({ ...FAR, bob: 1 }, FLY[3]), 90],
    [banded({ ...FOCUS, tail: 'sitB' }, FLY[0]), 150],
    [banded(NEAR, FLY[1]), 70],
    [banded(FAR, FLY[2]), 70],
    [banded({ ...NEAR, bob: 1 }, FLY[3]), 90],
    [banded(FAR, FLY[0]), 70],
    [banded(NEAR, FLY[1]), 70],
    [banded({ ...SIT, head: [0, -1], tail: 'sitB' }, FLY[2]), 260],
    [banded(FAR, FLY[3]), 100],
  ]),
  zoneOut: anim([
    [banded({ ...NEAR, bob: 1 }, FLY[0]), 100],
    [banded({ ...SIT, head: [0, -1] }, REST), 110],
    [banded({ ...SIT, eye: 'closed', head: [1, 1] }, REST, hidden(PAW_UP, 10, 8)), 100],
    [{ ...SIT, eye: 'closed', head: [1, 1], paw: 'wave1', props: [held(SLACK, 19, 10)] }, 80],
    [{ ...SIT, eye: 'down', paw: 'wave1', props: [held(FALLING, 24, 14)] }, 80],
    [{ ...SIT, eye: 'down', bob: 1, paw: 'wave1', props: [held(DRAPE, 22, 19)] }, 110],
    [{ ...SIT, eye: 'down', head: [0, 1], paw: 'tapNear', props: [hidden(PEEK, 19, 23)] }, 90],
    [{ ...SIT, eye: 'closed', mouth: 'open', bob: 1, head: [0, 1], tail: 'sitB' }, 240],
    [{ ...SIT, eye: 'happy', tail: 'sitA' }, 120],
    [{ ...SIT }, 80],
  ]),
  lanternIn: anim([
    [{ ...SIT }, 90],
    [{ ...SIT, away: true, head: [-2, 2], props: [hidden(DARK, 17, 16)] }, 110],
    [carried({ ...SIT, head: [-1, 1] }), 110],
    [carried({ ...SIT, head: [0, -1], tail: 'sitB' }), 160],
    [carried({ ...SIT, head: [1, 2], eye: 'down' }), 100],
    [carried({ ...SIT, head: [2, 4], eye: 'down' }), 140],
    [{ ...SIT, head: [1, 2], eye: 'down', props: [standing(DARK)] }, 100],
    [{ ...SIT, head: [-1, 0], eye: 'down', tail: 'sitB', props: [standing(DARK)] }, 120],
    [{ ...SIT, head: [0, 1], eye: 'down', paw: 'wave1', props: [hidden(DARK, LAMP_X, LAMP_Y), held(SPARK, 25, 17)] }, 80],
    [{ ...SIT, head: [-1, -1], eye: 'wide', props: [standing(FLARE), ...light(5, SHINE_BIG)] }, 90],
    [lit({ ...SIT, eye: 'wide', mouth: 'open', tail: 'sitB' }, TALL), 240],
    [lit({ ...SIT, eye: 'happy' }, LEAN), 200],
    [lit(COSY, SQUAT), 160],
  ]),
  lantern: anim([
    [lit(COSY, SQUAT), 300],
    [lit({ ...SIT, eye: 'down', tail: 'sitB' }, TALL), 240],
    [lit({ ...SIT, eye: 'happy', tail: 'sitB' }, LEAN), 260],
    [lit({ ...SIT, eye: 'down' }, TALL), 200],
    [lit({ ...SIT, eye: 'closed' }, SQUAT), 140],
    [lit(COSY, LEAN), 240],
    [lit({ ...SIT, eye: 'closed', head: [0, 1] }, TALL), 220],
    [lit({ ...SIT, eye: 'closed', head: [1, 2], bob: 1 }, SQUAT), 300],
    [lit({ ...SIT, eye: 'wide', head: [0, -1], tail: 'sitB' }, LEAN), 80],
    [lit({ ...SIT, mouth: 'flat' }, TALL), 180],
    [lit(COSY, SQUAT), 240],
    [lit(COSY, LEAN), 300],
  ]),
  lanternOut: anim([
    [lit(COSY, SQUAT), 100],
    [lit({ ...SIT, head: [-1, -1], mouth: 'flat' }, TALL), 120],
    [{ ...SIT, head: [1, 1], eye: 'closed', mouth: 'open', props: [standing(DYING), held(PUFF, 29, 16)] }, 110],
    [{ ...SIT, eye: 'open', props: [standing(DARK), held(SMOKE[0], 30, 16)] }, 100],
    [{ ...SIT, eye: 'up', head: [1, 2], props: [standing(DARK), held(SMOKE[1], 31, 10)] }, 90],
    [carried({ ...SIT, head: [2, 4], eye: 'closed' }), 100],
    [carried({ ...SIT, head: [-1, 1] }), 100],
    [{ ...SIT, away: true, head: [-2, 2], props: [hidden(DARK, 17, 16)] }, 100],
    [{ ...SIT, eye: 'happy', tail: 'sitB' }, 120],
    [{ ...SIT }, 80],
  ]),
} satisfies Record<string, Animation>;
