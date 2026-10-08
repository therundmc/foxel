export const SPRITE_SIZE = 32;
/**
 * A frame is drawn with a margin all round the sprite: a tail streaming behind it, an ear or a nose may reach a
 * little past its box, and must not be cut off there.
 */
export const FRAME_PAD = 4;
export const FRAME_SIZE = SPRITE_SIZE + FRAME_PAD * 2;

export type Point = readonly [number, number];

export type Glyph = readonly string[];

/** Something drawn with the fox for one frame, placed from the top left of its sprite when it faces right. */
export interface Overlay {
  readonly x: number;
  readonly y: number;
  readonly glyph: Glyph;
  /** Turns round with the fox when it faces left (a thing it holds); otherwise only its place does (a Zzz, a heart). */
  readonly mirrors?: true;
  /** Drawn behind the fox instead of over it. */
  readonly behind?: true;
}

export interface Frame {
  /** `FRAME_SIZE` rows of as many letters: the sprite starts `FRAME_PAD` in from the left and from the top. */
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
