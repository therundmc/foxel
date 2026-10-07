import type { Buddy } from './sim/buddy';
import type { Box } from './sim/math';
import type { WorldPoint } from './sim/world';
import { SPRITE_SIZE } from './sprites/frames';

export const DEFAULT_SCALE = 4;

/** A box on the canvas, in CSS pixels. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function inside(r: Rect, x: number, y: number, pad = 0): boolean {
  return x >= r.x - pad && x < r.x + r.w + pad && y >= r.y - pad && y < r.y + r.h + pad;
}

/**
 * The canvas, and how the world maps onto it: a sprite pixel is `scale` CSS pixels wide,
 * world x runs from the left edge and world y is the height above the ground line at the bottom.
 */
export class Stage {
  readonly ctx: CanvasRenderingContext2D;
  width = 0;
  height = 0;
  scale = DEFAULT_SCALE;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  }

  /** Matches the canvas to the size of its element, with sprite pixels `scale` CSS pixels wide. */
  fit(scale: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    this.scale = Math.max(1, Math.round(scale) || DEFAULT_SCALE);
  }

  toWorld(cssX: number, cssY: number): WorldPoint {
    return { x: cssX / this.scale, y: (this.height - this.scale - cssY) / this.scale };
  }

  screenY(worldY: number): number {
    return this.height - this.scale - worldY * this.scale;
  }

  buddyRect(buddy: Buddy): Rect {
    const size = SPRITE_SIZE * this.scale;
    return {
      x: Math.round(buddy.x * this.scale),
      y: this.height - size - Math.round(buddy.y * this.scale),
      w: size,
      h: size,
    };
  }

  /** Where a box of the world lands on the canvas. */
  rect(box: Box): Rect {
    return {
      x: Math.round(box.x * this.scale),
      y: Math.round(this.screenY(box.y + box.h)),
      w: box.w * this.scale,
      h: box.h * this.scale,
    };
  }
}
