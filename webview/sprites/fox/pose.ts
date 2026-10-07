import { SPRITE_SIZE, type Animation, type Frame, type Point } from '../frames';
import { ellipse, inEllipse, lerp, limb, outline, poly, rect, set, type Grid } from '../grid';
import { TRANSPARENT } from '../palette';
import { GROUND_ROW, HEAD_RX, HEAD_RY } from './anchors';
import { EXTRAS, type Extra } from './overlays';

type Body = 'stand' | 'sit' | 'curl' | 'bow' | 'lie' | 'back';
type Eye = 'open' | 'closed' | 'happy' | 'wide' | 'down' | 'up' | 'sleepy' | 'dizzy';
type Mouth = 'smile' | 'open' | 'flat' | 'tongue' | 'blep';
type Ears = 'up' | 'back';
type Tail =
  | 'up'
  | 'wagL'
  | 'wagR'
  | 'flat'
  | 'streamA'
  | 'streamB'
  | 'sitA'
  | 'sitB'
  | 'curl'
  | 'curlFlick'
  | 'high'
  | 'highL'
  | 'highR'
  | 'poof';
type Paw = 'none' | 'wave1' | 'wave2' | 'lick' | 'tapNear' | 'tapFar' | 'beg';

// [foot x offset, foot lift] for back-far, back-near, front-far, front-near legs.
type Legs = readonly [Point, Point, Point, Point];

export interface Pose {
  body?: Body;
  bob?: number;
  head?: Point;
  eye?: Eye;
  mouth?: Mouth;
  ears?: Ears;
  tail?: Tail;
  paw?: Paw;
  legs?: Legs;
  /** Front half of a standing body shifted down (+) or up (-) relative to the back. */
  pitch?: number;
  ball?: boolean;
  /** Ball centre relative to the head centre, for tricks; `ball` means in the mouth. */
  ballAt?: Point;
  /** Ball lying on the ground at this sprite column. */
  ballGround?: number;
  /** Tilts the head back: muzzle, nose and mouth move up by this many pixels, ears lean back. */
  snoutUp?: number;
  treat?: number;
  extras?: readonly Extra[];
}

export const STILL: Legs = [[0, 0], [0, 0], [0, 0], [0, 0]];
export const STEP_A: Legs = [[-1, 0], [1, 1], [1, 1], [-1, 0]];
export const STEP_B: Legs = [[1, 1], [-1, 0], [-1, 0], [1, 1]];
export const RUN_REACH: Legs = [[-3, 1], [-2, 0], [2, 0], [3, 1]];
export const RUN_GATHER: Legs = [[2, 2], [1, 2], [-1, 2], [-2, 2]];
// Gallop: stretched in the air, front feet land, gathered in the air, back feet push off.
export const GALLOP_STRETCH: Legs = [[-3, 1], [-2, 1], [2, 1], [3, 1]];
export const GALLOP_LAND: Legs = [[-2, 1], [-1, 1], [0, 0], [1, 0]];
export const GALLOP_GATHER: Legs = [[1, 1], [2, 1], [0, 1], [1, 1]];
export const GALLOP_PUSH: Legs = [[0, 0], [1, 0], [2, 1], [3, 1]];
// Bouncy hop: back paws kick off, everything flies stretched, front paws land, paws gather under.
export const HOP_KICK: Legs = [[-3, 0], [-2, 0], [2, 3], [3, 3]];
export const HOP_FLY: Legs = [[-3, 2], [-2, 2], [3, 2], [4, 2]];
export const HOP_LAND: Legs = [[-2, 3], [-1, 3], [1, 0], [2, 0]];
export const HOP_GATHER: Legs = [[2, 1], [3, 1], [-1, 1], [0, 1]];
export const TUCK: Legs = [[1, 3], [1, 3], [-1, 3], [-1, 3]];
export const THUMP: Legs = [[0, 0], [3, 3], [0, 0], [0, 0]];
// On its back, paws in the air, kicking one way then the other.
export const KICK_A: Legs = [[-2, 0], [1, 2], [2, 0], [-1, 2]];
export const KICK_B: Legs = [[1, 2], [-2, 0], [-1, 2], [2, 0]];

