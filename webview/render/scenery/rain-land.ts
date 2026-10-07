import { prerender, px, seeded, type VistaView } from './paint';
import { hash, type Plan } from './rain-plan';

// The land under the rain, painted once in its rainy colours and once washed: far hills, woods, a hill with
// round trees, the meadow the fox sits on and its puddles. The weather only cross-fades the two.

type Tones = readonly [light: string, body: string, shade: string];

interface Colors {
  readonly far: string;
  readonly farMist: string;
  readonly woods: string;
  readonly woodsMist: string;
  readonly hill: Tones;
  readonly leaves: Tones;
  readonly trunk: string;
  readonly grass: Tones;
  readonly bank: string;
  readonly water: string;
  readonly mirror: string;
  readonly glint: string;
  readonly flowers: readonly string[];
}

const RAINY: Colors = {
  far: '#9aaeb7',
  farMist: '#b2c2c3',
  woods: '#7d989c',
  woodsMist: '#9eb3b3',
  hill: ['#6f9a82', '#5a8672', '#4a7468'],
  leaves: ['#6a977c', '#4d7a68', '#3b615c'],
  trunk: '#4b4f5a',
  grass: ['#73a070', '#557f5f', '#436a56'],
  bank: '#39584f',
  water: '#93a6b8',
  mirror: '#6f8a94',
  glint: '#c8d5dc',
  flowers: ['#d3dccf', '#d9c3cf', '#d8d6a8'],
};

const FRESH: Colors = {
  far: '#9cc4dd',
  farMist: '#cfe6e6',
  woods: '#7dbb9e',
  woodsMist: '#b9e0c4',
  hill: ['#b5e36f', '#74c35e', '#4a9f5c'],
  leaves: ['#a8dc6a', '#58ad5a', '#2f805c'],
  trunk: '#7a5a44',
  grass: ['#c2ea78', '#7fcd5e', '#4fa558'],
  bank: '#3f7d55',
  water: '#a9daf2',
  mirror: '#6fb4d8',
  glint: '#ffffff',
  flowers: ['#ffffff', '#ffc2d4', '#ffe58a'],
};

/** A puddle: its top row and, for each of its rows, where the water starts and stops. */
export interface Puddle {
  readonly y: number;
  readonly rows: readonly (readonly [from: number, to: number])[];
}

/** The big-leaved plant a little way from the fox: the top middle of each leaf and its half width. */
export interface Plant {
  readonly x: number;
  readonly base: number;
  readonly leaves: readonly { readonly x: number; readonly y: number; readonly half: number }[];
}

interface Tree {
  readonly x: number;
  readonly r: number;
  readonly big: boolean;
}

export interface Land {
  /** [rainy, washed] for what is behind the rainbow, then for what is in front of it. */
  readonly far: readonly [HTMLCanvasElement, HTMLCanvasElement];
  readonly near: readonly [HTMLCanvasElement, HTMLCanvasElement];
  readonly puddles: readonly Puddle[];
  readonly plant: Plant | undefined;
}

/** The fox and what is right behind it stay clear of anything busy. */
const FOX_CLEAR = 21;
const PLANT_AWAY = 33;
const PLANT_LEAVES = [[-3, 14, 7], [6, 9, 6], [-9, 6, 4]] as const;

const farTop = (x: number, { ground, rise }: Plan): number =>
  Math.round(ground - rise * (0.62 + 0.27 * Math.sin(x / 47 + 1.3) + 0.11 * Math.sin(x / 19 + 4.1)));
const woodsTop = (x: number, { ground, rise }: Plan): number =>
  ground - rise * (0.34 + 0.13 * Math.sin(x / 31 + 2.6) + 0.05 * Math.sin(x / 12 + 0.4));
const hillTop = (x: number, { ground, rise }: Plan): number =>
  Math.round(ground - Math.max(2, rise * (0.17 + 0.1 * Math.sin(x / 57 + 5.2) + 0.04 * Math.sin(x / 19 + 2.2))));
