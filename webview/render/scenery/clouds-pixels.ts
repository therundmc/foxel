import { clamp01, prerender, seeded } from './paint';

// Pictures painted pixel by pixel, for what a few rectangles cannot say: a shaded cloud, a mountain face.

/** A colour as its three channels. */
export type Rgb = readonly [number, number, number];

export const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as unknown as Rgb;

/** The colour `amount` of the way from one to another. */
export function blend(from: Rgb, to: Rgb, amount: number): Rgb {
  const k = clamp01(amount);
  return [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k, from[2] + (to[2] - from[2]) * k];
}

/** A small canvas written one pixel at a time, then shown at once. */
export class Pixels {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly image: ImageData;

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.canvas = prerender(w, h, () => undefined);
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    this.image = this.ctx.createImageData(this.canvas.width, this.canvas.height);
  }

  clear(): void {
    this.image.data.fill(0);
  }

  set(x: number, y: number, color: Rgb): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) {
      return;
    }
    const i = (y * this.image.width + x) * 4;
    const { data } = this.image;
    data[i] = color[0];
    data[i + 1] = color[1];
    data[i + 2] = color[2];
    data[i + 3] = 255;
  }

  /** Shows what was written since the last `clear`. */
  flush(): void {
    this.ctx.putImageData(this.image, 0, 0);
  }
}

/** A smooth wandering line from -1 to 1, the same for the same seed: `at(x)` changes slowly with `x`. */
export function wander(seed: number): (x: number) => number {
  const random = seeded(seed);
  const knots = Array.from({ length: 64 }, () => random() * 2 - 1);
  return (x) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = knots[((i % 64) + 64) % 64];
    const b = knots[(((i + 1) % 64) + 64) % 64];
    return a + (b - a) * f * f * (3 - 2 * f);
  };
}
