import { FRAME_PAD, FRAME_SIZE, type Glyph, type Point } from './frames';
import { TRANSPARENT } from './palette';

/**
 * A sprite being drawn: rows of palette letters, with a margin round it. Everything here takes the sprite's own
 * coordinates, (0, 0) being its top left corner: what falls a little outside lands in the margin.
 */
export type Grid = string[][];

export function newGrid(): Grid {
  return Array.from({ length: FRAME_SIZE }, () => Array<string>(FRAME_SIZE).fill(TRANSPARENT));
}

export function set(g: Grid, x: number, y: number, c: string): void {
  const row = g[y + FRAME_PAD];
  if (row && x >= -FRAME_PAD && x < FRAME_SIZE - FRAME_PAD) {
    row[x + FRAME_PAD] = c;
  }
}

/** Whether something is drawn at this place of the sprite. */
export function filledAt(g: Grid, x: number, y: number): boolean {
  return (g[y + FRAME_PAD]?.[x + FRAME_PAD] ?? TRANSPARENT) !== TRANSPARENT;
}

export function rect(g: Grid, x0: number, y0: number, x1: number, y1: number, c: string): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      set(g, x, y, c);
    }
  }
}

export function inEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number): boolean {
  const nx = (x + 0.5 - cx) / rx;
  const ny = (y + 0.5 - cy) / ry;
  return nx * nx + ny * ny <= 1;
}

export function ellipse(
  g: Grid,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  c: string,
  clip: (x: number, y: number) => boolean = () => true,
): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (inEllipse(x, y, cx, cy, rx, ry) && clip(x, y)) {
        set(g, x, y, c);
      }
    }
  }
}

export function poly(g: Grid, pts: readonly Point[], c: string): void {
  const xs = pts.map(([x]) => x);
  const ys = pts.map(([, y]) => y);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
    for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
          inside = !inside;
        }
      }
      if (inside) {
        set(g, x, y, c);
      }
    }
  }
}

export function lerp(a: Point, b: Point, t: number): Point {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export function limb(g: Grid, from: Point, to: Point, c: string): void {
  const steps = Math.ceil(Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]))) * 2 + 1;
  for (let i = 0; i <= steps; i++) {
    const [x, y] = lerp(from, to, i / steps).map(Math.floor);
    rect(g, x, y, x + 1, y + 1, c);
  }
}

/** Wraps everything drawn so far in a dark one-pixel border. */
export function outline(g: Grid): void {
  const filled = g.map((r) => r.map((c) => c !== TRANSPARENT));
  const isFilled = (x: number, y: number): boolean => filled[y]?.[x] === true;
  for (let y = 0; y < FRAME_SIZE; y++) {
    for (let x = 0; x < FRAME_SIZE; x++) {
      if (
        !filled[y][x] &&
        (isFilled(x - 1, y) || isFilled(x + 1, y) || isFilled(x, y - 1) || isFilled(x, y + 1))
      ) {
        g[y][x] = 'K';
      }
    }
  }
}

/** Same border for a ready-made glyph, which grows by one pixel on each side. */
export function outlined(fill: Glyph): Glyph {
  const w = fill[0].length + 2;
  const at = (x: number, y: number): string => fill[y - 1]?.[x - 1] ?? TRANSPARENT;
  return Array.from({ length: fill.length + 2 }, (_, y) =>
    Array.from({ length: w }, (_, x) => {
      const c = at(x, y);
      if (c !== TRANSPARENT) {
        return c;
      }
      const touches = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].some((n) => n !== TRANSPARENT);
      return touches ? 'K' : TRANSPARENT;
    }).join(''),
  );
}
