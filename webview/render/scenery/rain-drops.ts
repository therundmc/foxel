import { px, type VistaView } from './paint';
import { hash, rainAt, SLANT, type Plan } from './rain-plan';

// The rain on us: fine pale streaks, nearly straight down. Each drop is a little clock that falls, waits, and
// falls again somewhere else. Whether a fall happens is settled when it starts, so the rain sets in and thins
// out drop by drop, never in mid-air.

export interface Depth {
  readonly seed: number;
  /** Length of the streak, pixels per second, how much it shows. */
  readonly tall: number;
  readonly speed: number;
  readonly strength: number;
  /** Square pixels of view for each drop: the nearer, the fewer. */
  readonly area: number;
}

/** Far ones are short, faint and slow; near ones longer and quicker. Both are slow for rain: it is a soft one. */
export const FAR: Depth = { seed: 1, tall: 3, speed: 46, strength: 0.34, area: 190 };
export const NEAR: Depth = { seed: 2, tall: 5, speed: 78, strength: 0.55, area: 520 };
const DROP = '#f4f5f2';

/** The fox's leaf: half its width, the row of its top above the ground, how much lower its edges are. */
const LEAF_HALF = 10;
const LEAF_TOP = 39;
const LEAF_DROOP = 3;
/** The fox, which no drop may cross: under its leaf with its back to us, and in profile without it. */
const FOX_HALF = 11;
const FOX_HALF_BARE = 17;
const FOX_TALL = 30;

/** One depth of rain. Drops stop on the fox's leaf, and none ever falls on the fox. */
export function paintRain({ ctx, w, h, t, foxX, dir }: VistaView, plan: Plan, depth: Depth): void {
  const wind = dir * SLANT;
  const slack = h * SLANT;
  const half = depth.tall >> 1;
  const count = Math.ceil((w * h) / depth.area);
  ctx.fillStyle = DROP;
  for (let i = 0; i < count; i++) {
    const cycle = (h + depth.tall) / depth.speed + 0.2 + hash(i, depth.seed) * 0.6;
    const at = t + hash(i, depth.seed + 10) * cycle;
    const fall = Math.floor(at / cycle);
    const since = at - fall * cycle;
    if (hash(i + depth.seed * 0.37, fall) >= rainAt(t - since, plan.clearAt)) {
      continue;
    }
    // Each drop keeps to its own stretch of the width: the rain stays even, with no clumps and no holes.
    const top = ((i + hash(fall, i * 0.71 + depth.seed)) / count) * (w + slack) - (dir > 0 ? slack : 0);
    let lands = h;
    const over = top + wind * (h - LEAF_TOP) - foxX;
    if (plan.leafUp && Math.abs(over) <= LEAF_HALF) {
      lands = h - LEAF_TOP + Math.round((LEAF_DROOP * over * over) / (LEAF_HALF * LEAF_HALF));
    } else if (Math.abs(top + wind * (h - FOX_TALL / 2) - foxX) < (plan.leafUp ? FOX_HALF : FOX_HALF_BARE)) {
      continue;
    }
    // The streak leans a little with the wind, and its tail is fainter.
    const y = Math.round(since * depth.speed);
    const head = Math.min(y, lands) - (y - half);
    const tail = Math.min(y - half, lands) - (y - depth.tall);
    if (head > 0) {
      ctx.globalAlpha = depth.strength;
      ctx.fillRect(Math.round(top + wind * y), y - half, 1, head);
    }
    if (tail > 0) {
      ctx.globalAlpha = depth.strength * 0.55;
      ctx.fillRect(Math.round(top + wind * (y - half)), y - depth.tall, 1, tail);
    }
  }
  ctx.globalAlpha = 1;
}

/** Where a drop gathers at each edge of the leaf, from the fox's middle, and the seconds between two of them. */
const DRIPS = [[-9, 2.7], [10, 3.7]] as const;
const DRIP_FROM = 34;
const GATHERS = 0.6;
const GRAVITY = 70;

/** Now and then a drop swells at an edge of the fox's leaf, and falls. */
export function paintDrips({ ctx, h, t, foxX }: VistaView, plan: Plan): void {
  if (!plan.leafWet) {
    return;
  }
  DRIPS.forEach(([aside, every], side) => {
    const at = t + side * 1.3;
    const nth = Math.floor(at / every);
    const falling = at - nth * every - GATHERS;
    const y = h - DRIP_FROM + (falling > 0 ? Math.round(GRAVITY * falling * falling) : 0);
    if (hash(nth, side + 40) < 0.7 && y < h - 4) {
      px(ctx, foxX + aside, y, DROP, 0.85, 1, falling > 0.12 ? 2 : 1);
    }
  });
}
