import { ramp } from './paint';
import { paintRings, paintSplash, paintSpray } from './whales-splash';
import { CALF_PEAK, down, PEAK, SINK, type Sea, type Spot } from './whales-sea';
import { paintBreath, paintWhale, type WhalePose } from './whales-whale';

// The mother and her calf, always the same two, and what they do second by second, worked out from the time alone.
// One thing at a time, with room to breathe between: her leap, its hop, the two of them at the surface, a breath
// each, a tail each to say goodbye. They keep to their own places on the sea (`whales-sea.ts`), clear of each other.

/** The mother's leap: when it starts after the moment, and how long it lasts. Before it, she rises under the water. */
const LEAP_AT = 0.8;
const LEAP_S = 2.8;
/** A ring where the calf is about to come up, then its hop. */
const HINT_AT = 6.4;
const HOP_AT = 7.2;
const HOP_S = 1.5;
/** Both come up to the surface, and each breathes, the mother first. */
const UP_AT = 11.4;
const CALF_UP_AT = 11.9;
const UP_S = 1;
const BREATH_AT = 12.8;
const CALF_BREATH_AT = 14;
/** Each waves its tail and dives, the calf once its mother's tail is nearly gone. */
const DIVE_AT = 16.2;
const DIVE_S = 4;
const CALF_DIVE_AT = 18.8;
const CALF_DIVE_S = 3.4;

/** Something done from `from` for `long` seconds, if it is being done now: how far it has got, from 0 to 1. */
const during = (time: number, from: number, long: number): number | undefined => (time >= from && time <= from + long ? (time - from) / long : undefined);

/** Where the middle of a leaper is, `p` of the way through a leap starting at `at`, carrying it `span` along. */
function arc(at: Spot, len: number, span: number, facing: 1 | -1, p: number, peak: number): [number, number] {
  return [at.x + facing * span * p, at.y + SINK * len - (peak + SINK) * 4 * len * p * (1 - p)];
}

/** The mother's leap: she follows her arc nose first, holds a flipper out at the top and waves it, and dives back in. */
function leap(sea: Sea, facing: 1 | -1, p: number): WhalePose {
  const len = sea.whale;
  const [x, y] = arc(sea.leap, len, sea.span, facing, p, PEAK);
  const slope = ((PEAK + SINK) * 4 * len * (1 - 2 * p)) / sea.span;
  const top = ramp(p, 0.3, 0.45) * (1 - ramp(p, 0.62, 0.75));
  return {
    x,
    y,
    // Never quite upright: a leap, not a dive.
    angle: Math.max(-0.95, Math.min(0.95, Math.atan(slope) * 0.85)),
    len,
    facing,
    water: sea.leap.y,
    flipper: -0.8 + 1.6 * top + 0.4 * top * Math.sin(p * 40),
    curl: 0.1 + 0.5 * top,
  };
}

/** The calf's hop: a little higher for its size, but wobbling and flapping, and it comes down flat on its belly. */
function hop(sea: Sea, facing: 1 | -1, p: number): WhalePose {
  const len = sea.small;
  const [x, y] = arc(sea.hop, len, sea.hopSpan, facing, p, CALF_PEAK);
  const slope = ((CALF_PEAK + SINK) * 4 * len * (1 - 2 * p)) / sea.hopSpan;
  const flat = ramp(p, 0.5, 0.8);
  return {
    x,
    y,
    angle: (0.55 * Math.atan(slope) + 0.22 * Math.sin(p * 11)) * (1 - flat) + 0.08 * flat,
    len,
    facing,
    water: sea.hop.y,
    flipper: Math.sin(p * 26),
    curl: 0.35,
    calf: true,
  };
}

/** Where one lies at the surface after its fall: a little on from where it went in. */
const restOf = (at: Spot, span: number, peak: number, len: number, facing: 1 | -1): Spot => ({ x: at.x + facing * (span * down(peak) + len * 0.12), y: at.y });

/** Lying at the surface, its back and head out, bobbing; `up` from 0 (under) to 1 (up). */
function rest(at: Spot, len: number, facing: 1 | -1, up: number, time: number, calf: boolean): WhalePose {
  const girth = len * (calf ? 0.25 : 0.19);
  return {
    x: at.x - facing * len * 0.15 * (1 - up),
    y: at.y + girth * (2.2 - 2.6 * up) + 0.35 * Math.sin(time * 2.2 + (calf ? 1.5 : 0)),
    angle: 0.1 + 0.25 * (1 - up),
    len,
    facing,
    water: at.y,
    flipper: -0.8,
    curl: 0,
    calf,
  };
}

/**
 * Diving from the surface: it tips its head down, its tail rises right out of the water and waves goodbye, then
 * slides under. The tail keeps its place as the body turns under it.
 */
function dive(at: Spot, len: number, facing: 1 | -1, p: number, calf: boolean): WhalePose {
  const tip = ramp(p, 0, 0.3);
  const angle = 0.1 - 1.47 * tip + 0.22 * Math.sin((p - 0.3) * 22) * ramp(p, 0.3, 0.4) * (1 - ramp(p, 0.68, 0.78));
  const lift = len * (0.42 * ramp(p, 0.05, 0.35) - 0.75 * ramp(p, 0.7, 1));
  const girth = len * (calf ? 0.25 : 0.19);
  // Where its tail is: it stays put while the head goes down, then sinks.
  const tailX = at.x - facing * len * 0.4 * Math.cos(0.1) + facing * len * 0.15 * ramp(p, 0, 0.4);
  const tailY = at.y - girth * 0.4 + len * 0.4 * Math.sin(0.1) - lift;
  return {
    x: tailX + facing * len * 0.4 * Math.cos(angle),
    y: tailY - len * 0.4 * Math.sin(angle),
    angle,
    len,
    facing,
    water: at.y,
    flipper: -0.9,
    curl: 0,
    spread: ramp(p, 0.08, 0.3),
    calf,
  };
}

