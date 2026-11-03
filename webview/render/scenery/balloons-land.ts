import { lookoutTop } from './lookout';
import { prerender, seeded, type VistaView } from './paint';

// The valley the balloons rise from, seen from the fox's grassy lookout high above it: far lilac hills with a
// gap on the side the fox looks to, two pairs of nearer slopes parting around the valley, and down on its floor
// a river winding toward us, a few round trees and a little farm. Painted once for a view, one picture per plane,
// so that the balloons can rise from behind each of them. Nothing of it moves.

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));
const smooth = (v: number): number => {
  const p = clamp(v, 0, 1);
  return p * p * (3 - 2 * p);
};

/** One plane of the valley: its picture, and its skyline as stretches of one row, [from, to, row]. */
export interface Plane {
  readonly image: HTMLCanvasElement;
  readonly runs: readonly (readonly [number, number, number])[];
  /** For each column, the row its land begins at (`h` where there is none), and the row it stands on. */
  readonly tops: Int16Array;
  readonly foot: number;
}

export interface Valley {
  /** The row the far hills stand on, which is also the top of the valley floor. */
  readonly horizon: number;
  /** The highest row of the far hills: the sky is hidden from there down. */
  readonly crest: number;
  /** The middle of the valley, where the far hills part and the river comes from. */
  readonly middle: number;
  /** The row of the foot of the middle slopes, where the mist lies along the floor. */
  readonly hollow: number;
  readonly far: Plane;
  readonly floor: Plane;
  readonly mid: Plane;
  readonly near: Plane;
  /** The river, row by row from the horizon: where its middle is and how wide it is, for the glints. */
  readonly river: readonly (readonly [number, number, number])[];
}

const FAR = { top: '#ad9bd2', foot: '#d6bcd8', rim: '#e4cce6' } as const;
const FLOOR = { top: '#d2c4d8', foot: '#8fb68a' } as const;
const MID = { top: '#8ea2bc', foot: '#a7bcb6', rim: '#b4c4dc', tree: '#7a8fa8', treeLit: '#a2b4cc' } as const;
const NEAR = { top: '#6c9a7a', foot: '#8cb488', rim: '#9cc69c', tree: '#557f66', treeLit: '#86b282' } as const;
const RIVER = { far: '#fbe8dc', near: '#ecd2e6', bank: '#93b39a' } as const;
const COPSE = ['#8fae96', '#7a9c86'] as const;
const FIELDS = ['#a6c896', '#c2d69a', '#92bc8a', '#d4daa4', '#b2cc8c', '#9ec4a0'] as const;
const HEDGE = '#78a07c';
const FARM = { wall: '#fff3e2', roof: '#e0806e', shade: '#d9c4c0' } as const;

/** A slow, repeatable roll between -1 and 1. */
function roll(random: () => number, length: number): (x: number) => number {
  const [a, b] = [random() * 6.28, random() * 6.28];
  return (x) => (Math.sin(x / length + a) + 0.45 * Math.sin(x / (length * 0.37) + b)) / 1.45;
}

function runsOf(tops: Int16Array): [number, number, number][] {
  const runs: [number, number, number][] = [];
  for (let x = 0; x < tops.length; x++) {
    const last = runs[runs.length - 1];
    if (last && last[2] === tops[x]) {
      last[1] = x + 1;
    } else {
      runs.push([x, x + 1, tops[x]]);
    }
  }
  return runs;
}

/** A plane of land under a skyline, one colour per row from its crest to `foot`, with a lit rim on its sunny slopes. */
function plane(
  w: number,
  h: number,
  tops: Int16Array,
  foot: number,
  tones: { readonly top: string; readonly foot: string; readonly rim?: string },
  sunward: (x: number) => number,
  extra?: (ctx: CanvasRenderingContext2D) => void,
): Plane {
  const runs = runsOf(tops);
  const crest = tops.reduce((min, y) => Math.min(min, y), h);
  const image = prerender(w, h, (ctx) => {
    for (let y = crest; y < foot; y++) {
      ctx.fillStyle = mixHex(tones.top, tones.foot, (y - crest) / Math.max(1, foot - crest));
      for (const [from, to, row] of runs) {
        if (row <= y) {
          ctx.fillRect(from, y, to - from, 1);
        }
      }
    }
    if (tones.rim) {
      // The slopes going down toward the low sun catch it along their crest.
      ctx.fillStyle = tones.rim;
      for (let x = 1; x < w - 1; x++) {
        if (tops[x] < h && tops[x + sunward(x)] >= tops[x]) {
          ctx.fillRect(x, tops[x], 1, 1);
        }
      }
    }
    extra?.(ctx);
  });
  return { image, runs, tops, foot };
}

