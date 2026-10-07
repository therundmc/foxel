import { px, type VistaView } from './paint';
import { hash, rainAt, SLANT_MOST, type Plan } from './rain-plan';

// The rain on us: a driving rain, leaning with the wind and laid almost flat by the gusts. Each drop is a little
// clock that falls, waits, and falls again somewhere else. Whether a fall happens is settled when it starts, so the
// rain sets in and thins out drop by drop, never in mid-air.

export interface Depth {
  readonly seed: number;
  /** Length of the streak, pixels per second, how much it shows. */
  readonly tall: number;
  readonly speed: number;
  readonly strength: number;
  /** Square pixels of view for each drop: the nearer, the fewer. And the most drops there ever are. */
  readonly area: number;
  readonly most: number;
}

/** Far ones are short, faint and slower; near ones long and quick. */
export const FAR: Depth = { seed: 1, tall: 4, speed: 72, strength: 0.4, area: 95, most: 700 };
export const NEAR: Depth = { seed: 2, tall: 7, speed: 122, strength: 0.56, area: 270, most: 260 };
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
  const wind = dir * plan.slant;
  // Room on the windward side for the drops the wind brings in from outside the view.
  const slack = h * SLANT_MOST;
  // A very large view gets no more drops than this: they would cost more than they show.
  const count = Math.min(depth.most, Math.ceil(((w + slack) * h) / depth.area));
  ctx.fillStyle = DROP;
  ctx.globalAlpha = depth.strength;
  for (let i = 0; i < count; i++) {
    const cycle = (h + depth.tall) / depth.speed + 0.15 + hash(i, depth.seed) * 0.5;
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
    // The streak leans with the wind: it is a few short upright strokes, each a step aside from the one above.
    const head = Math.round(since * depth.speed);
    let from = Math.min(head, lands - 1);
    const end = Math.max(0, head - depth.tall + 1);
    while (from >= end) {
      const x = Math.round(top + wind * from);
      let to = from;
      while (to - 1 >= end && Math.round(top + wind * (to - 1)) === x) {
        to--;
      }
      ctx.fillRect(x, to, 1, from - to + 1);
      from = to - 1;
    }
  }
  ctx.globalAlpha = 1;
}

/** Sheets of rain: in a gust, pale slanting veils sweep across the view with the wind. */
const SHEETS = 4;
const SHEET_SPEED = 95;

export function paintSheets({ ctx, w, h, t, dir }: VistaView, plan: Plan): void {
  const strength = 0.11 * plan.gust * rainAt(t, plan.clearAt);
  if (strength < 0.01) {
    return;
  }
  const span = w + h * 2;
  ctx.fillStyle = DROP;
  ctx.globalAlpha = strength;
  for (let i = 0; i < SHEETS; i++) {
    const along = (((t * SHEET_SPEED * (0.8 + 0.1 * i) + (i * span) / SHEETS) % span) + span) % span;
    const top = dir > 0 ? along - h : w + h - along;
    for (let y = 0; y < h; y += 2) {
      ctx.fillRect(Math.round(top + dir * plan.slant * y), y, 2 + (i % 2), 2);
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
