import type { Scene } from './lanterns-scene';
import { lookoutTop } from './lookout';
import { clamp01, ramp, seeded, type VistaView } from './paint';

// The lanterns that rise. Each is a round paper lantern, red or orange, a darker cap at its top and its foot, its
// paper glowing warmest round the flame in its middle, with a soft warm halo. The nearer it is, the bigger: from a
// single point far up to the one the fox lets go. Each sways, flickers at its own pace, and the water gives it back.

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));

/** The paper of each kind: red, orange, and a few of gold. */
const KINDS = [
  { cap: '#5a1c22', paper: '#d0382a', lit: '#ff7a3c', core: '#ffd58a' },
  { cap: '#5e2a1c', paper: '#e8602e', lit: '#ffa04a', core: '#ffe4a4' },
  { cap: '#5e3a1c', paper: '#f08c34', lit: '#ffc464', core: '#fff0c4' },
] as const;
const GLOW = '#ff8a44';
const MIRRORED = '#f0843e';
/** What it looks like once it is no more than a point among the stars. */
const FAR = '#ffc890';

/** Each size as rows of pixels from the top: C its caps, P paper, L paper lit from within, F the flame's glow. */
const SHAPES = [
  ['F'],
  ['P', 'L'],
  ['PP', 'LL'],
  ['.C.', 'PLP', 'LFL', '.C.'],
  ['.CC.', 'PLLP', 'LFFL', 'PLLP', '.CC.'],
  ['.CCC.', 'PLLLP', 'LFFFL', 'LFFFL', 'PLLLP', '.CCC.'],
] as const;
/** The tones that burn: they follow its flicker, the paper does not. */
const BURNS = new Set(['L', 'F']);

/** One shape as cells [dx from its middle, dy from its top, tone, burns]. */
interface Cell {
  readonly dx: number;
  readonly dy: number;
  readonly tone: 'cap' | 'paper' | 'lit' | 'core';
  readonly burns: boolean;
}
const TONE = { C: 'cap', P: 'paper', L: 'lit', F: 'core' } as const;
const CELLS: readonly (readonly Cell[])[] = SHAPES.map((rows) =>
  rows.flatMap((row, dy) =>
    [...row].flatMap((c, i) =>
      c === '.' ? [] : [{ dx: i - Math.floor(row.length / 2), dy, tone: TONE[c as keyof typeof TONE], burns: BURNS.has(c) }],
    ),
  ),
);

/** The river: when the town lets them go, after the moment, and how long one takes to climb out of sight. */
const RIVER_FROM_S = 2.5;
const RIVER_TO_S = 13;
const RISE_S = [9, 13] as const;
/** The first few, before the moment: when each leaves the town, in seconds of the sky, and they take their time. */
const EARLY_S = [2, 8.5, 13.5] as const;
const EARLY_RISE_S = 42;
/** A lantern is lit on the balconies and waits this long before it lifts off. */
const KINDLE_S = 0.6;

export interface Lantern {
  /** When it leaves: seconds of the sky for the early ones, seconds of the moment for the river. */
  readonly early: boolean;
  readonly leaves: number;
  readonly rises: number;
  /** Where it is lit, its bottom pixel. */
  readonly x: number;
  readonly y: number;
  /** How far the wind has carried it the way the fox looks by the time it is out of sight, and how far aside of the others. */
  readonly drift: number;
  readonly aside: number;
  readonly size: number;
  readonly sway: number;
  readonly pace: number;
  readonly phase: number;
  readonly bright: number;
  readonly kind: number;
}

/** Where a lantern is right now: its bottom pixel, its size, and how strongly it shines. */
export interface Seen {
  x: number;
  y: number;
  size: number;
  strength: number;
  flicker: number;
  kind: number;
  /** The row under it the water mirrors it about. */
  ground: number;
}

/** How big one starts: most are small, a few nearer ones bigger, and on a tall view a few bigger still. */
const sizeOf = (r: number, big: number, h: number): number => (h >= 96 && r < big * 0.25 ? 3 : r < big ? 2 : 1);

