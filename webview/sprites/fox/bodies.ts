import type { Point } from '../frames';
import { ellipse, inEllipse, limb, rect, type Grid } from '../grid';

// The ways it lies down that are not plain lying: tucked up like a loaf of bread, or rolled onto its back.
// And its hind foot when it scratches behind its ear. Each returns where the middle of its head goes.

/** A little paw: a short leg ending in a round cream pad with a pink bean. */
function pad(g: Grid, path: readonly Point[], c: string): void {
  for (let i = 1; i < path.length; i++) {
    limb(g, path[i - 1], path[i], c);
  }
  const [x, y] = path[path.length - 1].map(Math.floor);
  rect(g, x, y, x + 1, y + 1, 'c');
  rect(g, x, y, x, y, 'p');
}

/**
 * Lying with its paws tucked under its chest. It breathes by squashing a little (`b` 1), its back coming down while
 * its belly stays on the ground. With `knead`, its front paws come out in front of it and press the ground in turn,
 * each lifted that many pixels.
 */
export function drawLoaf(g: Grid, b: number, knead?: readonly [number, number]): Point {
  if (knead) {
    limb(g, [19, 25], [22.5, 28 - knead[0]], 'o');
    rect(g, 22, 29 - knead[0], 23, 29 - knead[0], 'c');
  }
  ellipse(g, 14, 25 + b / 2, 8.5, 4.5 - b / 2, 'O');
  ellipse(g, 19.5, 25.5 + b / 2, 3, 3, 'c', (x, y) => inEllipse(x, y, 14, 25 + b / 2, 8.5, 4.5 - b / 2));
  if (knead) {
    limb(g, [20, 26], [24.5, 28 - knead[1]], 'O');
    rect(g, 24, 29 - knead[1], 25, 29 - knead[1], 'c');
  } else {
    rect(g, 21, 29, 23, 29, 'c');
  }
  return [21, 18 + b];
}

/**
 * On its back like a kitten, a round bean with its pale belly up and its head tipped back on the ground: hind paws
 * short and spread in a little V, front paws folded over its chest. `paws` nudges each of them (back-far,
 * back-near, front-far, front-near) by [x, lift]; a lift of 1 is a pat in the air, -1 tucks it in.
 */
export function drawBelly(g: Grid, b: number, paws: readonly Point[]): Point {
  const at = (i: number, x: number, y: number): Point => [x + paws[i][0], y - paws[i][1]];
  const inBody = (x: number, y: number): boolean => inEllipse(x, y, 13, 25 + b / 2, 8.5, 4.5 - b / 2);
  pad(g, [[6, 23.5 + b], at(0, 3.5, 19 + b)], 'o');
  pad(g, [[14, 22.5 + b], at(2, 14, 18.5 + b), at(2, 15.5, 17.5 + b)], 'o');
  ellipse(g, 13, 25 + b / 2, 8.5, 4.5 - b / 2, 'O');
  ellipse(g, 12.5, 22.5 + b, 6.5, 2.6, 'c', inBody);
  pad(g, [[9, 22.5 + b], at(1, 9, 18 + b)], 'O');
  pad(g, [[17, 22.5 + b], at(3, 17, 18.5 + b), at(3, 18.5, 17.5 + b)], 'O');
  return [24, 22];
}

/** Sitting, its near hind foot raised behind its ear, high (0) or a little lower (1): it scratches. */
export function drawScratchFoot(g: Grid, head: Point, low: 0 | 1): void {
  const [hx, hy] = head;
  const foot: Point = [hx - 6.5, hy - 3 + low];
  limb(g, [12, 24], foot, 'o');
  rect(g, Math.floor(foot[0]) - 1, Math.floor(foot[1]), Math.floor(foot[0]), Math.floor(foot[1]) + 1, 'c');
}
