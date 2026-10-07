import { clamp, hash } from './blossom-wind';
import { mix, prerender, ramp, seeded, type VistaView } from './paint';

// A gentle valley in spring, far away, painted once for a view: three planes of soft rounded hills, paler and
// bluer with distance, drifts and lines of cherry trees on them, haze in the folds, and a thread of river coming
// down the floor of the valley. Nothing of it moves; only the light on the water is painted over it.

/** Three tones of one colour: turned from the light, plain, and in the light. */
type Tones = readonly [shade: string, body: string, light: string];

interface Plane {
  readonly land: Tones;
  readonly cherry: Tones;
  /** Darker woods among the meadows, where they can be told at all. */
  readonly woods: Tones | undefined;
  /** In shares of the height of the far hills: how high its hills stand, how far each reaches, how far apart they are, the ground between them. */
  readonly high: number;
  readonly reach: number;
  readonly apart: number;
  readonly base: number;
  /** How far from the middle of the valley it is back to its full height (0: it does not open), and what is left of it in the middle. */
  readonly opens: number;
  readonly sill: number;
  /** One tree on it: how wide and how tall its crown is. */
  readonly crown: readonly [number, number];
  /** How much of its foot the haze takes. */
  readonly haze: number;
}

const PLANES: readonly Plane[] = [
  { land: ['#9cc4cc', '#a9cfcd', '#c4e1d3'], cherry: ['#dcc7d8', '#ead6e0', '#f6ecef'], woods: undefined, high: 1, reach: 1.9, apart: 1.9, base: 0.42, opens: 0, sill: 1, crown: [3, 1], haze: 0.5 },
  { land: ['#7fb99c', '#93c9a0', '#b4dca6'], cherry: ['#e0a9c2', '#f2c6d5', '#fcebee'], woods: ['#6aa690', '#76b294', '#8cc49c'], high: 0.62, reach: 1.5, apart: 1.7, base: 0.12, opens: 2.3, sill: 0.3, crown: [4, 2], haze: 0.4 },
  { land: ['#6db46e', '#82c672', '#a8da80'], cherry: ['#dc92b0', '#f5b9cb', '#fff0f2'], woods: ['#52996a', '#5fa86c', '#7cbf74'], high: 0.36, reach: 1.3, apart: 1.5, base: 0, opens: 2.5, sill: 0, crown: [5, 3], haze: 0.25 },
];
const [FAR, MIDDLE, NEAR] = [0, 1, 2];
const HAZE = '#eef5f0';
/** The floor of the valley, from the foot of the hills toward us. */
const FLOOR = ['#b9dfa6', '#a3d58c', '#90cb76'] as const;
/** The river, giving the sky back: far away, and nearer. */
const WATER = ['#e6f2f8', '#bfdef3'] as const;

/** How wide the fox's quiet is: no pink is planted right behind its orange coat. */
const QUIET = 20;
/** Of the places a tree could grow, how many carry a drift of cherry, and how many a wood. */
const CHERRY = 0.45;
const WOODS = 0.15;
/** Of those, how many stand in a line along the crest of their hill. */
const ON_CREST = 0.35;
/** How finely the course of the river is followed. */
const RIVER_STEPS = 400;
/** The least it must be able to swing aside: with less room than that, there is no river. */
const RIVER_ROOM = 12;

export interface SpringLand {
  readonly image: HTMLCanvasElement;
  /** The row the hills stand on, and the highest they go: the sky is above. */
  readonly horizon: number;
  readonly skyline: number;
  /** The river, as stretches of one row: [from, to, row]. */
  readonly water: readonly (readonly [number, number, number])[];
}

/** One rounded hill: where its top is, how high it stands, how far it reaches on each side. */
interface Hill {
  readonly at: number;
  readonly high: number;
  readonly reach: number;
}

