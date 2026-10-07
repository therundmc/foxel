import type { Buddy } from './sim/buddy';
import type { Ball } from './sim/props/ball';
import type { Bowl } from './sim/props/bowl';
import type { Treat } from './sim/props/treat';
import type { WorldPoint } from './sim/world';
import { SPRITE_SIZE } from './sprites/frames';
import { BALL_SIZE, BOWL_H, BOWL_W, TREAT_H, TREAT_W } from './sprites/props';

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

  ballRect(ball: Ball): Rect {
    const size = BALL_SIZE * this.scale;
    return {
      x: Math.round(ball.x * this.scale),
      y: Math.round(this.screenY(ball.y + BALL_SIZE)),
      w: size,
      h: size,
    };
  }

  treatRect(treat: Treat): Rect {
    return {
      x: Math.round(treat.x * this.scale),
      y: Math.round(this.screenY(treat.y + TREAT_H)),
      w: TREAT_W * this.scale,
      h: TREAT_H * this.scale,
    };
  }

  bowlRect(bowl: Bowl): Rect {
    return {
      x: Math.round(bowl.x * this.scale),
      y: Math.round(this.screenY(BOWL_H)),
      w: BOWL_W * this.scale,
      h: BOWL_H * this.scale,
    };
  }
}
