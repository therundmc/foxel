import { breezeAt, clamp, gustOf, hash } from './blossom-wind';
import { clamp01, prerender, type VistaView } from './paint';

// The cherry trees we stand under: all we see of them is boughs in full bloom in the two upper corners, right in
// front of us, running out of the frame. Dark slender crooked wood carrying clouds of blossom whose petals are big,
// because they are so close. Each corner is two sprays, painted once: one reaching in, which bobs, and one hanging,
// which swings. They only shiver in the breeze, and toss when the breath of wind goes through them.

/** Blossom in shade, plain and in the light: in front, and deeper inside the bough. */
type Tones = readonly [shade: string, body: string, light: string];
const BLOSSOM: Tones = ['#eba9c0', '#f9d4dd', '#fff7f6'];
const INSIDE: Tones = ['#d28ba8', '#e5a6be', '#f3c4d2'];
const BARK = '#3b2a34';
const BARK_LIT = '#6b4d58';
/** How ragged the edge of a cloud of blossom is: loose petals all round it. */
const RAGGED = 0.6;

/** A limb: how thick it starts, in boughs, then the points it goes through from the corner inward: aside, down, aside, down... */
type Limb = readonly number[];
/** A cloud of blossom: where (aside, down), how wide and deep, in boughs. */
type Puff = readonly [aside: number, down: number, wide: number, deep: number];
/** A spray: its wood, which carries blossom all along, and the mass of blossom deep in the corner behind it. */
interface Spray {
  readonly limbs: readonly Limb[];
  readonly depths: readonly Puff[];
}
/** The bough on the side the wind comes from, the greater one: what reaches in, and what hangs. */
const GREAT: readonly [Spray, Spray] = [
  {
    limbs: [
      [0.075, -0.1, 0.62, 0.3, 0.54, 0.7, 0.4, 1.1, 0.43, 1.5, 0.33, 1.95, 0.42],
      [0.045, 0.7, 0.4, 0.95, 0.22, 1.3, 0.14],
      [0.045, 1.1, 0.43, 1.3, 0.6, 1.4, 0.82],
      [0.06, -0.1, 0.1, 0.45, 0.04, 0.9, -0.02, 1.3, 0.0],
    ],
    depths: [[0.2, 0.25, 0.5, 0.4]],
  },
  {
    limbs: [
      [0.06, 0.25, -0.1, 0.4, 0.3, 0.32, 0.66, 0.46, 1.0, 0.42, 1.28],
      [0.045, -0.1, 0.78, 0.1, 0.92, 0.14, 1.12],
    ],
    depths: [],
  },
];
/** The one on the side the fox looks to, smaller, so the view stays open there. */
const LESSER: readonly [Spray, Spray] = [
  {
    limbs: [
      [0.075, -0.1, 0.34, 0.4, 0.38, 0.8, 0.27, 1.15, 0.34, 1.45, 0.3],
      [0.045, 0.8, 0.27, 0.95, 0.5, 1.0, 0.72],
      [0.06, -0.1, 0.06, 0.5, 0.0, 0.95, -0.04],
    ],
    depths: [[0.15, 0.15, 0.4, 0.3]],
  },
  { limbs: [[0.06, 0.1, 0.3, 0.2, 0.62, 0.12, 0.95]], depths: [] },
];
const LESSER_SIZE = 0.8;
/** How far a spray goes, in boughs, and the room kept round its picture for it to move in. */
const SPAN = [2.25, 1.55] as const;
const MARGIN = 6;
/** A spray is moved in strips this wide; how far along it starts to give, and over what length. */
const STRIP = 3;
const GIVES = [0.35, 1.3] as const;
/** Blossom along a limb, in boughs: how far apart its clouds are, how big at the foot of the limb and at its tip, and how flat. */
const EVERY = 0.17;
const CLOUD = [0.24, 0.12] as const;
const FLAT = 0.62;
/** A twig is thinner than this, and carries smaller clouds; now and then one is missing and the wood shows. */
const TWIG = 0.05;
const BARE = 0.12;
/** How many of the places along a limb have a small cloud passing in front of the wood. */
const OVER = 0.4;
/** Deep in the bough the blossom stops this far along a limb: its end is slender. */
const DEEP_UNTIL = 0.62;

