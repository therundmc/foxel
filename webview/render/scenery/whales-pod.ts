import { ramp } from './paint';
import { paintRings, paintSplash, paintSpray } from './whales-splash';
import type { Sea, Spot } from './whales-sea';
import { paintBreath, paintWhale, type WhalePose } from './whales-whale';

// The whale and its calf: where they are and what they do, second by second. They come in from far out toward the
// fox, the mother leaps, the calf tries to do the same, and they go back out, the mother lifting her tail to say
// goodbye. Everything is worked out from the time alone.

/** How the leap goes, as shares of the whale's length: how deep its middle is as it starts, how high it goes. */
const SINK = 0.4;
const PEAK = 0.5;
const CALF_PEAK = 0.32;
/** The calf is this much of its mother. */
const CALF = 0.56;
/** When the mother leaps, and for how long; the same for the calf's peek and its own little leap. */
const LEAP_AT = 0.8;
const LEAP_S = 3;
const PEEK_AT = 6.2;
const PEEK_S = 1.2;
const CALF_AT = 8.6;
const CALF_S = 1.5;

/** The share of a leap at which its middle is back in the water. */
const down = (peak: number): number => (1 + Math.sqrt(1 - SINK / (peak + SINK))) / 2;

function leap(at: Spot, len: number, facing: 1 | -1, p: number, peak: number, clumsy: boolean): WhalePose {
  const rise = (peak + SINK) * 4;
  const along = Math.atan(rise * (1 - 2 * p));
  // The calf wobbles, flaps, and comes down flat on its belly.
  const angle = clumsy ? (0.75 * along + 0.35 * Math.sin(p * 9)) * (1 - ramp(p, 0.55, 0.9)) : along;
  return {
    x: at.x - (facing * len) / 2 + facing * len * p,
    y: at.y + SINK * len - rise * len * p * (1 - p),
    angle,
    len,
    facing,
    water: at.y,
    flipper: clumsy ? Math.sin(p * 14) : Math.sin(Math.PI * p),
    // Straight as it shoots out of the water, its tail curling up over the top.
    curl: 0.2 + 0.8 * ramp(p, 0.25, 0.45),
  };
}

/** Its back rolling out of the water and under again, going forward. */
function roll(at: Spot, len: number, facing: 1 | -1, p: number): WhalePose {
  const girth = len * 0.15;
  return {
    x: at.x + facing * len * (p - 0.5) * 0.7,
    y: at.y + girth * (1.4 - 0.9 * Math.sin(Math.PI * p)),
    angle: 0.6 * (0.5 - p),
    len,
    facing,
    water: at.y,
    curl: 0.5,
  };
}

/** Its head straight up out of the water for a look round. */
function peek(at: Spot, len: number, facing: 1 | -1, p: number): WhalePose {
  return { x: at.x, y: at.y + len * (0.48 - 0.44 * Math.sin(Math.PI * p) ** 0.6), angle: 1.3, len, facing, water: at.y, flipper: Math.sin(p * 12) };
}

/** Its tail lifted out of the water as it dives, waved from side to side when it means goodbye. */
function dive(at: Spot, len: number, facing: 1 | -1, p: number, wave: boolean): WhalePose {
  const lift = len * (0.36 * Math.sin(Math.PI * p) ** 0.7 - 0.08);
  const angle = -0.95 - 0.45 * p + (wave ? 0.2 * Math.sin(p * 18) * Math.sin(Math.PI * p) : 0);
  const hx = facing * Math.cos(angle);
  const hy = -Math.sin(angle);
  const tail = [at.x + facing * len * 0.2 * p, at.y - lift];
  return { x: tail[0] + (hx * len) / 2, y: tail[1] + (hy * len) / 2, angle, len, facing, water: at.y };
}

/** Something it does from `from` for `long` seconds, if it is doing it now: how far it has got, from 0 to 1. */
const during = (time: number, from: number, long: number): number | undefined => (time >= from && time <= from + long ? (time - from) / long : undefined);

/** A shift of a spot along the sea. */
const aside = (at: Spot, dx: number): Spot => ({ x: at.x + dx, y: at.y });

/** Before the moment: a breath far out, the back rolling; then nearer, and the tail as it dives. */
function approach(ctx: CanvasRenderingContext2D, sea: Sea, t: number, dir: 1 | -1): void {
  const facing = (-dir) as 1 | -1;
  const far = sea.whale * 0.34;
  const mid = sea.whale * 0.6;
  let p = during(t, 3, 2.6);
  if (p !== undefined) {
    paintWhale(ctx, roll(sea.far, far, facing, p));
  }
  paintBreath(ctx, sea.far.x + facing * far * 0.2, sea.far.y, Math.max(4, far * 0.6), t - 3.4, dir * 0.5, 11);
  p = during(t, 8.4, 2.8);
  if (p !== undefined) {
    paintWhale(ctx, roll(sea.mid, mid, facing, p));
  }
  paintBreath(ctx, sea.mid.x + facing * mid * 0.15, sea.mid.y, Math.max(5, mid * 0.6), t - 8.8, dir * 0.5, 12);
  const deep = aside(sea.mid, facing * mid * 0.5);
  paintRings(ctx, deep.x, deep.y, mid * 0.6, t - 15.5, sea.horizon + 1);
  p = during(t, 12.6, 3.2);
  if (p !== undefined) {
    paintWhale(ctx, dive(deep, mid, facing, p, false));
  }
}

