import { ramp, type VistaView } from './paint';

// The rain's score: where things stand in the picture and how far the weather has got, for one frame.

/** When the fox raises its leaf, and how long it keeps it once the rain thins. */
const LEAF_FROM = 8.5;
const LEAF_AFTER = 7;
/** The first drops, the rain at its fullest, how long it takes to thin at the great moment, and what is left of it. */
const FIRST_DROPS = 1.5;
const RAIN_FULL = 12;
const RAIN_THINS = 8;
const LAST_DROPS = 0.07;
/** The mist is thickest as the picture arrives, and most of it thins away when the air clears. */
const MIST_SETTLED = 0.92;
const MIST_LEFT = 0.4;
/** The warm light comes through the far trees first, then one row after the other, about a second apart. */
const LIGHT_FROM = 3.5;
const LIGHT_TAKES = 5;
/** Pixels sideways for each pixel down: the wind drives the rain toward the side the fox looks to, harder in the gusts. */
const SLANT = 0.38;
const SLANT_GUST = 0.62;
/** The most the rain ever leans, for what has to make room for it. */
export const SLANT_MOST = SLANT + SLANT_GUST;

export interface Plan {
  /** When the great moment began, in the sky's own time. */
  readonly clearAt: number | undefined;
  /** How thick the mist lies, and how far the air has cleared: 0 to 1. */
  readonly mist: number;
  readonly clear: number;
  /** How hard the wind blows right now, from 0 between gusts to 1 at the height of one, and how far it leans the rain. */
  readonly gust: number;
  readonly slant: number;
  /** Whether the fox holds its leaf up, and whether the leaf has been rained on long enough to drip. */
  readonly leafUp: boolean;
  readonly leafWet: boolean;
}

/** How hard it rains at `time`: it sets in gently, and thins to a few drops once the air clears. */
export function rainAt(time: number, clearAt: number | undefined): number {
  const falling = ramp(time, FIRST_DROPS, RAIN_FULL);
  return clearAt === undefined || time < clearAt ? falling : falling * (1 - (1 - LAST_DROPS) * ramp(time - clearAt, 0, RAIN_THINS));
}

/** How much of the warm light has come through to something: `order` 0 to 2 for the rows of trees, far to near. */
export function lightOn(moment: number | undefined, order: number): number {
  return moment === undefined ? 0 : ramp(moment, LIGHT_FROM + order, LIGHT_FROM + LIGHT_TAKES + order);
}

/** The gusts: they come every few seconds, never at quite the same pace, swell and die away. */
export function gustAt(t: number): number {
  const blow = 0.5 + 0.5 * Math.sin(t * 0.7 + 1.4 * Math.sin(t * 0.23)) + 0.25 * Math.sin(t * 1.9 + 2);
  return Math.min(1, Math.max(0, blow - 0.25)) ** 1.5;
}

export function planOf({ t, moment }: VistaView): Plan {
  const leafUp = t >= LEAF_FROM && (moment === undefined || moment < LEAF_AFTER);
  // The wind rises with the rain and drops with it once the air clears.
  const gust = gustAt(t) * ramp(t, 4, 12) * (moment === undefined ? 1 : 1 - 0.8 * ramp(moment, 3, 9));
  return {
    gust,
    slant: SLANT + SLANT_GUST * gust,
    clearAt: moment === undefined ? undefined : t - moment,
    mist: (1 - (1 - MIST_SETTLED) * ramp(t, 2, 14)) * (moment === undefined ? 1 : 1 - (1 - MIST_LEFT) * ramp(moment, 1.5, 9)),
    clear: moment === undefined ? 0 : ramp(moment, 1.5, 8),
    leafUp,
    leafWet: leafUp && t >= LEAF_FROM + 2,
  };
}

/** A cheap repeatable number from 0 to 1 for a pair of numbers: which drop, which fall, which leaf. */
export function hash(a: number, b: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
