import type { Scene } from './lanterns-scene';
import { clamp01, ramp, seeded, type VistaView } from './paint';

// A few spirit wisps: tiny pale motes of cool light that wander over the water and among the lanterns, each for a
// while, then fade and come back somewhere else. Only a handful before the moment; more of them when the lanterns
// rise, drawn up along with them.

const CORE = '#effcff';
const HALO = '#9fdcff';
/** How many wander before the moment and how many more join the lanterns, and how long one stays in sight. */
const BEFORE = 4;
const DURING = 12;
const STAYS_S = 9;
/** When the first ones come out, as dusk deepens. */
const FROM_S = 5;

function drawWisp(ctx: CanvasRenderingContext2D, x: number, y: number, back: number, alpha: number): void {
  const rx = Math.round(x);
  const ry = Math.round(y);
  ctx.fillStyle = HALO;
  ctx.globalAlpha = 0.22 * alpha;
  ctx.fillRect(rx - 1, ry, 3, 1);
  ctx.fillRect(rx, ry - 1, 1, 3);
  ctx.globalAlpha = 0.3 * alpha;
  ctx.fillRect(rx - back, ry + 1, 1, 1);
  ctx.fillStyle = CORE;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillRect(rx, ry, 1, 1);
}

/** The wisps, for the back layer, among the lanterns. */
export function paintWisps(view: VistaView, scene: Scene): void {
  const { ctx, t, moment, w, dir } = view;
  const { shore, cx, half } = scene;
  const count = BEFORE + (moment === undefined ? 0 : DURING);
  for (let i = 0; i < count; i++) {
    const late = i >= BEFORE;
    const clock = late ? (moment as number) - 1.5 - (i - BEFORE) * 0.7 : t - FROM_S - i * 2.3;
    if (clock < 0) {
      continue;
    }
    // Each round of its life it comes out somewhere else, the same for the same round.
    const round = Math.floor(clock / STAYS_S);
    const life = (clock % STAYS_S) / STAYS_S;
    const random = seeded(0x3159 + i * 977 + round * 131);
    const fromX = cx + (random() - 0.5) * 2.4 * half;
    const fromY = late ? shore - 2 - random() * shore * 0.4 : shore + 1 - random() * shore * 0.5;
    const phase = random() * 6.3;
    const x = fromX + dir * life * (6 + random() * 10) + 3 * Math.sin(t * 0.5 + phase);
    const y = fromY - life * (late ? shore * 0.35 : 4) + 2 * Math.sin(t * 0.8 + phase * 2);
    if (x < 0 || x >= w || y < 0) {
      continue;
    }
    const twinkle = 0.65 + 0.35 * Math.sin(t * 3.1 + phase);
    const fade = ramp(life, 0, 0.18) * (1 - ramp(life, 0.75, 1));
    const after = late && moment !== undefined ? 1 - ramp(moment, 28, 36) : 1;
    drawWisp(ctx, x, y, dir, clamp01(fade * twinkle * after) * 0.85);
  }
  ctx.globalAlpha = 1;
}
