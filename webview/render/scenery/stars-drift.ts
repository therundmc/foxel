import { parallax, prerender, px, ramp, seeded, type VistaView } from './paint';

// The small life of the night: banks of mist drifting in the valley, and fireflies waking near the ground.

const MIST = '#6066ad';
/** A bank every so many pixels along the valley, each of its own length and pace. */
const MIST_EVERY = 101;
const MIST_LENGTHS = [74, 52, 90, 60];
const MIST_ROWS = 4;
/** They lie among the nearer hills and slide with them; a light wind pushes them a little faster. */
const MIST_DEPTH = 0.15;
const MIST_WIND = 0.2;
/** The mist gathers as the night settles, and never thickens to more than a veil. */
const MIST_GATHER_S = 26;
const MIST_ALPHA = 0.42;

/** A long, low veil: a solid heart, and above and below it rows of dots that thin it out into the air. */
function bank(length: number, seed: number): HTMLCanvasElement {
  const random = seeded(seed);
  return prerender(length, MIST_ROWS, (ctx) => {
    ctx.fillStyle = MIST;
    for (let row = 0; row < MIST_ROWS; row++) {
      // Each row starts and ends where it likes, the heart being the longest.
      const heart = row === 2;
      const from = Math.round(heart ? 0 : 4 + random() * length * 0.3);
      const to = Math.round(heart ? length : length - 4 - random() * length * 0.3);
      for (let x = from; x < to; x++) {
        const frayed = Math.min(x - from, to - 1 - x) < 5;
        if ((heart && !frayed) || (x + row) % 2 === 0) {
          ctx.globalAlpha = heart || row === 1 ? 1 : 0.6;
          ctx.fillRect(x, row, 1, 1);
        }
      }
    }
  });
}

let banks: HTMLCanvasElement[] | undefined;

/** Banks of mist between the far hills and the treeline; `footY` is the row they rest on. */
export function drawMist(view: VistaView, footY: number): void {
  const { ctx, w, t, dir } = view;
  banks ??= MIST_LENGTHS.map((length, i) => bank(length, 0x3157 + i));
  ctx.globalAlpha = MIST_ALPHA * (0.4 + 0.6 * ramp(t, 0, MIST_GATHER_S));
  for (let k = -2; k * MIST_EVERY < w + MIST_EVERY; k++) {
    const kind = ((k % banks.length) + banks.length) % banks.length;
    const x = k * MIST_EVERY + 17 * kind + parallax(view, MIST_DEPTH) - Math.round(t * MIST_WIND * (0.75 + 0.2 * kind) * dir);
    ctx.drawImage(banks[kind], x, footY - MIST_ROWS + 1 - (kind % 2) * 2);
  }
  ctx.globalAlpha = 1;
}

/** Fireflies: when each wakes, where it hovers (toward `dir`, above the ground) and its own pace. */
const FIREFLIES = [
  { at: 31, toward: 27, up: 8, pace: 1 },
  { at: 37, toward: -24, up: 6, pace: 0.8 },
  { at: 43, toward: 47, up: 12, pace: 1.15 },
];
const FIREFLY = '#f4ffa6';
const FIREFLY_GLOW = '#c4ee5c';

export function drawFireflies({ ctx, w, h, t, foxX, dir }: VistaView): void {
  FIREFLIES.forEach((fly, i) => {
    const awake = ramp(t, fly.at, fly.at + 3);
    if (awake <= 0) {
      return;
    }
    const a = t * fly.pace;
    const x = Math.min(w - 3, Math.max(2, foxX + dir * fly.toward + Math.sin(a * 0.31 + i * 2) * 6 + Math.sin(a * 0.13 + i) * 4));
    const y = h - fly.up * Math.min(1, h / 60) + Math.sin(a * 0.43 + i * 4) * 2.5 + Math.sin(a * 0.19) * 1.5;
    // It glows, goes dark, glows again.
    const glow = Math.max(0, Math.sin(a * 1.25 + i * 1.9)) ** 1.6;
    px(ctx, Math.round(x) - 1, y, FIREFLY_GLOW, awake * glow * 0.3, 3, 1);
    px(ctx, x, Math.round(y) - 1, FIREFLY_GLOW, awake * glow * 0.3, 1, 3);
    px(ctx, x, y, FIREFLY, awake * (0.12 + 0.88 * glow));
  });
}
