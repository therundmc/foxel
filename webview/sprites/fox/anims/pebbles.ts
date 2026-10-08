import type { Animation, Glyph, Overlay, Point } from '../../frames';
import { outlined } from '../../grid';
import { anim, type Pose } from '../pose';

type Step = [Pose, number];

// Stone fills, from the biggest (the foot of the tower) to the tiniest (the last one): slate, warm grey, brown,
// pale, sand. Each has a lit top, a darker underside and a shape of its own.
const FILLS: readonly Glyph[] = [
  ['.mmmeee.', 'meeeeeeD', '.eDDDDD.'],
  ['.qqNN.', 'NNNnnn'],
  ['.TTt.', 'tttkk'],
  ['Ymm.', 'mmee'],
  ['hT'],
];

/** A quarter turn clockwise: the way a stone rolls to the right. */
const turned = (g: Glyph): Glyph =>
  Array.from({ length: g[0].length }, (_, y) => Array.from({ length: g.length }, (_, x) => g[g.length - 1 - x][y]).join(''));

// Every stone lying flat, on its edge, upside down and on its other edge.
const STONES: readonly (readonly Glyph[])[] = FILLS.map((flat) => {
  const edge = turned(flat);
  const over = turned(edge);
  return [flat, edge, over, turned(over)].map(outlined);
});

const GROUND = 30; // bottom row of the outline of a thing lying on the ground
const HEAD: Point = [21, 12]; // middle of the head of a sitting fox

// Left column of each stone in the tower: none sits quite in the middle of the one under it.
const TOWER_X = [27, 27, 29, 28, 28] as const;
// Top row of each: a stone shares its bottom outline with the top outline of the one under it.
const TOWER_Y = STONES.reduce<number[]>((tops, [flat], k) => [...tops, (k === 0 ? GROUND + 1 : tops[k - 1] + 1) - flat.length], []);
// How far right of the middle of its head a stone hangs from its mouth: the small ones from the very tip.
const GRIP = [3, 4, 5, 6, 6] as const;

const stone = (k: number, x: number, y: number, turn = 0): Overlay => ({ x, y, glyph: STONES[k][turn % 4], mirrors: true });

/** Stone k whatever way up, placed by its middle: how it flies and tumbles. */
function tumbling(k: number, turn: number, cx: number, cy: number): Overlay {
  const glyph = STONES[k][turn % 4];
  return stone(k, Math.round(cx - glyph[0].length / 2), Math.round(cy - glyph.length / 2), turn);
}

/** The first n stones stacked, leaning by so many pixels at the top. */
function tower(n: number, lean = 0): Overlay[] {
  return Array.from({ length: n }, (_, k) => stone(k, TOWER_X[k] + (k === 0 ? 0 : Math.round((lean * k) / (n - 1))), TOWER_Y[k]));
}

/** The same things `by` pixels into the ground: what is under it is not drawn. */
function sunk(things: readonly Overlay[], by: number): Overlay[] {
  return things
    .map((o) => ({ ...o, y: o.y + by, glyph: o.glyph.slice(0, Math.max(0, GROUND + 1 - o.y - by)) }))
    .filter((o) => o.glyph.length > 0);
}

/** Sitting, its head moved by [dx, dy]. */
const sit = (dx: number, dy: number, more: Pose = {}): Pose => ({ body: 'sit', head: [dx, dy], ...more });

/** Sitting with its head `down` rows lower in all: past a point it has to crouch for it. */
function leaning(dx: number, down: number, more: Pose = {}): Pose {
  const bob = down >= 7 ? 2 : down >= 5 ? 1 : 0;
  return sit(dx, down - bob, { bob, ...more });
}

/**
 * Stone k in its mouth, `back` columns short of its place on the tower and `up` rows above it: the head is where
 * that puts it, the top edge of the stone being the line of its lips.
 */
function bringing(k: number, back: number, up: number, around: readonly Overlay[], more: Pose = {}): Pose {
  const x = TOWER_X[k] - back;
  const y = TOWER_Y[k] - up;
  return { ...leaning(x - GRIP[k] - HEAD[0], y - 4 - HEAD[1], more), props: [...around, stone(k, x, y)] };
}