function mixHex(from: string, to: string, k: number): string {
  const t = clamp(k, 0, 1);
  const a = [1, 3, 5].map((i) => parseInt(from.slice(i, i + 2), 16));
  const b = [1, 3, 5].map((i) => parseInt(to.slice(i, i + 2), 16));
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
}

/** A round tree standing on row `y`, `size` 1 (a far one) to 3, lit on the side the fox looks to. */
function tree(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, dark: string, lit: string, dir: number): void {
  const rows = size === 1 ? [[0, 1], [0, 1]] : size === 2 ? [[0, 1], [-1, 2], [0, 1]] : [[-1, 1], [-2, 2], [-2, 2], [-1, 1], [0, 0]];
  ctx.fillStyle = dark;
  rows.forEach(([from, to], k) => ctx.fillRect(x + from, y - rows.length + k, to - from + 1, 1));
  if (size > 1) {
    // Its crown catches the light on the side the fox looks to.
    ctx.fillStyle = lit;
    const [from, to] = rows[0];
    ctx.fillRect(x + (dir > 0 ? to : from), y - rows.length, 1, 1);
    ctx.fillRect(x + (dir > 0 ? rows[1][1] : rows[1][0]), y - rows.length + 1, 1, size - 1);
  }
}

function build(view: VistaView): Valley {
  const { w, h, dir } = view;
  const foxX = Math.round(view.foxX);
  const random = seeded(0xba11);
  const ahead = dir > 0 ? w - foxX : foxX;
  const middle = clamp(Math.round(foxX + dir * clamp(ahead * 0.42, 30, 170)), 16, w - 16);
  const gap = (x: number, half: number, slope: number): number => smooth((Math.abs(x - middle) - half) / slope);
  const sunward = (x: number): number => (x < middle ? 1 : -1);

  const horizon = Math.round(h * 0.58);
  const lookout = h - lookoutTop(view, foxX);
  const nearFoot = h - Math.max(2, lookout - 3);
  const hollow = horizon + Math.round((nearFoot - horizon) * 0.42);

  // The far hills: a long rolling line, parted where the valley goes.
  const farHigh = clamp(h * 0.1, 3, 11);
  const farRoll = roll(random, 16 + w * 0.05);
  const farHalf = clamp(w * 0.05, 6, 22);
  const farTops = Int16Array.from({ length: w }, (_, x) =>
    Math.round(horizon - farHigh * (0.5 + 0.5 * farRoll(x)) * (0.15 + 0.85 * gap(x, farHalf, farHalf * 1.6))),
  );
  const far = plane(w, h, farTops, horizon, FAR, sunward);

  // The river winds down the floor toward us, wider and swinging further as it comes.
  const river: [number, number, number][] = [];
  const phase = random() * 6.28;
  for (let y = horizon; y < h; y++) {
    const near = (y - horizon) / Math.max(1, h - horizon);
    const x = middle + dir * near * near * clamp(w * 0.12, 10, 50) * Math.sin(phase + near * 5.2) - dir * near * 6;
    river.push([y, x, 0.6 + near * near * clamp(w * 0.03, 3, 10)]);
  }
  const floorTops = new Int16Array(w).fill(horizon);
  const floor = plane(w, h, floorTops, h, FLOOR, sunward, (ctx) => {
    // A patchwork of fields, in bands that widen as they come toward us, melting into the haze far away.
    for (let y = horizon + 1; y < h; ) {
      const near = (y - horizon) / Math.max(1, h - horizon);
      const tall = 1 + Math.floor(near * 4 + random() * 1.5);
      for (let x = -Math.floor(random() * 20); x < w; ) {
        const wide = Math.round((8 + random() * 22) * (0.6 + near * 1.6));
        ctx.fillStyle = mixHex(FIELDS[Math.floor(random() * FIELDS.length)], FLOOR.top, 0.85 * (1 - near) ** 1.4);
        ctx.fillRect(x, y, wide, tall);
        x += wide;
      }
      if (near > 0.3) {
        // Here and there a hedge along the foot of the band.
        ctx.fillStyle = mixHex(HEDGE, FLOOR.top, 0.6 * (1 - near));
        for (let x = Math.floor(random() * 30); x < w; x += 14 + Math.floor(random() * 40)) {
          ctx.fillRect(x, y + tall - 1, 4 + Math.floor(random() * 10), 1);
        }
      }
      y += tall;
    }
    for (const [y, x, wide] of river) {
      const half = wide / 2;
      ctx.fillStyle = RIVER.bank;
      ctx.fillRect(Math.round(x - half) - 1, y, Math.max(1, Math.round(wide)) + 2, 1);
      ctx.fillStyle = mixHex(RIVER.far, RIVER.near, (y - horizon) / Math.max(1, h - horizon));
      ctx.fillRect(Math.round(x - half), y, Math.max(1, Math.round(wide)), 1);
    }
    // Copses along the river, and a little farm with a red roof on the bank.
    for (let i = 0; i < Math.round(w / 22); i++) {
      const y = horizon + 2 + Math.floor(random() * Math.max(1, hollow - horizon));
      const [, rx, wide] = river[y - horizon];
      const x = Math.round(rx + (random() < 0.5 ? -1 : 1) * (wide / 2 + 2 + random() * 10));
      tree(ctx, x, y, y - horizon > 6 ? 2 : 1, COPSE[i % 2], FLOOR.top, dir);
    }
    const farmY = Math.round(horizon + (hollow - horizon) * 0.55);
    const [, rx, wide] = river[farmY - horizon];
    const farmX = Math.round(rx - dir * (wide / 2 + 5));
    ctx.fillStyle = FARM.wall;
    ctx.fillRect(farmX - 1, farmY - 1, 3, 2);
    ctx.fillStyle = FARM.shade;
    ctx.fillRect(farmX - dir, farmY - 1, 1, 2);
    ctx.fillStyle = FARM.roof;
    ctx.fillRect(farmX - 1, farmY - 2, 3, 1);
    ctx.fillRect(farmX, farmY - 3, 1, 1);
  });

  // The middle slopes, parting around the valley, with a few trees on them.
  const midHigh = clamp(h * 0.13, 4, 16);
  const midHalf = clamp(w * 0.13, 14, 60);
  const midRoll = roll(random, 14 + w * 0.04);
  const midTops = Int16Array.from({ length: w }, (_, x) => {
    const rise = midHigh * gap(x, midHalf, midHalf * 0.9) * (0.7 + 0.3 * midRoll(x));
    return rise < 0.5 ? h : Math.round(hollow - rise);
  });
  const mid = plane(w, h, midTops, hollow + 1, MID, sunward, (ctx) => {
    for (let x = 3 + Math.floor(random() * 6); x < w - 2; x += 5 + Math.floor(random() * 12)) {
      if (midTops[x] < hollow - 1) {
        tree(ctx, x, midTops[x] + 1, h >= 60 ? 2 : 1, MID.tree, MID.treeLit, dir);
      }
    }
  });

  // The nearest slopes, open wide around the valley, under the lookout.
  const nearHigh = clamp(h * 0.16, 5, 20);
  const nearHalf = clamp(w * 0.27, 28, 120);
  const nearRoll = roll(random, 18 + w * 0.05);
  const nearTops = Int16Array.from({ length: w }, (_, x) => {
    const rise = nearHigh * gap(x, nearHalf, nearHalf * 0.6) * (0.7 + 0.3 * nearRoll(x));
    return rise < 0.5 ? h : Math.round(nearFoot - rise);
  });
  const near = plane(w, h, nearTops, nearFoot + 1, NEAR, sunward, (ctx) => {
    for (let x = 2 + Math.floor(random() * 8); x < w - 2; x += 6 + Math.floor(random() * 16)) {
      if (nearTops[x] < nearFoot - 2) {
        tree(ctx, x, nearTops[x] + 1, h >= 60 ? 3 : 2, NEAR.tree, NEAR.treeLit, dir);
      }
    }
  });
  return { horizon, crest: farTops.reduce((min, y) => Math.min(min, y), h), middle, hollow, far, floor, mid, near, river };
}

let kept: { key: string; valley: Valley } | undefined;

/** The valley of this view, painted the first time it is asked for. */
export function valleyOf(view: VistaView): Valley {
  const key = `${view.w}:${view.h}:${Math.round(view.foxX)}:${view.dir}`;
  if (kept?.key !== key) {
    kept = { key, valley: build(view) };
  }
  return kept.valley;
}
