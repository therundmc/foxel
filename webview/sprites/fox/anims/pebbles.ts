import type { Animation, Glyph, Overlay } from '../../frames';
import { outlined } from '../../grid';
import { anim, type Pose } from '../pose';

const SIT = { body: 'sit' } as const;

// Pebble fills, from the biggest (bottom of the tower) to the tiniest (the last one).
const PEBBLES: readonly Glyph[] = [
  ['..QQQQ..', '.QQmmmmD', 'mmmDDDDD'],
  ['.NNNq.', 'NNnnnD'],
  ['.eQee', 'eeDDD'],
  ['.mQm', 'mDDD'],
  ['Nq'],
].map(outlined);

// The heap they come from, from five stones down to one.
const HEAPS: readonly Glyph[] = [
  ['...QQ...', '..mmNN..', '.QmDnNQ.', 'mmDDnnNN'],
  ['..mmNN..', '.QmDnNQ.', 'mmDDnnNN'],
  ['.QmDnNQ.', 'mmDDnnNN'],
  ['mmDnNN'],
  ['NDn'],
].map(outlined);

const TOWER_X = 29; // middle of the tower
const HEAP_X = 38;
const GROUND = 31; // exclusive bottom row of a thing on the ground

const pebbleX = (k: number, cx = TOWER_X): number => Math.round(cx - PEBBLES[k][0].length / 2);

// Outline row of the top of a tower of n pebbles (outline rows are shared between neighbours).
function topOf(n: number): number {
  let bottom = GROUND;
  for (let k = 0; k < n; k++) {
    bottom -= PEBBLES[k].length - 1;
  }
  return n === 0 ? GROUND : bottom - 1;
}

// Bottom (exclusive) of pebble k once it is placed.
const seatOf = (k: number): number => (k === 0 ? GROUND : topOf(k) + 1);

/** The first n pebbles stacked, each moved by [dx, dy] given per pebble. */
function tower(n: number, shift: (k: number) => readonly [number, number] = () => [0, 0]): Overlay[] {
  return PEBBLES.slice(0, n).map((g, k) => {
    const [dx, dy] = shift(k);
    return { x: pebbleX(k) + dx, y: seatOf(k) - g.length + dy, glyph: g };
  });
}

/** What is left of the heap (stones to go), counted from five. */
function heap(left: number): Overlay[] {
  if (left <= 0) {
    return [];
  }
  const g = HEAPS[5 - left];
  return [{ x: HEAP_X, y: GROUND - g.length, glyph: g }];
}

/** Pebble k in the air, its middle at column cx and its bottom at row `bottom`. */
function held(k: number, cx: number, bottom: number): Overlay {
  const g = PEBBLES[k];
  return { x: Math.round(cx - g[0].length / 2), y: bottom - g.length, glyph: g, mirrors: true };
}

const WAG = ['sitA', 'sitB'] as const;

// One round of stacking pebble k: reach for the heap, pick up, carry, lower, let go, lean back to look.
function place(k: number): [Pose, number][] {
  const below = tower(k);
  const rest = heap(5 - k);
  const after = heap(4 - k);
  const seat = seatOf(k);
  const wag = WAG[k % 2];
  const lift = { ...SIT, tail: wag, head: [3, 3] } as const;
  return [
    [{ ...SIT, tail: wag, head: [3, 4], eye: 'down', props: [...rest, ...below] }, 230],
    [{ ...lift, eye: 'down', mouth: 'flat', props: [...after, ...below, held(k, 34, 27)] }, 190],
    [{ ...SIT, tail: wag, head: [1, 1], eye: 'down', mouth: 'flat', props: [...after, ...below, held(k, 31, 22)] }, 230],
    [
      { ...SIT, tail: wag, head: [0, 3], eye: 'down', mouth: 'flat', props: [...after, ...below, held(k, TOWER_X, seat - 4)] },
      330,
    ],
    [{ ...SIT, tail: wag, head: [0, 3], eye: 'down', props: [...after, ...below, held(k, TOWER_X, seat - 1)] }, 110],
    [{ ...SIT, tail: wag, head: [0, 2], eye: 'down', props: [...after, ...tower(k + 1)] }, 160],
    [{ ...SIT, tail: wag, head: [-1, 0], eye: 'happy', props: [...after, ...tower(k + 1)] }, 400],
  ];
}

const LOOK = { ...SIT, head: [1, 2], eye: 'down' } as const;

const stackPebbles = anim([
  [{ ...SIT, eye: 'down', head: [1, 1], props: heap(5) }, 160],
  ...[0, 1, 2, 3].flatMap(place),
  [{ ...LOOK, tail: 'sitA', props: [...heap(1), ...tower(4)] }, 120],
]);

const towerProps = [...heap(1), ...tower(4)];

const towerAdmire = anim([
  [{ ...LOOK, tail: 'sitA', props: towerProps }, 700],
  [{ ...LOOK, head: [1, 1], tail: 'sitB', props: towerProps }, 500],
  [{ ...SIT, tail: 'sitA', eye: 'happy', props: towerProps }, 700],
  [{ ...SIT, tail: 'sitB', props: towerProps }, 500],
]);

