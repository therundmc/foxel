import type { Point } from '../frames';
import { ellipse, inEllipse, lerp, poly, rect, set, type Grid } from '../grid';
import { HEAD_RX, HEAD_RY } from './anchors';

type Eye = 'open' | 'closed' | 'happy' | 'wide' | 'down' | 'up' | 'sleepy' | 'dizzy';
type Mouth = 'smile' | 'open' | 'flat' | 'tongue' | 'blep';
type Ears = 'up' | 'back';

export interface HeadPose {
  eye?: Eye;
  mouth?: Mouth;
  ears?: Ears;
  /** Tilts the head back: muzzle, nose and mouth move up by this many pixels, ears lean back. */
  snoutUp?: number;
  /** Tips the whole head back by this angle in radians, nose in the air. */
  tilt?: number;
}

const EARS_BACK_RAD = -0.55;

// Mouth pixels around the head centre, with their colour.
const MOUTHS: Record<Mouth, readonly (readonly [number, number, string])[]> = {
  smile: [[4, 4, 'K'], [5, 4, 'K'], [6, 3, 'K']],
  tongue: [[4, 4, 'K'], [5, 4, 'K'], [6, 3, 'K'], [5, 5, 'p']],
  blep: [[4, 4, 'K'], [5, 4, 'K'], [6, 4, 'K'], [5, 5, 'p'], [5, 6, 'r']],
  flat: [[4, 4, 'K'], [5, 4, 'K'], [6, 4, 'K']],
  open: [[3, 4, 'M'], [4, 4, 'M'], [5, 4, 'M'], [6, 4, 'M'], [3, 5, 'M'], [5, 5, 'M'], [6, 5, 'M'], [4, 5, 'p']],
};

function drawEar(g: Grid, base1: Point, apex: Point, base2: Point, inner: boolean): void {
  poly(g, [base1, apex, base2], 'O');
  if (inner) {
    const centroid: Point = [(base1[0] + apex[0] + base2[0]) / 3, (base1[1] + apex[1] + base2[1]) / 3];
    poly(g, [lerp(base1, centroid, 0.45), lerp(apex, centroid, 0.45), lerp(base2, centroid, 0.45)], 'p');
  }
  poly(g, [lerp(apex, base1, 0.3), apex, lerp(apex, base2, 0.3)], 'd');
}

/** Draws the head centred on (hx, hy) and returns where its open eye is. */
export function drawHead(g: Grid, hx: number, hy: number, p: HeadPose): Point {
  const up = p.snoutUp ?? 0;
  const turn = p.tilt ?? 0;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  // Where a point of the level head ends up once it is tipped back, and by how many whole pixels it moved.
  const tipped = (dx: number, dy: number): Point => [dx * cos + dy * sin, dy * cos - dx * sin];
  const moved = (dx: number, dy: number): Point => {
    const [x, y] = tipped(dx, dy);
    return [Math.round(x - dx), Math.round(y - dy)];
  };
  const lean = ((p.ears ?? 'up') === 'up' ? 0 : EARS_BACK_RAD) - up * 0.12 - turn;
  const ear = (dx: number, dy: number): Point => [
    hx + dx * Math.cos(lean) - dy * Math.sin(lean),
    hy + dx * Math.sin(lean) + dy * Math.cos(lean),
  ];
  drawEar(g, ear(-6, -3), ear(-4.5, -11.5), ear(-1, -5), false);
  drawEar(g, ear(-1.5, -5), ear(2.5, -12), ear(5, -3.5), true);
  ellipse(g, hx, hy, HEAD_RX, HEAD_RY, 'O');
  const muzzle = tipped(3, 3.5 - up);
  const snout = tipped(5.5, 2.2 - up);
  ellipse(g, hx + muzzle[0], hy + muzzle[1], 4.2, 3, 'c', (x, y) => inEllipse(x, y, hx, hy, HEAD_RX, HEAD_RY));
  ellipse(g, hx + snout[0], hy + snout[1], 2.6, 1.8, 'c');

  const [esx, esy] = moved(1.5, -1);
  const ex = hx + esx;
  const ey = hy + esy;
  switch (p.eye ?? 'open') {
    case 'open':
      rect(g, ex + 1, ey - 2, ex + 2, ey, 'E');
      set(g, ex + 2, ey - 2, 'W');
      break;
    case 'down':
      rect(g, ex + 1, ey - 1, ex + 2, ey, 'E');
      set(g, ex + 2, ey - 1, 'W');
      break;
    case 'up': {
      const back = Math.round(up / 2);
      rect(g, ex - back + 1, ey - 3, ex - back + 2, ey - 1, 'E');
      set(g, ex - back + 2, ey - 3, 'W');
      break;
    }
    case 'sleepy':
      rect(g, ex, ey - 1, ex + 3, ey - 1, 'E');
      rect(g, ex + 1, ey, ex + 2, ey, 'E');
      break;
    case 'wide':
      rect(g, ex, ey - 2, ex + 2, ey, 'E');
      set(g, ex + 2, ey - 2, 'W');
      set(g, ex, ey, 'W');
      break;
    case 'closed':
      set(g, ex, ey - 1, 'E');
      rect(g, ex + 1, ey, ex + 2, ey, 'E');
      set(g, ex + 3, ey - 1, 'E');
      break;
    case 'happy':
      set(g, ex, ey, 'E');
      rect(g, ex + 1, ey - 1, ex + 2, ey - 1, 'E');
      set(g, ex + 3, ey, 'E');
      break;
    case 'dizzy':
      for (const [x, y] of [[0, -2], [2, -2], [1, -1], [0, 0], [2, 0]] as const) {
        set(g, ex + x, ey + y, 'E');
      }
      break;
  }

  const [bsx, bsy] = moved(-0.5, 2);
  rect(g, hx - 1 + bsx, hy + 2 + bsy, hx + bsx, hy + 2 + bsy, 'r');
  for (const [dx, dy, c] of [[7, 1, 'E'], ...MOUTHS[p.mouth ?? 'smile']] as const) {
    const [x, y] = tipped(dx + 0.5, dy + 0.5 - up);
    set(g, Math.floor(hx + x), Math.floor(hy + y), c);
  }
  return [ex + 1, ey - 2];
}
