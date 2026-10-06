export const SPRITE_SIZE = 32;
export const TRANSPARENT = '.';
export const NOSE_X = 29;
export const GROUND_ROW = 30;
export const BALL_SIZE = 7;
export const BUG_W = 5;
export const BUG_H = 4;

export const PALETTE: Readonly<Record<string, string>> = {
  K: '#3a2418',
  O: '#f39a3d',
  o: '#c8702a',
  c: '#fff1d6',
  d: '#5a3420',
  p: '#f6a6b2',
  r: '#ff7f8f',
  E: '#1e1a2e',
  W: '#ffffff',
  M: '#7a2a2a',
  C: '#6fc3ff',
  Z: '#cfd8ff',
  H: '#fff3a8',
  L: '#ff4f7a',
  S: '#ffd84a',
  Q: '#e8e8e8',
  R: '#e8413c',
  U: '#3b82f6',
  V: '#b07cf0',
};

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
}

export interface Animation {
  readonly frames: readonly Frame[];
  readonly durations: readonly number[];
}

export type AnimName =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'sit'
  | 'groom'
  | 'stretch'
  | 'yawn'
  | 'sniff'
  | 'chaseTail'
  | 'lookAround'
  | 'sleep'
  | 'typing'
  | 'wave'
  | 'love'
  | 'celebrate'
  | 'panic'
  | 'dizzy'
  | 'carry'
  | 'pounce'
  | 'lie'
  | 'alert'
  | 'stalk'
  | 'wiggle'
  | 'leap'
  | 'proud'
  | 'puzzled'
  | 'sad'
  | 'petted'
  | 'cuddle'
  | 'watch';

type Body = 'stand' | 'sit' | 'curl' | 'bow' | 'lie';
type Eye = 'open' | 'closed' | 'happy' | 'wide' | 'down' | 'dizzy';
type Mouth = 'smile' | 'open' | 'flat' | 'tongue';
type Ears = 'up' | 'back';
type Tail =
  | 'up'
  | 'wagL'
  | 'wagR'
  | 'flat'
  | 'sitA'
  | 'sitB'
  | 'curl'
  | 'high'
  | 'highL'
  | 'highR';
type Paw = 'none' | 'wave1' | 'wave2' | 'lick' | 'tapNear' | 'tapFar';
type Extra =
  | 'zzzA'
  | 'zzzB'
  | 'heartsA'
  | 'heartsB'
  | 'smallHeartA'
  | 'smallHeartB'
  | 'sweat'
  | 'sparkleA'
  | 'sparkleB'
  | 'starsA'
  | 'starsB'
  | 'question'
  | 'bang'
  | 'sniffA'
  | 'sniffB';

type Point = readonly [number, number];
// [foot x offset, foot lift] for back-far, back-near, front-far, front-near legs.
type Legs = readonly [Point, Point, Point, Point];

interface Pose {
  body?: Body;
  bob?: number;
  head?: Point;
  eye?: Eye;
  mouth?: Mouth;
  ears?: Ears;
  tail?: Tail;
  paw?: Paw;
  legs?: Legs;
  ball?: boolean;
  extras?: readonly Extra[];
}

type Grid = string[][];

const STILL: Legs = [[0, 0], [0, 0], [0, 0], [0, 0]];
const STEP_A: Legs = [[-1, 0], [1, 1], [1, 1], [-1, 0]];
const STEP_B: Legs = [[1, 1], [-1, 0], [-1, 0], [1, 1]];
const RUN_REACH: Legs = [[-3, 1], [-2, 0], [2, 0], [3, 1]];
const RUN_GATHER: Legs = [[2, 2], [1, 2], [-1, 2], [-2, 2]];
const TUCK: Legs = [[1, 3], [1, 3], [-1, 3], [-1, 3]];

const STAND_LEG_X = [8, 11, 16, 19] as const;
const LEG_TOP_Y = 24;
const FOOT_Y = 28;
const HEAD_RX = 7;
const HEAD_RY = 6.5;
const EARS_BACK_RAD = -0.8;

