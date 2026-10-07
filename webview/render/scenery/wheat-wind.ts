import { ramp, type VistaView } from './paint';
import type { Field } from './wheat-land';

// The wind, made visible: where it lays the wheat over, a field shows a paler gold. Bands of it cross each field
// toward the side the fox looks to, swelling and fading as they go; at the great moment one long gust rolls
// through every field, the farthest first, and then the wind drops for a while.

export const hash = (a: number, b: number): number => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** After the great gust the wind is down for this long, then a light breeze comes back. */
const CALM_S = 15;
/** The gust crosses the view in about this long, but never crawls on a narrow one. */
const GUST_CROSSES_S = 2.6;
const GUST_SLOWEST = 60;
/** How far outside the view it starts, and how much later it reaches each field, from the farthest to the nearest. */
const GUST_FROM = 20;
const GUST_LATE = [0, 0.25, 0.5, 0.8] as const;
/** The breeze on each field, from the farthest to the nearest: bands for 300 pixels, their half length, their pace. */
const BREEZE = [
  { bands: 2, long: 14, pace: 5 },
  { bands: 3, long: 24, pace: 9 },
  { bands: 4, long: 36, pace: 15 },
  { bands: 4, long: 46, pace: 22 },
] as const;
/** How ragged the edge of a band is, in pixels, on the nearest field. */
const RAGGED = 7;
/** A band's near edge runs ahead of its far one by this many pixels a row: what is closer passes faster. */
const SLANT = 1.8;

/** How hard the breeze blows, from 0 to 1: it rises in the first seconds, and drops after the great gust. */
export function breeze({ t, moment }: VistaView): number {
  const rising = 0.4 + 0.6 * ramp(t, 2, 13);
  return moment === undefined ? rising : rising * (1 - ramp(moment, 1, 4) * (1 - 0.45 * ramp(moment, CALM_S, CALM_S + 8)));
}

const gustPace = (w: number): number => Math.max(GUST_SLOWEST, w / GUST_CROSSES_S);
/** How long the gust's wheat stays bent behind its front, in pixels. */
const gustLong = (w: number): number => Math.max(70, w * 0.5);

/** Seconds since the front of the great gust reached the wheat nearest to us in column `x`: negative before. */
export function sinceGust({ w, moment, dir }: VistaView, x: number): number {
  if (moment === undefined) {
    return -1;
  }
  return moment - GUST_LATE[GUST_LATE.length - 1] - (GUST_FROM + (dir > 0 ? x : w - x)) / gustPace(w);
}

/** How long the gust holds what it has bent, in seconds. */
export const gustHolds = (w: number): number => gustLong(w) / gustPace(w);

/** Fills columns `from` to `to` of the row `below` rows under the crest of a field, following its roll. */
function follow(ctx: CanvasRenderingContext2D, { runs, runAt }: Field, from: number, to: number, below: number): void {
  const a = Math.max(0, from);
  const b = Math.min(runAt.length, to);
  if (a >= b) {
    return;
  }
  for (let i = runAt[a]; i < runs.length && runs[i][0] < b; i++) {
    const left = Math.max(a, runs[i][0]);
    ctx.fillRect(left, runs[i][2] + below, Math.min(b, runs[i][1]) - left, 1);
  }
}

/**
 * A patch lying on a field, in the fill colour already set: a long lens, `long` pixels from its middle to its
 * ends and `high` rows from its middle row to its top, its near edge ahead, its outline ragged like wheat.
 */
export function patch(view: VistaView, field: Field, x: number, row: number, long: number, high: number, ragged: number, seed: number): void {
  if (high < 0.5 || long < 1) {
    return;
  }
  const last = Math.min(field.deep, Math.floor(row + high));
  for (let k = Math.max(1, Math.ceil(row - high)); k <= last; k++) {
    const off = (k - row) / high;
    const half = long * Math.sqrt(1 - off * off);
    const mid = x + view.dir * SLANT * (k - row) + ragged * (hash(k, seed) - 0.5);
    follow(view.ctx, field, Math.round(mid - half), Math.round(mid + half), k);
  }
}

/** The breeze on one field: a few bands at a time, each a little clock of its own. */
export function paintBreeze(view: VistaView, field: Field, depth: number): void {
  const { ctx, w, t, dir } = view;
  const { bands, long, pace } = BREEZE[depth];
  const blowing = breeze(view);
  const ragged = (RAGGED * (depth + 1)) / BREEZE.length;
  const count = Math.max(1, Math.round((bands * w) / 300));
  for (let i = 0; i < count; i++) {
    const period = 8 + 7 * hash(i, depth);
    const at = t / period + hash(i, depth + 20);
    const turn = Math.floor(at);
    const age = at - turn;
    // It swells, travels and fades; the wheat is bent most in its middle.
    const strength = blowing * Math.sin(Math.PI * age) ** 1.5;
    if (strength < 0.08) {
      continue;
    }
    const size = Math.sqrt(strength);
    const seed = i * 7.3 + depth + turn * 0.71;
    const reach = long * (0.7 + 0.6 * hash(seed, 1)) * size;
    const high = Math.max(1.2, field.deep * (0.22 + 0.2 * hash(seed, 2))) * size;
    const row = field.deep * (0.3 + 0.5 * hash(seed, 3));
    // Its own irregular pace: it hurries and lingers on its way.
    const gone = pace * period * (age - 0.5) + 0.25 * long * Math.sin(age * 9 + i);
    const x = hash(seed, 4) * (w + 2 * long) - long + dir * gone;
    // Where the wheat springs back behind it, it shows its darker side for a moment.
    ctx.fillStyle = field.tones.shade;
    patch(view, field, x - dir * reach * 0.22, row - high * 0.2, reach * 0.9, high * 0.9, ragged, seed);
    ctx.fillStyle = field.tones.light;
    patch(view, field, x, row, reach, high, ragged, seed);
    ctx.fillStyle = field.tones.bright;
    patch(view, field, x + dir * reach * 0.12, row + high * 0.1, reach * 0.7 * size, high * 0.6 * size, ragged * 0.6, seed + 1);
  }
}

/** The great gust on one field: a long wave of bent wheat behind a bright front, from one side of the view to the other. */
export function paintGust(view: VistaView, field: Field, depth: number): void {
  const { ctx, w, moment, dir } = view;
  if (moment === undefined) {
    return;
  }
  const long = gustLong(w);
  const gone = gustPace(w) * (moment - GUST_LATE[depth]);
  if (gone <= 0 || gone > w + GUST_FROM + long * 1.2) {
    return;
  }
  const front = (dir > 0 ? -GUST_FROM : w + GUST_FROM) + dir * gone;
  const ragged = (RAGGED * (depth + 1)) / BREEZE.length;
  const row = field.deep / 2;
  // Tall enough to take the whole field: only its two ends are round.
  const high = field.deep * 1.6;
  ctx.fillStyle = field.tones.shade;
  patch(view, field, front - dir * long * 0.92, row, long * 0.16, high, ragged, depth + 40);
  ctx.fillStyle = field.tones.light;
  patch(view, field, front - dir * long * 0.5, row, long * 0.5, high, ragged, depth + 50);
  ctx.fillStyle = field.tones.bright;
  patch(view, field, front - dir * long * 0.24, row, long * 0.22, high, ragged, depth + 60);
}