/** Before the moment: the sea is calm, and once, far out, a breath goes up where they will come from. */
function before(ctx: CanvasRenderingContext2D, sea: Sea, t: number, dir: 1 | -1): void {
  const { far } = sea;
  const tall = Math.max(4, sea.whale * 0.32);
  paintBreath(ctx, far.x, far.y, tall, t - 9, dir * 0.4);
  paintRings(ctx, far.x, far.y, sea.whale * 0.35, t - 9.2, sea.horizon + 1);
}

/** The moment: her leap and splash, the calf's hop, the two side by side breathing, their tails, and calm again. */
function moment(ctx: CanvasRenderingContext2D, sea: Sea, m: number, dir: 1 | -1): void {
  const { horizon, whale, small } = sea;
  const above = horizon + 1;
  const facing = dir;
  const splash = sea.leap.x + facing * sea.span * down(PEAK);
  const splashAt = LEAP_AT + LEAP_S * down(PEAK);
  const plop = sea.hop.x + facing * sea.hopSpan * down(CALF_PEAK);
  const plopAt = HOP_AT + HOP_S * down(CALF_PEAK);
  const mother = restOf(sea.leap, sea.span, PEAK, whale, facing);
  const calf = restOf(sea.hop, sea.hopSpan, CALF_PEAK, small, facing);
  // The rings first: they lie on the water, under all the rest.
  const breaks = sea.leap.x + facing * sea.span * (1 - down(PEAK));
  paintRings(ctx, breaks, sea.leap.y, whale * 0.5, m - LEAP_AT - 0.2, above);
  paintRings(ctx, splash, sea.leap.y, whale, m - splashAt, above);
  paintRings(ctx, sea.hop.x + facing * small * 0.2, sea.hop.y, small * 0.6, m - HINT_AT, above);
  paintRings(ctx, plop, sea.hop.y, small * 1.1, m - plopAt, above);
  paintRings(ctx, mother.x - facing * whale * 0.25, mother.y, whale * 0.8, m - DIVE_AT - DIVE_S * 0.8, above);
  paintRings(ctx, calf.x - facing * small * 0.25, calf.y, small * 0.9, m - CALF_DIVE_AT - CALF_DIVE_S * 0.8, above);
  // Something big rising under the water, just before she breaks out.
  if (m < LEAP_AT) {
    const [x, y] = arc(sea.leap, whale, sea.span, facing, 0, PEAK);
    const near = m / LEAP_AT;
    paintWhale(ctx, { x: x - facing * whale * 0.3 * (1 - near), y: y + whale * 0.3 * (1 - near), angle: 0.6, len: whale, facing, water: sea.leap.y, curl: 0 });
  }
  let p = during(m, LEAP_AT, LEAP_S);
  if (p !== undefined) {
    paintWhale(ctx, leap(sea, facing, p));
  }
  p = during(m, HOP_AT, HOP_S);
  if (p !== undefined) {
    paintWhale(ctx, hop(sea, facing, p));
  }
  // Side by side at the surface; each breathes once, then waves its tail goodbye and dives.
  if (m >= UP_AT && m < DIVE_AT) {
    paintWhale(ctx, rest(mother, whale, facing, ramp(m, UP_AT, UP_AT + UP_S), m, false));
  }
  if (m >= CALF_UP_AT && m < CALF_DIVE_AT) {
    paintWhale(ctx, rest(calf, small, facing, ramp(m, CALF_UP_AT, CALF_UP_AT + UP_S), m, true));
  }
  p = during(m, DIVE_AT, DIVE_S);
  if (p !== undefined) {
    paintWhale(ctx, dive(mother, whale, facing, p, false));
  }
  p = during(m, CALF_DIVE_AT, CALF_DIVE_S);
  if (p !== undefined) {
    paintWhale(ctx, dive(calf, small, facing, p, true));
  }
  const blow = (at: Spot, len: number, calf: boolean): number => at.y - len * (calf ? 0.25 : 0.19) * 1.3;
  paintBreath(ctx, mother.x + facing * whale * 0.2, blow(mother, whale, false), whale * 0.42, m - BREATH_AT, dir * 0.4);
  paintBreath(ctx, calf.x + facing * small * 0.15, blow(calf, small, true), small * 0.5, m - CALF_BREATH_AT, dir * 0.4);
  // The splashes over them, and the spray that hangs on with its rainbow.
  paintSplash(ctx, breaks, sea.leap.y, whale * 0.4, m - LEAP_AT - 0.15, 31, true);
  paintSplash(ctx, splash, sea.leap.y, whale, m - splashAt, 32, false);
  paintSpray(ctx, splash, sea.leap.y, whale, m - splashAt, 33, -dir * 0.3, 1);
  paintSplash(ctx, plop, sea.hop.y, small, m - plopAt, 34, false);
}

export function paintPod(ctx: CanvasRenderingContext2D, sea: Sea, t: number, m: number | undefined, dir: 1 | -1): void {
  if (m === undefined) {
    before(ctx, sea, t, dir);
  } else {
    moment(ctx, sea, m, dir);
  }
}
