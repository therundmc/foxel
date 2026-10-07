/** A rectangle in the world: `x` is its left edge, `y` the height of its bottom above the ground. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
