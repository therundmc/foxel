import type { Coat } from '../shared/protocol';

export const SPRITE_SIZE = 32;
export const TRANSPARENT = '.';
export const NOSE_X = 29;
export const GROUND_ROW = 30;
export const BALL_SIZE = 7;
export const BUG_W = 5;
export const BUG_H = 4;
export const TREAT_W = 11;
export const TREAT_H = 6;
/** Centre of the treat being eaten, in sprite columns; it sticks out past the nose. */
export const TREAT_PAWS_X = 33.5;

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
  V: '#b07cf0',
  B: '#cde83a',
  b: '#93ad24',
  Y: '#f8f8ec',
  y: '#c8d0a4',
  g: '#efff9e',
  T: '#d99a52',
  t: '#a8672f',
  h: '#f6cf94',
  A: '#e0525c',
  a: '#a8353f',
  k: '#8a5a2e',
  U: '#4fb3c9',
  u: '#2f7f94',
  w: '#8ee3ff',
  I: '#5a6fd6',
  i: '#3c4ea8',
  X: '#ffd23f',
  x: '#ffae2b',
  G: '#f6f0c8',
  q: '#d6cc98',
  J: '#fff6c4',
};

// Fur letters only; everything else keeps the base palette.
export const COATS: Readonly<Record<Coat, Readonly<Record<string, string>>>> = {
  red: {},
  arctic: { O: '#f2f5fb', o: '#c3cde0', c: '#ffffff', d: '#8e9ab3' },
  silver: { O: '#8f95a6', o: '#62687a', c: '#e6e8ef', d: '#2c2f3b' },
  fennec: { O: '#e6c08a', o: '#c0955a', c: '#fff5e0', d: '#9c6a36' },
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
  /** Centre of the head, used to tell where the fox was touched. */
  readonly head: Point;
  /** Bite stage of the treat being eaten (index into TREAT_STAGES); undefined once it is gone. */
  readonly treat?: number;
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
  | 'snatch'
  | 'proud'
  | 'puzzled'
  | 'sad'
  | 'petted'
  | 'cuddle'
  | 'ready'
  | 'boop'
  | 'beg'
  | 'pat'
  | 'patLie'
  | 'scratch'
  | 'shake'
  | 'blep'
  | 'lick'
  | 'nuzzle'
  | 'nuzzleLie'
  | 'tilt'
  | 'playBow'
  | 'flop'
  | 'highFive'
  | 'twirl'
  | 'startle'
  | 'tailPoof'
  | 'peek'
  | 'balance'
  | 'tossFlick'
  | 'tossWait'
  | 'tossCatch'
  | 'pawPlay'
  | 'doze'
  | 'morning'
  | 'goodNight'
  | 'hungry'
  | 'hungrySad'
  | 'eatBowl'
  | 'drink'
  | 'drowsy'
  | 'typingSleepy'
  | 'sigh'
  | 'eat'
  | 'watch';

type Body = 'stand' | 'sit' | 'curl' | 'bow' | 'lie';
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
type Extra =
  | 'zzz1'
  | 'zzz2'
  | 'zzz3'
  | 'dreamDots1'
  | 'dreamDots2'
  | 'dreamBall'
  | 'dreamBone'
  | 'dreamButterfly'
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
  | 'sniffB'
  | 'crumbsA'
  | 'crumbsB'
  | 'rumbleA'
  | 'rumbleB';

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

type Grid = string[][];

const STILL: Legs = [[0, 0], [0, 0], [0, 0], [0, 0]];
const STEP_A: Legs = [[-1, 0], [1, 1], [1, 1], [-1, 0]];
const STEP_B: Legs = [[1, 1], [-1, 0], [-1, 0], [1, 1]];
const RUN_REACH: Legs = [[-3, 1], [-2, 0], [2, 0], [3, 1]];
const RUN_GATHER: Legs = [[2, 2], [1, 2], [-1, 2], [-2, 2]];
// Gallop: stretched in the air, front feet land, gathered in the air, back feet push off.
const GALLOP_STRETCH: Legs = [[-3, 1], [-2, 1], [2, 1], [3, 1]];
const GALLOP_LAND: Legs = [[-2, 1], [-1, 1], [0, 0], [1, 0]];
const GALLOP_GATHER: Legs = [[1, 1], [2, 1], [0, 1], [1, 1]];
const GALLOP_PUSH: Legs = [[0, 0], [1, 0], [2, 1], [3, 1]];
// Bouncy hop: back paws kick off, everything flies stretched, front paws land, paws gather under.
const HOP_KICK: Legs = [[-3, 0], [-2, 0], [2, 3], [3, 3]];
const HOP_FLY: Legs = [[-3, 2], [-2, 2], [3, 2], [4, 2]];
const HOP_LAND: Legs = [[-2, 3], [-1, 3], [1, 0], [2, 0]];
const HOP_GATHER: Legs = [[2, 1], [3, 1], [-1, 1], [0, 1]];
const TUCK: Legs = [[1, 3], [1, 3], [-1, 3], [-1, 3]];
const THUMP: Legs = [[0, 0], [3, 3], [0, 0], [0, 0]];

const STAND_LEG_X = [8, 11, 16, 19] as const;
const LEG_TOP_Y = 24;
const FOOT_Y = 28;
const HEAD_RX = 7;
const HEAD_RY = 6.5;
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
};