/** The hills of one plane, side by side, the tallest first: lower where the valley opens. */
function hillsOf(plane: Plane, index: number, w: number, tall: number, middle: number): Hill[] {
  const gap = plane.apart * tall;
  const hills: Hill[] = [];
  for (let k = Math.floor(-middle / gap) - 2; middle + (k - 2) * gap < w; k++) {
    const at = middle + (k + 0.5 + (hash(k, index) - 0.5) * 0.5) * gap;
    const open = plane.opens > 0 ? plane.sill + (1 - plane.sill) * ramp(Math.abs(at - middle), plane.opens * tall * 0.3, plane.opens * tall) : 1;
    hills.push({ at, high: tall * plane.high * (0.72 + 0.28 * hash(k, index + 9)) * open, reach: plane.reach * tall * (0.85 + 0.3 * hash(k, index + 5)) });
  }
  return hills.sort((a, b) => b.high - a.high);
}

/** How high a hill stands at `x`: a broad rounded back. */
function topOf(hill: Hill, x: number): number {
  const away = (x - hill.at) / hill.reach;
  return away * away >= 1 ? 0 : Math.round(hill.high * (1 - away * away) ** 1.3);
}

// A tree seen from far: a small rounded crown, lit above and shaded under when it is big enough to tell. `big` is
// how many pixels its roundness takes at each end.
function crown(ctx: CanvasRenderingContext2D, x: number, y: number, wide: number, tall: number, big: number, tones: Tones): void {
  const third = Math.max(1, Math.round(tall / 3));
  for (let row = 0; row < tall; row++) {
    const inset = tall <= big ? 0 : Math.max(0, big - (tall > 2 * big ? Math.min(row, tall - 1 - row) : row));
    ctx.fillStyle = tall <= big ? tones[1] : row < third ? tones[2] : tall > 2 * big && row >= tall - third ? tones[0] : tones[1];
    ctx.fillRect(Math.round(x) + inset, Math.round(y) - tall + 1 + row, wide - inset * 2, 1);
  }
}