function launch(view: VistaView, scene: Scene): Lantern[] {
  const { w, h, foxX, dir } = view;
  const random = seeded(0x1a47);
  const room = dir > 0 ? w - foxX : foxX;
  const all = clamp(Math.round((w * h) / 65), 70, 380);
  const big = h >= 80 ? 0.32 : h >= 56 ? 0.24 : 0.06;
  const drift = clamp(room * 0.5, 20, 200);
  // A taller sky takes a little longer to climb.
  const slower = clamp(h / 70, 0.85, 1.25);
  const lanterns: Lantern[] = [];
  for (let i = 0; i < all + EARLY_S.length; i++) {
    const early = i < EARLY_S.length;
    // Most leave from the middle of the town, from its balconies and its path, a few from its ends.
    const spread = early ? [-0.7, 0.55, 0.1][i] : (random() + random() - 1) * 0.8;
    // They go a few at first, then more and more, then the last few.
    const u = (random() + random()) / 2;
    lanterns.push({
      early,
      leaves: early ? EARLY_S[i] : RIVER_FROM_S + (RIVER_TO_S - RIVER_FROM_S) * u ** 0.9,
      rises: early ? EARLY_RISE_S : slower * (RISE_S[0] + random() * (RISE_S[1] - RISE_S[0])),
      x: scene.cx + spread * scene.half * 1.1,
      y: scene.ground - 1 - Math.floor(random() * scene.ground * 0.25),
      drift: drift * (early ? 0.5 : 0.8 + 0.35 * random()),
      aside: early ? 0 : (random() - 0.5) * clamp(w * 0.16, 10, 70),
      size: early ? (h >= 48 ? 2 : 1) : sizeOf(random(), big, h),
      sway: 0.4 + random() * 0.8,
      pace: 0.6 + random() * 0.8,
      phase: random() * 6.3,
      bright: early ? 1 : 0.6 + 0.4 * random(),
      kind: early ? i % 2 : random() < 0.45 ? 0 : random() < 0.75 ? 1 : 2,
    });
  }
  return lanterns;
}

/** How it burns right now, from about 0.6 to 1. */
const flickerOf = (t: number, pace: number, phase: number): number =>
  0.8 + 0.13 * Math.sin(t * pace * 3.1 + phase) + 0.07 * Math.sin(t * pace * 7.7 + phase * 2.3);

/** The river does not climb straight: it wanders the same way at the same height, like a stream of smoke. */
const meander = (w: number, up: number, t: number): number => clamp(w * 0.035, 2, 12) * Math.sin(up * 4.6 + t * 0.13 + 0.8) * up;

function place(view: VistaView, scene: Scene, l: Lantern, since: number, out: Seen): boolean {
  const { w, t, dir } = view;
  if (since < 0) {
    return false;
  }
  const p = Math.max(0, since - KINDLE_S) / l.rises;
  // Slow off the ground, then steady: hot air takes a moment to lift the paper.
  const up = clamp01(p < 0.04 ? 12.5 * p * p : p - 0.02);
  const y = l.y - (l.y + 3) * up;
  // The stream leans the way the wind blows and widens as it climbs.
  out.x = l.x + dir * l.drift * up ** 1.3 + l.aside * up ** 1.5 + meander(w, up, t) + l.sway * Math.sin(t * l.pace + l.phase);
  out.y = y;
  out.size = Math.max(0, l.size - (up > 0.28 ? 1 : 0) - (up > 0.58 ? 1 : 0));
  out.flicker = flickerOf(t, l.pace, l.phase);
  // It is lit on the balconies, glows its best once clear of the roofs, and thins into the stars as it climbs.
  out.strength = l.bright * ramp(since, 0, KINDLE_S) * (0.6 + 0.4 * ramp(up, 0, 0.15)) * (1 - 0.4 * up) * (1 - ramp(up, 0.72, 1));
  out.kind = l.kind;
  out.ground = scene.shore;
  return out.strength > 0.02 && out.x > -3 && out.x < w + 3;
}

let flock: { key: string; lanterns: Lantern[] } | undefined;
const seen: Seen = { x: 0, y: 0, size: 0, strength: 0, flicker: 0, kind: 0, ground: 0 };