/** Its mouth opens and the stone is on the tower: its head where it was with the stone `up` rows above its place. */
function lettingGo(k: number, up: number, things: readonly Overlay[], more: Pose = {}): Pose {
  return { ...bringing(k, 0, up, [], more), mouth: 'open', props: things };
}

/**
 * It keeps its stones on its far side: it turns its head away, dips for one and comes back with it between its
 * teeth, the stone showing from behind its head before its face does.
 */
function fetch(k: number, around: readonly Overlay[], rummage = 150): Step[] {
  const width = STONES[k][0][0].length;
  const peeking: Overlay = { ...stone(k, HEAD[0] - 2 + 9 + Math.min(3, width - 2) - width, HEAD[1] + 2), behind: true };
  return [
    [sit(-2, 0, { away: true, tail: 'sitB', props: around }), 90],
    [sit(-3, 2, { away: true, bob: 1, tail: 'sitA', props: around }), rummage],
    [sit(-2, 0, { away: true, tail: 'sitB', props: [...around, peeking] }), 80],
  ];
}

// The first one is the heavy one: it lets it go from a little way up, and blinks at the thud.
const first: Step[] = [
  ...fetch(0, []),
  [bringing(0, 3, 9, [], { tail: 'sitA' }), 110],
  [bringing(0, 2, 9, [], { tail: 'sitB' }), 80],
  [bringing(0, 1, 7, [], { eye: 'down', tail: 'sitB' }), 80],
  [bringing(0, 0, 5, [], { eye: 'down' }), 90],
  [bringing(0, 0, 4, [], { eye: 'down' }), 110],
  [bringing(0, 0, 3, [], { eye: 'down' }), 180],
  [lettingGo(0, 4, [stone(0, TOWER_X[0], TOWER_Y[0] - 2)], { eye: 'down' }), 60],
  [leaning(2, 5, { eye: 'closed', tail: 'sitB', props: tower(1) }), 90],
  [sit(0, 2, { eye: 'down', tail: 'sitB', props: tower(1) }), 110],
  [sit(-1, 0, { eye: 'happy', tail: 'sitA', props: tower(1) }), 280],
];

// The second one, with care: slower and slower, and a look at how it sits.
const one = tower(1);
const second: Step[] = [
  ...fetch(1, one),
  [bringing(1, 2, 6, one, { tail: 'sitA' }), 110],
  [bringing(1, 1, 7, one, { tail: 'sitB' }), 80],
  [bringing(1, 0, 5, one, { eye: 'down', tail: 'sitB' }), 80],
  [bringing(1, 0, 3, one, { eye: 'down' }), 100],
  [bringing(1, 0, 2, one, { eye: 'down' }), 130],
  [bringing(1, 0, 1, one, { eye: 'down' }), 200],
  [lettingGo(1, 2, tower(2), { eye: 'down' }), 90],
  [leaning(1, 4, { eye: 'wide', tail: 'sitB', props: tower(2, 1) }), 80],
  [sit(-1, 0, { eye: 'happy', tail: 'sitB', props: tower(2) }), 300],
];

// The third one: it is not sure, lifts it again, looks, and tries once more.
const two = tower(2);
const third: Step[] = [
  ...fetch(2, two),
  [bringing(2, 3, 3, two, { tail: 'sitA' }), 110],
  [bringing(2, 2, 5, two, { tail: 'sitB' }), 80],
  [bringing(2, 1, 4, two, { eye: 'down', tail: 'sitB' }), 80],
  [bringing(2, 0, 3, two, { eye: 'down' }), 100],
  [bringing(2, 0, 2, two, { eye: 'down' }), 150],
  [bringing(2, 0, 3, two, { tail: 'sitB' }), 120],
  [bringing(2, 1, 4, two, { eye: 'down', ears: 'back', tail: 'sitB' }), 260],
  [bringing(2, 0, 3, two, { eye: 'down' }), 100],
  [bringing(2, 0, 2, two, { eye: 'down' }), 120],
  [bringing(2, 0, 1, two, { eye: 'down' }), 200],
  [lettingGo(2, 2, tower(3), { eye: 'down' }), 90],
  [sit(2, 2, { eye: 'wide', tail: 'sitB', props: tower(3, 1) }), 80],
  [sit(1, 1, { eye: 'wide', tail: 'sitB', props: tower(3, -1) }), 80],
  [sit(-1, 0, { eye: 'happy', tail: 'sitA', props: tower(3) }), 300],
];