const STAND_LEG_X = [8, 11, 16, 19] as const;
const LEG_TOP_Y = 24;
const FOOT_Y = 28;
const EARS_BACK_RAD = -0.55;

// Each tail is a chain of fluffy circles [cx, cy, r]; the last one is the cream tip.
const TAILS: Record<Tail, readonly (readonly [number, number, number])[]> = {
  up: [[7, 21, 2], [5, 18, 2.5], [4, 14, 3], [5, 10, 2.7], [5, 9, 2]],
  wagL: [[7, 21, 2], [4.5, 18, 2.5], [3, 14, 3], [3.5, 10, 2.7], [3.5, 9, 2]],
  wagR: [[7, 21, 2], [5.5, 18, 2.5], [6, 14, 3], [7.5, 10.5, 2.7], [7.5, 9.5, 2]],
  flat: [[7, 21, 2.2], [4.5, 19.5, 2.6], [2.8, 17.5, 2.4], [2.5, 17, 1.8]],
  streamA: [[7, 21, 2.2], [4.5, 19, 2.6], [2.5, 16.5, 2.4], [1.8, 15.2, 1.8]],
  streamB: [[7, 21, 2.2], [4.5, 20.5, 2.6], [2.3, 20, 2.4], [1.5, 20, 1.8]],
  sitA: [[9, 27, 2.2], [6, 27.5, 2.4], [3.5, 26, 2.3], [3, 25, 1.7]],
  sitB: [[9, 27, 2.2], [6, 27.5, 2.4], [3.5, 25, 2.3], [3.5, 23.5, 1.7]],
  curl: [
    [6, 25.5, 2.3],
    [8, 27.3, 2.1],
    [11, 28.2, 2],
    [14, 28.3, 2],
    [17, 28.2, 2],
    [18.5, 28, 1.5],
  ],
  curlFlick: [
    [6, 25.5, 2.3],
    [8, 27.3, 2.1],
    [11, 28.2, 2],
    [14, 28.3, 2],
    [16.8, 27.5, 2],
    [18, 25.8, 1.6],
  ],
  high: [[6, 16, 2], [4, 12, 2.6], [4, 8, 3], [6, 4.5, 2.6], [6, 3.5, 2]],
  highL: [[6, 16, 2], [3.5, 12, 2.6], [2.5, 8, 3], [3.5, 4.5, 2.6], [3.5, 3.5, 2]],
  highR: [[6, 16, 2], [4.5, 12, 2.6], [5.5, 8, 3], [8, 5, 2.6], [8, 4, 2]],
  poof: [[7, 21, 2.6], [5, 17.5, 3.3], [4.2, 13.5, 3.8], [5, 9.5, 3.4], [5, 8.5, 2.6]],
};

const DEFAULT_TAIL: Record<Body, Tail> = {
  stand: 'up',
  sit: 'sitA',
  curl: 'curl',
  bow: 'high',
  lie: 'sitA',
  back: 'sitA',
};

function leg(g: Grid, top: Point, foot: Point, c: string): void {
  limb(g, top, foot, c);
  rect(g, Math.floor(foot[0]), Math.floor(foot[1]) + 1, Math.floor(foot[0]) + 1, Math.floor(foot[1]) + 1, 'c');
}

function raisedPaw(g: Grid, from: Point, to: Point): void {
  limb(g, from, to, 'O');
  rect(g, Math.floor(to[0]), Math.floor(to[1]), Math.floor(to[0]) + 1, Math.floor(to[1]) + 1, 'c');
}

