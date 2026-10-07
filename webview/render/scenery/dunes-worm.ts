import type { DunesLand, Lights } from './dunes-land';
import { clamp01, mix, ramp, type VistaView } from './paint';

// What lives under the sand. For a long while there is only its sign: a little swell of sand travelling along
// behind a dune. At the great moment the worm comes out: an enormous ringed body that rises from behind the
// dune, arches high across the sky and dives back into the sand, which it throws up as it leaves and as it lands.

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));
const hash = (a: number, b: number): number => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Its hide in shade, plain and in the light; the dark of its mouth, and thrown sand. */
const HIDE_SHADE: Lights = ['#6a4763', '#8b5b42'];
const HIDE: Lights = ['#b07f84', '#c4925f'];
const HIDE_LIT: Lights = ['#e6b7a2', '#f1cc8e'];
const MAW = '#2c1a2b';
const SAND: Lights = ['#f6cfb2', '#fbe3b4'];

/** The sign shows from this long after the sky appeared, and where it is then (a share of the room ahead of the fox). */
const SIGN_FROM_S = 8;
const SIGN_STARTS = 0.12;
/** It crosses this share of the room ahead in a second, within these paces; afterwards it leaves faster. */
const SIGN_PACE = 0.013;
const SIGN_PACES = [0.8, 3] as const;
const SIGN_LEAVES = 2.5;
const PUFFS = 5;
const PUFF_S = 1.2;

/** How thick the worm is, how high it leaps and how far (shares of the land's height), within these bounds in pixels. */
const THICK = 0.13;
const THICKS = [2, 6] as const;
const SLENDER = 0.12;
const LEAP = 0.82;
const LEAPS = [10, 48] as const;
const SPAN = 2.2;
const SPANS = [14, 120] as const;
/** Its body is this share of the arch long. A ring every so many pixels of it; its tail thins over its last third. */
const BODY = 0.85;
const RING = 5;
const TAIL = 0.33;
/** When its head comes out, and how long the whole of it takes to pass. */
const RISES_S = 0.25;
const PASSES_S = 6;

/** Thrown sand: how long a grain flies, and over how long a burst goes on. */
const GRAIN_S = 1.5;
const BURST_S = 1.6;
/** The dust it leaves hangs for this long. */
const DUST_S = 11;

/** Where it leaps: from `from` (pixels ahead of the fox) over `span`, out of the row `surface`, `high` rows up. */
interface Leap {
  readonly from: number;
  readonly span: number;
  readonly surface: number;
  readonly high: number;
  readonly thick: number;
}

const roomAhead = ({ w, foxX, dir }: VistaView): number => (dir > 0 ? w - foxX : foxX);
const signPace = (view: VistaView): number => clamp(roomAhead(view) * SIGN_PACE, SIGN_PACES[0], SIGN_PACES[1]);
/** How far ahead of the fox the sign has travelled at `time`. */
const signAt = (view: VistaView, time: number): number => roomAhead(view) * SIGN_STARTS + signPace(view) * (time - SIGN_FROM_S);

function leapOf(view: VistaView, land: DunesLand, began: number): Leap {
  const { w, foxX, dir } = view;
  const room = roomAhead(view) - THICKS[0] - 3;
  const span = clamp(Math.min(land.tall * LEAP * SPAN, room - THICKS[0] - 8), SPANS[0], SPANS[1]);
  // Where there is little room it leaps less far, and is thinner for it.
  const thick = clamp(Math.round(Math.min(land.tall * THICK, span * SLENDER)), THICKS[0], THICKS[1]);
  // It comes out where its sign had got to.
  const from = clamp(signAt(view, began), thick + 6, Math.max(thick + 6, room - span));
  let surface = 0;
  for (let at = from; at <= from + span; at++) {
    surface = Math.max(surface, land.screen[clamp(Math.round(foxX + dir * at), 0, w - 1)]);
  }
  const high = Math.min(clamp(land.tall * LEAP, LEAPS[0], LEAPS[1]), span * 0.8, surface - thick - 1);
  return { from, span, surface: surface + 1, high, thick };
}

