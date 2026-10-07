import { px } from './paint';

// The sea the evening sun sinks into: calm rows of water mirroring the sky, and the light of the ball laid on it.

/** The water, one colour per row from the horizon down: `colorOf` is given 0 at the horizon, 1 at our feet. */
export function drawWater(ctx: CanvasRenderingContext2D, w: number, horizon: number, h: number, colorOf: (depth: number) => string): void {
  const rows = h - horizon;
  for (let row = 0; row < rows; row++) {
    ctx.fillStyle = colorOf(row / Math.max(1, rows - 1));
    ctx.fillRect(0, horizon + row, w, 1);
  }
}

/**
 * The sun on the water: one soft column of light under it, a little wider toward us. Every other row is
 * shorter and each sways a pixel, slowly, which is all the life calm water needs.
 */
export function drawReflection(ctx: CanvasRenderingContext2D, x: number, horizon: number, h: number, radius: number, t: number, color: string, strength: number): void {
  if (strength <= 0.02) {
    return;
  }
  const rows = h - horizon;
  for (let row = 0; row < rows; row++) {
    const half = Math.round((radius * 0.55 + row * 0.22) * (row % 2 === 0 ? 1 : 0.7));
    const left = x - half + Math.round(Math.sin(t * 0.45 + row * 1.9));
    const light = strength * (1 - (0.55 * row) / rows);
    px(ctx, left - 2, horizon + row, color, light * 0.3, half * 2 + 5, 1);
    px(ctx, left, horizon + row, color, light * 0.75, half * 2 + 1, 1);
  }
}