const GLYPHS = {
  z: ['ZZZZ', '..Z.', '.Z..', 'ZZZZ'],
  zSmall: ['ZZZ', '..Z', '.Z.', 'ZZZ'],
  dot: ['Z'],
  bigDot: ['ZZ', 'ZZ'],
  heart: ['LL.LL', 'LLLLL', '.LLL.', '..L..'],
  smallHeart: ['L.L', 'LLL', '.L.'],
  drop: ['.C.', 'CCC', 'CCC', '.C.'],
  spark: ['.H.', 'HHH', '.H.'],
  star: ['.S.', 'SSS', '.S.'],
  question: ['.QQ.', 'Q..Q', '..Q.', '....', '..Q.'],
  bang: ['H', 'H', 'H', '.', 'H'],
  puff: ['Q'],
  crumb: ['t'],
} as const satisfies Record<string, Glyph>;

// A thought bubble above the sleeping head, with a little picture of what it dreams about.
function dream(icon: Glyph): readonly Overlay[] {
  const w = 11;
  const h = 8;
  const bubble: string[][] = Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => {
      const corner = (x < 2 || x > w - 3) && (y === 0 || y === h - 1) ? true : (x === 0 || x === w - 1) && (y === 1 || y === h - 2);
      if (corner) {
        return TRANSPARENT;
      }
      const edge = y === 0 || y === h - 1 || x === 0 || x === w - 1 || ((x === 1 || x === w - 2) && (y === 1 || y === h - 2));
      return edge ? 'Z' : 'W';
    }),
  );
  const ox = Math.floor((w - icon[0].length) / 2);
  const oy = Math.floor((h - icon.length) / 2);
  icon.forEach((line, y) => [...line].forEach((c, x) => c !== TRANSPARENT && (bubble[oy + y][ox + x] = c)));
  return [
    { x: 25, y: 13, glyph: GLYPHS.dot },
    { x: 23, y: 10, glyph: GLYPHS.bigDot },
    { x: 17, y: 1, glyph: bubble.map((r) => r.join('')) },
  ];
}

const EXTRAS: Record<Extra, readonly Overlay[]> = {
  zzz1: [{ x: 27, y: 13, glyph: GLYPHS.dot }],
  zzz2: [{ x: 27, y: 10, glyph: GLYPHS.zSmall }],
  zzz3: [{ x: 28, y: 4, glyph: GLYPHS.z }, { x: 26, y: 11, glyph: GLYPHS.dot }],
  dreamDots1: [{ x: 25, y: 13, glyph: GLYPHS.dot }],
  dreamDots2: [{ x: 25, y: 13, glyph: GLYPHS.dot }, { x: 23, y: 10, glyph: GLYPHS.bigDot }],
  dreamBall: dream(['.BB.', 'BBYB', 'BYBB', '.BB.']),
  dreamBone: dream(['T...T', 'TTTTT', 't...t']),
  dreamButterfly: dream(['VV.VV', 'VVKVV', '.VKV.']),
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
  crumbsA: [{ x: 30, y: 22, glyph: GLYPHS.crumb }, { x: 24, y: 24, glyph: GLYPHS.crumb }],
  crumbsB: [{ x: 31, y: 24, glyph: GLYPHS.crumb }, { x: 23, y: 25, glyph: GLYPHS.crumb }],
  rumbleA: [{ x: 21, y: 23, glyph: ['Q.Q', '.Q.'] }],
  rumbleB: [{ x: 22, y: 22, glyph: ['.Q.', 'Q.Q'] }],
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
      head = drawCurl(g, b, tail);
      break;
    case 'bow':
      head = drawBow(g, b);
      break;
    case 'lie':
      head = drawLie(g, b);
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

// Bone fill only; outlined() adds the border. After each bite the fox pulls what is left back under its mouth.
const TREAT_BITES: readonly Glyph[] = [
  ['hT.....hT', 'TThhhhhTT', 'ttttttttt', 'tt.....tt'],
  ['.....hT..', '.hhhhTT..', 'ttttttt..', '.....tt..'],
  ['..hT.....', 'hhTT.....', '.ttt.....', '..tt.....'],
  ['hT.......', 'TT.......', 'tt.......', '.t.......'],
];

function outlined(fill: Glyph): Glyph {
  const w = fill[0].length + 2;
  const at = (x: number, y: number): string => fill[y - 1]?.[x - 1] ?? TRANSPARENT;
  return Array.from({ length: fill.length + 2 }, (_, y) =>
    Array.from({ length: w }, (_, x) => {
      const c = at(x, y);
      if (c !== TRANSPARENT) {
        return c;
      }
      const touches = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].some((n) => n !== TRANSPARENT);
      return touches ? 'K' : TRANSPARENT;
    }).join(''),
  );
}

/** The treat as it is being eaten, near end on the left (mirror when facing left). */
export const TREAT_STAGES: readonly Glyph[] = TREAT_BITES.map(outlined);