// The last one, high up: ears flat, not a breath while the tower sways, then it lets its breath out.
const three = tower(3);
const tense = { eye: 'wide', ears: 'back', mouth: 'flat' } as const;
const fourth: Step[] = [
  ...fetch(3, three),
  [bringing(3, 2, 2, three, { tail: 'sitA' }), 110],
  [bringing(3, 2, 3, three, { tail: 'sitB' }), 80],
  [bringing(3, 1, 4, three, { tail: 'sitB' }), 80],
  [bringing(3, 0, 3, three, { eye: 'down', ears: 'back' }), 120],
  [bringing(3, 0, 2, three, { eye: 'down', ears: 'back' }), 170],
  [bringing(3, 0, 1, three, { eye: 'down', ears: 'back' }), 320],
  [lettingGo(3, 2, tower(4), { eye: 'down', ears: 'back' }), 90],
  [sit(0, -1, { ...tense, props: tower(4, 1) }), 110],
  [sit(0, -1, { ...tense, props: tower(4, -1) }), 110],
  [sit(0, -1, { ...tense, props: tower(4) }), 220],
  [sit(-1, 1, { bob: 1, eye: 'closed', mouth: 'open', tail: 'sitB', props: tower(4) }), 180],
  [sit(-1, 0, { eye: 'happy', tail: 'sitA', props: tower(4) }), 300],
];

const stackPebbles = anim([
  [sit(0, 0, { tail: 'sitA' }), 200],
  [sit(1, 2, { eye: 'down', tail: 'sitB' }), 250],
  ...first,
  ...second,
  ...third,
  ...fourth,
]);

const four = tower(4);

// By its tower: it looks it over, blinks, sits back rather pleased with itself, and looks up at you.
const towerAdmire = anim([
  [sit(-1, 1, { eye: 'down', tail: 'sitA', props: four }), 600],
  [sit(-1, 1, { eye: 'down', tail: 'sitB', props: four }), 280],
  [sit(-1, 1, { eye: 'closed', tail: 'sitA', props: four }), 110],
  [sit(-1, 0, { eye: 'happy', tail: 'sitB', props: four }), 480],
  [sit(-1, 0, { bob: 1, eye: 'happy', tail: 'sitA', props: four }), 280],
  [sit(0, 0, { tail: 'sitB', props: four }), 350],
  [sit(0, 0, { tail: 'sitA', props: four }), 300],
]);

const five = tower(5);
// Nose, then chin on the top stone, it presses the tower into the ground and follows it down:
// [how far in the tower is, head forward by, head down by, for how long].
const PRESS: readonly (readonly [number, number, number, number])[] = [
  [0, 1, 0, 110],
  [1, 1, 1, 80],
  [3, 1, 3, 70],
  [6, 3, 4, 70],
  [9, 3, 7, 70],
  [12, 3, 10, 80],
  [14, 3, 10, 80],
  [16, 3, 10, 80],
];

const towerDone = anim([
  ...fetch(4, four, 120),
  [bringing(4, 3, 1, four, { tail: 'sitA' }), 100],
  [bringing(4, 2, 2, four, { tail: 'sitB' }), 80],
  [bringing(4, 1, 2, four, { eye: 'down', tail: 'sitB' }), 90],
  [bringing(4, 0, 1, four, { eye: 'down' }), 170],
  [lettingGo(4, 2, five, { eye: 'down' }), 90],
  [sit(-1, -1, { eye: 'happy', mouth: 'open', tail: 'sitB', extras: ['sparkleA'], props: five }), 210],
  [sit(-1, 0, { eye: 'happy', mouth: 'open', tail: 'sitA', extras: ['sparkleB'], props: five }), 210],
  ...PRESS.map(([by, dx, down, ms]): Step => [leaning(dx, down, { eye: 'closed', tail: by % 2 ? 'sitB' : 'sitA', props: sunk(five, by) }), ms]),
  [leaning(1, 5, { eye: 'happy', tail: 'sitB' }), 90],
  [sit(0, 0, { eye: 'happy', tail: 'sitA' }), 250],
]);

