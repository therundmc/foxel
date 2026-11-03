import type { Seen } from './lanterns-flight';
import type { Shore } from './lanterns-shore';
import { clamp01, ramp, type VistaView } from './paint';

// The fox's own lantern. At the great moment it is suddenly there by its paws, as if it had just let it go; it lingers
// a breath, then climbs and floats away over the lake the way the fox looks, smaller and smaller, until it is one more
// point of light among the others.

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));

/** It glows into being by the fox's side, waits a breath, then goes. */
const LIT_S = 0.9;
const LIFTS_S = 1.4;
/** How long it takes to float out over the lake, and to go out up there. */
const AWAY_S = 19;
const GONE_S = [20, 25] as const;
/** How far from the fox's middle it is lit, and how high above the ground its flame. */
const BESIDE = 16;
const ABOVE = 7;
/** As it goes away it gets smaller: the share of its way at which it takes each smaller size. */
const SMALLER_AT = [0.18, 0.42, 0.68, 0.9] as const;

const seen: Seen = { x: 0, y: 0, size: 0, strength: 0, flicker: 0, ground: 0 };

/** Where the fox's lantern is now, or undefined before the moment and once it has gone out. */
export function foxLantern(view: VistaView, shore: Shore): Seen | undefined {
  const { w, h, t, moment, foxX, dir } = view;
  if (moment === undefined || moment > GONE_S[1]) {
    return undefined;
  }
  const room = dir > 0 ? w - foxX : foxX;
  const fromX = foxX + dir * BESIDE;
  const fromY = h - ABOVE;
  const toX = clamp(foxX + dir * clamp(room * 0.62, 30, 240), 4, w - 4);
  const toY = Math.round(shore.shore * 0.4);
  // Eased off its start; slowing down as it goes, as anything that floats away from us seems to.
  const way = 1 - (1 - ramp(moment, LIFTS_S, LIFTS_S + AWAY_S)) ** 1.5;
  const bob = Math.sin(moment * 1.7) * 0.6 * (1 - way);
  seen.x = fromX + (toX - fromX) * way ** 1.4 + Math.sin(moment * 0.9 + 1) * (0.5 + way);
  seen.y = fromY + (toY - fromY) * way ** 0.6 + bob;
  const biggest = h >= 56 ? 4 : 3;
  seen.size = Math.max(0, biggest - SMALLER_AT.filter((at) => way > at).length);
  seen.flicker = 0.84 + 0.1 * Math.sin(t * 2.3) + 0.06 * Math.sin(t * 6.1 + 1);
  seen.strength = ramp(moment, 0, LIT_S) * (1 - 0.4 * way) * (1 - ramp(moment, GONE_S[0], GONE_S[1]));
  // Over the lookout it is mirrored by nothing; out over the lake, about the water beneath it.
  seen.ground = h + (shore.shore - h) * clamp01(way * 1.8);
  return seen;
}

/** How much its light falls on the grass the fox sits on, from 0 to 1. */
export function lightOnGrass(view: VistaView): number {
  const { moment } = view;
  return moment === undefined ? 0 : ramp(moment, 0, LIT_S) * (1 - ramp(moment, LIFTS_S + 1, LIFTS_S + 6));
}
