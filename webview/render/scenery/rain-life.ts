import { clamp01, px, ramp, seeded, type VistaView } from './paint';
import type { Plant, Puddle } from './rain-land';
import { hash, showerAt, tone, type Plan } from './rain-plan';
import { BOW_COLORS } from './rain-sky';

// What keeps the fox company in the rain: big leaves nodding under the drops, a little frog that comes to
// shelter under one of them, and, once the sky has cleared, the mist lifting and the wet grass glinting.

/** [rainy, washed] */
type Turning = readonly [string, string];
const LEAF_LIGHT: Turning = ['#a3d07e', '#d2f08a'];
const LEAF_BODY: Turning = ['#74b86a', '#7ccf5a'];
const LEAF_SHADE: Turning = ['#4a8f5c', '#4c9a45'];
const LEAF_EDGE: Turning = ['#2c5547', '#2f6e44'];
const STALK: Turning = ['#4a8f5c', '#5cab52'];
const FROG: Readonly<Record<string, Turning>> = {
  G: ['#8fc27c', '#a5e06e'],
  g: ['#55906a', '#5fb35a'],
  c: ['#d3dcbb', '#fbf6c8'],
  K: ['#25332f', '#25332f'],
};
/** Looking right. Its eye sits in the bump on top of its head. */
const FROG_SITS = ['....GGG.', '.GGGGKGG', 'GGGGGGGG', 'gGGgGccc', 'gg.gg.c.'];
const FROG_LEAPS = ['....GGG.', '.GGGGKGG', 'GGGGGGGG', 'gGGGGccc', 'g....g..'];

/** A drop knocks a leaf down for this long. */
const NOD_S = 0.17;

/** How far down a leaf is pushed right now by the drop that has just hit it. */
function nod(index: number, t: number, clearAt: number | undefined): number {
  const period = 2.1 + index * 0.73;
  const at = t + index * 1.37;
  const fall = Math.floor(at / period);
  const since = at - fall * period;
  return since < NOD_S && hash(index + 50, fall) < showerAt(t - since, clearAt) ? 1 : 0;
}

/** Where the big leaves drip from: the outer tip of each. */
export function leafTips(plant: Plant, dir: number): { x: number; y: number }[] {
  return plant.leaves.map((leaf, i) => ({ x: leaf.x + (i === 2 ? -dir : dir) * leaf.half, y: leaf.y + 3 }));
}

function paintPlant({ ctx, t }: VistaView, plan: Plan, plant: Plant): void {
  const color = (pair: Turning): string => tone(pair[0], pair[1], plan.fresh);
  plant.leaves.forEach((leaf, i) => {
    const top = leaf.y + nod(i, t, plan.clearAt);
    // The stalk bends out from the foot of the plant to the middle of its leaf.
    const height = plant.base - top - 2;
    for (let k = 0; k <= height; k++) {
      const along = k / height;
      px(ctx, plant.x + (leaf.x - plant.x) * along * along, plant.base - k, color(STALK));
    }
    // A shallow umbrella, like the one the fox holds: lit on top, dark along its rim, a rib down the middle.
    const { half } = leaf;
    const row = (y: number, inset: number, pair: Turning): void =>
      px(ctx, leaf.x - half + inset, top + y, color(pair), 1, (half - inset) * 2 + 1, 1);
    row(0, 3, LEAF_LIGHT);
    row(1, 0, LEAF_EDGE);
    row(1, 1, LEAF_BODY);
    row(2, 0, LEAF_EDGE);
    row(2, 1, LEAF_BODY);
    row(3, 1, LEAF_EDGE);
    row(3, 3, LEAF_SHADE);
    px(ctx, leaf.x - half + 2, top + 1, color(LEAF_LIGHT), 1, half - 2, 1);
    px(ctx, leaf.x, top + 1, color(LEAF_SHADE), 1, 1, 3);
  });
}

const HOP = 9;
const HOP_S = 0.42;
const HOP_HIGH = 4;
/** It sets off for shelter when the shower sets in, and comes out again to look at the rainbow. */
const SHELTER_FROM = 11.5;
const HOPS_APART = 1.25;
const OUT_FROM = 11.5;

function paintFrog(view: VistaView, plan: Plan, plant: Plant): void {
  const { ctx, w, t, moment, dir } = view;
  const home = plant.leaves[1].x + dir;
  const edge = dir > 0 ? w - home : home;
  const hopsIn = Math.max(0, Math.min(4, Math.floor((edge - 8) / HOP)));
  const hopsOut = Math.min(2, hopsIn);
  // Hops still to make before it is home, then hops made on its way out: one number per hop under way.
  let away = hopsIn;
  let leap = 0;
  for (let i = 0; i < hopsIn + hopsOut; i++) {
    const out = i >= hopsIn;
    const clock = out ? (moment ?? -1) - OUT_FROM - (i - hopsIn) * HOPS_APART : t - SHELTER_FROM - i * HOPS_APART;
    const done = clamp01(clock / HOP_S);
    away += out ? done : -done;
    if (done > 0 && done < 1) {
      leap = Math.sin(Math.PI * done);
    }
  }
  const arriving = moment === undefined || moment < OUT_FROM;
  const facing = arriving && t < SHELTER_FROM + hopsIn * HOPS_APART + 0.6 ? -dir : dir;
  const blink = (t + 1.3) % 3.7 < 0.14;
  const rows = leap > 0.2 ? FROG_LEAPS : FROG_SITS;
  const left = Math.round(home + dir * away * HOP) - 4;
  const top = plant.base - 3 - Math.round(leap * HOP_HIGH);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const letter = row[facing > 0 ? x : row.length - 1 - x];
      const pair = FROG[letter === 'K' && blink ? 'g' : letter];
      if (pair) {
        px(ctx, left + x, top + y, tone(pair[0], pair[1], plan.fresh));
      }
    }
  });
}

