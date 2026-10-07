import { lookoutTop } from './lookout';
import { clamp01, prerender, seeded, type VistaView } from './paint';

// Rolling fields of ripe wheat, painted once for a view: four planes of broad low hills, each paler and cooler
// than the one before it, a hedgerow, a line of poplars far away and a little windmill on a far hilltop.
// Nothing of it moves: the wind, the shadows of the clouds and the mill's sails are painted over it.

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));

/** The colours of one field: in the light, on a slope turned from the sun, and where the wind lays the wheat over. */
interface FieldTones {
  readonly base: string;
  readonly shade: string;
  readonly light: string;
  readonly bright: string;
}

/**
 * The planes from the farthest to the nearest: how high the crest stands (a share of all the land), how much it
 * rolls, the lengths of its two swells (radians a pixel) and where they start.
 */
const PLANES = [
  { rise: 1, swell: 0.055, long: 0.043, short: 0.097, phase: 2.2, tones: { base: '#dddcb4', shade: '#c8cdaa', light: '#e9e7c4', bright: '#f3f0d4' } },
  { rise: 0.82, swell: 0.11, long: 0.034, short: 0.071, phase: 0, tones: { base: '#f0db90', shade: '#dcc27a', light: '#f6e7aa', bright: '#fbf1c8' } },
  { rise: 0.6, swell: 0.16, long: 0.029, short: 0.06, phase: 2.9, tones: { base: '#ecc960', shade: '#d9ae4c', light: '#f5db86', bright: '#fbebae' } },
  { rise: 0.36, swell: 0.1, long: 0.019, short: 0.047, phase: 4.6, tones: { base: '#e5b545', shade: '#cf9a38', light: '#f1cf6c', bright: '#fbe69c' } },
] as const;
/** How much of the view's height the land takes, from the fox's feet to the far crest. */
const LAND = 0.5;
/** The plane the windmill stands on: its swells start at the mill, so that it crowns a hilltop. */
export const MILL_FIELD = 1;
/** How strongly the short swell counts beside the long one. */
const SHORT = 0.3;
/** Slopes steeper than this share of the steepest are in the shade, when they face away from the sun. */
const SHADED_FROM = 0.15;
/** And at this share of the steepest, the shade takes the whole depth of the field. */
const SHADED_WHOLE = 0.7;

const HEDGE = '#869a54';
/** The hedgerow's field, and how far behind the mill it starts. */
const HEDGE_FIELD = 2;
const HEDGE_BEHIND = 14;
const POPLARS = 6;
const POPLAR = ['#93aa80', '#7e9874'] as const;
/** The mill: how tall its tower is and how long its sails, and the same in a view lower than `LOW_VIEW`. */
const MILL = [8, 6] as const;
const MILL_SMALL = [6, 4] as const;
const LOW_VIEW = 44;
const STONE = '#f8f0dc';
const STONE_SHADE = '#cfc0a6';
const CAP = '#a2523f';
const DOOR = '#6e5346';

export interface Field {
  readonly image: HTMLCanvasElement;
  readonly tones: FieldTones;
  /** Stretches of columns where its crest keeps to one row, [from, to, row], and for each column which stretch. */
  readonly runs: readonly (readonly [number, number, number])[];
  readonly runAt: Int16Array;
  /** How many rows of it show at most under its crest before a nearer field hides it. */
  readonly deep: number;
}

export interface WheatLand {
  /** The fields from the farthest to the nearest. */
  readonly fields: readonly Field[];
  /** The row the land begins at, the row the sky is hidden from, and for each column the row the nearest field begins at. */
  readonly horizon: number;
  readonly skyFoot: number;
  readonly near: Int16Array;
  /** The windmill: its picture and where it goes, the hub its sails turn on and how long they are. */
  readonly mill: { readonly image: HTMLCanvasElement; readonly x: number; readonly y: number; readonly hubX: number; readonly hubY: number; readonly sail: number };
}

function paintMill(tall: number, dir: number): HTMLCanvasElement {
  return prerender(5, tall + 2, (ctx) => {
    // A round stone tower, wider at the foot, its side away from the sun in shade, under a small red cap.
    for (let row = 0; row < tall; row++) {
      const half = row < tall * 0.5 ? 1 : 2;
      ctx.fillStyle = STONE;
      ctx.fillRect(2 - half, row + 2, half * 2 + 1, 1);
      ctx.fillStyle = STONE_SHADE;
      ctx.fillRect(2 + dir * half, row + 2, 1, 1);
    }
    ctx.fillStyle = CAP;
    ctx.fillRect(2, 0, 1, 1);
    ctx.fillRect(1, 1, 3, 1);
    ctx.fillStyle = DOOR;
    ctx.fillRect(2, tall, 1, 2);
    ctx.fillRect(2 - dir, 4, 1, 1);
  });
}