const meadowTop = (x: number, { ground }: Plan): number => ground + Math.round(0.7 * Math.sin(x / 23 + 0.8));

function plantOf({ w, h, foxX, dir }: VistaView, { ground }: Plan): Plant | undefined {
  const x = Math.round(Math.min(w - 10, Math.max(9, foxX + dir * PLANT_AWAY)));
  if (Math.abs(x - foxX) < PLANT_AWAY - 6) {
    return undefined;
  }
  const base = ground + 3;
  const tall = h < 44 ? 0.8 : 1;
  const leaves = PLANT_LEAVES.map(([dx, up, half]) => ({ x: x + dir * dx, y: base - Math.round(up * tall), half }));
  return { x, base, leaves };
}

// Puddles on the meadow, away from the fox and the plant, the first one out where the rainbow will stand.
function puddlesOf({ w, h, foxX, dir }: VistaView, plan: Plan, plant: Plant | undefined): Puddle[] {
  const random = seeded(0x9dd1e + w);
  const y = Math.min(h - 4, plan.ground + (h < 44 ? 1 : 3));
  const spans: [number, number][] = [];
  const wanted = Math.min(5, Math.max(1, Math.round(w / 85)));
  for (let attempt = 0; attempt < 40 && spans.length < wanted; attempt++) {
    const width = Math.round(14 + random() * 14);
    const x = Math.round(attempt === 0 ? foxX + dir * (48 + random() * 16) - width / 2 : random() * (w - width));
    const clear = (at: number, margin: number): boolean => x > at + margin || x + width < at - margin;
    const free = spans.every(([from, to]) => x > to + 8 || x + width < from - 8);
    if (x > 1 && x + width < w - 1 && clear(foxX, FOX_CLEAR) && (!plant || clear(plant.x, 11)) && free) {
      spans.push([x, x + width]);
    }
  }
  return spans.map(([from, to]) => ({ y, rows: [[from + 2, to - 3], [from, to], [from + 3, to - 1]] }));
}

function treesOf({ w, foxX, dir }: VistaView, { rise }: Plan): Tree[] {
  const random = seeded(0x72ee5 + w);
  const scale = Math.min(1.2, Math.max(0.6, rise / 20));
  const trees: Tree[] = [];
  // One great old tree stands on the side the fox turns its back on, to weigh against the opening sky.
  const behind = dir > 0 ? foxX : w - foxX;
  const bigX = Math.round(foxX - dir * Math.max(40, behind * 0.6));
  const big = behind >= 46;
  if (big) {
    trees.push({ x: bigX, r: rise * 0.36, big: true });
  }
  for (let x = 5 + random() * 14; x < w; x += 15 + random() * 26) {
    const r = (2.6 + random() * 2) * scale;
    if (Math.abs(x - foxX) > FOX_CLEAR + 2 && !(big && Math.abs(x - bigX) < rise * 0.36 + r + 6)) {
      trees.push({ x: Math.round(x), r, big: false });
    }
  }
  return trees;
}

// A row of far treetops: round crowns and a few pines, as heights to add to the ridge they stand on.
function treeline(w: number): Float32Array {
  const random = seeded(0xf0235 + w);
  const line = new Float32Array(w);
  for (let x = -3; x < w + 4; ) {
    const r = 1.8 + random() * 2.4;
    const pine = random() < 0.2;
    for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
      const at = Math.round(x + dx);
      if (at >= 0 && at < w) {
        const up = pine ? r * 2.1 * (1 - Math.abs(dx) / (r * 0.75)) : Math.sqrt(Math.max(0, r * r - dx * dx));
        line[at] = Math.max(line[at], up);
      }
    }
    x += r * 1.2 + random() * 3.5;
  }
  return line;
}