function build(view: VistaView): SpringLand {
  const { w, h, foxX, dir } = view;
  const depth = clamp(Math.round(h * 0.1), 3, 10);
  const horizon = h - 3 - depth;
  // In a narrow view the hills stay small enough for their round backs to show.
  const tall = Math.round(Math.min(clamp(h * 0.4, 10, 62), Math.max(14, w * 0.3)));
  const big = tall >= 40 ? 2 : 1;
  // The valley opens on the side the fox looks to, well clear of it.
  const room = dir > 0 ? w - foxX : foxX;
  const middle = clamp(Math.round(foxX + dir * clamp(room * 0.5, 34, 150)), 8, w - 8);
  const random = seeded(0xb1055);
  const hills = PLANES.map((plane, i) => hillsOf(plane, i, w, tall, middle));
  const tops = PLANES.map((plane, i) => Array.from({ length: w }, (_, x) => hills[i].reduce((top, hill) => Math.max(top, topOf(hill, x)), Math.round(plane.base * tall))));
  // The nearest hills stand a little forward on the floor of the valley.
  const feet = [horizon, horizon, horizon + Math.round(depth * 0.3)];

  // The river comes out between the hills and winds toward us, wider as it nears: seen from so low, each of its
  // bends is a long thin line of light.
  const sweep = Math.min(tall * 1.6, Math.max(0, (Math.abs(middle - foxX) - 30) * 1.1));
  const water: [number, number, number][] = [];
  for (let step = 0; step <= RIVER_STEPS && sweep >= RIVER_ROOM; step++) {
    const p = step / RIVER_STEPS;
    const row = horizon + Math.floor((h - horizon) * p ** 1.6);
    const x = middle - dir * sweep * Math.sin(p * Math.PI * 2.2) * (0.35 + 0.65 * p);
    const half = 0.5 + 3 * big * p * p;
    const last = water[water.length - 1];
    if (last?.[2] === row) {
      last[0] = Math.min(last[0], Math.round(x - half));
      last[1] = Math.max(last[1], Math.round(x + half) + 1);
    } else if (row < h) {
      water.push([Math.round(x - half), Math.round(x + half) + 1, row]);
    }
  }

  const image = prerender(w, h, (ctx) => {
    const paintPlane = (index: number): void => {
      const plane = PLANES[index];
      const foot = feet[index];
      const at = (x: number): number => tops[index][clamp(Math.round(x), 0, w - 1)];
      ctx.fillStyle = plane.land[1];
      ctx.fillRect(0, foot - Math.round(plane.base * tall), w, Math.round(plane.base * tall));
      // Each hill is one flat tone, every other one a little deeper, with a pale crest on the side that faces the light.
      hills[index].forEach((hill, k) => {
        const from = Math.max(0, Math.floor(hill.at - hill.reach));
        const to = Math.min(w, Math.ceil(hill.at + hill.reach));
        ctx.fillStyle = k % 2 === 0 ? plane.land[1] : mix(plane.land[1], plane.land[0], 0.55);
        for (let x = from; x < to; x++) {
          ctx.fillRect(x, foot - topOf(hill, x), 1, topOf(hill, x));
        }
        ctx.fillStyle = plane.land[2];
        const crest = Math.max(1, Math.round(hill.high * 0.08));
        for (let x = from; x < to; x++) {
          const top = topOf(hill, x);
          if (top > 1 && (x - hill.at) * dir > -hill.reach * 0.12) {
            ctx.fillRect(x, foot - top, 1, Math.min(crest, top - 1));
          }
        }
      });
      // Cherry trees grow in drifts on the slopes and in lines along the crests, woods in small stands.
      const [wide, high] = plane.crown.map((v) => v * big);
      for (let x = random() * wide * 2; x < w; x += wide * (1 + 2.5 * random())) {
        const roll = random();
        const up = random() < ON_CREST ? 1 : 0.2 + 0.55 * random();
        const many = 2 + Math.floor(random() * (roll < CHERRY ? 5 : 2));
        const tones = roll < CHERRY ? plane.cherry : roll < CHERRY + WOODS ? plane.woods : undefined;
        const lap = high > 2 ? 2 : 1;
        const across = many * (wide - lap);
        if (!tones || (tones === plane.cherry && Math.abs(x + across / 2 - foxX) < QUIET + across / 2)) {
          continue;
        }
        for (let k = 0; k < many; k++) {
          const tx = Math.round(x + k * (wide - lap));
          const top = Math.min(at(tx), at(tx + wide - 1));
          if (top > high) {
            crown(ctx, tx, foot - 1 - Math.round((top - high) * up) + (up < 1 ? k % 2 : 0), wide, high, big, tones);
          }
        }
        x += across;
      }
      // Haze lies along its foot, in the folds: two thin sheets, the upper one never quite level.
      const thick = Math.max(2, Math.round(plane.high * tall * 0.34));
      ctx.fillStyle = HAZE;
      for (let x = 0; x < w; x++) {
        const upper = thick + Math.round(Math.sin(x * 0.045 + index * 2) + 0.5 * Math.sin(x * 0.13 + index));
        ctx.globalAlpha = plane.haze * 0.6;
        ctx.fillRect(x, foot - upper, 1, upper);
        ctx.globalAlpha = plane.haze * 0.7;
        ctx.fillRect(x, foot - Math.round(thick * 0.45), 1, Math.round(thick * 0.45));
      }
      ctx.globalAlpha = 1;
    };
    paintPlane(FAR);
    paintPlane(MIDDLE);
    FLOOR.forEach((color, i) => {
      const from = horizon + Math.round(((h - horizon) * i * i) / 9);
      ctx.fillStyle = color;
      ctx.fillRect(0, from, w, h - from);
    });
    paintPlane(NEAR);
    water.forEach(([from, to, row], i) => {
      ctx.fillStyle = WATER[i < 2 ? 0 : 1];
      ctx.fillRect(from, row, to - from, 1);
    });
  });
  return { image, horizon, skyline: horizon - Math.max(...tops[FAR]), water };
}

let kept: { key: string; land: SpringLand } | undefined;

/** The land of this view, painted the first time it is asked for. */
export function springLand(view: VistaView): SpringLand {
  const key = `${view.w}:${view.h}:${view.foxX}:${view.dir}`;
  if (kept?.key !== key) {
    kept = { key, land: build(view) };
  }
  return kept.land;
}