// Also returns, for each bite stage, the time to resume from: lying down calmly in front of what is left.
function eatAnimation(): { animation: Animation; resumeAt: number[] } {
  const LIE = { body: 'lie' } as const;
  const steps: [Pose, number][] = [
    [{ body: 'bow', treat: 0, eye: 'down' }, 220],
    [{ ...LIE, treat: 0, head: [1, 2], eye: 'down', extras: ['sniffA'] }, 320],
    [{ ...LIE, treat: 0, head: [1, 1], eye: 'happy', tail: 'sitB' }, 300],
  ];
  const resumeAt = [0];
  const elapsed = (): number => steps.reduce((sum, [, d]) => sum + d, 0);
  TREAT_BITES.forEach((_, s) => {
    const left = s + 1 < TREAT_BITES.length ? s + 1 : undefined;
    steps.push(
      [{ ...LIE, treat: s, head: [1, 2], eye: 'closed', mouth: 'open' }, 180],
      [{ ...LIE, treat: s, head: [2, 3], eye: 'closed', mouth: 'flat' }, 200],
      [{ ...LIE, treat: left, head: [0, 1], eye: 'closed', mouth: 'flat', extras: ['crumbsA'] }, 160],
      [{ ...LIE, treat: left, eye: 'happy', mouth: 'open', tail: 'sitA', extras: ['crumbsB'] }, 220],
      [{ ...LIE, treat: left, head: [0, 1], eye: 'happy', mouth: 'flat', tail: 'sitB' }, 220],
      [{ ...LIE, treat: left, eye: 'happy', mouth: 'open', tail: 'sitA' }, 220],
      [{ ...LIE, treat: left, head: [0, 1], eye: 'happy', mouth: 'flat', tail: 'sitB' }, 220],
    );
    if (left !== undefined) {
      resumeAt.push(elapsed());
    }
    steps.push([{ ...LIE, treat: left, eye: 'happy', tail: 'sitA' }, 260]);
  });
  steps.push(
    [{ ...LIE, eye: 'happy', mouth: 'tongue' }, 280],
    [{ ...LIE, eye: 'happy', mouth: 'tongue', head: [1, 0] }, 280],
    [{ ...LIE, eye: 'happy' }, 300],
    [{ ...LIE, eye: 'happy', tail: 'sitA', extras: ['heartsA'] }, 450],
    [{ ...LIE, eye: 'happy', tail: 'sitB', bob: 1, extras: ['heartsB'] }, 450],
  );
  return { animation: anim(steps), resumeAt };
}

function nuzzleAnimation(body: 'stand' | 'lie'): Animation {
  return anim([
    [{ body, head: [1, 0], eye: 'closed', tail: body === 'lie' ? 'sitA' : 'wagL' }, 220],
    [{ body, head: [2, -1], eye: 'closed', tail: body === 'lie' ? 'sitB' : 'wagR', extras: ['smallHeartA'] }, 260],
    [{ body, head: [1, 0], eye: 'closed', tail: body === 'lie' ? 'sitA' : 'wagL' }, 220],
    [{ body, head: [2, -1], eye: 'closed', tail: body === 'lie' ? 'sitB' : 'wagR', extras: ['smallHeartB'] }, 260],
    [{ body, eye: 'happy', tail: body === 'lie' ? 'sitA' : 'up' }, 360],
  ]);
}

export const TWIRL_CROUCH_MS = 120;
export const TWIRL_AIR_MS = 600;
export const STARTLE_CROUCH_MS = 120;
export const STARTLE_AIR_MS = 420;
// Intro peek timeline: look around, duck back shyly, peek again, light up.
export const PEEK_LOOK_MS = 1100;
export const PEEK_DUCK_MS = 600;
export const PEEK_RETURN_MS = 220;
export const PEEK_HAPPY_MS = 800;
export const TOSS_FLICK_MS = 300;
export const TOSS_CATCH_MS = 450;
/** When the morning greeting starts waving (and shows the sun). */
export const MORNING_WAVE_MS = 2700;
export const KIBBLE_MS = 940;

// A long sleepy loop: slow breathing with rising Zzz, little twitches and dreams of the ball, a treat and a butterfly.
function sleepAnimation(): Animation {
  const SLEEP = { body: 'curl', eye: 'closed', ears: 'back' } as const;
  const breathe = (): [Pose, number][] => [
    [{ ...SLEEP, extras: ['zzz1'] }, 900],
    [{ ...SLEEP, bob: 1, extras: ['zzz2'] }, 900],
    [{ ...SLEEP, extras: ['zzz3'] }, 900],
    [{ ...SLEEP, bob: 1 }, 900],
  ];
  const dreamOf = (about: Extra, twitch: Pose): [Pose, number][] => [
    [{ ...SLEEP, extras: ['dreamDots1'] }, 400],
    [{ ...SLEEP, bob: 1, extras: ['dreamDots2'] }, 400],
    [{ ...SLEEP, extras: [about] }, 900],
    [{ ...SLEEP, ...twitch, extras: [about] }, 220],
    [{ ...SLEEP, bob: 1, extras: [about] }, 900],
    [{ ...SLEEP, ...twitch, extras: [about] }, 220],
    [{ ...SLEEP, mouth: 'blep', extras: [about] }, 1100],
    [{ ...SLEEP, bob: 1, mouth: 'blep' }, 900],
  ];
  return anim([
    ...breathe(),
    ...breathe(),
    [{ ...SLEEP, ears: 'up' }, 150],
    [SLEEP, 150],
    [{ ...SLEEP, ears: 'up' }, 150],
    [{ ...SLEEP, bob: 1 }, 500],
    ...breathe(),
    ...dreamOf('dreamBall', { tail: 'curlFlick' }),
    ...breathe(),
    [{ ...SLEEP, tail: 'curlFlick' }, 200],
    [SLEEP, 200],
    [{ ...SLEEP, tail: 'curlFlick' }, 200],
    [{ ...SLEEP, bob: 1 }, 600],
    ...breathe(),
    ...dreamOf('dreamBone', { mouth: 'open' }),
    ...breathe(),
    ...breathe(),
    ...dreamOf('dreamButterfly', { ears: 'up' }),
  ]);
}

