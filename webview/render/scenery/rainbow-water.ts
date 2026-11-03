import { px, ramp, type VistaView } from './paint';
import { paintBowInWater, sparkle } from './rainbow-bow';
import { blend, css, FOX_HALF, hash, rainAt, rgb, sparkleAt, type Plan } from './rainbow-plan';
import { skyAt } from './rainbow-sky';

// The water and the rain. The pond gives back the sky and, once it is out, the rainbow's foot; the shower rings it
// with ripples. The rain itself is light, short drops falling through the sun: some catch the light as they fall,
// and the very last ones glint with the rainbow's colours. Each drop is a little clock that falls, waits, and falls
// again somewhere else; whether it falls is settled when it starts, so the rain thins drop by drop.

/** The water is the sky a little deeper and bluer. */
const WATER = rgb('#4d7f9e');
const DEPTH = 0.3;
const RIPPLE = '#eef4ff';
const GLINT = '#fffbe8';
const DROP = '#eef3ff';
/** A drop caught by the sun, and the colours the last ones glint with. */
const SUNLIT = '#fff1c2';
const GLITTER = ['#ffb0bc', '#ffd29a', '#fff0a0', '#bff0b4', '#a8dcff', '#cdbcff'] as const;

/** How long a ripple takes to spread and fade, and how wide it gets. */
const RIPPLE_S = 0.8;
const RIPPLE_WIDE = 3;

/** The water's rows as they waver: how far aside each row gives back what is above it. */
function wobble(t: number): (x: number, y: number) => number {
  return (x, y) => Math.round(0.7 * Math.sin(y * 1.9 + t * 1.4 + x * 0.05));
}

/** The pond: the sky given back, the rainbow in it, a few glints that drift, and the ripples of the shower. */
export function paintPond(view: VistaView, plan: Plan, light: number): void {
  const { ctx, t, moment } = view;
  const { pond, horizon } = plan;
  pond.rows.forEach(([from, wide], row) => {
    const y = pond.y + row;
    ctx.fillStyle = css(blend(skyAt(plan, light, 2 * horizon - y), WATER, DEPTH + 0.25 * (row / pond.tall)));
    ctx.fillRect(from, y, wide, 1);
  });
  paintBowInWater(view, plan, pond, wobble(t));
  // Pale glints, a short dash on every other row, sliding slowly to and fro.
  pond.rows.forEach(([from, wide], row) => {
    if (row % 2 === 1 || wide < 6) {
      return;
    }
    const at = from + 1 + Math.round((wide - 4) * (0.5 + 0.5 * Math.sin(t * 0.3 + row * 2.3)));
    px(ctx, at, pond.y + row, GLINT, 0.35, 2 + (row % 3 === 0 ? 1 : 0), 1);
  });
  const rain = rainAt(t, moment);
  const spots = Math.max(2, Math.round(pond.rows[pond.tall >> 1][1] / 7));
  for (let i = 0; i < spots; i++) {
    const every = RIPPLE_S * (1.2 + hash(i, 1));
    const at = t + hash(i, 2) * every;
    const nth = Math.floor(at / every);
    const age = (at - nth * every) / RIPPLE_S;
    if (age > 1 || hash(i, nth) >= rainAt(t - age * RIPPLE_S, moment) || rain <= 0) {
      continue;
    }
    const row = 1 + Math.floor(hash(nth, i + 3) * Math.max(1, pond.tall - 2));
    const [from, wide] = pond.rows[row];
    const x = from + 2 + Math.floor(hash(nth, i + 7) * Math.max(1, wide - 4));
    const y = pond.y + row;
    const r = Math.round(age * RIPPLE_WIDE);
    const alpha = 0.7 * (1 - age);
    if (r === 0) {
      px(ctx, x, y, RIPPLE, alpha);
    } else {
      // A flat ring: its two ends, and its far edge a row up, shorter.
      px(ctx, x - r, y, RIPPLE, alpha);
      px(ctx, x + r, y, RIPPLE, alpha);
      if (r > 1 && row > 0) {
        px(ctx, x - r + 1, y - 1, RIPPLE, alpha * 0.6, 2 * r - 1, 1);
      }
    }
  }
}

