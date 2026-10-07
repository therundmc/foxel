import { SPRITE_SIZE, type Animation, type Frame, type Point } from '../frames';
import { ellipse, inEllipse, limb, outline, rect, set, type Grid } from '../grid';
import { TRANSPARENT } from '../palette';
import { GROUND_ROW } from './anchors';
import { drawHead, type HeadPose } from './head';
import { EXTRAS, type Extra } from './overlays';

type Body = 'stand' | 'sit' | 'curl' | 'bow' | 'lie' | 'back';
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
  | 'poof'
  | 'backA'
  | 'backB';
type Paw = 'none' | 'wave1' | 'wave2' | 'lick' | 'tapNear' | 'tapFar' | 'beg';

// [foot x offset, foot lift] for back-far, back-near, front-far, front-near legs.
type Legs = readonly [Point, Point, Point, Point];

export interface Pose extends HeadPose {
  body?: Body;
  bob?: number;
  head?: Point;
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
// On its back: back feet kicking one after the other while the front paws pat the air.
export const KICK_A: Legs = [[-1, 0], [1, 2], [0, 1], [0, 0]];
export const KICK_B: Legs = [[1, 2], [-1, 0], [0, 0], [0, 1]];

const STAND_LEG_X = [8, 11, 16, 19] as const;
const LEG_TOP_Y = 24;
const FOOT_Y = 28;

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
  backA: [[4.5, 27, 2.2], [2.8, 25.6, 2.1], [2, 23.8, 1.8], [2, 23, 1.4]],
  backB: [[4.5, 27, 2.2], [2.5, 26.8, 2.1], [1.6, 26, 1.8], [1.2, 25.6, 1.4]],
};

const DEFAULT_TAIL: Record<Body, Tail> = {
  stand: 'up',
  sit: 'sitA',
  curl: 'curl',
  bow: 'high',
  lie: 'sitA',
  back: 'backA',
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

// Belly up like an otter: round tummy, bunny feet in the air, paws on its chest. `legs` moves them as it wriggles.
function drawBack(g: Grid, b: number, legs: Legs): Point {
  const at = (i: number, x: number, y: number): Point => [x + legs[i][0], y + b - legs[i][1]];
  const foot = (i: number, x: number, fur: string, pad: boolean): void => {
    const [fx, fy] = at(i, x, 17.5);
    limb(g, [x, 22 + b], [fx - 0.5, fy + 1], fur);
    ellipse(g, fx + 0.5, fy, 1.7, 1.7, 'c');
    if (pad) {
      set(g, Math.floor(fx + 0.5), Math.floor(fy), 'p');
    }
  };
  const mitt = (i: number, x: number, y: number, fur: string): void => {
    const [fx, fy] = at(i, x, y);
    limb(g, [x - 0.5, 22 + b], [fx - 0.5, fy + 0.5], fur);
    ellipse(g, fx + 0.5, fy, 1.6, 1.4, 'c');
  };
  foot(0, 9.5, 'o', false);
  mitt(2, 12, 19.6, 'o');
  ellipse(g, 12, 25 + b, 9, 4.6, 'O');
  ellipse(g, 12.5, 22.6 + b, 6.5, 2.4, 'c', (x, y) => inEllipse(x, y, 12, 25 + b, 9, 4.6));
  ellipse(g, 6, 22.8 + b, 2.8, 2.6, 'O');
  foot(1, 5.5, 'O', true);
  mitt(3, 14.5, 19.4, 'O');
  return [23, 21 + b];
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
  const eye = drawHead(g, hx, hy, p);

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
    eye: (p.eye ?? 'open') === 'open' ? eye : undefined,
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