// A ridge that fades into the mist lying at its foot.
function paintRidge(
  ctx: CanvasRenderingContext2D,
  w: number,
  ground: number,
  top: (x: number) => number,
  color: string,
  mist: string,
): void {
  for (let x = 0; x < w; x++) {
    const from = Math.round(top(x));
    const misty = Math.round(from + (ground - from) * 0.6);
    px(ctx, x, from, color, 1, 1, misty - from);
    px(ctx, x, misty, mist, 1, 1, ground + 2 - misty);
    // One checkered row, so the mist has no edge.
    if ((x + misty) & 1) {
      px(ctx, x, misty - 1, mist);
    }
  }
}

/** A crown made of round lobes, each lit from above and from the side the light will come from. */
function paintCrown(
  ctx: CanvasRenderingContext2D,
  lobes: readonly (readonly [x: number, y: number, r: number])[],
  [light, body, shade]: Tones,
  dir: number,
): void {
  const left = Math.floor(Math.min(...lobes.map(([x, , r]) => x - r)));
  const right = Math.ceil(Math.max(...lobes.map(([x, , r]) => x + r)));
  const top = Math.floor(Math.min(...lobes.map(([, y, r]) => y - r)));
  const bottom = Math.ceil(Math.max(...lobes.map(([, y, r]) => y + r)));
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      // The last lobe that holds the pixel is the one in front.
      let lit: number | undefined;
      for (const [lx, ly, r] of lobes) {
        const dx = x + 0.5 - lx;
        const dy = y + 0.5 - ly;
        if (dx * dx + dy * dy <= r * r) {
          lit = (dx * dir * 0.45 - dy) / r;
        }
      }
      if (lit !== undefined) {
        px(ctx, x, y, lit > 0.38 ? light : lit < -0.42 ? shade : body);
      }
    }
  }
}

function paintTree(ctx: CanvasRenderingContext2D, tree: Tree, plan: Plan, colors: Colors, dir: number): void {
  const { x, r } = tree;
  const foot = hillTop(x, plan) + 1;
  const trunk = Math.max(2, Math.round(r * (tree.big ? 1 : 0.8)));
  const wide = tree.big && r > 5 ? 3 : r > 3.6 ? 2 : 1;
  px(ctx, x - Math.floor(wide / 2), foot - trunk, colors.trunk, 1, wide, trunk + 1);
  const cy = foot - trunk - r * 0.55;
  if (tree.big) {
    px(ctx, x - Math.floor(wide / 2) - 1, foot, colors.trunk, 1, wide + 2, 1);
    const lobes = [[-0.95, 0.2, 0.7], [0.95, 0.2, 0.7], [0, -0.25, 1], [-0.5, -0.8, 0.66], [0.55, -0.7, 0.62]];
    paintCrown(ctx, lobes.map(([lx, ly, lr]) => [x + lx * r, cy + ly * r, lr * r] as const), colors.leaves, dir);
  } else {
    paintCrown(ctx, [[x - r * 0.6, cy + r * 0.3, r * 0.7], [x + r * 0.6, cy + r * 0.3, r * 0.7], [x, cy - r * 0.2, r]], colors.leaves, dir);
  }
}

function paintMeadow(ctx: CanvasRenderingContext2D, view: VistaView, plan: Plan, colors: Colors): void {
  const { w, h, foxX } = view;
  const [light, body, shade] = colors.grass;
  for (let x = 0; x < w; x++) {
    const top = meadowTop(x, plan);
    px(ctx, x, top, body, 1, 1, h - top);
    // Blades along its far edge, and the wet shade of the grass nearest to us.
    if (hash(x, 1) > 0.45) {
      px(ctx, x, top, light);
    }
    if (hash(x, 2) > 0.7) {
      px(ctx, x, top - 1, hash(x, 3) > 0.5 ? light : body);
    }
    if ((x & 1) === 0 || hash(x, 4) > 0.6) {
      px(ctx, x, h - 1, shade);
    }
    if (hash(x, 5) > 0.72) {
      px(ctx, x, h - 2, shade);
    }
  }
  const random = seeded(0x6ea55 + w);
  for (let i = 0; i < (w * (h - plan.ground)) / 24; i++) {
    const x = Math.floor(random() * w);
    const y = plan.ground + 2 + Math.floor(random() * (h - plan.ground - 3));
    px(ctx, x, y, random() < 0.55 ? light : shade, 1, random() < 0.5 ? 2 : 1, 1);
  }
  for (let i = 0; i < w / 11; i++) {
    const x = Math.floor(random() * w);
    const y = plan.ground + 1 + Math.floor(random() * (h - plan.ground - 2));
    const color = colors.flowers[Math.floor(random() * colors.flowers.length)];
    if (Math.abs(x - foxX) > FOX_CLEAR - 3) {
      px(ctx, x, y, color);
    }
  }
}