/** How far along its way the worm is, from 0 to 1: it surges out, and never stops. */
const gone = (moment: number): number => {
  const q = clamp01((moment - RISES_S) / PASSES_S);
  return 0.6 * q + 0.4 * q * q * (3 - 2 * q);
};

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  const cx = Math.round(x);
  const cy = Math.round(y);
  for (let dy = -Math.floor(r); dy <= r; dy++) {
    const half = Math.floor(Math.sqrt((r + 0.4) * (r + 0.4) - dy * dy));
    ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}

// A burst of sand thrown up from one place, `since` seconds ago: each grain on its own arc.
function burst({ ctx, dir }: VistaView, x: number, y: number, since: number, count: number, power: number, seed: number): void {
  if (since <= 0 || since > BURST_S + GRAIN_S) {
    return;
  }
  for (let i = 0; i < count; i++) {
    const age = since - hash(i, seed) * BURST_S;
    if (age <= 0 || age >= GRAIN_S) {
      continue;
    }
    const across = (hash(i, seed + 1) - 0.5) * power * 1.2 + dir * power * 0.2;
    const up = (0.45 + 0.55 * hash(i, seed + 2)) * power;
    ctx.globalAlpha = 0.9 * (1 - age / GRAIN_S);
    ctx.fillRect(Math.round(x + across * age), Math.round(y - up * age + 0.8 * power * age * age), i % 3 === 0 ? 2 : 1, 1);
  }
  ctx.globalAlpha = 1;
}

