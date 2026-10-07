import { mix, parallax, px, type VistaView } from './paint';
import { FLASH } from './rain-light';
import { hash, type Plan } from './rain-plan';

// What lies under the storm: three pale planes of far hills fading into the rain, the mist at their feet,
// and close to us the dark grassy lookout the fox sits on.

export interface Plane {
  /** 0 just behind the lookout, 1 as far as the sky: it sets how fast the plane glides past. */
  readonly depth: number;
  /** Width of its hills, and the lowest and highest its crest goes, as shares of the land's rise. */
  readonly wave: number;
  readonly low: number;
  readonly high: number;
  /** Under the rain, and washed by the light. */
  readonly rainy: string;
  readonly washed: string;
  /** How thick the mist lies at its feet. */
  readonly mist: number;
}
export const RANGE: Plane = { depth: 0.75, wave: 31, low: 0.5, high: 1, rainy: '#7f88a4', washed: '#a8c4d8', mist: 0.3 };
export const MIDDLE: Plane = { depth: 0.3, wave: 23, low: 0.25, high: 0.62, rainy: '#6b7694', washed: '#8fbfae', mist: 0.35 };
export const NEAR: Plane = { depth: 0, wave: 37, low: 0.05, high: 0.36, rainy: '#566382', washed: '#74b384', mist: 0.7 };
const MIST = ['#9aa1b8', '#e0ecdf'] as const;
const GRASS = ['#2f4a52', '#3f7a4c'] as const;
const EARTH = ['#1f333d', '#27573f'] as const;
/** How much a flash lifts the far land, and the rim it puts on the lookout. */
const LIFT = 0.22;
const RIM = 0.6;

/** A colour under the rain, lifted by a flash (`lit` from 0 to 1) or washed by the light that follows the storm. */
const shade = ([rainy, washed]: readonly [string, string], plan: Plan, lit: number): string =>
  lit > 0.01 ? mix(rainy, FLASH, lit) : mix(rainy, washed, plan.fresh);

// A crisp shape from the row `top(x)` of each column down to the bottom of the view: one block for each
// stretch of columns of the same height.
function silhouette({ ctx, w, h }: VistaView, color: string, top: (x: number) => number): void {
  ctx.fillStyle = color;
  let from = 0;
  let y = top(0);
  for (let x = 1; x <= w; x++) {
    const next = x < w ? top(x) : h + 1;
    if (next !== y) {
      ctx.fillRect(from, y, x - from, h - y);
      from = x;
      y = next;
    }
  }
}

/** One plane of far hills, a function of where we are along the land so it can glide by for ever, and its mist. */
export function paintPlane(view: VistaView, plan: Plan, plane: Plane, lit: number): void {
  const { base, rise } = plan;
  const shift = parallax(view, plane.depth);
  const wave = plane.wave * (0.6 + rise / 30);
  silhouette(view, shade([plane.rainy, plane.washed], plan, lit * LIFT), (x) => {
    const at = x - shift;
    const lift = 0.5 + 0.3 * Math.sin(at / wave + plane.wave) + 0.2 * Math.sin(at / (wave * 0.41) + plane.depth * 9);
    return base - Math.round(rise * (plane.low + (plane.high - plane.low) * lift));
  });
  // A flat sheet of it from the hollows down: the hills in front stand out of it.
  px(view.ctx, 0, base - Math.round(rise * plane.low), shade(MIST, plan, lit * LIFT), plane.mist, view.w, view.h);
}

/** The lookout: a near dark hilltop, highest under the fox, with blades of grass along its edge. It never moves. */
export function paintLookout(view: VistaView, plan: Plan, lit: number): void {
  const { w, h, foxX } = view;
  const spread = Math.min(90, Math.max(30, w * 0.28));
  const top = (x: number): number => {
    const away = (x - foxX) / spread;
    return h - Math.round(plan.edge + (plan.crest - plan.edge) / (1 + away * away) + 0.5 * Math.sin(x * 0.19));
  };
  const blade = (x: number): number => (x % 2 === 0 && hash(x, 5) < 0.55 * Math.sin(x * 0.23) ? 2 + Math.floor(hash(x, 6) * 3) : 0);
  silhouette(view, shade(GRASS, plan, lit * RIM), (x) => top(x) - blade(x));
  silhouette(view, shade(EARTH, plan, 0), (x) => top(x) + 2);
}

/** Blades in front of the fox, over its paws: [how far from its middle, how tall]. */
const BLADES = [[-14, 3], [-10, 2], [-5, 4], [3, 2], [8, 3], [13, 4], [16, 2]] as const;

export function paintBlades({ ctx, h, foxX }: VistaView, plan: Plan, lit: number): void {
  const grass = shade(GRASS, plan, lit * RIM);
  BLADES.forEach(([aside, tall]) => px(ctx, foxX + aside, h - tall, grass, 1, 1, tall));
}