/** One depth of rain. */
export interface Depth {
  readonly seed: number;
  /** Length of the streak, pixels per second, how much it shows. */
  readonly tall: number;
  readonly speed: number;
  readonly strength: number;
  /** Square pixels of view for each drop, and the most drops there ever are. */
  readonly area: number;
  readonly most: number;
  /** Whether the drops fall the whole way to us, or land somewhere on the land in between. */
  readonly near: boolean;
}

/** Far drops are short and faint and land in the meadow; near ones are longer and fall past the fox. */
export const FAR: Depth = { seed: 1, tall: 2, speed: 62, strength: 0.42, area: 110, most: 600, near: false };
export const NEAR: Depth = { seed: 2, tall: 4, speed: 105, strength: 0.55, area: 420, most: 160, near: true };
/** How far aside a drop goes for each pixel it falls: the wind takes the shower away the way the fox looks. */
const SLANT = 0.12;

export function paintDrops({ ctx, w, h, t, moment, foxX, dir, watched }: VistaView, plan: Plan, depth: Depth, sun: number): void {
  const slack = Math.ceil(h * SLANT);
  const count = Math.min(depth.most, Math.ceil(((w + slack) * h) / depth.area));
  const glitter = sparkleAt(moment);
  for (let i = 0; i < count; i++) {
    const cycle = (h + depth.tall) / depth.speed + 0.2 + hash(i, depth.seed) * 0.6;
    const at = t + hash(i, depth.seed + 10) * cycle;
    const fall = Math.floor(at / cycle);
    const since = at - fall * cycle;
    if (hash(i + depth.seed * 0.37, fall) >= rainAt(t - since, moment)) {
      continue;
    }
    // Each drop keeps to its own stretch of the width: the shower stays even, with no clumps and no holes.
    const left = ((i + hash(fall, i * 0.71 + depth.seed)) / count) * (w + slack) - (dir > 0 ? slack : 0);
    const lands = depth.near ? h : plan.horizon + 2 + Math.floor(hash(fall, i + 33) * (h - plan.horizon - 4));
    const head = Math.round(since * depth.speed);
    if (head - depth.tall >= lands) {
      continue;
    }
    if (depth.near && watched && Math.abs(left + dir * SLANT * h * 0.7 - foxX) < FOX_HALF) {
      continue;
    }
    const x = (y: number): number => Math.round(left + dir * SLANT * y);
    const pick = hash(fall, i + 51);
    if (pick < glitter * 0.6) {
      // One of the last drops, glinting with a colour of the rainbow as it falls.
      const color = GLITTER[Math.floor(hash(i, fall + 3) * GLITTER.length)];
      const y = Math.min(head, lands - 1);
      if (depth.near && Math.sin(t * 18 + i) > 0.2) {
        sparkle(ctx, x(y), y, 0.8, false, color);
      } else {
        px(ctx, x(y), y, color, 0.95);
        px(ctx, x(y - 1), y - 1, color, 0.4);
      }
      continue;
    }
    for (let k = 0; k < depth.tall; k++) {
      const y = head - k;
      if (y >= 0 && y < lands) {
        px(ctx, x(y), y, DROP, depth.strength * (1 - k / (depth.tall + 1)));
      }
    }
    // Some catch the sun: their head flashes warm for a moment as they fall.
    if (pick > 1 - 0.35 * sun && head < lands && Math.sin(since * 9 + i) > 0.3) {
      px(ctx, x(head), head, SUNLIT, 0.9);
    }
  }
  // Under the near rain, the last drops land with a tiny glint on the grass.
  if (depth.near && glitter > 0) {
    for (let i = 0; i < Math.ceil(w / 30); i++) {
      const nth = Math.floor(t * 1.6 + hash(i, 4));
      const x = Math.floor(hash(nth, i) * w);
      const phase = t * 1.6 + hash(i, 4) - nth;
      if (Math.abs(x - foxX) > FOX_HALF && hash(i, nth + 9) < glitter) {
        px(ctx, x, h - 2 - Math.floor(hash(nth, i + 1) * 3), GLITTER[(i + nth) % GLITTER.length], Math.sin(Math.PI * phase) * ramp(glitter, 0, 0.3));
      }
    }
  }
}