// Each tail is a chain of fluffy circles [cx, cy, r]; the last one is the cream tip.
const TAILS: Record<Tail, readonly (readonly [number, number, number])[]> = {
  up: [[7, 21, 2], [5, 18, 2.5], [4, 14, 3], [5, 10, 2.7], [5, 9, 2]],
  wagL: [[7, 21, 2], [4.5, 18, 2.5], [3, 14, 3], [3.5, 10, 2.7], [3.5, 9, 2]],
  wagR: [[7, 21, 2], [5.5, 18, 2.5], [6, 14, 3], [7.5, 10.5, 2.7], [7.5, 9.5, 2]],
  flat: [[7, 21, 2.2], [4.5, 19.5, 2.6], [2.8, 17.5, 2.4], [2.5, 17, 1.8]],
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
  high: [[6, 16, 2], [4, 12, 2.6], [4, 8, 3], [6, 4.5, 2.6], [6, 3.5, 2]],
  highL: [[6, 16, 2], [3.5, 12, 2.6], [2.5, 8, 3], [3.5, 4.5, 2.6], [3.5, 3.5, 2]],
  highR: [[6, 16, 2], [4.5, 12, 2.6], [5.5, 8, 3], [8, 5, 2.6], [8, 4, 2]],
};

const DEFAULT_TAIL: Record<Body, Tail> = {
  stand: 'up',
  sit: 'sitA',
  curl: 'curl',
  bow: 'high',
  lie: 'sitA',
};

const GLYPHS = {
  z: ['ZZZZ', '..Z.', '.Z..', 'ZZZZ'],
  dot: ['Z'],
  heart: ['LL.LL', 'LLLLL', '.LLL.', '..L..'],
  smallHeart: ['L.L', 'LLL', '.L.'],
  drop: ['.C.', 'CCC', 'CCC', '.C.'],
  spark: ['.H.', 'HHH', '.H.'],
  star: ['.S.', 'SSS', '.S.'],
  question: ['.QQ.', 'Q..Q', '..Q.', '....', '..Q.'],
  bang: ['H', 'H', 'H', '.', 'H'],
  puff: ['Q'],
} as const satisfies Record<string, Glyph>;

const EXTRAS: Record<Extra, readonly Overlay[]> = {
  zzzA: [{ x: 24, y: 8, glyph: GLYPHS.z }],
  zzzB: [{ x: 27, y: 3, glyph: GLYPHS.z }, { x: 25, y: 10, glyph: GLYPHS.dot }],
  heartsA: [{ x: 26, y: 4, glyph: GLYPHS.heart }],
  heartsB: [{ x: 27, y: 1, glyph: GLYPHS.heart }, { x: 29, y: 7, glyph: GLYPHS.smallHeart }],
  smallHeartA: [{ x: 27, y: 3, glyph: GLYPHS.smallHeart }],
  smallHeartB: [{ x: 28, y: 0, glyph: GLYPHS.smallHeart }],
  sweat: [{ x: 12, y: 4, glyph: GLYPHS.drop }],
  sparkleA: [{ x: 1, y: 2, glyph: GLYPHS.spark }, { x: 28, y: 6, glyph: GLYPHS.spark }],
  sparkleB: [{ x: 4, y: 6, glyph: GLYPHS.spark }, { x: 27, y: 0, glyph: GLYPHS.spark }],
  starsA: [
    { x: 13, y: 1, glyph: GLYPHS.star },
    { x: 20, y: 0, glyph: GLYPHS.star },
    { x: 27, y: 2, glyph: GLYPHS.star },
  ],
  starsB: [
    { x: 16, y: 0, glyph: GLYPHS.star },
    { x: 24, y: 1, glyph: GLYPHS.star },
    { x: 11, y: 4, glyph: GLYPHS.star },
  ],
  question: [{ x: 27, y: 0, glyph: GLYPHS.question }],
  bang: [{ x: 28, y: 0, glyph: GLYPHS.bang }],
  sniffA: [{ x: 30, y: 21, glyph: GLYPHS.puff }],
  sniffB: [{ x: 30, y: 19, glyph: GLYPHS.puff }, { x: 31, y: 22, glyph: GLYPHS.puff }],
};

