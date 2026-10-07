import { ramp, type VistaView } from './paint';

// The storm's score: where things stand in the picture and how far the weather has got, for one frame.

/** When the fox raises its leaf, and how long it keeps it once the sky clears. */
const LEAF_FROM = 8.5;
const LEAF_AFTER = 7;
/** The first drops, the shower at its fullest, and how long it takes to stop at the great moment. */
const FIRST_DROPS = 4;
const SHOWER_FULL = 15;
const SHOWER_ENDS = 6;

export interface Plan {
  /** How high the lookout stands under the fox, and at the edges of the view. */
  readonly crest: number;
  readonly edge: number;
  /** The row the far hills stand on, just behind the lookout, and how far the farthest rise above it. */
  readonly base: number;
  readonly rise: number;
  /** The flat bottoms of the lowest storm clouds, and how tall those clouds are. */
  readonly cloudBase: number;
  readonly cloudSize: number;
  /** Free width on the side the fox looks to. */
  readonly room: number;
  /** When the great moment began, in the sky's own time. */
  readonly clearAt: number | undefined;
  /** How hard it rains right now, how dark the storm has made the sky, how far the washed light has come: 0 to 1. */
  readonly shower: number;
  readonly gloom: number;
  readonly fresh: number;
  /** Pixels a drop slides sideways for each pixel it falls: the wind that carries the storm away. */
  readonly wind: number;
  /** Whether the fox holds its leaf up. */
  readonly leafUp: boolean;
}

/** How hard it rains at `time`: the shower sets in slowly, and thins out once the sky clears. */
export function showerAt(time: number, clearAt: number | undefined): number {
  const building = ramp(time, FIRST_DROPS, SHOWER_FULL);
  return clearAt === undefined || time < clearAt ? building : building * (1 - ramp(time - clearAt, 0.5, SHOWER_ENDS));
}

export function planOf({ h, t, moment, foxX, w, dir }: VistaView): Plan {
  const low = h < 44;
  const crest = low ? 5 : Math.min(10, Math.max(6, Math.round(h * 0.13)));
  const base = h - crest + 1;
  const rise = Math.min(30, Math.max(8, Math.round(h * 0.24)));
  const cloudBase = base - rise - Math.max(3, Math.round(rise * 0.35));
  const room = dir > 0 ? w - foxX : foxX;
  const clearAt = moment === undefined ? undefined : t - moment;
  return {
    crest,
    edge: low ? 2 : 3,
    base,
    rise,
    cloudBase,
    cloudSize: Math.round(Math.min(60, Math.max(16, cloudBase), Math.max(24, w * 0.6))),
    room,
    clearAt,
    shower: showerAt(t, clearAt),
    gloom: ramp(t, 1.5, 13),
    fresh: moment === undefined ? 0 : ramp(moment, 1, 10),
    wind: -dir * (0.2 + 0.07 * Math.sin(t * 0.23 + 1)),
    leafUp: t >= LEAF_FROM && (moment === undefined || moment < LEAF_AFTER),
  };
}

/** A cheap repeatable number from 0 to 1 for a pair of numbers: which drop, which fall, which cloud. */
export function hash(a: number, b: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
