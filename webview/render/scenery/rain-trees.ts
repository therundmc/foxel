import { px } from './paint';

// How foliage is drawn: clouds of leaves in three tones, and the dark boughs that carry them. Each is drawn once,
// in several lights at the same time so the pictures match exactly.

/** Three tones of one colour: in shade, plain, and in the light. */
export type Tones = readonly [shade: string, body: string, light: string];

/** What foliage is painted with. Colours come in lists: one for each picture drawn at once. */
export interface Brush {
  readonly inks: readonly CanvasRenderingContext2D[];
  readonly leaves: readonly Tones[];
  readonly bark: readonly Tones[];
  /** The side the light comes from. */
  readonly light: 1 | -1;
  /** How big a leaf is, in pixels: 1 far away, more for foliage right in front of us. */
  readonly grain: number;
  /** Told of a few leaves that could shiver: where, and the tone they flick to. */
  readonly shiver?: (x: number, y: number, tone: number) => void;
}

const speck = (x: number, y: number): number => {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/** A cloud of leaves: rounded above, flatter under, its edge ragged, lit from above on the side of the light. */
export function drawMass(brush: Brush, cx: number, cy: number, rx: number, ry: number, seed: number): void {
  const grain = brush.grain;
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry; y++) {
    for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      // A leaf is `grain` pixels across: its pixels share one throw of the dice.
      const lx = Math.floor(x / grain);
      const ly = Math.floor(y / grain);
      const u = (x + 0.5 - cx) / rx;
      const v = ((y + 0.5 - cy) / ry) * (y > cy ? 1.5 : 1);
      if (u * u + v * v + (speck(lx + seed, ly) - 0.5) * 0.5 >= 1) {
        continue;
      }
      const lit = v - 0.45 * brush.light * u + (speck(lx, ly + seed) - 0.5) * 0.5;
      const tone = lit < -0.3 ? 2 : lit > 0.5 ? 0 : 1;
      brush.inks.forEach((ink, k) => px(ink, x, y, brush.leaves[k][tone]));
      if (tone > 0 && speck(x + 3, y + 5) < 0.02) {
        brush.shiver?.(x, y, tone - 1);
      }
    }
  }
}

/** A bough, `wide` pixels at its start and thinning to one at its end. */
export function drawBough(brush: Brush, x0: number, y0: number, x1: number, y1: number, wide: number): void {
  const steps = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    const thick = Math.max(1, Math.round(wide * (1 - p)));
    brush.inks.forEach((ink, k) => px(ink, x0 + (x1 - x0) * p, y0 + (y1 - y0) * p, brush.bark[k][1], 1, thick, thick));
  }
}