function set(g: Grid, x: number, y: number, c: string): void {
  if (x >= 0 && x < SPRITE_SIZE && y >= 0 && y < SPRITE_SIZE) {
    g[y][x] = c;
  }
}

function rect(g: Grid, x0: number, y0: number, x1: number, y1: number, c: string): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      set(g, x, y, c);
    }
  }
}

function inEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number): boolean {
  const nx = (x + 0.5 - cx) / rx;
  const ny = (y + 0.5 - cy) / ry;
  return nx * nx + ny * ny <= 1;
}

function ellipse(
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

function poly(g: Grid, pts: readonly Point[], c: string): void {
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

function lerp(a: Point, b: Point, t: number): Point {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function limb(g: Grid, from: Point, to: Point, c: string): void {
  const steps = Math.ceil(Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]))) * 2 + 1;
  for (let i = 0; i <= steps; i++) {
    const [x, y] = lerp(from, to, i / steps).map(Math.floor);
    rect(g, x, y, x + 1, y + 1, c);
  }
}

function leg(g: Grid, top: Point, foot: Point, c: string): void {
  limb(g, top, foot, c);
  rect(g, Math.floor(foot[0]), Math.floor(foot[1]) + 1, Math.floor(foot[0]) + 1, Math.floor(foot[1]) + 1, 'c');
}

function raisedPaw(g: Grid, from: Point, to: Point): void {
  limb(g, from, to, 'o');
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
  const tilt = (p.ears ?? 'up') === 'up' ? 0 : EARS_BACK_RAD;
  const ear = (dx: number, dy: number): Point => [
    hx + dx * Math.cos(tilt) - dy * Math.sin(tilt),
    hy + dx * Math.sin(tilt) + dy * Math.cos(tilt),
  ];
  drawEar(g, ear(-6, -3), ear(-4.5, -11.5), ear(-1, -5), false);
  drawEar(g, ear(-1.5, -5), ear(2.5, -12), ear(5, -3.5), true);
  ellipse(g, hx, hy, HEAD_RX, HEAD_RY, 'O');
  ellipse(g, hx + 3, hy + 3.5, 4.2, 3, 'c', (x, y) => inEllipse(x, y, hx, hy, HEAD_RX, HEAD_RY));
  ellipse(g, hx + 5.5, hy + 2.2, 2.6, 1.8, 'c');

  switch (p.eye ?? 'open') {
    case 'open':
      rect(g, hx + 1, hy - 2, hx + 2, hy, 'E');
      set(g, hx + 2, hy - 2, 'W');
      break;
    case 'down':
      rect(g, hx + 1, hy - 1, hx + 2, hy, 'E');
      set(g, hx + 2, hy - 1, 'W');
      break;
    case 'wide':
      rect(g, hx, hy - 3, hx + 3, hy + 1, 'W');
      rect(g, hx + 1, hy - 2, hx + 2, hy, 'E');
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

  set(g, hx + 7, hy + 1, 'E');
  rect(g, hx - 1, hy + 2, hx, hy + 2, 'r');

  switch (p.mouth ?? 'smile') {
    case 'smile':
      rect(g, hx + 4, hy + 4, hx + 5, hy + 4, 'K');
      set(g, hx + 6, hy + 3, 'K');
      break;
    case 'tongue':
      rect(g, hx + 4, hy + 4, hx + 5, hy + 4, 'K');
      set(g, hx + 6, hy + 3, 'K');
      set(g, hx + 5, hy + 5, 'p');
      break;
    case 'flat':
      rect(g, hx + 4, hy + 4, hx + 6, hy + 4, 'K');
      break;
    case 'open':
      rect(g, hx + 3, hy + 4, hx + 6, hy + 5, 'M');
      set(g, hx + 4, hy + 5, 'p');
      break;
  }
}

function drawStand(g: Grid, b: number, legs: Legs): Point {
  const foot = (i: number): Point => [STAND_LEG_X[i] + legs[i][0], FOOT_Y - legs[i][1]];
  const top = (i: number): Point => [STAND_LEG_X[i], LEG_TOP_Y + b];
  leg(g, top(0), foot(0), 'o');
  leg(g, top(2), foot(2), 'o');
  ellipse(g, 14, 22.5 + b, 7.5, 5, 'O');
  ellipse(g, 18, 24 + b, 3.5, 2.5, 'c');
  leg(g, top(1), foot(1), 'O');
  leg(g, top(3), foot(3), 'O');
  return [22, 13 + b];
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

function drawCurl(g: Grid, b: number): Point {
  ellipse(g, 14, 25 + b, 9, 4.8, 'O');
  drawTail(g, 'curl', b, true);
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

function outline(g: Grid): void {
  const filled = g.map((r) => r.map((c) => c !== TRANSPARENT));
  const isFilled = (x: number, y: number): boolean => filled[y]?.[x] === true;
  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      if (
        !filled[y][x] &&
        (isFilled(x - 1, y) || isFilled(x + 1, y) || isFilled(x, y - 1) || isFilled(x, y + 1))
      ) {
        g[y][x] = 'K';
      }
    }
  }
}

function frame(p: Pose): Frame {
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
      head = drawCurl(g, b);
      break;
    case 'bow':
      head = drawBow(g, b);
      break;
    case 'lie':
      head = drawLie(g, b);
      break;
    default:
      head = drawStand(g, b, p.legs ?? STILL);
  }
  const hx = head[0] + (p.head?.[0] ?? 0);
  const hy = head[1] + (p.head?.[1] ?? 0);
  drawHead(g, hx, hy, p);

  if (paw === 'wave1') {
    raisedPaw(g, [19, 21 + b], [27, 22]);
  } else if (paw === 'wave2') {
    raisedPaw(g, [19, 21 + b], [29, 19]);
  } else if (paw === 'lick') {
    raisedPaw(g, [19, 21 + b], [hx + 3, hy + 4]);
  }
  if (p.ball) {
    drawCarriedBall(g, hx + 5.5, hy + 5.5);
  }

  outline(g);
  return {
    pixels: g.map((r) => r.join('')),
    overlays: (p.extras ?? []).flatMap((e) => EXTRAS[e]),
    eye: (p.eye ?? 'open') === 'open' ? [hx + 1, hy - 2] : undefined,
  };
}

