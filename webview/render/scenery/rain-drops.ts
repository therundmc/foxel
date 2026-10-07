import { clamp01, px, seeded, type VistaView } from './paint';
import type { Puddle } from './rain-land';
import { hash, leafUpAt, showerAt, type Plan } from './rain-plan';

// The rain itself. Every drop is a little clock: it falls, lands, splashes, waits, and falls again somewhere
// else. Whether a fall happens is settled when it starts, so a shower thins out drop by drop, never in mid-air.

export interface Depth {
  readonly seed: number;
  /** The streak, as stretches of pixels from its head up: each a little fainter and further back in the wind. */
  readonly streak: readonly number[];
  /** Pixels per second, and how much it shows. */
  readonly speed: number;
  readonly strength: number;
  readonly color: string;
  /** Square pixels of view for each drop: the nearer, the fewer. */
  readonly area: number;
  /** Where it lands, as rows up from the bottom of the view: [nearest, farthest]. */
  readonly lands: readonly [number, number];
  readonly splashes: boolean;
}

/** Far ones are short, faint and slow behind the fox; near ones long and quick in front of it. */
export const FAR: Depth = { seed: 1, streak: [3], speed: 50, strength: 0.34, color: '#d3dfe8', area: 85, lands: [7, 16], splashes: false };
export const MIDDLE: Depth = { seed: 2, streak: [2, 3], speed: 78, strength: 0.56, color: '#dde8f0', area: 135, lands: [3, 6], splashes: true };
export const NEAR: Depth = { seed: 3, streak: [3, 2, 2], speed: 112, strength: 0.8, color: '#eef4fa', area: 300, lands: [0, 2], splashes: true };

const SPLASH_S = 0.3;
const SPLASH = '#eef4f8';
/** The fox's leaf: half its width, the row of its top above the ground, how much lower its edges are. */
const LEAF_HALF = 10;
const LEAF_TOP = 39;
const LEAF_DROOP = 3;
const LEAF_TIP = 34;
const LEAF_HOLDS_A_BEAD = 1.3;
/** The fox under it, which no drop may cross. */
const FOX_HALF = 11;

/** Per drop: where in its cycle it starts, its pause on the ground, the row it lands on. */
const cache = new Map<string, Float32Array>();

function dropsOf(depth: Depth, w: number, h: number): Float32Array {
  const key = `${depth.seed}:${w}x${h}`;
  let drops = cache.get(key);
  if (!drops) {
    if (cache.size > 8) {
      cache.clear();
    }
    const random = seeded(0xd2095 + depth.seed * 977 + w * 31 + h);
    drops = Float32Array.from({ length: Math.ceil((w * h) / depth.area) * 3 }, (_, i) =>
      i % 3 === 2 ? Math.round(depth.lands[0] + random() * (depth.lands[1] - depth.lands[0])) : random(),
    );
    cache.set(key, drops);
  }
  return drops;
}

function splash(ctx: CanvasRenderingContext2D, x: number, y: number, since: number, strength: number): void {
  const p = since / SPLASH_S;
  const out = p < 0.45 ? 1 : 2;
  const fade = strength * (1 - p * 0.7);
  px(ctx, x - out, y - out, SPLASH, fade);
  px(ctx, x + out, y - out, SPLASH, fade);
  if (p < 0.45) {
    px(ctx, x, y, SPLASH, fade);
  }
}

/** Curtains of thicker rain pass slowly across: it is never an even noise. */
function gust(x: number, t: number, dir: number): number {
  return 0.66 + 0.34 * Math.sin(x * 0.03 - dir * t * 0.8 + 2 * Math.sin(t * 0.17));
}

/** One depth of rain. With `sheltered`, drops land on the fox's leaf and none falls under it. */
export function paintRain(view: VistaView, plan: Plan, depth: Depth, sheltered: boolean): void {
  const { ctx, w, h, t, foxX, dir } = view;
  const { wind, clearAt } = plan;
  const drops = dropsOf(depth, w, h);
  const slack = h * 0.4;
  const leaf = sheltered && plan.leafUp;
  const length = depth.streak.reduce((sum, stretch) => sum + stretch, 0);
  for (let i = 0; i < drops.length; i += 3) {
    const ground = h - 1 - drops[i + 2];
    const cycle = (ground + length) / depth.speed + SPLASH_S + drops[i + 1] * 0.5;
    const at = t + drops[i] * cycle;
    const fall = Math.floor(at / cycle);
    const since = at - fall * cycle;
    if (hash(i + depth.seed * 0.37, fall) >= showerAt(t - since, clearAt)) {
      continue;
    }
    const top = hash(fall, i * 0.71 + depth.seed) * (w + 2 * slack) - slack;
    let lands = ground;
    if (leaf) {
      const over = top + wind * (h - LEAF_TOP) - foxX;
      if (Math.abs(over) <= LEAF_HALF) {
        lands = h - LEAF_TOP + Math.round((LEAF_DROOP * over * over) / (LEAF_HALF * LEAF_HALF));
      } else if (Math.abs(top + wind * ground - foxX) < FOX_HALF) {
        continue;
      }
    }
    const y = since * depth.speed - 1;
    const strength = depth.strength * gust(top, t, dir);
    if (y < lands) {
      // The streak leans with the wind and fades up its tail.
      let up = 0;
      for (let k = 0; k < depth.streak.length; k++) {
        up += depth.streak[k];
        px(ctx, top + wind * (y - up + 1), Math.round(y) - up + 1, depth.color, strength * (1.2 - 0.35 * k), 1, depth.streak[k]);
      }
    } else if (depth.splashes) {
      const landed = since - (lands + 1) / depth.speed;
      if (landed < SPLASH_S) {
        splash(ctx, Math.round(top + wind * lands), lands, landed, strength + 0.25);
      }
    }
  }
}

