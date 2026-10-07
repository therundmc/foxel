// Small helpers the vista painters share. A painter draws in sprite pixels: one unit is one pixel of the fox.

/** What a painter is given to paint one frame of its sky. It keeps nothing: the same view gives the same picture. */
export interface VistaView {
  /** A canvas `w` by `h` sprite pixels, cleared: (0, 0) is its top left corner, `h` the ground the fox sits on. */
  readonly ctx: CanvasRenderingContext2D;
  readonly w: number;
  readonly h: number;
  /** Seconds since the sky began to appear. It fades in and out by itself; the painter decides what comes when. */
  readonly t: number;
  /** Seconds since its great moment began, or undefined before it. */
  readonly moment: number | undefined;
  /** Where the fox sat down (the middle of it), and the side it leans its look to. */
  readonly foxX: number;
  readonly dir: 1 | -1;
  /** Whether it is still sitting there: it may have been drawn away to play while the sky goes on. */
  readonly watched: boolean;
}

/** One sky: what is behind the fox and, if need be, what passes in front of it. */
export interface VistaPainter {
  back(view: VistaView): void;
  front?(view: VistaView): void;
}

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** 0 before `from`, 1 after `to`, easing in and out in between. */
export function ramp(t: number, from: number, to: number): number {
  const p = clamp01((t - from) / (to - from));
  return p * p * (3 - 2 * p);
}

/** A repeatable stream of numbers from 0 to 1: the same seed always paints the same sky. */
export function seeded(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const channels = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** The colour `amount` of the way from one `#rrggbb` to another. */
export function mix(from: string, to: string, amount: number): string {
  const a = channels(from);
  const b = channels(to);
  const k = clamp01(amount);
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`;
}

/** One pixel, or a `w` by `h` block of them, snapped to the grid. */
export function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, alpha = 1, w = 1, h = 1): void {
  if (alpha <= 0) {
    return;
  }
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
  ctx.globalAlpha = 1;
}

/** Fills rows `top` to `bottom` with a vertical gradient through `stops`: [position from 0 to 1, colour]. */
export function gradient(
  { ctx, w }: VistaView,
  top: number,
  bottom: number,
  stops: readonly (readonly [number, string])[],
  alpha = 1,
): void {
  const fill = ctx.createLinearGradient(0, top, 0, bottom);
  stops.forEach(([at, color]) => fill.addColorStop(at, color));
  ctx.globalAlpha = clamp01(alpha);
  ctx.fillStyle = fill;
  ctx.fillRect(0, top, w, bottom - top);
  ctx.globalAlpha = 1;
}

/** A picture painted once on a canvas of its own, for what is too costly to redraw every frame. */
export function prerender(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w));
  canvas.height = Math.max(1, Math.ceil(h));
  draw(canvas.getContext('2d') as CanvasRenderingContext2D);
  return canvas;
}