function patAnimation(body: 'sit' | 'lie'): Animation {
  return anim([
    [{ body, head: [0, 1], eye: 'closed', tail: 'sitA' }, 240],
    [{ body, head: [0, 2], eye: 'closed', tail: 'sitB', extras: ['smallHeartA'] }, 340],
    [{ body, head: [0, 1], eye: 'closed', tail: 'sitA', extras: ['smallHeartB'] }, 340],
    [{ body, head: [0, 2], eye: 'happy', tail: 'sitB' }, 300],
    [{ body, eye: 'happy', tail: 'sitA' }, 280],
  ]);
}

function anim(steps: readonly (readonly [Pose, number])[]): Animation {
  return { frames: steps.map(([p]) => frame(p)), durations: steps.map(([, d]) => d) };
}

export const JUMP_CROUCH_MS = 120;
export const JUMP_AIR_MS = 480;
export const JUMP_LAND_MS = 120;

const SIT = { body: 'sit' } as const;

const EAT = eatAnimation();
/** Where to pick the eat animation back up for a treat already eaten down to a given TREAT_STAGES index. */
export const EAT_RESUME_MS: readonly number[] = EAT.resumeAt;

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
  // The head stays level while the body bounces under it, so the ears never leave the sprite.
  run: anim([
    [{ legs: HOP_KICK, bob: -1, pitch: -1, head: [1, 2], tail: 'streamB', eye: 'happy', mouth: 'tongue' }, 90],
    [{ legs: HOP_FLY, bob: -2, head: [1, 2], tail: 'flat', eye: 'happy', mouth: 'open' }, 110],
    [{ legs: HOP_LAND, pitch: 1, head: [1, 0], tail: 'streamA', eye: 'happy', mouth: 'tongue' }, 80],
    [{ legs: HOP_GATHER, bob: 1, head: [0, -1], tail: 'streamB', eye: 'happy', mouth: 'tongue' }, 90],
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
  sleep: sleepAnimation(),
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
  panic: anim(
    (
      [
        [GALLOP_STRETCH, -1],
        [GALLOP_LAND, 0],
        [GALLOP_GATHER, -1],
        [GALLOP_PUSH, 0],
      ] as const
    ).map(([legs, bob]) => [
      { legs, bob, tail: 'flat', ears: 'back', eye: 'wide', mouth: 'open', extras: ['sweat'] },
      70,
    ]),
  ),
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
  snatch: anim([[{ legs: TUCK, head: [1, -1], tail: 'wagR', eye: 'happy', ball: true }, 600]]),
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
  ready: anim([
    [{ tail: 'wagL', mouth: 'tongue' }, 180],
    [{ tail: 'wagR', mouth: 'tongue' }, 180],
  ]),
  boop: anim([
    [{ eye: 'closed', ears: 'back', head: [-1, 0] }, 180],
    [{ eye: 'closed', ears: 'back', mouth: 'open', head: [1, 1], extras: ['sniffB'] }, 240],
    [{ eye: 'happy', tail: 'wagL' }, 300],
    [{ eye: 'happy', tail: 'wagR' }, 300],
  ]),
  eat: EAT.animation,
  beg: anim([
    [{ ...SIT, mouth: 'tongue', tail: 'sitA' }, 240],
    [{ ...SIT, mouth: 'tongue', tail: 'sitB', paw: 'beg', head: [1, 0] }, 200],
    [{ ...SIT, mouth: 'tongue', tail: 'sitA', paw: 'beg', head: [1, 0] }, 200],
    [{ ...SIT, mouth: 'tongue', tail: 'sitB' }, 240],
  ]),
  pat: patAnimation('sit'),
  patLie: patAnimation('lie'),
  scratch: anim([
    [{ eye: 'happy', mouth: 'tongue', tail: 'wagL', head: [0, 1] }, 160],
    [{ eye: 'happy', mouth: 'tongue', tail: 'wagR', legs: THUMP, head: [0, 1] }, 120],
    [{ eye: 'happy', mouth: 'tongue', tail: 'wagL', head: [0, 1], bob: 1 }, 120],
    [{ eye: 'happy', mouth: 'tongue', tail: 'wagR', legs: THUMP, head: [0, 1] }, 120],
    [{ eye: 'happy', mouth: 'tongue', tail: 'wagL', head: [0, 1], bob: 1 }, 120],
    [{ eye: 'happy', mouth: 'tongue', tail: 'wagR', legs: THUMP, head: [0, 1] }, 120],
    [{ eye: 'happy', mouth: 'open', tail: 'up', extras: ['smallHeartA'] }, 300],
    [{ eye: 'happy', tail: 'wagL', extras: ['smallHeartB'] }, 300],
  ]),
  shake: anim([
    [{ ...SIT, tail: 'sitA' }, 220],
    [{ ...SIT, paw: 'wave1', tail: 'sitB' }, 420],
    [{ ...SIT, paw: 'wave1', head: [0, 1], eye: 'happy', tail: 'sitA' }, 260],
    [{ ...SIT, paw: 'wave2', eye: 'happy', mouth: 'open', tail: 'sitB' }, 220],
    [{ ...SIT, paw: 'wave1', head: [0, 1], eye: 'happy', tail: 'sitA' }, 260],
    [{ ...SIT, eye: 'happy', tail: 'sitB', extras: ['smallHeartA'] }, 400],
  ]),
  blep: anim([
    [{ mouth: 'flat' }, 160],
    [{ mouth: 'blep' }, 900],
    [{ eye: 'happy', mouth: 'blep', tail: 'wagL' }, 300],
    [{ eye: 'happy', tail: 'wagR' }, 300],
  ]),
  lick: anim([
    [{ head: [1, -1], eye: 'happy', mouth: 'open' }, 140],
    [{ head: [1, -1], eye: 'happy', mouth: 'tongue', tail: 'wagL' }, 160],
    [{ head: [1, 0], eye: 'happy', mouth: 'open' }, 140],
    [{ head: [1, -1], eye: 'happy', mouth: 'tongue', tail: 'wagR' }, 160],
    [{ head: [1, 0], eye: 'happy', mouth: 'open' }, 140],
    [{ eye: 'happy', tail: 'wagL', extras: ['smallHeartA'] }, 420],
  ]),
  nuzzle: nuzzleAnimation('stand'),
  nuzzleLie: nuzzleAnimation('lie'),
  tilt: anim([
    [{ head: [-1, 1], mouth: 'flat', extras: ['question'] }, 520],
    [{ mouth: 'flat', extras: ['question'] }, 140],
    [{ head: [1, 1], extras: ['question'] }, 520],
    [{ eye: 'happy', tail: 'wagL' }, 200],
    [{ eye: 'happy', tail: 'wagR' }, 200],
  ]),
  playBow: anim(
    Array.from({ length: 8 }, (_, i) => [
      { body: 'bow', eye: 'happy', mouth: 'open', tail: i % 2 ? 'highR' : 'highL', bob: i % 2 },
      110,
    ]),
  ),
  flop: anim([
    [{ bob: 1, eye: 'happy', mouth: 'open' }, 160],
    [{ body: 'lie', eye: 'happy', mouth: 'open', tail: 'sitA' }, 300],
    [{ body: 'lie', eye: 'happy', mouth: 'tongue', tail: 'sitB', bob: 1, extras: ['heartsA'] }, 450],
    [{ body: 'lie', eye: 'happy', mouth: 'tongue', tail: 'sitA', extras: ['heartsB'] }, 450],
  ]),
  highFive: anim([
    [{ ...SIT, tail: 'sitA' }, 150],
    [{ ...SIT, paw: 'wave2', eye: 'wide', mouth: 'open', tail: 'sitB' }, 260],
    [{ ...SIT, paw: 'wave2', eye: 'happy', mouth: 'open', tail: 'sitA', extras: ['sparkleA'] }, 380],
    [{ ...SIT, paw: 'wave2', eye: 'happy', tail: 'sitB', extras: ['sparkleB'] }, 380],
    [{ ...SIT, eye: 'happy', tail: 'sitA' }, 300],
  ]),
  twirl: anim([
    [{ bob: 1, eye: 'happy', mouth: 'open', tail: 'wagL' }, TWIRL_CROUCH_MS],
    [{ legs: TUCK, eye: 'happy', mouth: 'open', tail: 'wagR' }, TWIRL_AIR_MS],
    [{ bob: 1, eye: 'happy', tail: 'up', extras: ['sparkleA'] }, 200],
    [{ eye: 'happy', tail: 'wagL', extras: ['sparkleB'] }, 320],
  ]),
  startle: anim([
    [{ bob: 1, eye: 'wide', mouth: 'flat' }, STARTLE_CROUCH_MS],
    [{ legs: TUCK, eye: 'wide', mouth: 'open', tail: 'poof', extras: ['bang'] }, STARTLE_AIR_MS],
    [{ bob: 1, eye: 'wide', tail: 'poof' }, 180],
    [{ tail: 'poof', extras: ['question'] }, 520],
    [{ eye: 'happy', tail: 'wagL' }, 300],
  ]),
  tailPoof: anim([
    [{ tail: 'poof', eye: 'wide', mouth: 'flat' }, 420],
    [{ tail: 'poof', mouth: 'smile', extras: ['sparkleA'] }, 420],
    [{ tail: 'wagL', eye: 'happy' }, 180],
    [{ tail: 'wagR', eye: 'happy' }, 180],
    [{ tail: 'wagL', eye: 'happy' }, 180],
    [{ tail: 'wagR', eye: 'happy' }, 180],
  ]),
  peek: anim([
    [{ head: [0, 1], mouth: 'flat' }, 500],
    [{}, PEEK_LOOK_MS - 500],
    [{ head: [-1, 1], eye: 'closed', mouth: 'flat' }, PEEK_DUCK_MS],
    [{}, PEEK_RETURN_MS],
    [{ head: [1, 0], eye: 'happy', mouth: 'open', extras: ['sparkleB'] }, PEEK_HAPPY_MS],
  ]),
  // Flicks the ball onto its nose, sits up with a paw tucked like a seal and sways gently to keep it there.
  balance: anim([
    [{ ...SIT, ball: true, tail: 'sitA' }, 240],
    [{ ...SIT, head: [0, 1], ball: true, tail: 'sitB' }, 140],
    [{ ...SIT, ballAt: [7, -8], eye: 'up', mouth: 'open', snoutUp: 1, paw: 'beg', tail: 'sitA' }, 150],
    [{ ...SIT, ballAt: [7, -3.6], eye: 'up', snoutUp: 1, paw: 'beg', tail: 'sitB' }, 280],
    [{ ...SIT, head: [-1, 0], ballAt: [7.5, -3.6], eye: 'up', snoutUp: 1, paw: 'beg', tail: 'sitA' }, 260],
    [{ ...SIT, ballAt: [7, -3.6], eye: 'up', snoutUp: 1, paw: 'beg', tail: 'sitB' }, 220],
    [{ ...SIT, head: [1, 0], ballAt: [6.5, -3.6], eye: 'up', snoutUp: 1, paw: 'beg', tail: 'sitA' }, 260],
    [{ ...SIT, ballAt: [7, -3.6], eye: 'up', snoutUp: 1, paw: 'beg', tail: 'sitB' }, 220],
    [{ ...SIT, head: [-1, 0], ballAt: [7.5, -3.6], eye: 'up', snoutUp: 1, paw: 'beg', tail: 'sitA' }, 260],
    [{ ...SIT, ballAt: [7, -3.6], eye: 'up', snoutUp: 1, paw: 'beg', tail: 'sitB' }, 220],
    [{ ...SIT, head: [1, 0], ballAt: [6.5, -3.6], eye: 'up', snoutUp: 1, paw: 'beg', tail: 'sitA' }, 260],
    [{ ...SIT, ballAt: [7, -3.6], eye: 'up', snoutUp: 1, paw: 'beg', tail: 'sitB', extras: ['sparkleA'] }, 320],
    [{ ...SIT, ballAt: [7, -3.6], eye: 'up', snoutUp: 1, paw: 'beg', tail: 'sitA', extras: ['sparkleB'] }, 320],
    [{ ...SIT, head: [0, 1], ballAt: [7, -8], eye: 'up', mouth: 'open', tail: 'sitB' }, 160],
    [{ ...SIT, ballAt: [6, -2], eye: 'up', mouth: 'open', tail: 'sitA' }, 100],
    [{ ...SIT, head: [0, 1], ball: true, eye: 'happy', tail: 'sitB' }, 200],
    [{ ...SIT, ball: true, eye: 'happy', tail: 'sitA', extras: ['smallHeartA'] }, 450],
  ]),
  // Toss: flick the ball up (the world ball flies), watch it, catch it.
  tossFlick: anim([
    [{ ball: true, tail: 'wagL' }, 160],
    [{ head: [1, 1], ball: true, tail: 'wagR', bob: 1 }, TOSS_FLICK_MS - 160],
  ]),
  tossWait: anim([
    [{ eye: 'up', mouth: 'open', tail: 'wagL' }, 140],
    [{ eye: 'up', mouth: 'open', tail: 'wagR' }, 140],
  ]),
  tossCatch: anim([
    [{ head: [0, 1], ball: true, eye: 'happy', bob: 1 }, 160],
    [{ ball: true, eye: 'happy', tail: 'wagL', extras: ['sparkleA'] }, TOSS_CATCH_MS - 160],
  ]),
  // Drops the ball between its paws, nudges it back and forth with its nose, then snaps it up.
  pawPlay: anim([
    [{ body: 'bow', ball: true, eye: 'happy' }, 220],
    [{ body: 'lie', ballGround: 27.5, eye: 'down', tail: 'sitA' }, 300],
    [{ body: 'lie', head: [1, 1], ballGround: 28.5, eye: 'happy', mouth: 'open', tail: 'sitB' }, 200],
    [{ body: 'lie', head: [0, 1], ballGround: 26.5, eye: 'down', tail: 'sitA' }, 220],
    [{ body: 'lie', head: [1, 1], ballGround: 28.5, eye: 'happy', mouth: 'open', tail: 'sitB' }, 200],
    [{ body: 'lie', head: [0, 1], ballGround: 25.5, eye: 'down', tail: 'sitA' }, 240],
    [{ body: 'lie', head: [0, 1], ballGround: 25.5, eye: 'happy', tail: 'sitB', extras: ['smallHeartA'] }, 300],
    [{ body: 'lie', head: [1, 2], ballGround: 26.5, eye: 'closed', mouth: 'open', tail: 'sitA' }, 180],
    [{ body: 'lie', ball: true, eye: 'happy', tail: 'sitB' }, 300],
    [{ ball: true, eye: 'happy', tail: 'wagL' }, 260],
  ]),
  // Post-lunch dip: nods off sitting up, jerks awake, nods off again.
  doze: anim([
    [{ ...SIT, eye: 'sleepy', tail: 'sitA' }, 900],
    [{ ...SIT, eye: 'sleepy', head: [0, 1], tail: 'sitB' }, 700],
    [{ ...SIT, eye: 'closed', head: [0, 2], tail: 'sitA' }, 1100],
    [{ ...SIT, eye: 'wide', tail: 'sitB' }, 180],
    [{ ...SIT, eye: 'sleepy', tail: 'sitA' }, 900],
  ]),
  morning: anim([
    [{ body: 'bow', eye: 'closed', mouth: 'open' }, 600],
    [{ body: 'bow', eye: 'closed', mouth: 'open', head: [0, -1] }, 500],
    [{ eye: 'happy' }, 250],
    [{ ...SIT, eye: 'sleepy' }, 220],
    [{ ...SIT, eye: 'closed', mouth: 'open', head: [0, -1] }, 800],
    [{ ...SIT, eye: 'closed' }, MORNING_WAVE_MS - 2370],
    [{ ...SIT, paw: 'wave1', eye: 'happy', mouth: 'open', tail: 'sitA' }, 220],
    [{ ...SIT, paw: 'wave2', eye: 'happy', mouth: 'open', tail: 'sitB' }, 220],
    [{ ...SIT, paw: 'wave1', eye: 'happy', mouth: 'open', tail: 'sitA' }, 220],
    [{ ...SIT, paw: 'wave2', eye: 'happy', mouth: 'open', tail: 'sitB' }, 220],
    [{ ...SIT, eye: 'happy', tail: 'sitA' }, 500],
  ]),
  goodNight: anim([
    [{ ...SIT, eye: 'sleepy', tail: 'sitA' }, 300],
    [{ ...SIT, paw: 'wave1', eye: 'sleepy', tail: 'sitB' }, 260],
    [{ ...SIT, paw: 'wave2', eye: 'sleepy', tail: 'sitA' }, 260],
    [{ ...SIT, paw: 'wave1', eye: 'sleepy', tail: 'sitB' }, 260],
    [{ ...SIT, eye: 'closed', mouth: 'open', head: [0, -1], tail: 'sitA' }, 900],
    [{ ...SIT, eye: 'sleepy', tail: 'sitB' }, 500],
  ]),
  // Sits by the empty bowl with a rumbling tummy, nudges the bowl, then looks up at you.
  hungry: anim([
    [{ ...SIT, mouth: 'flat', tail: 'sitA', extras: ['rumbleA'] }, 450],
    [{ ...SIT, mouth: 'flat', tail: 'sitB', extras: ['rumbleB'] }, 450],
    [{ ...SIT, mouth: 'flat', tail: 'sitA' }, 1300],
    [{ body: 'bow', head: [1, 2], eye: 'down', mouth: 'flat' }, 300],
    [{ body: 'bow', head: [2, 3], eye: 'down', mouth: 'flat' }, 260],
    [{ body: 'bow', head: [1, 2], eye: 'down', mouth: 'flat' }, 260],
    [{ ...SIT, mouth: 'flat', tail: 'sitB' }, 1500],
  ]),
  hungrySad: anim([
    [{ ...SIT, ears: 'back', eye: 'down', mouth: 'flat', head: [0, 1], tail: 'sitA' }, 1300],
    [{ ...SIT, ears: 'back', eye: 'down', mouth: 'flat', head: [0, 1], tail: 'sitB', extras: ['rumbleA'] }, 1300],
  ]),
  // One kibble per loop.
  eatBowl: anim([
    [{ head: [1, 4], eye: 'closed', mouth: 'open', tail: 'wagL' }, 220],
    [{ head: [1, 5], eye: 'closed', mouth: 'flat', tail: 'wagR' }, 220],
    [{ head: [1, 3], eye: 'happy', mouth: 'open', tail: 'wagL' }, 230],
    [{ head: [1, 3], eye: 'happy', mouth: 'flat', tail: 'wagR' }, KIBBLE_MS - 670],
  ]),
  drink: anim([
    [{ head: [1, 5], eye: 'closed', mouth: 'tongue', tail: 'wagL' }, 170],
    [{ head: [1, 4], eye: 'closed', mouth: 'flat', tail: 'wagR' }, 170],
  ]),
  drowsy: anim([
    [{ ...SIT, eye: 'sleepy', tail: 'sitA' }, 1200],
    [{ ...SIT, eye: 'closed', mouth: 'open', head: [0, -1], tail: 'sitB' }, 900],
    [{ ...SIT, eye: 'sleepy', tail: 'sitA', bob: 1 }, 1500],
  ]),
  typingSleepy: anim([
    [{ ...SIT, paw: 'tapNear', eye: 'sleepy', mouth: 'flat' }, 320],
    [{ ...SIT, paw: 'tapFar', eye: 'sleepy', mouth: 'flat' }, 320],
  ]),
  // You ignored the break: it flops down and sighs.
  sigh: anim([
    [{ body: 'lie', eye: 'down', mouth: 'flat', tail: 'sitA' }, 900],
    [{ body: 'lie', eye: 'closed', mouth: 'flat', bob: 1, tail: 'sitA', extras: ['sniffB'] }, 700],
    [{ body: 'lie', eye: 'down', mouth: 'flat', tail: 'sitB' }, 1500],
  ]),
};

export type Emote = 'sun' | 'moon' | 'cup' | 'drop' | 'bowl';

const EMOTE_ICONS: Record<Emote, Glyph> = {
  sun: ['..x..', '.XXX.', 'xXXXx', '.XXX.', '..x..'],
  moon: ['.GG..', 'GGq..', 'GG...', 'GGq..', '.GG..'],
  cup: ['Q.Q..', '.Q.Q.', 'AAAA.', 'AAAaA', 'AAAA.', '.aa..'],
  drop: ['..U..', '.UUU.', 'UUwUU', 'UUUUU', '.UUU.'],
  bowl: ['.kkk.', 'AAAAA', '.aaa.'],
};

// A rounded speech bubble with a little tail at the bottom left, pointing down to the head.
function emoteBubble(icon: Glyph): Glyph {
  const w = icon[0].length + 4;
  const h = icon.length + 4;
  const rows: string[][] = Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => {
      const cornerX = x === 0 || x === w - 1;
      const cornerY = y === 0 || y === h - 1;
      if (cornerX && cornerY) {
        return TRANSPARENT;
      }
      return cornerX || cornerY ? 'Z' : 'W';
    }),
  );
  icon.forEach((line, y) => [...line].forEach((c, x) => c !== TRANSPARENT && (rows[y + 2][x + 2] = c)));
  const tail = Array.from({ length: w }, (_, x) => (x === 2 ? 'Z' : TRANSPARENT));
  return [...rows.map((r) => r.join('')), tail.join('')];
}