/** The moment: the leap, the splash and its rainbow, the calf's turn, and the two of them going home. */
function show(ctx: CanvasRenderingContext2D, sea: Sea, m: number, dir: 1 | -1): void {
  const { spot, horizon } = sea;
  const len = sea.whale;
  const small = Math.round(len * CALF);
  const facing = (-dir) as 1 | -1;
  const from = aside(spot, (-facing * len) / 2);
  const splashAt = LEAP_AT + LEAP_S * down(PEAK);
  const fell = leap(spot, len, facing, down(PEAK), PEAK, false).x;
  const calfAt = CALF_AT + CALF_S * down(CALF_PEAK);
  const calfFell = leap(sea.calf, small, facing, down(CALF_PEAK), CALF_PEAK, true).x;
  // The rings first: they lie on the water, under all the rest.
  paintRings(ctx, from.x, spot.y, len * 0.5, m - LEAP_AT, horizon + 1);
  paintRings(ctx, fell, spot.y, len, m - splashAt, horizon + 1);
  paintRings(ctx, sea.calf.x, sea.calf.y, small * 0.6, m - PEEK_AT - PEEK_S * 0.8, horizon + 1);
  paintRings(ctx, calfFell, sea.calf.y, small * 1.1, m - calfAt, horizon + 1);
  paintRings(ctx, spot.x + dir * len * 0.4, spot.y, len * 0.7, m - 25.5, horizon + 1);
  // Something big rising under the water.
  if (m < LEAP_AT) {
    paintWhale(ctx, { x: from.x - facing * len * 0.2, y: spot.y + len * (0.3 - 0.2 * (m / LEAP_AT)), angle: 0.5, len, facing, water: spot.y });
  }
  let p = during(m, LEAP_AT, LEAP_S);
  if (p !== undefined) {
    paintWhale(ctx, leap(spot, len, facing, p, PEAK, false));
  }
  p = during(m, PEEK_AT, PEEK_S);
  if (p !== undefined) {
    paintWhale(ctx, peek(sea.calf, small, facing, p));
  }
  p = during(m, CALF_AT, CALF_S);
  if (p !== undefined) {
    paintWhale(ctx, leap(sea.calf, small, facing, p, CALF_PEAK, true));
  }
  // Going home: each breathes once more, then the mother lifts her tail and waves it, and the calf does as she does.
  const home = dir;
  p = during(m, 13.5, 3);
  if (p !== undefined) {
    paintWhale(ctx, roll(spot, len, home, p));
  }
  paintBreath(ctx, spot.x + home * len * 0.1, spot.y, len * 0.6, m - 13.9, dir * 0.5, 21);
  p = during(m, 15.6, 2.4);
  if (p !== undefined) {
    paintWhale(ctx, roll(sea.calf, small, home, p));
  }
  paintBreath(ctx, sea.calf.x + home * small * 0.1, sea.calf.y, small * 0.6, m - 16, dir * 0.5, 22);
  p = during(m, 20, 5.5);
  if (p !== undefined) {
    paintWhale(ctx, dive(aside(spot, dir * len * 0.4), len, home, p, true));
  }
  p = during(m, 22.5, 3);
  if (p !== undefined) {
    paintWhale(ctx, dive(aside(sea.calf, dir * small * 0.6), small, home, p, true));
  }
  // The splashes over them, and the spray that hangs on.
  paintSplash(ctx, from.x, spot.y, len * 0.45, m - LEAP_AT - 0.1, 31);
  paintSplash(ctx, fell, spot.y, len, m - splashAt, 32);
  paintSpray(ctx, fell, spot.y, len, m - splashAt, 33, dir * 0.6, 1);
  paintSplash(ctx, calfFell, sea.calf.y, small * 0.9, m - calfAt, 34);
  paintSpray(ctx, calfFell, sea.calf.y, small * 0.7, m - calfAt, 35, dir * 0.6, 0);
}

export function paintPod(ctx: CanvasRenderingContext2D, sea: Sea, t: number, moment: number | undefined, dir: 1 | -1): void {
  if (moment === undefined) {
    approach(ctx, sea, t, dir);
  } else {
    show(ctx, sea, moment, dir);
  }
}
