import { prerender, px, seeded, type VistaView } from './paint';
import { hash, lightOn } from './rain-plan';
import { drawBough, drawMass, type Brush, type Tones } from './rain-trees';

// The Japanese countryside in autumn, seen from under the trees. Three planes: wooded hills far away, ridge behind
// ridge, where only the colours of the forest can be told and the mist lies in every fold; the floor of the valley;
// and right in front of us, in the upper corners, the foliage of the trees we stand under, so close that it is
// all we see of them. Nothing here moves: each plane is painted once for a view, under the rain and in the warm
// light, and the two are blended as the light comes.

/** Maples in vermilion, scarlet, orange and gold; the clear yellow of a ginkgo; the dark of a cedar. */
const MAPLES: readonly Tones[] = [
  ['#a02c20', '#d0442a', '#ee6c3c'],
  ['#84202e', '#b62c34', '#d84c44'],
  ['#b2581e', '#de7c28', '#f4a446'],
  ['#b48622', '#dfa930', '#f4cc5a'],
];
const VERMILION = 0;
const ORANGE = 2;
const GOLD = 3;
const GINKGO: Tones = ['#bd9828', '#e8c83c', '#f8e682'];
const PINES: Tones = ['#2a4038', '#375646', '#4f7257'];
const BARK: Tones = ['#2e2226', '#3b2b2e', '#5e4a48'];
/** The ground under the trees, a carpet of fallen leaves. */
const FLOOR = '#7a5238';
/** What the wet air and the warm light do to a colour, and how much of it each row has lost to the air. */
const DULL = '#5c5a64';
const RAIN_AIR = '#a4a7a8';
const SUN = '#ffc860';
const GOLD_AIR = '#f2e0b8';
const GLINT = '#fff2b8';
const HAZE = [0.6, 0.4, 0.04] as const;
const [FAR, MIDDLE, NEAR] = [0, 1, 2];

/** The colour `amount` of the way from one `#rrggbb` to another, as `#rrggbb` again so it can be blended further. */
function tint(from: string, to: string, amount: number): string {
  const part = (i: number): string => {
    const a = parseInt(from.slice(i, i + 2), 16);
    const b = parseInt(to.slice(i, i + 2), 16);
    return Math.round(a + (b - a) * amount).toString(16).padStart(2, '0');
  };
  return `#${part(1)}${part(3)}${part(5)}`;
}

/** A colour as a row of trees shows it: under the rain, and in the warm light. */
const lights = (color: string, haze: number): [string, string] => [
  tint(tint(color, DULL, 0.24), RAIN_AIR, haze),
  tint(tint(color, SUN, 0.16), GOLD_AIR, haze * 0.6),
];

/** Three tones in both lights; in the warm one, what is lit glows. */
function tonesIn(tones: Tones, haze: number): Tones[] {
  const [shade, body, light] = tones.map((color) => lights(color, haze));
  return [
    [shade[0], body[0], light[0]],
    [shade[1], body[1], tint(light[1], GLINT, 0.3 * (1 - haze))],
  ];
}

/** One wooded ridge: where its top is, how high it stands over the valley, how far it reaches on each side, how much the air has taken of it. */
interface Ridge {
  readonly x: number;
  readonly high: number;
  readonly reach: number;
  readonly haze: number;
}

interface Layout {
  /** The measure of the picture, and the row each plane stands on. */
  readonly tall: number;
  readonly feet: readonly [number, number, number];
  /** The hills, the farthest first. */
  readonly ridges: readonly Ridge[];
  /** The size of a cloud of leaves of the trees we stand under. */
  readonly bough: number;
}

function layoutOf({ w, h, dir }: VistaView): Layout {
  const tall = Math.round(Math.min(130, Math.max(46, h * 0.9)));
  const depth = Math.min(10, Math.max(3, Math.round(h * 0.1)));
  const high = Math.min(78, Math.max(12, h * 0.5));
  const reach = Math.max(64, w * 0.34);
  const middle = w * (0.5 + 0.06 * dir);
  return {
    tall,
    feet: [h - 3 - depth, h - 3 - Math.round(depth / 2), h - 3],
    // Each nearer one is lower, clearer and set to the other side, so every ridge shows above the next.
    ridges: [
      { x: middle - dir * reach * 0.8, high, reach: reach * 0.9, haze: 0.84 },
      { x: middle + dir * reach * 0.75, high: high * 0.84, reach: reach * 0.85, haze: 0.72 },
      { x: middle - dir * reach * 0.05, high: high * 0.58, reach: reach * 0.8, haze: HAZE[FAR] },
    ],
    bough: Math.round(Math.min(Math.min(70, Math.max(18, h * 0.5)), w * 0.3)),
  };
}