/** Every lantern of the town in sight right now, one after the other. */
function eachLantern(view: VistaView, scene: Scene, each: (s: Seen) => void): void {
  const key = `${view.w}:${view.h}:${view.foxX}:${view.dir}`;
  if (flock?.key !== key) {
    flock = { key, lanterns: launch(view, scene) };
  }
  for (const l of flock.lanterns) {
    const since = l.early ? view.t - l.leaves : view.moment === undefined ? -1 : view.moment - l.leaves;
    if (place(view, scene, l, since, seen)) {
      each(seen);
    }
  }
}

/** One lantern: its halo, its paper and its flame. */
export function drawLantern(ctx: CanvasRenderingContext2D, { x, y, size, strength, flicker, kind: seenKind }: Seen): void {
  const cells = CELLS[size];
  const tall = SHAPES[size].length;
  const wide = SHAPES[size][0].length;
  const left = Math.round(x) - Math.floor(wide / 2);
  const top = Math.round(y) - tall + 1;
  if (size === 0) {
    ctx.fillStyle = FAR;
    ctx.globalAlpha = Math.min(1, strength * flicker * 1.3);
    ctx.fillRect(left, top, 1, 1);
    return;
  }
  // A halo with its corners rounded off, and a second, wider one around the biggest; the smallest only warms its sides.
  ctx.fillStyle = GLOW;
  ctx.globalAlpha = (size === 1 ? 0.14 : 0.22) * strength * flicker;
  if (size === 1) {
    ctx.fillRect(left - 1, top + 1, 3, 1);
  } else {
    ctx.fillRect(left - 1, top, wide + 2, tall);
    ctx.fillRect(left, top - 1, wide, tall + 2);
  }
  if (size >= 3) {
    ctx.globalAlpha = 0.1 * strength * flicker;
    ctx.fillRect(left - 2, top + 1, wide + 4, tall - 1);
    ctx.fillRect(left - 1, top - 1, wide + 2, tall + 3);
  }
  const kind = KINDS[seenKind];
  for (const cell of cells) {
    ctx.fillStyle = kind[cell.tone];
    ctx.globalAlpha = Math.min(1, strength * (cell.burns ? flicker * 1.15 : 1));
    ctx.fillRect(left + Math.floor(wide / 2) + cell.dx, top + cell.dy, 1, 1);
  }
  ctx.globalAlpha = 1;
}

/** Its light on the water: a short wavering stroke below the row it is mirrored about, if that row is open water. */
export function drawMirrored(view: VistaView, scene: Scene, { x, y, size, strength, flicker, ground }: Seen): void {
  const { ctx, t } = view;
  const row = Math.round(ground + (ground - y) * 0.8);
  const at = Math.round(x);
  if (row <= scene.shore || row >= Math.min(scene.foot, lookoutTop(view, at) - 1)) {
    return;
  }
  const beat = Math.sin(row * 1.7 + t * 1.3 + at * 0.3);
  if (beat < -0.7) {
    return;
  }
  const wide = size >= 3 ? 2 : 1;
  const aside = Math.round(0.8 * Math.sin(row * 0.9 + t * 0.9));
  ctx.fillStyle = MIRRORED;
  ctx.globalAlpha = 0.42 * strength * flicker * (0.6 + 0.4 * beat) * (size === 0 ? 0.6 : 1);
  ctx.fillRect(at + aside - (wide >> 1), row, wide, size >= 2 ? 2 : 1);
  ctx.globalAlpha = 1;
}

/** The town's lanterns and their light on the water, for the back layer. */
export function paintLanterns(view: VistaView, scene: Scene): void {
  eachLantern(view, scene, (s) => drawMirrored(view, scene, s));
  eachLantern(view, scene, (s) => drawLantern(view.ctx, s));
}

/** How many lanterns are out, from 0 to 1: they warm the sky over the town and the water under it. */
export function warmth({ moment }: VistaView): number {
  return moment === undefined ? 0 : ramp(moment, RIVER_FROM_S, RIVER_FROM_S + 8) * (1 - 0.6 * ramp(moment, RIVER_TO_S + 6, RIVER_TO_S + 22));
}
