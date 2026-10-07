import type { VistaView } from './paint';
import { hash, showerAt, type Plan } from './rain-plan';

// The rain on us: thin slanted streaks. Each drop is a little clock that falls, waits, and falls again somewhere
// else. Whether a fall happens is settled when it starts, so the shower thins out drop by drop, never in mid-air.

export interface Depth {
  readonly seed: number;
  /** Length of the streak, pixels per second, how much it shows. */
  readonly tall: number;
  readonly speed: number;
  readonly strength: number;
  readonly color: string;
  /** Square pixels of view for each drop: the nearer, the fewer. */
  readonly area: number;
}

/** Far ones are short, faint and slow behind the fox; near ones long and quick in front of it. */
export const FAR: Depth = { seed: 1, tall: 3, speed: 52, strength: 0.3, color: '#c9d0e2', area: 170 };
export const NEAR: Depth = { seed: 2, tall: 6, speed: 110, strength: 0.6, color: '#e8ecf6', area: 420 };

/** The fox's leaf: half its width, the row of its top above the ground, how much lower its edges are. */
const LEAF_HALF = 10;
const LEAF_TOP = 39;
const LEAF_DROOP = 3;
/** The fox under it, which no drop may cross. */
const FOX_HALF = 11;

/** One depth of rain. With `sheltered`, drops stop on the fox's leaf and none falls under it. */
export function paintRain({ ctx, w, h, t, foxX }: VistaView, plan: Plan, depth: Depth, sheltered: boolean): void {
  const { wind, clearAt } = plan;
  const slack = h * 0.4;
  const leaf = sheltered && plan.leafUp;
  const half = depth.tall >> 1;
  const count = Math.ceil((w * h) / depth.area);
  ctx.fillStyle = depth.color;
  for (let i = 0; i < count; i++) {
    const cycle = (h + depth.tall) / depth.speed + 0.2 + hash(i, depth.seed) * 0.6;
    const at = t + hash(i, depth.seed + 10) * cycle;
    const fall = Math.floor(at / cycle);
    const since = at - fall * cycle;
    if (hash(i + depth.seed * 0.37, fall) >= showerAt(t - since, clearAt)) {
      continue;
    }
    const top = hash(fall, i * 0.71 + depth.seed) * (w + 2 * slack) - slack;
    let lands = h;
    if (leaf) {
      const over = top + wind * (h - LEAF_TOP) - foxX;
      if (Math.abs(over) <= LEAF_HALF) {
        lands = h - LEAF_TOP + Math.round((LEAF_DROOP * over * over) / (LEAF_HALF * LEAF_HALF));
      } else if (Math.abs(top + wind * h - foxX) < FOX_HALF) {
        continue;
      }
    }
    // The streak leans with the wind, and its tail is fainter.
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