/** How high a ridge stands at `x`, as a share of its height: a broad rounded back, never quite regular. */
function ridgeAt(x: number, ridge: Ridge): number {
  const away = (x - ridge.x) / ridge.reach;
  return Math.max(0, 1 - away * away) ** 1.3 * (0.93 + 0.07 * Math.sin(x * 0.09 + ridge.x));
}

/** The clouds of leaves in an upper corner, from the corner inward: [aside, down, width, depth] in boughs. */
const CANOPY = [
  [0.15, 0.02, 1, 0.46],
  [1.05, -0.06, 0.86, 0.4],
  [0.1, 0.72, 0.62, 0.36],
  [1.85, 0.1, 0.56, 0.3],
  [0.78, 0.5, 0.5, 0.28],
  [-0.05, 1.3, 0.4, 0.3],
] as const;

// The ground a row stands on, from its foot down: a carpet of fallen leaves, a few of them still bright.
function drawFloor({ w, h }: VistaView, inks: readonly CanvasRenderingContext2D[], foot: number, haze: number, random: () => number): void {
  const floor = lights(FLOOR, haze);
  inks.forEach((ink, k) => px(ink, 0, foot, floor[k], 1, w, h - foot));
  for (let n = Math.round(w * (h - foot) * 0.08); n > 0; n--) {
    const leaf = lights(MAPLES[Math.floor(random() * MAPLES.length)][1], haze);
    const x = Math.floor(random() * w);
    const y = foot + Math.floor(random() * (h - foot));
    inks.forEach((ink, k) => px(ink, x, y, leaf[k]));
  }
}

interface Shiver {
  readonly x: number;
  readonly y: number;
  /** The tone the leaf flicks to, under the rain and in the warm light. */
  readonly colors: readonly [string, string];
}
const MOST_SHIVERS = 260;

interface Row {
  readonly rainy: HTMLCanvasElement;
  readonly golden: HTMLCanvasElement;
}

export interface Grove {
  readonly key: string;
  /** How tall its near trees are, and the row each row of trees stands on, the farthest first. */
  readonly tall: number;
  readonly feet: readonly [number, number, number];
  readonly rows: readonly Row[];
  readonly shivers: readonly Shiver[];
}