function drawTail(g: Grid, tail: Tail, b: number, outlined = false): void {
  const parts = TAILS[tail];
  if (outlined) {
    const overBody = (x: number, y: number): boolean => g[y]?.[x] !== TRANSPARENT;
    parts.forEach(([cx, cy, r]) => ellipse(g, cx, cy + b, r + 1, r + 1, 'K', overBody));
  }
  parts.forEach(([cx, cy, r], i) => ellipse(g, cx, cy + b, r, r, i === parts.length - 1 ? 'c' : 'O'));
}

function drawEar(g: Grid, base1: Point, apex: Point, base2: Point, inner: boolean): void {
  poly(g, [base1, apex, base2], 'O');
  if (inner) {
    const centroid: Point = [(base1[0] + apex[0] + base2[0]) / 3, (base1[1] + apex[1] + base2[1]) / 3];
    poly(g, [lerp(base1, centroid, 0.45), lerp(apex, centroid, 0.45), lerp(base2, centroid, 0.45)], 'p');
  }
  poly(g, [lerp(apex, base1, 0.3), apex, lerp(apex, base2, 0.3)], 'd');
}

function drawHead(g: Grid, hx: number, hy: number, p: Pose): void {
  const up = p.snoutUp ?? 0;
  const tilt = ((p.ears ?? 'up') === 'up' ? 0 : EARS_BACK_RAD) - up * 0.12;
  const ear = (dx: number, dy: number): Point => [
    hx + dx * Math.cos(tilt) - dy * Math.sin(tilt),
    hy + dx * Math.sin(tilt) + dy * Math.cos(tilt),
  ];
  drawEar(g, ear(-6, -3), ear(-4.5, -11.5), ear(-1, -5), false);
  drawEar(g, ear(-1.5, -5), ear(2.5, -12), ear(5, -3.5), true);
  ellipse(g, hx, hy, HEAD_RX, HEAD_RY, 'O');
  const my = hy - up;
  ellipse(g, hx + 3, my + 3.5, 4.2, 3, 'c', (x, y) => inEllipse(x, y, hx, hy, HEAD_RX, HEAD_RY));
  ellipse(g, hx + 5.5, my + 2.2, 2.6, 1.8, 'c');
  const ex = hx - Math.round(up / 2);

  switch (p.eye ?? 'open') {
    case 'open':
      rect(g, hx + 1, hy - 2, hx + 2, hy, 'E');
      set(g, hx + 2, hy - 2, 'W');
      break;
    case 'down':
      rect(g, hx + 1, hy - 1, hx + 2, hy, 'E');
      set(g, hx + 2, hy - 1, 'W');
      break;
    case 'up':
      rect(g, ex + 1, hy - 3, ex + 2, hy - 1, 'E');
      set(g, ex + 2, hy - 3, 'W');
      break;
    case 'sleepy':
      rect(g, hx, hy - 1, hx + 3, hy - 1, 'E');
      rect(g, hx + 1, hy, hx + 2, hy, 'E');
      break;
    case 'wide':
      rect(g, hx, hy - 2, hx + 2, hy, 'E');
      set(g, hx + 2, hy - 2, 'W');
      set(g, hx, hy, 'W');
      break;
    case 'closed':
      set(g, hx, hy - 1, 'E');
      rect(g, hx + 1, hy, hx + 2, hy, 'E');
      set(g, hx + 3, hy - 1, 'E');
      break;
    case 'happy':
      set(g, hx, hy, 'E');
      rect(g, hx + 1, hy - 1, hx + 2, hy - 1, 'E');
      set(g, hx + 3, hy, 'E');
      break;
    case 'dizzy':
      for (const [x, y] of [[0, -2], [2, -2], [1, -1], [0, 0], [2, 0]] as const) {
        set(g, hx + x, hy + y, 'E');
      }
      break;
  }

  set(g, hx + 7, my + 1, 'E');
  rect(g, hx - 1, hy + 2, hx, hy + 2, 'r');

  switch (p.mouth ?? 'smile') {
    case 'smile':
      rect(g, hx + 4, my + 4, hx + 5, my + 4, 'K');
      set(g, hx + 6, my + 3, 'K');
      break;
    case 'tongue':
      rect(g, hx + 4, my + 4, hx + 5, my + 4, 'K');
      set(g, hx + 6, my + 3, 'K');
      set(g, hx + 5, my + 5, 'p');
      break;
    case 'blep':
      rect(g, hx + 4, my + 4, hx + 6, my + 4, 'K');
      set(g, hx + 5, my + 5, 'p');
      set(g, hx + 5, my + 6, 'r');
      break;
    case 'flat':
      rect(g, hx + 4, my + 4, hx + 6, my + 4, 'K');
      break;
    case 'open':
      rect(g, hx + 3, my + 4, hx + 6, my + 5, 'M');
      set(g, hx + 4, my + 5, 'p');
      break;
  }
}