function drawCarriedBall(g: Grid, cx: number, cy: number): void {
  const r = 2.6;
  ellipse(g, cx, cy, r, r, 'R');
  ellipse(g, cx, cy, r, r, 'W', (x) => x === Math.floor(cx));
  ellipse(g, cx, cy, r, r, 'U', (x) => x > Math.floor(cx));
}

function anim(steps: readonly (readonly [Pose, number])[]): Animation {
  return { frames: steps.map(([p]) => frame(p)), durations: steps.map(([, d]) => d) };
}

export const JUMP_CROUCH_MS = 120;
export const JUMP_AIR_MS = 480;
export const JUMP_LAND_MS = 120;

const SIT = { body: 'sit' } as const;

export const ANIMATIONS: Record<AnimName, Animation> = {
  idle: anim([
    [{ tail: 'up' }, 700],
    [{ tail: 'wagL' }, 400],
    [{ tail: 'up' }, 400],
    [{ tail: 'wagR' }, 400],
    [{ tail: 'up', bob: 1 }, 700],
  ]),
  walk: anim([
    [{ legs: STEP_A, tail: 'wagL' }, 210],
    [{ bob: 1 }, 210],
    [{ legs: STEP_B, tail: 'wagR' }, 210],
    [{ bob: 1 }, 210],
  ]),
  run: anim([
    [{ legs: RUN_REACH, tail: 'flat', ears: 'back', mouth: 'tongue' }, 90],
    [{ legs: RUN_GATHER, bob: -1, tail: 'flat', ears: 'back', mouth: 'tongue' }, 90],
  ]),
  jump: anim([
    [{ bob: 1, mouth: 'open' }, JUMP_CROUCH_MS],
    [{ legs: TUCK, eye: 'happy', mouth: 'open' }, JUMP_AIR_MS],
    [{ bob: 1, tail: 'wagL' }, JUMP_LAND_MS],
  ]),
  sit: anim([
    [{ ...SIT, tail: 'sitA' }, 900],
    [{ ...SIT, tail: 'sitB' }, 900],
  ]),
  groom: anim([
    [{ ...SIT, paw: 'lick', eye: 'closed', mouth: 'tongue', head: [0, 1] }, 260],
    [{ ...SIT, paw: 'lick', eye: 'closed', mouth: 'smile', head: [0, 2] }, 260],
  ]),
  stretch: anim([
    [{ body: 'bow', eye: 'closed', mouth: 'open' }, 700],
    [{ body: 'bow', eye: 'closed', mouth: 'open', head: [0, -1] }, 700],
    [{ eye: 'happy' }, 300],
  ]),
  yawn: anim([
    [SIT, 300],
    [{ ...SIT, eye: 'closed', mouth: 'open', head: [0, -1] }, 900],
    [{ ...SIT, eye: 'closed' }, 300],
  ]),
  sniff: anim([
    [{ legs: STEP_A, head: [1, 4], eye: 'down', extras: ['sniffA'] }, 300],
    [{ head: [1, 5], eye: 'down', extras: ['sniffB'] }, 300],
    [{ legs: STEP_B, head: [1, 4], eye: 'down' }, 300],
    [{ head: [1, 5], eye: 'down' }, 300],
  ]),
  chaseTail: anim([
    [{ legs: RUN_REACH, tail: 'wagR', eye: 'happy', mouth: 'open', head: [-1, 1] }, 110],
    [{ legs: RUN_GATHER, bob: -1, tail: 'wagL', eye: 'happy', mouth: 'open', head: [-1, 1] }, 110],
  ]),
  lookAround: anim([
    [{ extras: ['question'] }, 600],
    [{ head: [0, -1], extras: ['question'] }, 600],
  ]),
  sleep: anim([
    [{ body: 'curl', eye: 'closed', ears: 'back', extras: ['zzzA'] }, 800],
    [{ body: 'curl', bob: 1, eye: 'closed', ears: 'back', extras: ['zzzB'] }, 800],
  ]),
  typing: anim([
    [{ ...SIT, paw: 'tapNear', eye: 'down', mouth: 'flat' }, 180],
    [{ ...SIT, paw: 'tapFar', eye: 'down', mouth: 'flat' }, 180],
  ]),
  wave: anim([
    [{ ...SIT, paw: 'wave1', eye: 'happy', mouth: 'open' }, 220],
    [{ ...SIT, paw: 'wave2', eye: 'happy', mouth: 'open' }, 220],
  ]),
  love: anim([
    [{ ...SIT, eye: 'happy', tail: 'sitA', extras: ['heartsA'] }, 300],
    [{ ...SIT, bob: 1, eye: 'happy', tail: 'sitB', extras: ['heartsB'] }, 300],
  ]),
  celebrate: anim([
    [{ legs: TUCK, tail: 'wagL', eye: 'happy', mouth: 'open', extras: ['sparkleA'] }, 180],
    [{ bob: 1, tail: 'wagR', eye: 'happy', mouth: 'open', extras: ['sparkleB'] }, 180],
  ]),
  panic: anim([
    [{ legs: RUN_REACH, tail: 'flat', ears: 'back', eye: 'wide', mouth: 'open', extras: ['sweat'] }, 80],
    [
      {
        legs: RUN_GATHER,
        bob: -1,
        tail: 'flat',
        ears: 'back',
        eye: 'wide',
        mouth: 'open',
        extras: ['sweat'],
      },
      80,
    ],
  ]),
  dizzy: anim([
    [{ eye: 'dizzy', mouth: 'tongue', head: [-1, 0], extras: ['starsA'] }, 250],
    [{ eye: 'dizzy', mouth: 'tongue', head: [1, 1], bob: 1, extras: ['starsB'] }, 250],
  ]),
  carry: anim([
    [{ legs: STEP_A, tail: 'wagL', ball: true }, 150],
    [{ bob: 1, ball: true }, 150],
    [{ legs: STEP_B, tail: 'wagR', ball: true }, 150],
    [{ bob: 1, ball: true }, 150],
  ]),
  pounce: anim([
    [{ body: 'bow', eye: 'happy', mouth: 'open' }, 200],
    [{ legs: TUCK, tail: 'wagR', eye: 'happy', mouth: 'open', head: [1, 1] }, 200],
  ]),
  lie: anim([
    [{ body: 'lie', tail: 'sitA' }, 1400],
    [{ body: 'lie', bob: 1, tail: 'sitB' }, 1400],
  ]),
  alert: anim([[{ head: [0, -1], tail: 'up', extras: ['bang'] }, 500]]),
  stalk: anim([
    [{ bob: 2, head: [1, 1], tail: 'flat', legs: STEP_A, mouth: 'flat' }, 340],
    [{ bob: 2, head: [1, 1], tail: 'flat', mouth: 'flat' }, 340],
    [{ bob: 2, head: [1, 1], tail: 'flat', legs: STEP_B, mouth: 'flat' }, 340],
    [{ bob: 2, head: [1, 1], tail: 'flat', mouth: 'flat' }, 340],
  ]),
  wiggle: anim([
    [{ body: 'bow', tail: 'highL', mouth: 'flat' }, 110],
    [{ body: 'bow', bob: 1, tail: 'highR', mouth: 'flat' }, 110],
  ]),
  leap: anim([
    [{ legs: RUN_REACH, head: [1, -1], tail: 'flat', mouth: 'open' }, 200],
    [{ legs: TUCK, head: [1, -1], tail: 'flat', mouth: 'open' }, 400],
  ]),
  proud: anim([
    [{ ...SIT, eye: 'happy', tail: 'sitA', extras: ['sparkleA'] }, 350],
    [{ ...SIT, eye: 'happy', tail: 'sitB', extras: ['sparkleB'] }, 350],
  ]),
  puzzled: anim([
    [{ ...SIT, head: [0, 1], extras: ['question'] }, 700],
    [{ ...SIT, head: [-1, 1], extras: ['question'] }, 700],
  ]),
  sad: anim([
    [{ ...SIT, ears: 'back', eye: 'down', mouth: 'flat', head: [0, 2] }, 900],
    [{ ...SIT, ears: 'back', eye: 'down', mouth: 'flat', head: [0, 2], bob: 1 }, 900],
  ]),
  petted: anim([
    [{ ...SIT, eye: 'happy', head: [0, 1], tail: 'sitA', extras: ['smallHeartA'] }, 350],
    [{ ...SIT, eye: 'happy', head: [0, 1], bob: 1, tail: 'sitB', extras: ['smallHeartB'] }, 350],
  ]),
  cuddle: anim([
    [{ body: 'lie', eye: 'happy', tail: 'sitA', extras: ['heartsA'] }, 450],
    [{ body: 'lie', eye: 'happy', bob: 1, tail: 'sitB', extras: ['heartsB'] }, 450],
  ]),
  watch: anim([
    [{ ...SIT, tail: 'sitA', mouth: 'tongue' }, 160],
    [{ ...SIT, tail: 'sitB', mouth: 'tongue', bob: 1 }, 160],
  ]),
};

export const BUG_FRAMES: readonly Glyph[] = [
  ['VV.VV', 'VVKVV', '.VKV.', '..K..'],
  ['.....', '.VKV.', 'VVKVV', '..K..'],
];

const BALL_BASE = ['..KKK..', '.K123K.', 'K11233K', 'K11233K', 'K11233K', '.K123K.', '..KKK..'];
const BALL_COLORS = ['RWU', 'URW', 'WUR'] as const;

export const BALL_FRAMES: readonly Glyph[] = BALL_COLORS.map((colors) =>
  BALL_BASE.map((line) => line.replace(/[123]/g, (d) => colors[Number(d) - 1])),
);

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
