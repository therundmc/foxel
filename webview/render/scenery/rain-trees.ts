import { px } from './paint';

// How the trees of the grove are drawn: a Japanese maple with its foliage in tiers of flat clouds, a tall
// ginkgo, a dark cedar. Each is drawn once, in several lights at the same time so the pictures match exactly.

/** Three tones of one colour: in shade, plain, and in the light. */
export type Tones = readonly [shade: string, body: string, light: string];
export type Kind = 'maple' | 'ginkgo' | 'cedar';

export interface Tree {
  readonly kind: Kind;
  /** Column and row of the foot of its trunk, its height, and half the width of its crown. */
  readonly x: number;
  readonly foot: number;
  readonly tall: number;
  readonly spread: number;
  /** The side its trunk bends to. */
  readonly lean: 1 | -1;
  readonly seed: number;
}

/** What a tree is painted with. Colours come in lists: one for each picture drawn at once. */
export interface Brush {
  readonly inks: readonly CanvasRenderingContext2D[];
  readonly leaves: readonly Tones[];
  readonly bark: readonly Tones[];
  /** The side the light comes from, and the width of the trunk at its foot. */
  readonly light: 1 | -1;
  readonly thick: number;
  /** Told of a few leaves that could shiver: where, and the tone they flick to. */
  readonly shiver?: (x: number, y: number, tone: number) => void;
}

const speck = (x: number, y: number): number => {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

// A cloud of leaves: rounded above, flatter under, its edge ragged, lit from above on the side of the light.
function pad(brush: Brush, cx: number, cy: number, rx: number, ry: number, seed: number): void {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry; y++) {
    for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const u = (x + 0.5 - cx) / rx;
      const v = ((y + 0.5 - cy) / ry) * (y > cy ? 1.5 : 1);
      if (u * u + v * v + (speck(x + seed, y) - 0.5) * 0.5 >= 1) {
        continue;
      }
      const lit = v - 0.45 * brush.light * u + (speck(x, y + seed) - 0.5) * 0.5;
      const tone = lit < -0.3 ? 2 : lit > 0.5 ? 0 : 1;
      brush.inks.forEach((ink, k) => px(ink, x, y, brush.leaves[k][tone]));
      if (tone > 0 && speck(x + 3, y + 5) < 0.02) {
        brush.shiver?.(x, y, tone - 1);
      }
    }
  }
}

// A straight limb, `wide` pixels at its start and one at its end.
function limb(brush: Brush, x0: number, y0: number, x1: number, y1: number, wide: number): void {
  const steps = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    const thick = p < 0.35 ? wide : 1;
    brush.inks.forEach((ink, k) => px(ink, x0 + (x1 - x0) * p, y0 + (y1 - y0) * p, brush.bark[k][1], 1, thick, 1));
  }
}

// The trunk from its foot up to row `top`, bending by `bend` pixels on the way; returns the column it ends at.
function trunk(brush: Brush, x: number, foot: number, top: number, bend: number): number {
  for (let y = foot; y >= top; y--) {
    const p = (foot - y) / Math.max(1, foot - top);
    const wide = brush.thick + (p < 0.12 ? 1 : p > 0.7 ? -1 : 0);
    const left = Math.round(x + bend * p ** 1.6 - wide / 2);
    brush.inks.forEach((ink, k) => {
      px(ink, left, y, brush.bark[k][1], 1, Math.max(1, wide), 1);
      if (wide >= 3) {
        px(ink, brush.light > 0 ? left + wide - 1 : left, y, brush.bark[k][2]);
      }
    });
  }
  return x + bend;
}

/** The clouds of a maple, the top one first: [how far aside, as a share of its spread; how high and how wide]. */
const MAPLE = [[0.02, 0.88, 0.5], [0.32, 0.74, 0.46], [-0.26, 0.7, 0.5], [0.6, 0.56, 0.42], [-0.58, 0.52, 0.46]] as const;
/** A ginkgo holds its leaves close to its trunk, in a tall flame. */
const GINKGO = [[0, 0.92, 0.5], [-0.12, 0.77, 0.85], [0.14, 0.61, 1], [-0.04, 0.46, 0.8]] as const;

function leafy(brush: Brush, tree: Tree, pads: readonly (readonly [number, number, number])[], forkAt: number, bend: number): void {
  const { x, foot, tall, spread, lean, seed } = tree;
  const fork = foot - Math.round(tall * forkAt);
  const from = trunk(brush, x, foot, fork, lean * tall * bend);
  const thick = (tall * 0.085) * (pads === GINKGO ? 1.25 : 1);
  const clouds = pads.map(([aside, up, wide], i) => ({
    x: from + lean * aside * spread + (speck(seed, i) - 0.5) * spread * 0.14,
    y: foot - up * tall + (speck(seed + 1, i) - 0.5) * tall * 0.04,
    rx: Math.max(2, wide * spread),
    ry: Math.max(2, thick),
  }));
  clouds.forEach((cloud) => limb(brush, from, fork, cloud.x, cloud.y, brush.thick - 1));
  clouds.forEach((cloud, i) => pad(brush, cloud.x, cloud.y, cloud.rx, cloud.ry, seed + i * 17));
}

// A cedar: a straight trunk and short boughs in tiers, narrowing to a point.
function cedar(brush: Brush, { x, foot, tall, spread, seed }: Tree): void {
  const step = Math.max(3, Math.round(tall * 0.085));
  const from = foot - Math.round(tall * 0.24);
  const tiers = Math.max(3, Math.round((tall * 0.74) / step));
  trunk(brush, x, foot, from, 0);
  for (let k = 0; k <= tiers; k++) {
    pad(brush, x, from - k * step, spread * (1 - k / (tiers + 0.6)) + 1.5, step * 0.85, seed + k * 13);
  }
}

export function drawTree(brush: Brush, tree: Tree): void {
  if (tree.kind === 'cedar') {
    cedar(brush, tree);
  } else if (tree.kind === 'ginkgo') {
    leafy(brush, tree, GINKGO, 0.36, 0.02);
  } else {
    leafy(brush, tree, MAPLE, 0.4, 0.08);
  }
}

/** A soft mass of far foliage, with no tree to be told in it. */
export function drawMass(brush: Brush, x: number, y: number, rx: number, ry: number, seed: number): void {
  pad(brush, x, y, rx, ry, seed);
}