export const EMOTES: Record<Emote, Glyph> = {
  sun: emoteBubble(EMOTE_ICONS.sun),
  moon: emoteBubble(EMOTE_ICONS.moon),
  cup: emoteBubble(EMOTE_ICONS.cup),
  drop: emoteBubble(EMOTE_ICONS.drop),
  bowl: emoteBubble(EMOTE_ICONS.bowl),
};

export type Hat = 'party' | 'nightcap';

/** Hats are drawn over the head; `x`/`y` place the glyph's top-left relative to the head centre. */
export const HATS: Record<Hat, { glyph: Glyph; x: number; y: number }> = {
  party: { glyph: outlined(['..W..', '..L..', '.LSL.', '.SLS.', 'LSLSL']), x: -4, y: -12 },
  nightcap: {
    glyph: outlined(['WW......', 'WIi.....', '.IiIi...', '..IiIiII', '..IIIIII']),
    x: -8,
    y: -9,
  },
};

const BOWL_SHAPE = ['AAAAAAAAAA', '.aaaaaaaa.', '..AAAAAA..'];
// Kibble or water level, drawn as the top row of the bowl.
function bowlGlyph(fill: string, amount: number, capacity: number): Glyph {
  const slots = [1, 3, 5, 7, 2, 6, 4, 8].slice(0, Math.round((amount / capacity) * 8));
  const top = Array.from({ length: 10 }, (_, x) => (slots.includes(x) ? fill : TRANSPARENT)).join('');
  return outlined([top, ...BOWL_SHAPE.map((r) => (fill === 'w' ? r.replace(/A/g, 'U').replace(/a/g, 'u') : r))]);
}