function drawGrove(view: VistaView, key: string): Grove {
  const { w, h, dir } = view;
  const { tall, feet, ridges, bough } = layoutOf(view);
  const random = seeded(0x6a70);
  const shivers: Shiver[] = [];
  const rows = HAZE.map(() => [0, 1].map(() => prerender(w, h, () => undefined)));
  const inks = rows.map((row) => row.map((image) => image.getContext('2d') as CanvasRenderingContext2D));
  const brush = (row: number, leaves: Tones, haze: number, grain: number): Brush => {
    const tones = tonesIn(leaves, haze);
    return {
      inks: inks[row],
      leaves: tones,
      bark: tonesIn(BARK, haze),
      light: dir,
      grain,
      shiver: row === NEAR ? (x, y, tone) => shivers.length < MOST_SHIVERS && shivers.push({ x, y, colors: [tones[0][tone], tones[1][tone]] }) : undefined,
    };
  };
  const forest = (): Tones => {
    const roll = random();
    return roll < 0.2 ? GINKGO : roll < 0.32 ? PINES : MAPLES[Math.floor(random() * MAPLES.length)];
  };

  // Far: the hills. On each, the forest is only patches of colour; the slope turned from the light is darker, the
  // crest catches a little of it, and mist fills the fold at its foot: that is all the relief there is.
  const air = lights(RAIN_AIR, 0);
  const dark = lights(DULL, 0.2);
  ridges.forEach((ridge) => {
    const earth = tonesIn(MAPLES[ORANGE], ridge.haze);
    const tops = Array.from({ length: w }, (_, x) => Math.round(ridge.high * ridgeAt(x, ridge)));
    tops.forEach((high, x) => inks[FAR].forEach((ink, k) => px(ink, x, feet[FAR] - high, earth[k][0], 1, 1, high)));
    const patch = Math.min(9, Math.max(3, Math.round(ridge.high * 0.2)));
    for (let x = -patch; x < w + patch; x += patch * (0.9 + 0.6 * random())) {
      const high = ridge.high * ridgeAt(x, ridge);
      for (let up = high; up > patch * 0.3; up -= patch * (0.6 + 0.4 * random())) {
        drawMass(brush(FAR, forest(), ridge.haze, 1), x + (random() - 0.5) * patch, feet[FAR] - up + patch * 0.35, patch * (0.9 + 0.5 * random()), patch * 0.62, Math.floor(random() * 1000));
      }
    }
    tops.forEach((high, x) => {
      if (high < 1) {
        return;
      }
      const turned = Math.min(1, Math.max(0, 0.5 - (dir * (x - ridge.x)) / ridge.reach));
      const lit = (tops[Math.min(w - 1, Math.max(0, x + dir * 2))] ?? high) < high;
      inks[FAR].forEach((ink, k) => {
        px(ink, x, feet[FAR] - high, dark[k], 0.32 * turned, 1, high);
        px(ink, x, feet[FAR] - high, air[k], lit ? 0.4 : 0, 1, 1);
        px(ink, x, feet[FAR] - Math.round(high * 0.42), air[k], 0.3, 1, high);
        px(ink, x, feet[FAR] - Math.round(high * 0.2), air[k], 0.4, 1, high);
      });
    });
  });
  drawFloor(view, inks[FAR], feet[FAR], HAZE[FAR], random);

  // Middle: the floor of the valley, where the mist lies.
  drawFloor(view, inks[MIDDLE], feet[MIDDLE], HAZE[MIDDLE], random);

  // Near: the trees we stand under. Only their foliage shows, in the two upper corners: big leaves, a bough or two.
  drawFloor(view, inks[NEAR], feet[NEAR], HAZE[NEAR], random);
  const grain = h >= 110 ? 3 : 2;
  [-1, 1].forEach((side) => {
    const leaves = MAPLES[side * dir > 0 ? VERMILION : GOLD];
    const near = brush(NEAR, leaves, HAZE[NEAR], grain);
    const at = (aside: number): number => (side < 0 ? aside * bough : w - aside * bough);
    drawBough(near, at(-0.1), bough * 0.55, at(1.5), bough * 0.2, Math.max(2, Math.round(bough * 0.12)));
    drawBough(near, at(-0.1), bough * 0.1, at(0.5), bough * 1.2, Math.max(2, Math.round(bough * 0.08)));
    CANOPY.forEach(([aside, down, wide, deep], i) => drawMass(near, at(aside), down * bough, wide * bough, deep * bough, 40 + side * 7 + i * 17));
  });
  return { key, tall, feet, rows: rows.map(([rainy, golden]) => ({ rainy, golden })), shivers };
}

let painted: Grove | undefined;

/** The grove of this view, painted the first time it is asked for. */
export function groveOf(view: VistaView): Grove {
  const key = `${view.w}:${view.h}:${view.foxX}:${view.dir}`;
  if (painted?.key !== key) {
    painted = drawGrove(view, key);
  }
  return painted;
}

/** One row of trees, 0 the farthest: the warm light reaches it a little after the one behind. */
export function paintRow({ ctx, moment }: VistaView, grove: Grove, index: number): void {
  const row = grove.rows[index];
  const warm = lightOn(moment, index);
  if (warm < 1) {
    ctx.drawImage(row.rainy, 0, 0);
  }
  if (warm > 0) {
    ctx.globalAlpha = warm;
    ctx.drawImage(row.golden, 0, 0);
    ctx.globalAlpha = 1;
  }
}

/** How often a leaf may change, in a second, and how many are flicked at a time; both rise with the wind. */
const SHIVERS = 2.6;
const FLICKED = 0.28;
const GUST = 0.5;

/** The foliage over our heads shivers under the rain, and tosses in the gusts: leaves flick to a darker tone and back. */
export function paintShiver({ ctx, t, moment }: VistaView, grove: Grove, gust: number): void {
  const warm = lightOn(moment, NEAR);
  grove.shivers.forEach((leaf, i) => {
    if (hash(i, Math.floor(t * SHIVERS * (1 + gust) + i * 0.37)) < FLICKED + GUST * gust) {
      px(ctx, leaf.x, leaf.y, leaf.colors[0], 1, 2, 2);
      px(ctx, leaf.x, leaf.y, leaf.colors[1], warm, 2, 2);
    }
  });
}
