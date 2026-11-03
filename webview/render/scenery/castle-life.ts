import { clamp01, ramp, seeded, type VistaView } from './paint';
import type { Island } from './castle-island';

// What moves on and around the island: its waterfalls spilling over the rim and falling far, thinning into
// veils of mist before they reach the clouds below; and a flock of birds wheeling round it, some of which
// break away at its great moment and sweep past over the fox.

const WATER = '#e4f1fa';
const SPARKLE = '#ffffff';
const MIST = '#eef4fa';
/** The falls run down this fast, in pixels a second; a bright fleck every this many pixels. */
const FALL_SPEED = 9;
const FLECK_EVERY = 5;
const BIRD = '#3f4874';
const BIRDS = 8;
/** A full round of the island takes this long; the birds that leave go at these times after the moment. */
const ROUND_S = 16;
const LEAVE_S = [8.5, 16] as const;
const LEAVING = 4;

/** Where the island is on the view: its middle and the row of its top. */
export interface Place {
  readonly x: number;
  readonly y: number;
}

/**
 * The waterfalls: a thread of water from each notch in the rim, flecks of light running down it, falling to
 * row `sea`; lower down they fray and widen into mist. `clear` is how much they show, `sparkle` how much sun;
 * with `glints`, only their flecks, as seen through a cloud.
 */
export function paintFalls(view: VistaView, island: Island, at: Place, sea: number, clear: number, sparkle: number, glints = false): void {
  const { ctx, t } = view;
  if (clear <= 0.02) {
    return;
  }
  const wide = island.size >= 56 ? 2 : 1;
  island.falls.forEach(([fx, fy, under], n) => {
    const x0 = Math.round(at.x + fx);
    const top = Math.round(at.y + fy);
    const length = Math.max(4, sea - top);
    // The ones at the ends leap clear of the rim before they fall; the middle one runs down the rock face.
    const out = n === 1 ? 0 : Math.sign(fx);
    for (let k = 0; k < length; k++) {
      const y = top + k;
      const p = k / length;
      const x = x0 + out * Math.round(Math.sqrt(k) * 0.6);
      const fade = clamp01(1 - p ** 1.6) * clear;
      const onRock = y < at.y + under && n === 1;
      if (!glints) {
        ctx.globalAlpha = fade * (onRock ? 0.85 : 0.75);
        ctx.fillStyle = WATER;
        ctx.fillRect(x, y, wide + (p > 0.55 ? 1 : 0), 1);
      }
      const fleck = (((k - t * FALL_SPEED + n * 7) % FLECK_EVERY) + FLECK_EVERY) % FLECK_EVERY;
      if (fleck < 1) {
        ctx.globalAlpha = fade * (0.55 + 0.45 * sparkle);
        ctx.fillStyle = SPARKLE;
        ctx.fillRect(x + (p > 0.55 && k % 2 ? 1 : 0), y, 1, 1);
      }
      // Lower down the fall frays into spray, a pixel each side now and then.
      if (p > 0.35 && !glints) {
        const spray = Math.sin(k * 1.7 + t * 3 + n) + Math.sin(k * 0.6 - t * 2.1);
        if (spray > 0.9) {
          ctx.globalAlpha = fade * 0.4;
          ctx.fillStyle = MIST;
          ctx.fillRect(x + (spray > 1.4 ? -1 : wide + 1), y, 1, 1);
        }
      }
    }
    if (glints) {
      return;
    }
    // Where it is lost, a veil of mist drifting a little.
    const veil = Math.max(3, Math.round(island.size * 0.1));
    for (let r = 0; r < veil; r++) {
      const y = sea - veil + r;
      const half = Math.round(1 + (r / veil) * island.size * 0.07 + Math.sin(t * 0.7 + r + n) * 0.8);
      const x = x0 + out * Math.round(Math.sqrt(length) * 0.6);
      ctx.globalAlpha = 0.28 * clear * (0.6 + 0.4 * Math.sin(t * 0.9 + r * 0.8 + n * 2));
      ctx.fillStyle = MIST;
      ctx.fillRect(x - half, y, half * 2 + wide, 1);
    }
  });
  ctx.globalAlpha = 1;
}

/** A bird: wings up or level, bigger as it comes near. */
function bird(ctx: CanvasRenderingContext2D, x: number, y: number, flap: boolean, big: boolean): void {
  const rx = Math.round(x);
  const ry = Math.round(y);
  ctx.fillRect(rx, ry, 1, 1);
  if (big) {
    ctx.fillRect(rx - 1, ry - (flap ? 1 : 0), 1, 1);
    ctx.fillRect(rx + 1, ry - (flap ? 1 : 0), 1, 1);
    ctx.fillRect(rx - 2, ry - (flap ? 2 : 0), 1, 1);
    ctx.fillRect(rx + 2, ry - (flap ? 2 : 0), 1, 1);
  } else {
    ctx.fillRect(rx - 1, ry - (flap ? 1 : 0), 1, 1);
    ctx.fillRect(rx + 1, ry - (flap ? 1 : 0), 1, 1);
  }
}

/**
 * The flock: each bird on its own round of the island, behind it on the far half (`front` false) and before
 * it on the near one. At the moment a few break away, sweep toward the fox and over it, out of the view.
 */
export function paintBirds(view: VistaView, island: Island, at: Place, front: boolean, shown: number): void {
  const { ctx, t, moment, foxX, dir, h } = view;
  if (shown <= 0) {
    return;
  }
  const random = seeded(0xb12d);
  const rx = island.size * 0.72;
  const ry = island.size * 0.16;
  const cy = at.y - island.size * 0.12;
  ctx.fillStyle = BIRD;
  for (let i = 0; i < BIRDS; i++) {
    const speed = (Math.PI * 2) / (ROUND_S * (0.85 + random() * 0.3));
    const phase = (i / BIRDS) * Math.PI * 2 + random() * 0.6;
    const lift = (random() - 0.5) * island.size * 0.16;
    const angle = -dir * t * speed + phase;
    let x = at.x + Math.cos(angle) * rx * (0.85 + 0.15 * Math.sin(t * 0.3 + i));
    let y = cy + lift + Math.sin(angle) * ry;
    let near = Math.sin(angle) > 0;
    let big = false;
    if (i < LEAVING && moment !== undefined) {
      const k = ramp(moment, LEAVE_S[0] + i * 0.7, LEAVE_S[1] + i * 0.7);
      if (k >= 1) {
        continue;
      }
      if (k > 0) {
        // Out of the round, down toward the fox and up over it, coming nearer all the way.
        const ex = foxX - dir * (view.w * 0.35 + 20);
        const mx = (at.x + foxX) / 2;
        const my = h * 0.55;
        const u = 1 - k;
        x = u * u * x + 2 * u * k * mx + k * k * ex + Math.sin(k * 9 + i) * 2;
        y = u * u * y + 2 * u * k * my + k * k * -8;
        near = true;
        big = k > 0.3;
      }
    }
    if (near !== front) {
      continue;
    }
    ctx.globalAlpha = shown;
    bird(ctx, x, y, Math.floor(t * 4 + i * 1.3) % 2 === 0, big);
  }
  ctx.globalAlpha = 1;
}
