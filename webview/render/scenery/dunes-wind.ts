import type { Lights } from './dunes-land';
import { mix, ramp, type VistaView } from './paint';

// The wind over the desert, made visible by the sand it carries. Most of the time it is only a few fine grains
// drifting across at a steady pace. Once, a while before the great moment, a wave of sand comes through: a thick
// cloud of it that sweeps the whole view toward the side the fox looks to, and is gone.

const hash = (a: number, b: number): number => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const SAND: Lights = ['#f8d6ba', '#fde9bd'];
const DUST: Lights = ['#eabfae', '#f6ddb0'];
/** A thin veil of dust always hangs between us and the far dunes. */
const VEIL = 0.07;

/** The few grains that are always in the air: how many for 300 pixels of view and at most, and their steady pace. */
const DRIFTING = 34;
const DRIFTING_MOST = 80;
const DRIFT_PACE = 38;

/** The wave: when its front enters the view, how long it takes to cross, and how wide it is (a share of the view). */
const WAVE_AT_S = 11;
const WAVE_CROSSES_S = 5.5;
const WAVE_WIDE = 0.6;
/** Its grains, for 300 pixels of view and at most; how much dust it carries; how high it stands (a share of the view, and at most). */
const WAVE_GRAINS = 1300;
const WAVE_MOST = 2400;
const WAVE_DUST = 0.72;
const WAVE_HIGH = 0.82;
const WAVE_HIGHEST = 64;

/** The thin veil of dust between us and what lies beyond `fromRow`. */
export function paintVeil({ ctx, w, h }: VistaView, fromRow: number, light: number): void {
  ctx.fillStyle = mix(DUST[0], DUST[1], light);
  ctx.globalAlpha = VEIL;
  for (let step = 0; step < 2; step++) {
    const top = Math.round(fromRow + ((h - fromRow) * step) / 3);
    ctx.fillRect(0, top, w, h - top);
  }
  ctx.globalAlpha = 1;
}

/** A few fine grains drifting across, each a pixel, each at its own steady pace. */
export function paintDrift({ ctx, w, h, t, dir }: VistaView, light: number): void {
  const count = Math.min(DRIFTING_MOST, Math.round((DRIFTING * w) / 300));
  const span = w + 20;
  ctx.fillStyle = mix(SAND[0], SAND[1], light);
  for (let i = 0; i < count; i++) {
    const flown = (hash(i, 2) * span + DRIFT_PACE * (0.7 + 0.6 * hash(i, 1)) * t) % span;
    // Most of them skim the ground.
    const up = hash(i, 3) ** 2 * h * 0.5;
    ctx.globalAlpha = 0.35 + 0.4 * hash(i, 4);
    ctx.fillRect(Math.round(dir > 0 ? flown - 10 : w + 10 - flown), Math.round(h - 4 - up), 1, 1);
  }
  ctx.globalAlpha = 1;
}

/**
 * The wave of sand: `share` of it, so that it can be laid partly behind the fox and partly in front. A cloud of
 * dust with a billowing top, thick with grains, its front steep and its tail thinning out.
 */
export function paintWave({ ctx, w, h, t, dir }: VistaView, light: number, share: number, seed: number): void {
  const wide = Math.max(60, w * WAVE_WIDE);
  const gone = ((t - WAVE_AT_S) / WAVE_CROSSES_S) * (w + wide);
  if (gone <= 0 || gone >= w + wide + 40) {
    return;
  }
  // How far behind its front a place is, and how thick the wave is there: it rises fast and trails off.
  const column = (behindFront: number): number => (dir > 0 ? gone - behindFront : w - gone + behindFront);
  const thick = (behindFront: number): number => ramp(behindFront, 0, wide * 0.18) * (1 - ramp(behindFront, wide * 0.3, wide));
  const tall = Math.min(WAVE_HIGHEST, h * WAVE_HIGH);
  ctx.fillStyle = mix(DUST[0], DUST[1], light);
  for (let back = 0; back < wide; back += 3) {
    const x = Math.round(column(back));
    if (x < -3 || x > w) {
      continue;
    }
    // Its top billows, and rolls forward as it goes.
    const billow = 0.75 + 0.25 * Math.sin(back * 0.11 - t * 2.4 + seed) * Math.sin(back * 0.043 + t * 0.9);
    const up = Math.round(tall * thick(back) * billow);
    ctx.globalAlpha = WAVE_DUST * share * thick(back);
    ctx.fillRect(x, h - up, 3, up);
    ctx.fillRect(x, h - Math.round(up * 0.55), 3, Math.round(up * 0.55));
  }
  ctx.fillStyle = mix(SAND[0], SAND[1], light);
  const count = Math.round(Math.min(WAVE_MOST, (WAVE_GRAINS * w) / 300) * share);
  for (let i = 0; i < count; i++) {
    // Each grain has its place in the wave and whirls a little around it.
    const back = hash(i, seed) * wide;
    const there = thick(back);
    const x = Math.round(column(back) + 3 * Math.sin(t * 5 + i));
    if (there < 0.05 || x < 0 || x >= w) {
      continue;
    }
    const up = hash(i, seed + 1) ** 1.6 * tall * there;
    ctx.globalAlpha = (0.45 + 0.5 * hash(i, seed + 2)) * there;
    ctx.fillRect(x, Math.round(h - 2 - up + 2 * Math.sin(t * 3.1 + i * 1.7)), 1, 1);
  }
  ctx.globalAlpha = 1;
}
