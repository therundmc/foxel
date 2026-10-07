import type { Point } from '../frames';
import { ellipse, inEllipse, lerp, limb, poly, rect, set, type Grid } from '../grid';

/** What it does when it faces us, right up against the glass of its view. */
export interface FrontPose {
  /** Front paws flat on the glass, each this many pixels above where it first lands; left out, the paws are down. */
  pads?: readonly [number, number];
  /** Tongue on the glass, this many pixels long. */
  lick?: number;
}

type FrontEye = 'open' | 'closed' | 'happy';

const PAD_X = [10, 22] as const;
const PAD_Y = 20;

function drawEars(g: Grid, hx: number, hy: number): void {
  for (const side of [-1, 1]) {
    const outer: Point = [hx + side * 6.2, hy - 2.5];
    const apex: Point = [hx + side * 5.6, hy - 11.5];
    const inner: Point = [hx + side * 2.6, hy - 5.5];
    const middle: Point = [(outer[0] + apex[0] + inner[0]) / 3, (outer[1] + apex[1] + inner[1]) / 3];
    poly(g, [outer, apex, inner], 'O');
    poly(g, [lerp(outer, middle, 0.45), lerp(apex, middle, 0.45), lerp(inner, middle, 0.45)], 'p');
    poly(g, [lerp(apex, outer, 0.3), apex, lerp(apex, inner, 0.3)], 'd');
  }
}

function drawFace(g: Grid, hx: number, hy: number, eye: FrontEye, lick: number): void {
  const inCheeks = (x: number, y: number): boolean => inEllipse(x, y, hx, hy + 2, 7.2, 3.8);
  ellipse(g, hx, hy - 0.5, 6.2, 5.8, 'O');
  ellipse(g, hx, hy + 2, 7.2, 3.8, 'O');
  // The pale mask of a fox: both cheeks and the muzzle between them.
  ellipse(g, hx, hy + 4.4, 6.6, 2.4, 'c', inCheeks);
  ellipse(g, hx, hy + 3, 2.8, 2.4, 'c');
  // Left and right of the nose, which sits on the two middle columns.
  for (const x of [hx - 4, hx + 2]) {
    if (eye === 'open') {
      rect(g, x, hy - 1, x + 1, hy + 1, 'E');
      set(g, x + 1, hy - 1, 'W');
    } else {
      // Shut, in a line; or happy, in a little arch.
      const ends = eye === 'happy' ? 1 : 0;
      const from = x < hx ? x - 1 : x;
      set(g, from, hy + ends, 'E');
      set(g, from + 1, hy, 'E');
      set(g, from + 2, hy + ends, 'E');
    }
  }
  rect(g, hx - 1, hy + 2, hx, hy + 2, 'E');
  rect(g, hx - 7, hy + 3, hx - 6, hy + 3, 'r');
  rect(g, hx + 5, hy + 3, hx + 6, hy + 3, 'r');
  if (lick > 0) {
    rect(g, hx - 1, hy + 4, hx, hy + 3 + lick, 'p');
    rect(g, hx - 1, hy + 3 + lick, hx, hy + 3 + lick, 'r');
  } else {
    set(g, hx - 2, hy + 4, 'K');
    set(g, hx + 1, hy + 4, 'K');
  }
}

/** Sitting and facing us. `head` is where the middle of its head goes, already moved as the pose asks. */
export function drawFront(g: Grid, b: number, head: Point, eye: FrontEye, pose: FrontPose): void {
  const [hx, hy] = head;
  drawEars(g, hx, hy);
  rect(g, 8, 29, 10, 29, 'c');
  rect(g, 21, 29, 23, 29, 'c');
  ellipse(g, 16, 22.5 + b, 5.6, 6, 'O');
  ellipse(g, 16, 26, 7.5, 3.6, 'O');
  ellipse(g, 16, 23.5 + b, 3.2, 4.6, 'c');
  if (!pose.pads) {
    for (const x of [14, 16]) {
      limb(g, [x, 22 + b], [x, 27], 'O');
      rect(g, x, 28, x + 1, 29, 'c');
    }
  }
  drawFace(g, hx, hy, eye, pose.lick ?? 0);
  // Paws on the glass come last: they are the nearest thing to us, soles and pink pads showing.
  pose.pads?.forEach((lift, i) => {
    const x = PAD_X[i];
    const y = PAD_Y - lift + b;
    limb(g, [i === 0 ? 12 : 19, 22 + b], [x - 0.5, y], 'O');
    ellipse(g, x + 0.5, y + 0.5, 1.9, 1.9, 'c');
    set(g, x, y, 'p');
  });
}
