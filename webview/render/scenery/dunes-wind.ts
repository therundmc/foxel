import type { Lights } from './dunes-land';
import { clamp01, mix, ramp, type VistaView } from './paint';

// The wind over the desert, made visible by the sand it carries. It comes in gusts: grains fly across the whole
// view toward the side the fox looks to, thickest near the ground, ribbons of sand snake along it, and a veil of
// dust rises between us and the far dunes. The worm's leap raises the wildest gust of all.

const hash = (a: number, b: number): number => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const SAND: Lights = ['#f8d6ba', '#fde9bd'];
const DUST: Lights = ['#eabfae', '#f6ddb0'];
/** The wind sets in over these seconds; the worm's gust rises and falls over these, counted from the great moment. */
const SETS_IN = [3, 12] as const;
const WORM_GUST = [0.4, 2, 5, 12] as const;
/** How much of the far dunes the dust hides in a calm, and in the hardest gust. */
const VEIL = [0.05, 0.3] as const;

/** Grains at one distance: how many for 300 pixels of view and at most, their pace, their length, how much they show. */
interface Flight {
  readonly seed: number;
  readonly grains: number;
  readonly most: number;
  readonly pace: number;
  readonly long: number;
  readonly strength: number;
  /** How high in the view they fly, as a share of its height. */
  readonly high: number;
}
export const FAR_FLIGHT: Flight = { seed: 3, grains: 60, most: 150, pace: 46, long: 2, strength: 0.5, high: 0.5 };
export const NEAR_FLIGHT: Flight = { seed: 7, grains: 34, most: 90, pace: 112, long: 4, strength: 0.75, high: 0.62 };

/** Ribbons of sand along the ground: how many, how fast their waves run, how long a stretch of one shows. */
const RIBBONS = 3;
const RIBBON_PACE = 46;
const RIBBON_STRETCH = 70;

/** How hard the wind blows, from 0 to 1: it rises and drops by itself, and the worm raises a storm. */
export function gustAt({ t, moment }: VistaView): number {
  const sway = 0.5 + 0.5 * Math.sin(t * 0.37 + 1) * Math.sin(t * 0.13 + 0.4);
  const worm = moment === undefined ? 0 : ramp(moment, WORM_GUST[0], WORM_GUST[1]) * (1 - ramp(moment, WORM_GUST[2], WORM_GUST[3]));
  return clamp01((0.25 + 0.5 * sway) * ramp(t, SETS_IN[0], SETS_IN[1]) + 0.6 * worm);
}

/** The veil of dust between us and what lies beyond `fromRow`: thicker toward the ground. */
export function paintVeil(view: VistaView, fromRow: number, light: number): void {
  const { ctx, w, h } = view;
  const strength = VEIL[0] + (VEIL[1] - VEIL[0]) * gustAt(view);
  ctx.fillStyle = mix(DUST[0], DUST[1], light);
  // Three steps of it rather than a smooth fade: it lies in sheets.
  for (let step = 0; step < 3; step++) {
    const top = Math.round(fromRow + ((h - fromRow) * step) / 4);
    ctx.globalAlpha = strength * 0.5;
    ctx.fillRect(0, top, w, h - top);
  }
  ctx.globalAlpha = 1;
}

/** Grains of sand flying across at one distance. */
export function paintGrains(view: VistaView, flight: Flight, light: number): void {
  const { ctx, w, h, t, dir } = view;
  const gust = gustAt(view);
  const count = Math.min(flight.most, Math.round((flight.grains * w) / 300));
  const span = w + 40;
  ctx.fillStyle = mix(SAND[0], SAND[1], light);
  for (let i = 0; i < count; i++) {
    // A grain only flies when the wind is strong enough for it: the gust thickens the air grain by grain.
    const shows = clamp01((gust - hash(i, flight.seed) * 0.8) * 4);
    if (shows <= 0) {
      continue;
    }
    const pace = flight.pace * (0.7 + 0.6 * hash(i, flight.seed + 1)) * (0.6 + 0.8 * gust);
    const flown = (((hash(i, flight.seed + 2) * span + pace * t) % span) + span) % span;
    const x = Math.round(dir > 0 ? flown - 20 : w + 20 - flown);
    // Most of them skim the ground; they rise and dip as they go.
    const up = hash(i, flight.seed + 3) ** 2 * h * flight.high;
    const y = Math.round(h - 4 - up + 1.5 * Math.sin(t * 2.3 + i));
    ctx.globalAlpha = flight.strength * shows * (0.5 + 0.5 * hash(i, flight.seed + 4));
    ctx.fillRect(x, y, flight.long + (gust > 0.7 ? 1 : 0), 1);
  }
  ctx.globalAlpha = 1;
}

/** Ribbons of sand snaking along the ground, in front of everything. */
export function paintRibbons(view: VistaView, light: number): void {
  const { ctx, w, h, t, dir } = view;
  const gust = gustAt(view);
  if (gust < 0.15) {
    return;
  }
  ctx.fillStyle = mix(SAND[0], SAND[1], light);
  for (let r = 0; r < RIBBONS; r++) {
    const row = h - 3 - r * 3;
    for (let x = 0; x < w; x += 2) {
      // Stretches of it travel along; between them the air is clear.
      const along = x - dir * t * RIBBON_PACE * (1 + 0.3 * r);
      const there = Math.sin((along / RIBBON_STRETCH) * Math.PI + r * 2.1);
      if (there <= 0.25) {
        continue;
      }
      ctx.globalAlpha = 0.55 * gust * (there - 0.25);
      ctx.fillRect(x, Math.round(row + 1.6 * Math.sin(along * 0.09 + r)), 2, 1);
    }
  }
  ctx.globalAlpha = 1;
}