// A cloud of blossom: rounded above, flatter under, white where the light falls and deeper pink below.
function puff(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, tones: Tones, light: number, grain: number, seed: number): void {
  for (let ly = Math.floor((cy - ry) / grain) - 1; ly * grain <= cy + ry; ly++) {
    for (let lx = Math.floor((cx - rx) / grain) - 1; lx * grain <= cx + rx; lx++) {
      const u = ((lx + 0.5) * grain - cx) / rx;
      const v = (((ly + 0.5) * grain - cy) / ry) * ((ly + 0.5) * grain > cy ? 1.3 : 1);
      if (u * u + v * v + (hash(lx + seed, ly) - 0.5) * RAGGED >= 1) {
        continue;
      }
      const lit = v - 0.4 * light * u + (hash(lx, ly + seed) - 0.5) * 0.45;
      ctx.fillStyle = tones[lit < -0.05 ? 2 : lit > 0.6 ? 0 : 1];
      ctx.fillRect(lx * grain, ly * grain, grain, grain);
    }
  }
}

// A limb, thinning to a single pixel at its tip, a little crooked at every point it goes through.
function limb(ctx: CanvasRenderingContext2D, [wide, ...points]: Limb, size: number, place: (aside: number, down: number) => [number, number]): void {
  const joints = points.length / 2 - 1;
  for (let j = 0; j < joints; j++) {
    const [x0, y0] = place(points[j * 2] * size, points[j * 2 + 1] * size);
    const [x1, y1] = place(points[j * 2 + 2] * size, points[j * 2 + 3] * size);
    const steps = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= steps; i++) {
      const thick = Math.max(1, Math.round(wide * size * (1 - (j + i / steps) / joints)));
      const x = Math.round(x0 + ((x1 - x0) * i) / steps - thick / 2);
      const y = Math.round(y0 + ((y1 - y0) * i) / steps - thick / 2);
      ctx.fillStyle = BARK;
      ctx.fillRect(x, y, thick, thick);
      if (thick > 2) {
        ctx.fillStyle = BARK_LIT;
        ctx.fillRect(x, y, thick, 1);
      }
    }
  }
}

/** Where blossom is on a limb: deep in the bough, hanging under the wood in shade; sitting on it in the light; or a few small clouds passing in front of it. */
type Depth = 'deep' | 'on' | 'over';
const DEPTHS: Record<Depth, { readonly big: number; readonly down: number; readonly tones: Tones }> = {
  deep: { big: 1.2, down: 0.6, tones: INSIDE },
  on: { big: 1, down: -0.7, tones: BLOSSOM },
  over: { big: 0.65, down: 0.1, tones: BLOSSOM },
};

// The blossom a limb carries: clouds of it strung all along, smaller toward the tip, which stays bare.
function blossomAlong(ctx: CanvasRenderingContext2D, [wide, ...points]: Limb, size: number, place: (aside: number, down: number) => [number, number], depth: Depth, light: number, grain: number, seed: number): void {
  const joints = points.length / 2 - 1;
  const { big, down, tones } = DEPTHS[depth];
  let n = 0;
  for (let j = 0; j < joints; j++) {
    const long = Math.hypot(points[j * 2 + 2] - points[j * 2], points[j * 2 + 3] - points[j * 2 + 1]);
    const places = Math.max(1, Math.round(long / EVERY));
    for (let i = 0; i < places; i++, n++) {
      const p = (i + 1) / places;
      const along = (j + p) / joints;
      // The tip of every limb ends in a cloud of its own: no bare wood sticks out.
      const tip = j === joints - 1 && i === places - 1;
      if (depth === 'deep' ? along > DEEP_UNTIL : depth === 'on' ? tip || hash(n, seed) < BARE : !tip && hash(n, seed) > OVER) {
        continue;
      }
      // Never smaller than a few petals, or it is no cloud at all.
      const r = Math.max(grain * 1.8, size * (CLOUD[0] + (CLOUD[1] - CLOUD[0]) * along) * (wide < TWIG ? 0.72 : 1) * (0.8 + 0.4 * hash(n, seed + 1)) * big);
      const [x, y] = place(
        (points[j * 2] + (points[j * 2 + 2] - points[j * 2]) * p) * size + (hash(n, seed + 2) - 0.5) * r * 0.5,
        (points[j * 2 + 1] + (points[j * 2 + 3] - points[j * 2 + 1]) * p) * size + down * r * FLAT,
      );
      puff(ctx, x, y, r, r * FLAT, tones, light, grain, seed + n * 17);
    }
  }
}

interface Bough {
  /** The corner it grows from: -1 the left one, 1 the right one; its size, in pixels. */
  readonly side: 1 | -1;
  readonly size: number;
  /** Its two sprays and where their pictures go. */
  readonly reaching: HTMLCanvasElement;
  readonly hanging: HTMLCanvasElement;
  readonly x: number;
}

export interface Boughs {
  readonly key: string;
  /** The size of the greater one: the measure of everything that falls from them. */
  readonly size: number;
  readonly both: readonly [Bough, Bough];
}

