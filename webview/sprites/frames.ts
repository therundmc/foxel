export const SPRITE_SIZE = 32;

export type Point = readonly [number, number];

export type Glyph = readonly string[];

export interface Overlay {
  readonly x: number;
  readonly y: number;
  readonly glyph: Glyph;
}

export interface Frame {
  readonly pixels: readonly string[];
  readonly overlays: readonly Overlay[];
  /** Top-left of the 2x3 open-eye block, when the eye is open. */
  readonly eye?: Point;
  /** Centre of the head, used to tell where the fox was touched. */
  readonly head: Point;
  /** Bite stage of the treat being eaten (index into TREAT_STAGES); undefined once it is gone. */
  readonly treat?: number;
}

export interface Animation {
  readonly frames: readonly Frame[];
  readonly durations: readonly number[];
}

export function totalDuration(animation: Animation): number {
  return animation.durations.reduce((sum, d) => sum + d, 0);
}

export function frameAt(animation: Animation, elapsedMs: number): Frame {
  let t = elapsedMs % totalDuration(animation);
  for (let i = 0; i < animation.frames.length; i++) {
    t -= animation.durations[i];
    if (t < 0) {
      return animation.frames[i];
    }
  }
  return animation.frames[animation.frames.length - 1];
}
