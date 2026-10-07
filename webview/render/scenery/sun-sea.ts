import { px, seeded } from './paint';

// The sea the evening sun sinks into: rows of water mirroring the sky, a path of glints under the sun,
// and a lighthouse that wakes up at dusk.

const TAU = Math.PI * 2;

export interface Sea {
  /** The sun's path on the water, wider toward us: row, offset from the sun, length, phase, rate. */
  readonly glints: Float32Array;
  /** Small crests catching the sky everywhere else: x, row, length, phase, rate. */
  readonly flecks: Float32Array;
}

export function laySea(w: number, rows: number, radius: number, seed: number): Sea {
  const random = seeded(seed);
  const glints: number[] = [];
  for (let row = 0; row < rows; row++) {
    const half = radius * 0.55 + 1 + row * 1.15;
    const count = Math.min(7, 2 + Math.round(row * 0.55));
    for (let i = 0; i < count; i++) {
      const length = 1 + Math.floor(random() * Math.min(5, 1.6 + row * 0.4));
      glints.push(row, (random() * 2 - 1) * half - length / 2, length, random() * TAU, 0.7 + random() * 1.2);
    }
  }
  const flecks: number[] = [];
  for (let i = Math.round((w * rows) / 46); i > 0; i--) {
    const row = Math.floor(random() ** 0.8 * rows);
    flecks.push(Math.floor(random() * w), row, 1 + Math.floor(random() * (1.5 + row * 0.3)), random() * TAU, 0.25 + random() * 0.5);
  }
  return { glints: Float32Array.from(glints), flecks: Float32Array.from(flecks) };
}

/** The water, one colour per row from the horizon down: `colorOf` is given 0 at the horizon, 1 at our feet. */
export function drawWater(ctx: CanvasRenderingContext2D, w: number, horizon: number, h: number, colorOf: (depth: number) => string): void {
  const rows = h - horizon;
  for (let row = 0; row < rows; row++) {
    ctx.fillStyle = colorOf(row / Math.max(1, rows - 1));
    ctx.fillRect(0, horizon + row, w, 1);
  }
}

/** The glints come and go in three steps (out, half, full), slowly: water that shimmers, not a signal that blinks. */
function shimmer(t: number, rate: number, phase: number): number {
  const v = Math.sin(t * rate + phase);
  return v > 0.55 ? 1 : v > 0 ? 0.5 : 0;
}

export function drawGlints(ctx: CanvasRenderingContext2D, sea: Sea, sunX: number, horizon: number, t: number, color: string, strength: number): void {
  if (strength <= 0.02) {
    return;
  }
  const { glints } = sea;
  for (let i = 0; i < glints.length; i += 5) {
    const lit = shimmer(t, glints[i + 4], glints[i + 3]);
    if (lit > 0) {
      px(ctx, sunX + glints[i + 1], horizon + glints[i], color, strength * lit, glints[i + 2], 1);
    }
  }
}

export function drawFlecks(ctx: CanvasRenderingContext2D, sea: Sea, horizon: number, t: number, color: string, strength: number): void {
  const { flecks } = sea;
  for (let i = 0; i < flecks.length; i += 5) {
    const lit = shimmer(t, flecks[i + 4], flecks[i + 3]);
    if (lit > 0) {
      px(ctx, flecks[i], horizon + flecks[i + 1], color, strength * lit, flecks[i + 2], 1);
    }
  }
}

const LAMP = '#fff3c0';
/** One slow turn of the lamp. */
const SWEEP_S = 5;

/** The lighthouse lamp: a pixel that swells as its beam sweeps past us, and a few dashes of it on the water. */
export function drawBeacon(ctx: CanvasRenderingContext2D, x: number, y: number, horizon: number, t: number, lit: number): void {
  if (lit <= 0) {
    return;
  }
  const beam = Math.max(0, Math.sin((t / SWEEP_S) * TAU)) ** 3;
  px(ctx, x, y, LAMP, lit * (0.55 + 0.45 * beam));
  const halo = lit * beam * 0.45;
  px(ctx, x - 1, y, LAMP, halo);
  px(ctx, x + 1, y, LAMP, halo);
  px(ctx, x, y - 1, LAMP, halo);
  for (let row = 1; row < 6; row += 2) {
    px(ctx, x - (row > 2 ? 1 : 0), horizon + row, LAMP, lit * (0.15 + 0.4 * beam) * (1 - row / 8), row > 2 ? 2 : 1, 1);
  }
}