function drawStand(g: Grid, b: number, legs: Legs, pitch: number): Point {
  const front = (i: number): number => (i >= 2 ? pitch : 0);
  const foot = (i: number): Point => [STAND_LEG_X[i] + legs[i][0], FOOT_Y - legs[i][1]];
  const top = (i: number): Point => [STAND_LEG_X[i], LEG_TOP_Y + b + front(i)];
  leg(g, top(0), foot(0), 'o');
  leg(g, top(2), foot(2), 'o');
  ellipse(g, 14, 22.5 + b, 7.5, 5, 'O', (x) => pitch === 0 || x < 14);
  if (pitch !== 0) {
    ellipse(g, 14, 22.5 + b + pitch, 7.5, 5, 'O', (x) => x >= 14);
  }
  ellipse(g, 18, 24 + b + pitch, 3.5, 2.5, 'c');
  leg(g, top(1), foot(1), 'O');
  leg(g, top(3), foot(3), 'O');
  return [22, 13 + b + pitch];
}

function drawSit(g: Grid, b: number, paw: Paw): Point {
  const farLift = paw === 'tapFar' ? 2 : 0;
  leg(g, [16, 22 + b], [16, FOOT_Y - farLift], 'o');
  ellipse(g, 13.5, 22 + b, 6.5, 6.5, 'O');
  ellipse(g, 10.5, 25.5 + b, 4.5, 3.5, 'o');
  ellipse(g, 10, 25 + b, 3.7, 2.9, 'O');
  rect(g, 11, 28, 13, 28, 'O');
  rect(g, 11, 29, 14, 29, 'c');
  ellipse(g, 17.5, 21 + b, 3, 3.5, 'c');
  if (paw === 'none' || paw === 'tapFar') {
    leg(g, [19, 22 + b], [19, FOOT_Y], 'O');
  } else if (paw === 'tapNear') {
    leg(g, [19, 22 + b], [20, FOOT_Y - 2], 'O');
  }
  return [21, 12 + b];
}

function drawCurl(g: Grid, b: number, tail: Tail): Point {
  ellipse(g, 14, 25 + b, 9, 4.8, 'O');
  drawTail(g, tail, b, true);
  return [21, 21 + b];
}

function drawBow(g: Grid, b: number): Point {
  leg(g, [8, 20 + b], [8, FOOT_Y], 'o');
  ellipse(g, 11, 19 + b, 6, 4.5, 'O');
  ellipse(g, 17, 23 + b, 6, 4, 'O');
  leg(g, [11, 20 + b], [11, FOOT_Y], 'O');
  limb(g, [18, 25 + b], [24, 27], 'o');
  limb(g, [19, 26 + b], [26, 28], 'O');
  rect(g, 26, 28, 27, 29, 'c');
  return [23, 20 + b];
}

function drawLie(g: Grid, b: number): Point {
  limb(g, [17, 26 + b], [23, 27], 'o');
  rect(g, 23, 28, 24, 28, 'c');
  ellipse(g, 14, 25 + b, 9, 4.5, 'O');
  limb(g, [19, 27 + b], [25, 28], 'O');
  rect(g, 25, 29, 26, 29, 'c');
  return [22, 18 + b];
}