// The dust that hangs where it broke the sand: a low pale mound that spreads and thins.
function dust({ ctx }: VistaView, x: number, y: number, since: number, thick: number): void {
  const strength = 0.4 * ramp(since, 0, 1.2) * (1 - ramp(since, 3, DUST_S));
  if (since <= 0 || strength < 0.02) {
    return;
  }
  const wide = thick * (2 + 5 * ramp(since, 0, 7));
  const tall = thick * (0.9 + 1.3 * ramp(since, 0, 5));
  for (const [share, alpha] of [[1, 0.5], [0.6, 1]] as const) {
    ctx.globalAlpha = strength * alpha;
    for (let dy = 0; dy <= tall * share; dy++) {
      const half = Math.round(wide * share * Math.sqrt(1 - (dy / (tall * share + 1)) ** 2));
      ctx.fillRect(Math.round(x) - half, Math.round(y) - dy, half * 2 + 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}

// The sign: a small swell on the crest it passes behind, and the puffs of sand it leaves.
function sign({ ctx, w, t, foxX, dir }: VistaView, land: DunesLand, at: number, strength: number): void {
  const x = Math.round(foxX + dir * at);
  if (strength <= 0.02 || x < 2 || x > w - 3) {
    return;
  }
  const y = land.screen[x];
  ctx.globalAlpha = 0.85 * strength;
  ctx.fillRect(x - 2, y - 1, 5, 1);
  ctx.fillRect(x - 1, y - 2, 3, 1);
  for (let i = 0; i < PUFFS; i++) {
    const age = t / PUFF_S + i / PUFFS;
    const flown = age - Math.floor(age);
    ctx.globalAlpha = 0.7 * strength * (1 - flown);
    ctx.fillRect(Math.round(x - dir * (2 + flown * 8)), y - 2 - Math.round(flown * 3 * (0.5 + hash(i, Math.floor(age)))), 2, 1);
  }
  ctx.globalAlpha = 1;
}

/** The worm's body along its arch, from its head back: where each stretch of it is, and how thick. */
function paintBody(view: VistaView, leap: Leap, light: number): void {
  const { ctx, foxX, dir, moment = 0 } = view;
  const { from, span, surface, high, thick } = leap;
  const point = (p: number): [number, number] => [foxX + dir * (from + span * p), surface - high * 4 * p * (1 - p)];
  const steps = Math.max(8, Math.ceil((span + high * 2) / 1.5));
  const lengths = new Float32Array(steps + 1);
  let [lastX, lastY] = point(0);
  for (let i = 1; i <= steps; i++) {
    const [x, y] = point(i / steps);
    lengths[i] = lengths[i - 1] + Math.hypot(x - lastX, y - lastY);
    [lastX, lastY] = [x, y];
  }
  const whole = lengths[steps];
  const body = whole * BODY;
  const head = -thick + (whole + body + thick * 2) * gone(moment);
  const stretches: [x: number, y: number, r: number, back: number, p: number][] = [];
  for (let i = 0; i <= steps; i++) {
    const back = head - lengths[i];
    if (back >= 0 && back <= body) {
      const thin = clamp01((back - body * (1 - TAIL)) / (body * TAIL));
      stretches.push([...point(i / steps), thick * (1 - 0.65 * thin), back, i / steps]);
    }
  }
  if (stretches.length === 0) {
    return;
  }
  ctx.fillStyle = mix(HIDE_SHADE[0], HIDE_SHADE[1], light);
  stretches.forEach(([x, y, r]) => disc(ctx, x, y, r));
  ctx.fillStyle = mix(HIDE[0], HIDE[1], light);
  stretches.forEach(([x, y, r]) => disc(ctx, x, y - 1, r - 1));
  ctx.fillStyle = mix(HIDE_LIT[0], HIDE_LIT[1], light);
  stretches.forEach(([x, y, r]) => r >= 3 && disc(ctx, x + dir, y - r * 0.55, r * 0.3));
  // Its rings, across the body, travel with it.
  const slope = (p: number): [number, number] => {
    const across = dir * span;
    const down = -high * 4 * (1 - 2 * p);
    const long = Math.hypot(across, down);
    return [across / long, down / long];
  };
  ctx.fillStyle = mix(HIDE_SHADE[0], HIDE_SHADE[1], light);
  ctx.globalAlpha = 0.6;
  let ring = -1;
  for (const [x, y, r, back, p] of stretches) {
    const nth = Math.floor(back / RING);
    if (nth !== ring && ring >= 0 && r >= 2) {
      const [tx, ty] = slope(p);
      for (let k = -Math.floor(r); k <= r; k++) {
        ctx.fillRect(Math.round(x - ty * k), Math.round(y + tx * k), 1, 1);
      }
    }
    ring = nth;
  }
  ctx.globalAlpha = 1;
  // Its mouth, open ahead of it while its head is in the air.
  const [x, y, r, back, p] = stretches[stretches.length - 1];
  if (back < 2 && thick >= 3) {
    const [tx, ty] = slope(p);
    ctx.fillStyle = MAW;
    disc(ctx, x + tx * r * 0.6, y + ty * r * 0.6, r - 2);
  }
}

/** What lives under the sand, `light` of the way from dawn to the golden morning. */
export function paintWorm(view: VistaView, land: DunesLand, light: number): void {
  const { ctx, w, t, moment, foxX, dir } = view;
  ctx.fillStyle = mix(SAND[0], SAND[1], light);
  if (moment === undefined) {
    sign(view, land, signAt(view, t), ramp(t, SIGN_FROM_S, SIGN_FROM_S + 3));
    return;
  }
  const leap = leapOf(view, land, t - moment);
  const column = (at: number): number => clamp(Math.round(foxX + dir * at), 0, w - 1);
  const out = column(leap.from);
  const back = column(leap.from + leap.span);
  // Its head is back in the sand a little after half its way.
  const landsAt = RISES_S + PASSES_S * 0.46;
  dust(view, out, land.screen[out], moment - 0.4, leap.thick);
  dust(view, back, land.screen[back], moment - landsAt, leap.thick);
  paintBody(view, leap, light);
  ctx.fillStyle = mix(SAND[0], SAND[1], light);
  burst(view, out, land.screen[out], moment - 0.05, leap.thick * 10, leap.thick * 7, 11);
  burst(view, back, land.screen[back], moment - landsAt, leap.thick * 13, leap.thick * 8, 23);
  // Then it goes on its way under the sand, and its sign with it.
  const since = moment - RISES_S - PASSES_S;
  sign(view, land, leap.from + leap.span + signPace(view) * SIGN_LEAVES * since, ramp(since, 0, 1.5));
}