export const BOWL_W = 12;
export const BOWL_H = 6;
export const BOWL_CAPACITY = 5;
/** Food bowl glyphs by kibble count left (0..BOWL_CAPACITY), then the water bowl by sips left. */
export const FOOD_BOWL: readonly Glyph[] = Array.from({ length: BOWL_CAPACITY + 1 }, (_, n) => bowlGlyph('k', n, BOWL_CAPACITY));
export const WATER_BOWL: readonly Glyph[] = Array.from({ length: 4 }, (_, n) => bowlGlyph('w', n, 3));

export const BASKET_W = 26;
export const BASKET_BACK: Glyph = [
  '..tttttttttttttttttttttt..',
  '.tTTTTTTTTTTTTTTTTTTTTTTt.',
  'tTCCCCCCCCCCCCCCCCCCCCCCTt',
  'tTCCCCCCCCCCCCCCCCCCCCCCTt',
];
export const BASKET_FRONT: Glyph = [
  'tTTTTTTTTTTTTTTTTTTTTTTTTt',
  'tThThThThThThThThThThThTTt',
  '.tTTTTTTTTTTTTTTTTTTTTTTt.',
  '..tttttttttttttttttttttt..',
];

export const CAKE: readonly Glyph[] = [
  outlined(['...H...', '...S...', '.LLLLL.', 'WWWWWWW', 'LLLLLLL', 'ccccccc']),
  outlined(['...S...', '...S...', '.LLLLL.', 'WWWWWWW', 'LLLLLLL', 'ccccccc']),
];