const seatTop = seatOf(4); // where the last pebble lands, on the tower of four

// Reach for the last stone of the heap, carry it up, set it on top.
const fetch: [Pose, number][] = [
  [{ ...LOOK, tail: 'sitA', head: [3, 4], props: towerProps }, 190],
  [{ ...SIT, tail: 'sitB', head: [3, 3], eye: 'down', mouth: 'flat', props: [...tower(4), held(4, 35, 27)] }, 150],
  [{ ...SIT, tail: 'sitA', head: [1, 1], eye: 'down', mouth: 'flat', props: [...tower(4), held(4, 31, seatTop - 7)] }, 160],
  [{ ...SIT, tail: 'sitB', head: [0, 2], eye: 'down', mouth: 'flat', props: [...tower(4), held(4, TOWER_X, seatTop - 3)] }, 210],
  [{ ...SIT, tail: 'sitA', head: [0, 2], eye: 'down', props: [...tower(4), held(4, TOWER_X, seatTop - 1)] }, 90],
];

const glad = { ...SIT, eye: 'happy', mouth: 'open' } as const;
// The tower slides off, a nudge at a time.
const slide = (dx: number): Overlay[] => tower(5, () => [Math.min(dx, 22), 0]);

const towerDone = anim([
  ...fetch,
  [{ ...SIT, tail: 'sitA', head: [0, 2], mouth: 'open', props: tower(5) }, 90],
  [{ ...glad, tail: 'sitA', extras: ['sparkleA'], props: tower(5) }, 220],
  [{ ...glad, tail: 'sitB', extras: ['sparkleB'], props: tower(5) }, 220],
  [{ ...SIT, tail: 'sitA', head: [1, 3], eye: 'closed', props: tower(5) }, 100],
  [{ ...SIT, tail: 'sitB', head: [2, 3], eye: 'closed', props: slide(2) }, 110],
  [{ ...SIT, tail: 'sitA', head: [3, 3], eye: 'closed', props: slide(6) }, 110],
  [{ ...SIT, tail: 'sitB', head: [3, 3], eye: 'closed', props: slide(12) }, 110],
  [{ ...SIT, tail: 'sitA', head: [2, 2], eye: 'happy', props: slide(18) }, 110],
  [{ ...SIT, tail: 'sitB', head: [1, 1], eye: 'happy', props: slide(22) }, 110],
  [{ ...SIT, tail: 'sitA', eye: 'happy' }, 130],
]);

// [dx, dy] of each pebble in each frame of the tumble; the biggest is slowest, one bounces up and away.
const TUMBLE: readonly (readonly (readonly [number, number])[])[] = [
  [[0, 0], [2, 1], [5, 4], [6, 3]],
  [[0, 0], [5, 3], [9, 6], [10, 6]],
  [[1, 0], [10, 4], [14, 4], [14, -2]],
  [[3, 0], [17, 4], [22, 7], [20, -6]],
  [[7, 0], [27, 4], [31, 7], [28, -4]],
  [[15, 0], [38, 4], [42, 7], [38, 0]],
  [[27, 0], [50, 4], [54, 7], [50, 4]],
];
const WOBBLE: readonly (readonly (readonly [number, number])[])[] = [
  [[0, 0], [0, 0], [1, 0], [-1, 0]],
  [[0, 0], [-1, 0], [-1, 0], [2, 0]],
  [[0, 0], [1, 0], [2, 0], [-2, 1]],
];
const rolled = (table: typeof TUMBLE, i: number): Overlay[] => tower(4, (k) => [Math.min(table[i][k][0], 21), table[i][k][1]]);

const towerFalls = anim([
  ...WOBBLE.map((_, i): [Pose, number] => [
    { ...SIT, tail: 'sitA', head: [1, 2], eye: 'wide', props: rolled(WOBBLE, i) },
    120,
  ]),
  ...TUMBLE.map((_, i): [Pose, number] => [
    { ...SIT, tail: 'flat', head: [i < 2 ? 0 : 1, 2], eye: i < 2 ? 'wide' : 'down', ears: 'back', mouth: 'flat', props: rolled(TUMBLE, i) },
    i < 2 ? 110 : 100,
  ]),
  [{ ...SIT, tail: 'sitA', head: [0, 2], eye: 'down', ears: 'back', mouth: 'flat' }, 350],
  [{ ...SIT, tail: 'sitB', head: [0, 1], bob: 1, eye: 'closed', ears: 'back' }, 220],
  [{ ...SIT, tail: 'sitA', head: [0, 0], eye: 'closed', mouth: 'smile' }, 220],
  [{ ...SIT, tail: 'sitB', eye: 'happy' }, 250],
]);

export const pebblesAnims = {
  stackPebbles,
  towerAdmire,
  towerDone,
  towerFalls,
} satisfies Record<string, Animation>;