function build(view: VistaView): WheatLand {
  const { w, h, foxX, dir } = view;
  const base = h - 3;
  const tall = clamp(Math.round(h * LAND), 14, 70);
  const behind = dir > 0 ? foxX : w - foxX;
  const ahead = w - behind;
  const millX = Math.round(foxX + dir * clamp(ahead * 0.55, 24, 120));
  const random = seeded(0x3ea7);
  const height = (plane: number, x: number): number => {
    const { rise, swell, long, short, phase } = PLANES[plane];
    return base - tall * (rise + swell * (Math.cos((x - millX) * long + phase) + SHORT * Math.cos((x - millX) * short + phase * 1.7)));
  };
  const crests = PLANES.map((_, plane) => Int16Array.from({ length: w }, (_unused, x) => Math.round(height(plane, x))));
  const fields = PLANES.map((plane, p): Field => {
    const crest = crests[p];
    // What hides its foot: the next field, or the lookout for the nearest.
    const foot = (x: number): number => (p + 1 < PLANES.length ? crests[p + 1][x] : lookoutTop(view, x));
    const runs: [number, number, number][] = [];
    const runAt = new Int16Array(w);
    let deep = 1;
    for (let x = 0; x < w; x++) {
      const last = runs[runs.length - 1];
      if (last && last[2] === crest[x]) {
        last[1] = x + 1;
      } else {
        runs.push([x, x + 1, crest[x]]);
      }
      runAt[x] = runs.length - 1;
      deep = Math.max(deep, foot(x) - crest[x]);
    }
    const gap = tall * (plane.rise - (PLANES[p + 1]?.rise ?? 0.1));
    const steepest = tall * plane.swell * (plane.long + SHORT * plane.short);
    const image = prerender(w, h, (ctx) => {
      ctx.fillStyle = plane.tones.base;
      runs.forEach(([from, to, row]) => ctx.fillRect(from, row, to - from, h - row));
      const facing = new Float32Array(w);
      ctx.fillStyle = plane.tones.shade;
      for (let x = 0; x < w; x++) {
        // The sun is behind the fox's shoulder: a slope going down toward the side it looks to is turned from it.
        facing[x] = ((height(p, x + 2) - height(p, x - 2)) / 4 / steepest) * dir;
        const shaded = Math.round(clamp01((facing[x] - SHADED_FROM) / (SHADED_WHOLE - SHADED_FROM)) * gap * 1.2);
        ctx.fillRect(x, crest[x] + 1, 1, shaded);
      }
      ctx.fillStyle = plane.tones.light;
      for (let x = 0; x < w; x++) {
        if (facing[x] < SHADED_FROM) {
          ctx.fillRect(x, crest[x], 1, 1);
        }
      }
      if (p === PLANES.length - 1) {
        // Up close the wheat has a grain: a few short strokes, lighter and darker.
        for (let i = Math.round((w * gap) / 140); i > 0; i--) {
          const x = Math.floor(random() * w);
          const below = 2 + Math.floor(random() * Math.max(1, gap - 2));
          ctx.fillStyle = random() < 0.6 ? plane.tones.light : plane.tones.shade;
          ctx.fillRect(x, crest[x] + below, 2 + Math.floor(random() * 2), 1);
        }
      }
    });
    return { image, tones: plane.tones, runs, runAt, deep };
  });
  const paint = (p: number): CanvasRenderingContext2D => fields[p].image.getContext('2d') as CanvasRenderingContext2D;
  // One hedgerow, on the hill in front of the mill's: it follows the land, sinking toward us as it goes, with a
  // small tree every so often.
  const hedged = Math.round(clamp(ahead * 0.3, 20, 70)) + HEDGE_BEHIND;
  const hedge = paint(HEDGE_FIELD);
  hedge.fillStyle = HEDGE;
  for (let i = 0; i < hedged; i++) {
    const x = millX + dir * (i - HEDGE_BEHIND);
    if (x >= 0 && x < w) {
      const tree = i % 9 < 2 ? 2 : 1;
      hedge.fillRect(x, crests[HEDGE_FIELD][x] + 2 + Math.round((tall * 0.2 * i) / hedged) - tree, 1, tree);
    }
  }
  if (behind > 40) {
    // Poplars in a row on the farthest hill, behind the fox's shoulder, each a little different from the next:
    // they give the scale.
    const first = Math.round(foxX - dir * clamp(behind * 0.5, 26, 110));
    const ctx = paint(0);
    for (let i = 0; i < POPLARS; i++) {
      const x = first + dir * i * 3;
      const high = 3 + Math.floor(random() * 2.4);
      if (x >= 1 && x < w - 1) {
        ctx.fillStyle = POPLAR[0];
        ctx.fillRect(x, crests[0][x] - high + 1, 1, high);
        ctx.fillStyle = POPLAR[1];
        ctx.fillRect(x + dir, crests[0][x] - high + 2, 1, high - 1);
      }
    }
  }
  // The mill stands a pixel into its hilltop, its hub just under the cap; it is smaller where the view is low.
  const [tower, sail] = h < LOW_VIEW ? MILL_SMALL : MILL;
  const footRow = crests[MILL_FIELD][clamp(millX, 0, w - 1)] + 1;
  const mill = { image: paintMill(tower, dir), x: millX - 2, y: footRow - tower - 2, hubX: millX, hubY: footRow - tower - 1, sail };
  return { fields, horizon: Math.min(...crests[0]), skyFoot: Math.max(...crests[0]) + 1, near: crests[PLANES.length - 1], mill };
}

let kept: { key: string; land: WheatLand } | undefined;

/** The land of this view, painted the first time it is asked for. */
export function wheatLand(view: VistaView): WheatLand {
  const key = `${view.w}:${view.h}:${view.foxX}:${view.dir}`;
  if (kept?.key !== key) {
    kept = { key, land: build(view) };
  }
  return kept.land;
}