/** Emote and sky letters keep their colour whatever the light, the fox does not. */
export const UNTINTED = new Set(['X', 'x', 'G', 'q', 'J', 'Z', 'W', 'Q']);

export const BUG_FRAMES: readonly Glyph[] = [
  ['VV.VV', 'VVKVV', '.VKV.', '..K..'],
  ['.....', '.VKV.', 'VVKVV', '..K..'],
];

export const TREAT_GLYPH: Glyph = TREAT_STAGES[0];

// Seam rotated 45° clockwise per frame, so rolling right spins the right way.
export const BALL_FRAMES: readonly Glyph[] = [
  ['..KKK..', '.KBYYK.', 'KBgYBBK', 'KBBYBbK', 'KBBYbbK', '.KByyK.', '..KKK..'],
  ['..KKK..', '.KBBBK.', 'KBgBYYK', 'KBBYBbK', 'KBYBbbK', '.KYbbK.', '..KKK..'],
  ['..KKK..', '.KBBBK.', 'KBgBBBK', 'KYYYYyK', 'KYBBbyK', '.KBbbK.', '..KKK..'],
  ['..KKK..', '.KBBBK.', 'KYYBBBK', 'KBBYBbK', 'KBBBybK', '.KBbyK.', '..KKK..'],
  ['..KKK..', '.KYYBK.', 'KBgYBBK', 'KBBYBbK', 'KBBYbbK', '.KYybK.', '..KKK..'],
  ['..KKK..', '.KBBYK.', 'KBgBYBK', 'KBBYBbK', 'KYYBbbK', '.KBbbK.', '..KKK..'],
  ['..KKK..', '.KBBBK.', 'KYgBBYK', 'KYYYYyK', 'KBBBbbK', '.KBbbK.', '..KKK..'],
  ['..KKK..', '.KYBBK.', 'KBYBBBK', 'KBBYBbK', 'KBBByyK', '.KBbbK.', '..KKK..'],
];

export function totalDuration(animation: Animation): number {
  return animation.durations.reduce((sum, d) => sum + d, 0);
}

export type TouchZone = 'nose' | 'head' | 'back' | 'paw' | 'tail';

/** Which part of the fox is under sprite pixel (x, y), in unflipped sprite coordinates. */
export function touchZone(frame: Frame, x: number, y: number): TouchZone | undefined {
  const px = Math.floor(x);
  const py = Math.floor(y);
  const near = (match: (c: string) => boolean): boolean =>
    [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => match(frame.pixels[py + dy]?.[px + dx] ?? TRANSPARENT));
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
