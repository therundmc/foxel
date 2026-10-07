import { TRANSPARENT } from '../palette';
import { FRAME_PAD, type Frame } from '../frames';

// Where things sit on the fox sprite when it faces right: columns from the left, rows from the top,
// heights above the ground. The simulation only knows the fox through these and its animations.

export const NOSE_X = 29;
export const GROUND_ROW = 30;

/** Centre of the treat being eaten, in sprite columns; it sticks out past the nose. */
export const TREAT_PAWS_X = 33.5;

/** Middle of the head when it sits or stands. */
export const HEAD_X = 21.5;
export const HEAD_RX = 7;
export const HEAD_RY = 6.5;

export const MOUTH_X = 28;
export const MOUTH_HEIGHT = 13;
export const NOSE_HEIGHT = 16;
/** Mouth while sitting up to beg. */
export const BEG_MOUTH_X = 26.5;
export const BEG_MOUTH_HEIGHT = 14.5;
/** The part of the body a rolling ball bounces off. */
export const BODY_LEFT = 6;
export const BODY_RIGHT = 26;
export const BODY_HEIGHT = 22;
/** Bowl centre: in front of the paws when sitting, under the mouth when eating. */
export const BOWL_SIT_X = 27;
export const BOWL_EAT_X = 28;

export type TouchZone = 'nose' | 'head' | 'back' | 'paw' | 'tail';

/** Which part of the fox is under sprite pixel (x, y), in unflipped sprite coordinates. */
export function touchZone(frame: Frame, x: number, y: number): TouchZone | undefined {
  const px = Math.floor(x);
  const py = Math.floor(y);
  const near = (match: (c: string) => boolean): boolean =>
    [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => match(frame.pixels[py + dy + FRAME_PAD]?.[px + dx + FRAME_PAD] ?? TRANSPARENT));
  if (!near((c) => c !== TRANSPARENT)) {
    return undefined;
  }
  const [hx, hy] = frame.head;
  const nx = (x - hx) / HEAD_RX;
  const ny = (y - hy) / HEAD_RY;
  const inHead = nx * nx + ny * ny <= 1.2;
  if (inHead && x >= hx + 3 && y >= hy - 1) {
    return 'nose';
  }
  if (inHead || (y < hy && Math.abs(x - hx) <= HEAD_RX)) {
    return 'head';
  }
  if (x < 8) {
    return 'tail';
  }
  if (y >= 27 && near((c) => c === 'c')) {
    return 'paw';
  }
  return 'back';
}