const RIPPLE_S = 0.85;
const RIPPLE = '#e3edf2';

/** Rings spreading on the puddles where drops land, each kept inside its water. */
export function paintRipples({ ctx, t }: VistaView, { clearAt }: Plan, puddles: readonly Puddle[]): void {
  puddles.forEach((puddle, p) => {
    const [from, to] = puddle.rows[1];
    const inWater = (x: number, row: number): boolean => x >= puddle.rows[row][0] && x < puddle.rows[row][1];
    for (let slot = 0; slot < (to - from) / 6; slot++) {
      const id = p * 13 + slot;
      const cycle = 1.15 + hash(id, 3) * 0.8;
      const at = t + hash(id, 4) * cycle;
      const fall = Math.floor(at / cycle);
      const since = at - fall * cycle;
      if (since > RIPPLE_S || hash(id, fall) >= showerAt(t - since, clearAt)) {
        continue;
      }
      const x = Math.round(from + 2 + hash(fall, id) * (to - from - 4));
      const spread = since / RIPPLE_S;
      const r = Math.round(spread * 5);
      const fade = 0.85 * (1 - spread);
      if (since < 0.12) {
        px(ctx, x, puddle.y, '#ffffff', 0.9);
      }
      for (const side of r === 0 ? [0] : [-1, 1]) {
        if (inWater(x + side * r, 1)) {
          px(ctx, x + side * r, puddle.y + 1, RIPPLE, fade);
        }
        // The ring is seen from the side: its near and far arcs are flatter and shorter.
        if (r > 2) {
          for (const row of [0, 2]) {
            if (inWater(x + side * (r - 2), row)) {
              px(ctx, x + side * (r - 2), puddle.y + row, RIPPLE, fade * 0.7, 1, 1);
            }
          }
        }
      }
    }
  });
}

/** A bead swells, hangs, and falls faster and faster. */
const DRIP_HANGS = 0.5;
const DRIP_GRAVITY = 240;
const DRIP = '#dcebf5';

/** A drip from the tip of a leaf at (`x`, `y`) down to `ground`: `chance(time)` says whether a bead forms at that time. */
export function paintDrip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ground: number,
  t: number,
  id: number,
  chance: (time: number) => number,
): void {
  const cycle = 1.5 + hash(id, 31) * 0.9;
  const at = t + hash(id, 32) * cycle;
  const fall = Math.floor(at / cycle);
  const since = at - fall * cycle;
  if (hash(id, fall + 0.5) >= chance(t - since)) {
    return;
  }
  const hangs = cycle * DRIP_HANGS;
  if (since < hangs) {
    px(ctx, x, y, DRIP, 0.85, 1, since < hangs * 0.55 ? 1 : 2);
    return;
  }
  const falling = since - hangs;
  const drop = y + 1 + 0.5 * DRIP_GRAVITY * falling * falling;
  if (drop < ground) {
    px(ctx, x, drop - 1, DRIP, 0.9, 1, 2);
    return;
  }
  const landed = falling - Math.sqrt((2 * (ground - y - 1)) / DRIP_GRAVITY);
  if (landed < SPLASH_S) {
    splash(ctx, x, ground, landed, 0.8);
  }
}

/** Beads keep falling from the leaves long after the rain: often at first, then now and then. */
export function drippingAt(time: number, clearAt: number | undefined): number {
  const raining = showerAt(time, clearAt);
  const since = clearAt === undefined ? -1 : time - clearAt;
  return since < 0 ? raining : Math.max(raining, 0.8 - 0.5 * clamp01((since - 6) / 26));
}

/** The two drips from the edges of the leaf the fox holds up, either side of it. */
export function paintLeafDrips({ ctx, h, t, foxX }: VistaView, { clearAt }: Plan): void {
  // A bead only forms if the leaf is there, and still there when it lets go.
  const chance = (time: number): number =>
    leafUpAt(time, clearAt) && leafUpAt(time + LEAF_HOLDS_A_BEAD, clearAt) ? drippingAt(time, clearAt) : 0;
  for (const side of [-1, 1]) {
    paintDrip(ctx, foxX + side * (LEAF_HALF + 1), h - LEAF_TIP, h - 1, t, 70 + side, chance);
  }
}