function paintPuddle(ctx: CanvasRenderingContext2D, puddle: Puddle, colors: Colors, seed: number): void {
  puddle.rows.forEach(([from, to], row) => {
    const y = puddle.y + row;
    px(ctx, from - 1, y, colors.bank, 1, to - from + 2, 1);
    px(ctx, from, y, row === 0 ? colors.mirror : colors.water, 1, to - from, 1);
  });
  const [from, to] = puddle.rows[2];
  px(ctx, from, puddle.y + 3, colors.bank, 1, to - from - 1, 1);
  // The hills upside down along its far bank, and two glints of sky.
  const [left, right] = puddle.rows[1];
  for (let x = left + 1; x < right - 1; x++) {
    if (hash(x, seed) > 0.55) {
      px(ctx, x, puddle.y + 1, colors.mirror);
    }
  }
  px(ctx, left + 2 + Math.floor(hash(seed, 7) * 3), puddle.y + 1, colors.glint, 1, 3, 1);
  px(ctx, right - 6 - Math.floor(hash(seed, 9) * 3), puddle.y + 2, colors.glint, 1, 2, 1);
}

let landKey = '';
let land: Land | undefined;

/** The land for this view, painted the first time it is asked for. */
export function landOf(view: VistaView, plan: Plan): Land {
  const { w, h, foxX, dir } = view;
  const key = `${w}x${h}:${Math.round(foxX)}:${dir}`;
  if (land && key === landKey) {
    return land;
  }
  const plant = plantOf(view, plan);
  const puddles = puddlesOf(view, plan, plant);
  const trees = treesOf(view, plan);
  const crowns = treeline(w);
  const far = (colors: Colors) =>
    prerender(w, h, (ctx) => {
      paintRidge(ctx, w, plan.ground, (x) => farTop(x, plan), colors.far, colors.farMist);
      paintRidge(ctx, w, plan.ground, (x) => woodsTop(x, plan) - crowns[x], colors.woods, colors.woodsMist);
    });
  const near = (colors: Colors) =>
    prerender(w, h, (ctx) => {
      for (let x = 0; x < w; x++) {
        const top = hillTop(x, plan);
        px(ctx, x, top, colors.hill[1], 1, 1, plan.ground + 2 - top);
        px(ctx, x, top, colors.hill[0]);
        if (hash(x, 11) > 0.6) {
          px(ctx, x, top + 1, colors.hill[0]);
        }
      }
      trees.forEach((tree) => paintTree(ctx, tree, plan, colors, dir));
      paintMeadow(ctx, view, plan, colors);
      puddles.forEach((puddle, i) => paintPuddle(ctx, puddle, colors, 40 + i));
    });
  landKey = key;
  land = { far: [far(RAINY), far(FRESH)], near: [near(RAINY), near(FRESH)], puddles, plant };
  return land;
}

/** One of the land's two pictures, turning from rainy to washed. */
export function paintLand({ ctx }: VistaView, pair: readonly [HTMLCanvasElement, HTMLCanvasElement], fresh: number): void {
  if (fresh < 1) {
    ctx.drawImage(pair[0], 0, 0);
  }
  if (fresh > 0) {
    ctx.globalAlpha = fresh;
    ctx.drawImage(pair[1], 0, 0);
    ctx.globalAlpha = 1;
  }
}
