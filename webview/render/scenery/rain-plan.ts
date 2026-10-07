import { clamp01, mix, ramp, type VistaView } from './paint';

// The rain's score: where things stand in the picture and how far the weather has got, for one frame.

/** When the fox raises its leaf, and how long it keeps it once the sky clears. */
const LEAF_FROM = 8.5;
const LEAF_AFTER = 7;
/** The first drops, the shower setting in, and how long it takes to stop at the great moment. */
const FIRST_DROPS = 0.7;
const SHOWER_FROM = 3.5;
const SHOWER_FULL = 14;
const SHOWER_ENDS = 5.2;
/** The washed colours take longer to come than the rain to go. */
const FRESH_FROM = 0.8;
const FRESH_FULL = 10;

export interface Plan {
  /** Top row of the meadow the fox sits on. */
  readonly ground: number;
  /** How far the hills rise above the meadow. */
  readonly rise: number;
  /** The line the clouds stack up from and the rainbow stands on. */
  readonly horizon: number;
  /** Free width on the side the fox looks to. */
  readonly room: number;
  /** When the great moment began, in the sky's own time. */
  readonly clearAt: number | undefined;
  /** How hard it rains right now, from 0 to 1. */
  readonly shower: number;
  /** How dark the shower has made the sky, from 0 to 1. */
  readonly gloom: number;
  /** How far the washed, sunlit colours have come, from 0 to 1. */
  readonly fresh: number;
  /** Pixels a drop slides sideways for each pixel it falls: a wind that leans to and fro, slowly. */
  readonly wind: number;
  /** Whether the fox holds its leaf up. */
  readonly leafUp: boolean;
  /** Where the clouds part: the centre of the opening and its half sizes. */
  readonly gap: { readonly x: number; readonly y: number; readonly rx: number; readonly ry: number };
}

/** How hard it rains at `time`: a few drops, a shower setting in, then thinning out once the sky clears. */
export function showerAt(time: number, clearAt: number | undefined): number {
  if (time < FIRST_DROPS) {
    return 0;
  }
  const building = 0.06 + 0.94 * ramp(time, SHOWER_FROM, SHOWER_FULL);
  return clearAt === undefined || time < clearAt ? building : building * (1 - ramp(time - clearAt, 0, SHOWER_ENDS));
}

/** Whether the fox holds its leaf up at `time`. */
export function leafUpAt(time: number, clearAt: number | undefined): boolean {
  return time >= LEAF_FROM && (clearAt === undefined || time - clearAt < LEAF_AFTER);
}

export function planOf({ w, h, t, moment, foxX, dir }: VistaView): Plan {
  const ground = h - (h < 44 ? 6 : 8);
  const rise = Math.round(Math.min(32, Math.max(9, h * 0.31)));
  const horizon = ground - Math.round(rise * 0.55);
  const room = dir > 0 ? w - foxX : foxX;
  const clearAt = moment === undefined ? undefined : t - moment;
  const gapY = Math.max(3, horizon * 0.34);
  return {
    ground,
    rise,
    horizon,
    room,
    clearAt,
    shower: showerAt(t, clearAt),
    gloom: ramp(t, SHOWER_FROM - 1, SHOWER_FULL),
    fresh: moment === undefined ? 0 : ramp(moment, FRESH_FROM, FRESH_FULL),
    wind: dir * (0.17 + 0.1 * Math.sin(t * 0.23 + 1) + 0.04 * Math.sin(t * 0.61)),
    leafUp: leafUpAt(t, clearAt),
    gap: {
      x: foxX + dir * Math.max(30, room * 0.64),
      y: gapY,
      rx: Math.min(80, Math.max(26, room * 0.3)),
      ry: Math.min(44, Math.max(10, horizon * 0.42)),
    },
  };
}

/** A cheap repeatable number from 0 to 1 for a pair of whole numbers: which drop, which fall. */
export function hash(a: number, b: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

const tones = new Map<string, string>();
const TONE_STEPS = 32;

/** `mix`, in a few steps and remembered: the weather turns slowly, the same colours come back every frame. */
export function tone(from: string, to: string, amount: number): string {
  const step = Math.round(clamp01(amount) * TONE_STEPS);
  const key = from + to + step;
  let color = tones.get(key);
  if (color === undefined) {
    color = mix(from, to, step / TONE_STEPS);
    tones.set(key, color);
  }
  return color;
}