// Belly up, paws in the air; `legs` moves the paws as it wriggles.
function drawBack(g: Grid, b: number, legs: Legs): Point {
  const paw = (i: number, x: number, c: string): void => {
    const to: Point = [x + legs[i][0], 16 - legs[i][1]];
    limb(g, [x, 24 + b], to, c);
    rect(g, Math.floor(to[0]), Math.floor(to[1]) - 1, Math.floor(to[0]) + 1, Math.floor(to[1]), 'c');
  };
  paw(0, 5, 'o');
  paw(2, 13, 'o');
  ellipse(g, 12.5, 26 + b, 9, 3.6, 'O');
  ellipse(g, 12, 24.4 + b, 6.5, 1.8, 'c');
  paw(1, 8, 'O');
  paw(3, 16, 'O');
  return [24, 22 + b];
}

export function frame(p: Pose): Frame {
  const g: Grid = Array.from({ length: SPRITE_SIZE }, () =>
    Array<string>(SPRITE_SIZE).fill(TRANSPARENT),
  );
  const body = p.body ?? 'stand';
  const b = p.bob ?? 0;
  const tail = p.tail ?? DEFAULT_TAIL[body];
  const paw = p.paw ?? 'none';

  if (body !== 'curl') {
    drawTail(g, tail, b);
  }
  let head: Point;
  switch (body) {
    case 'sit':
      head = drawSit(g, b, paw);
      break;
    case 'curl':
      head = drawCurl(g, b, tail);
      break;
    case 'bow':
      head = drawBow(g, b);
      break;
    case 'lie':
      head = drawLie(g, b);
      break;
    case 'back':
      head = drawBack(g, b, p.legs ?? STILL);
      break;
    default:
      head = drawStand(g, b, p.legs ?? STILL, p.pitch ?? 0);
  }
  const hx = head[0] + (p.head?.[0] ?? 0);
  const hy = head[1] + (p.head?.[1] ?? 0);
  drawHead(g, hx, hy, p);

  if (paw === 'wave1') {
    raisedPaw(g, [19, 21 + b], [25.5, 21]);
  } else if (paw === 'wave2') {
    raisedPaw(g, [19, 21 + b], [26, 17]);
  } else if (paw === 'lick') {
    raisedPaw(g, [19, 21 + b], [hx + 3, hy + 4]);
  } else if (paw === 'beg') {
    raisedPaw(g, [19, 21 + b], [23, 18 + b]);
  }
  if (p.ball) {
    drawCarriedBall(g, hx + 5.5, hy + 5.5);
  } else if (p.ballAt) {
    drawCarriedBall(g, hx + p.ballAt[0], hy + p.ballAt[1]);
  } else if (p.ballGround !== undefined) {
    drawCarriedBall(g, p.ballGround, GROUND_ROW - 2.6);
  }

  outline(g);
  return {
    pixels: g.map((r) => r.join('')),
    overlays: (p.extras ?? []).flatMap((e) => EXTRAS[e]),
    eye: (p.eye ?? 'open') === 'open' ? [hx + 1, hy - 2] : undefined,
    head: [hx, hy],
    treat: p.treat,
  };
}

function drawCarriedBall(g: Grid, cx: number, cy: number): void {
  const r = 2.6;
  const mx = Math.floor(cx);
  const my = Math.floor(cy);
  ellipse(g, cx, cy, r, r, 'B');
  ellipse(g, cx, cy, r, r, 'b', (x, y) => x - mx + y - my >= 2);
  ellipse(g, cx, cy, r, r, 'Y', (x, y) => x === mx - 1 || (x === mx && Math.abs(y - my) === 2));
}

export function anim(steps: readonly (readonly [Pose, number])[]): Animation {
  return { frames: steps.map(([p]) => frame(p)), durations: steps.map(([, d]) => d) };
}