interface Glint {
  readonly x: number;
  readonly y: number;
  readonly every: number;
  readonly offset: number;
}
let glintsKey = '';
let glints: Glint[] = [];
const GLINT_S = 0.34;

function glintsOf({ w, h, foxX }: VistaView, { ground, rise }: Plan): Glint[] {
  const key = `${w}x${h}:${Math.round(foxX)}`;
  if (key !== glintsKey) {
    const random = seeded(0x911e7 + w);
    glints = Array.from({ length: Math.round(w / 9) }, () => ({
      x: Math.floor(random() * w),
      y: Math.round(ground - rise * 0.2 + random() * (h - 2 - ground + rise * 0.2)),
      every: 2.6 + random() * 3.4,
      offset: random() * 6,
    })).filter((glint) => Math.abs(glint.x - foxX) > 18);
    glintsKey = key;
  }
  return glints;
}

// Drops left on the grass catch the light, one here, one there.
function paintGlints(view: VistaView, plan: Plan): void {
  if (plan.fresh <= 0.3) {
    return;
  }
  const strength = ramp(plan.fresh, 0.3, 0.9);
  for (const glint of glintsOf(view, plan)) {
    const since = (view.t + glint.offset) % glint.every;
    if (since < GLINT_S) {
      const lit = Math.sin((Math.PI * since) / GLINT_S) * strength;
      px(view.ctx, glint.x, glint.y, '#ffffff', lit);
      if (lit > 0.8) {
        px(view.ctx, glint.x - 1, glint.y, '#ffffff', 0.4, 3, 1);
        px(view.ctx, glint.x, glint.y - 1, '#ffffff', 0.4, 1, 3);
      }
    }
  }
}

const MIST = '#f4f7ee';

// Once the rain has stopped the mist lifts off the hills in thin wisps, drifts, and is gone.
function paintMist({ ctx, w, moment, dir }: VistaView, { ground, rise }: Plan): void {
  if (moment === undefined || moment < 3) {
    return;
  }
  const count = Math.min(7, Math.max(2, Math.round(w / 60)));
  for (let i = 0; i < count; i++) {
    const strength = 0.5 * ramp(moment, 3 + i * 0.8, 9 + i * 0.8) * (1 - ramp(moment, 20 + i * 1.5, 36));
    const length = Math.round(16 + hash(i, 21) * 22);
    const x = Math.round(hash(i, 22) * (w + length) - length + dir * moment * (1.1 + hash(i, 23)));
    const y = Math.round(ground - rise * (0.12 + 0.45 * hash(i, 24)) - moment * 0.16);
    px(ctx, x, y, MIST, strength, length, 1);
    px(ctx, x + 4, y - 1, MIST, strength * 0.8, Math.round(length * 0.55), 1);
    px(ctx, x - 5, y + 1, MIST, strength * 0.6, Math.round(length * 0.4), 1);
  }
}

/** A veil over the far hills while it pours: they fade into the rain. */
const VEIL = '#a3b3b3';

export function paintVeil({ ctx, w }: VistaView, { ground, rise, shower }: Plan): void {
  const top = ground - rise - 4;
  for (let y = top; y < ground; y++) {
    px(ctx, 0, y, VEIL, 0.42 * shower * clamp01((y - top) / 8), w, 1);
  }
}

/** The rainbow shows in the puddle standing under it: three small strokes of its colours. */
export function paintMirror({ ctx }: VistaView, puddles: readonly Puddle[], shown: number): void {
  const puddle = puddles[0];
  if (!puddle || shown <= 0) {
    return;
  }
  const [from, to] = puddle.rows[1];
  const middle = Math.round((from + to) / 2);
  [0, 2, 4].forEach((stripe, i) => {
    px(ctx, middle - 3 + i * 2, puddle.y + 1, BOW_COLORS[stripe], 0.75 * ramp(shown, 0.25 + i * 0.2, 0.6 + i * 0.2), 2, 1);
  });
}

/** Everything that lives on the land. */
export function paintLife(view: VistaView, plan: Plan, plant: Plant | undefined): void {
  paintMist(view, plan);
  if (plant) {
    paintFrog(view, plan, plant);
    paintPlant(view, plan, plant);
  }
  paintGlints(view, plan);
}