function grow(view: VistaView, side: 1 | -1, sprays: readonly [Spray, Spray], size: number, grain: number): Bough {
  const wide = Math.ceil(SPAN[0] * size) + MARGIN * 2;
  const tall = Math.ceil(SPAN[1] * size) + MARGIN * 2;
  const place = (aside: number, down: number): [number, number] => [side < 0 ? MARGIN + aside : wide - MARGIN - aside, MARGIN + down];
  const [reaching, hanging] = sprays.map((spray, s) =>
    prerender(wide, tall, (ctx) => {
      const seed = side * 31 + s * 57;
      spray.depths.forEach(([aside, down, across, deep], i) => {
        const [x, y] = place(aside * size, down * size);
        puff(ctx, x, y, across * size, deep * size, INSIDE, view.dir, grain, seed + i);
      });
      // The wood runs through the blossom, dark and whole, and only a few small clouds pass in front of it.
      (['deep', 'on'] as const).forEach((depth, d) => spray.limbs.forEach((points, i) => blossomAlong(ctx, points, size, place, depth, view.dir, grain, seed + i * 7 + d * 3)));
      spray.limbs.forEach((points) => limb(ctx, points, size, place));
      spray.limbs.forEach((points, i) => blossomAlong(ctx, points, size, place, 'over', view.dir, grain, seed + i * 7 + 5));
    }),
  );
  return { side, size, reaching, hanging, x: side < 0 ? -MARGIN : view.w - wide + MARGIN };
}

let grown: Boughs | undefined;

/** The boughs of this view, painted the first time they are asked for. */
export function boughsOf(view: VistaView): Boughs {
  const { w, h, dir } = view;
  const key = `${w}:${h}:${dir}`;
  if (grown?.key !== key) {
    const size = Math.round(Math.min(clamp(h * 0.5, 12, 70), w * 0.24));
    const grain = size >= 50 ? 3 : 2;
    const great: 1 | -1 = dir > 0 ? -1 : 1;
    grown = { key, size, both: [grow(view, great, GREAT, size, grain), grow(view, dir, LESSER, Math.round(size * LESSER_SIZE), grain)] };
  }
  return grown;
}

// One spray, bent: each strip of it is moved a little farther than the one before, from where it starts to give
// to its tip, so the wood bends and never slides. `upright` strips are columns, moved up and down.
function bend(ctx: CanvasRenderingContext2D, image: HTMLCanvasElement, bough: Bough, upright: boolean, tip: number): void {
  const long = upright ? image.width : image.height;
  let from = 0;
  let moved = 0;
  for (let at = 0; at < long + STRIP; at += STRIP) {
    const end = Math.min(at, long);
    // How far along the spray this strip is, from the corner it grows from.
    const along = ((upright && bough.side > 0 ? long - at : at) - MARGIN) / bough.size;
    const now = at >= long ? NaN : Math.round(tip * clamp01((along - GIVES[0]) / GIVES[1]) ** 1.4);
    if (now !== moved && end > from) {
      if (upright) {
        ctx.drawImage(image, from, 0, end - from, image.height, bough.x + from, moved - MARGIN, end - from, image.height);
      } else {
        ctx.drawImage(image, 0, from, image.width, end - from, bough.x + moved, from - MARGIN, image.width, end - from);
      }
      from = end;
    }
    moved = now;
  }
}

/** How far, in pixels, the tip of a spray strays in the breeze, and how far the breath of wind throws it. */
const SHIVERS = 1.3;
const TOSSES = 3.4;

/** The boughs in the two upper corners, shivering in the breeze and tossing in the breath of wind. */
export function paintBoughs(view: VistaView): void {
  const { ctx, t, dir } = view;
  const breeze = 0.5 + breezeAt(t);
  const gust = gustOf(view);
  boughsOf(view).both.forEach((bough) => {
    const reach = clamp(bough.size / 30, 0.7, 1.6);
    const phase = bough.side * 1.7;
    // The hanging spray is pushed the way the wind goes and swings back; the reaching one bobs.
    const swing = reach * (breeze * SHIVERS * (0.3 * dir + 0.7 * Math.sin(t * 0.8 + phase) + 0.3 * Math.sin(t * 2.1)) + gust * TOSSES * dir * (1 + 0.5 * Math.sin(t * 6.3 + phase)));
    const bob = reach * (breeze * SHIVERS * (0.7 * Math.sin(t * 1.05 - phase) + 0.4 * Math.sin(t * 2.6 + phase)) + gust * TOSSES * 0.8 * Math.sin(t * 7.5 + phase));
    bend(ctx, bough.hanging, bough, false, swing);
    bend(ctx, bough.reaching, bough, true, bob);
  });
}