// The two top stones go: [turn, middle x, middle y] frame after frame, faster and faster down.
// The third tips over the edge of the second, lands on its edge and flops flat.
const THIRD_FALLS: readonly (readonly [number, number, number])[] = [
  [0, 36.5, 22],
  [1, 40, 23.5],
  [2, 41.5, 26],
  [3, 41, 27.5],
  [0, 41.5, 29],
  [0, 41.5, 29],
];
// The fourth is thrown clear, lands on its edge, bounces once and comes to rest.
const FOURTH_FALLS: readonly (readonly [number, number, number])[] = [
  [0, 38, 19],
  [1, 44, 20],
  [2, 48, 23],
  [3, 49, 28],
  [0, 50, 26],
  [0, 50, 29],
];

/** What is left standing, with the two that fell where they are in frame i of their fall. */
const falling = (i: number): Overlay[] => [
  stone(0, TOWER_X[0], TOWER_Y[0]),
  stone(1, TOWER_X[1] + 1, TOWER_Y[1]),
  tumbling(2, ...THIRD_FALLS[i]),
  tumbling(3, ...FOURTH_FALLS[i]),
];
const mess = falling(THIRD_FALLS.length - 1);
// The ground takes them back, the farthest first: how far in [the two still stacked, the third, the fourth] are.
const swallowed = (pair: number, third: number, fourth: number): Overlay[] => [
  ...sunk(mess.slice(0, 2), pair),
  ...sunk([mess[2]], third),
  ...sunk([mess[3]], fourth),
];
const wince = { eye: 'closed', ears: 'back', mouth: 'flat', bob: 1 } as const;

const towerFalls = anim([
  [sit(0, 0, { eye: 'wide', tail: 'sitA', props: tower(4, -1) }), 90],
  [sit(-1, 0, { eye: 'wide', tail: 'sitA', props: tower(4, 1) }), 90],
  [sit(-1, -1, { eye: 'wide', mouth: 'open', tail: 'sitB', props: tower(4, 2) }), 90],
  [sit(-1, -1, { eye: 'wide', mouth: 'open', ears: 'back', tail: 'sitB', props: tower(4, 3) }), 80],
  [sit(-2, 0, { ...wince, tail: 'sitB', props: falling(0) }), 70],
  [sit(-2, 0, { ...wince, tail: 'sitA', props: falling(1) }), 70],
  [sit(-2, 1, { ...wince, tail: 'sitA', props: falling(2) }), 70],
  [sit(-2, 1, { ...wince, tail: 'sitA', props: falling(3) }), 70],
  [sit(-1, 1, { ...wince, tail: 'sitA', props: falling(4) }), 80],
  [sit(-1, 1, { ...wince, tail: 'sitA', props: falling(5) }), 80],
  [sit(1, 2, { eye: 'down', ears: 'back', mouth: 'flat', tail: 'sitA', props: mess }), 320],
  [sit(0, 2, { ...wince, tail: 'sitA', props: swallowed(0, 0, 1) }), 180],
  [sit(0, 2, { ...wince, tail: 'sitA', props: swallowed(0, 1, 3) }), 100],
  [sit(0, -1, { bob: -1, eye: 'closed', tail: 'sitB', props: swallowed(1, 3, 4) }), 130],
  [sit(0, -1, { bob: -1, eye: 'closed', tail: 'sitB', props: swallowed(3, 4, 4) }), 110],
  [sit(0, 1, { eye: 'closed', tail: 'sitA', props: swallowed(5, 4, 4) }), 100],
  [sit(0, 0, { tail: 'sitA', props: swallowed(7, 4, 4) }), 100],
  [sit(0, 0, { eye: 'happy', tail: 'sitB' }), 250],
]);

export const pebblesAnims = {
  stackPebbles,
  towerAdmire,
  towerDone,
  towerFalls,
} satisfies Record<string, Animation>;
