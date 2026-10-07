import type { Pond } from './fireflies-pond';
import { seeded, type VistaView } from './paint';

// The reeds: dark stands of them at both sides of the pond, bulrushes among their leaves, and in the two bottom
// corners a few tall grasses seen from very close. They are rooted and only bend, the tip more than the foot.

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));

/** The stands across the water are softened by the night air; their heads are the darkest thing on the pond. */
const REED = '#06171e';
const HEAD = '#1a1512';
/** The grasses in the corners: nearly black, with the side the moon touches. */
const CLOSE = '#030c14';
const CLOSE_LIT = '#164043';

interface Reed {
  readonly x: number;
  readonly foot: number;
  readonly tall: number;
  /** How far its tip stands aside of its foot when the air is still. */
  readonly bend: number;
  /** How many rows its bulrush head takes, or 0 for a leaf. */
  readonly head: number;
}

/** How far the air pushes a tip at `x` right now: a slow breath, never a gust. */
const push = (t: number, x: number): number => 0.8 * Math.sin(t * 0.5 + x * 0.05) + 0.5 * Math.sin(t * 0.23 - x * 0.11);

/** Where the row `k` of a stalk stands aside of its foot: it leans with the square of the height. */
const aside = (lean: number, k: number, tall: number): number => Math.round(lean * (k / tall) ** 2);

// One stalk from row `from` up to row `to`, as a few upright strokes rather than a pixel per row.
function stalk(ctx: CanvasRenderingContext2D, x: number, foot: number, tall: number, lean: number, from: number, to: number, wide: number): void {
  let start = from;
  let at = aside(lean, from, tall);
  for (let k = from + 1; k <= to; k++) {
    const next = k === to ? NaN : aside(lean, k, tall);
    if (next !== at) {
      ctx.fillRect(x + at, foot - k + 1, wide, k - start);
      start = k;
      at = next;
    }
  }
}

function stand({ w, h }: VistaView, pond: Pond): Reed[] {
  const deep = pond.foot - pond.shore;
  const zone = clamp(Math.round(w * 0.17), 9, 58);
  const highest = clamp(deep * 1.2, 14, 66);
  const random = seeded(0x4eed);
  const reeds: Reed[] = [];
  for (const side of [0, 1]) {
    const edge = (out: number): number => Math.round(side ? w - 1 - out : out);
    // A few bulrushes, well apart and taller toward the edge of the view, standing nearly straight.
    const heads = clamp(Math.round(zone / 13), 1, 4);
    for (let i = 0; i < heads; i++) {
      const out = (zone * 0.8 * (i + 0.25 + 0.5 * random())) / heads;
      const tall = Math.round(highest * (1 - 0.5 * (out / zone)) * (0.75 + 0.25 * random()));
      reeds.push({ x: edge(out), foot: h - 1, tall, bend: (random() - 0.5) * 2, head: tall > 12 ? clamp(Math.round(tall * 0.17), 4, 6) : 0 });
    }
    // Among them their long leaves, fanning a little, thinning toward the open water.
    const leaves = clamp(Math.round(zone / 4.5), 2, 11);
    for (let i = 0; i < leaves; i++) {
      const out = zone * random() ** 1.5;
      const tall = Math.round(highest * (0.35 + 0.5 * random()) * (1 - 0.4 * (out / zone)));
      reeds.push({ x: edge(out), foot: h - 1 - Math.round(random() ** 3 * deep * 0.3), tall, bend: (random() - 0.5) * tall * 0.3, head: 0 });
    }
  }
  return reeds;
}

let stood: { key: string; reeds: Reed[] } | undefined;

/** The stands of reeds at both sides of the pond, for the back layer. */
export function paintReeds(view: VistaView, pond: Pond): void {
  const { ctx, w, h, t } = view;
  const key = `${w}:${h}`;
  if (stood?.key !== key) {
    stood = { key, reeds: stand(view, pond) };
  }
  const { reeds } = stood;
  const lean = (reed: Reed): number => reed.bend + push(t, reed.x) * (reed.tall / 28);
  ctx.fillStyle = REED;
  for (const reed of reeds) {
    stalk(ctx, reed.x, reed.foot, reed.tall, lean(reed), 0, reed.tall, 1);
  }
  // A bulrush: its brown head under a bare tip.
  ctx.fillStyle = HEAD;
  for (const reed of reeds) {
    if (reed.head) {
      const top = reed.tall - 3;
      ctx.fillRect(reed.x + aside(lean(reed), top, reed.tall) - 1, reed.foot - top, 3, reed.head);
    }
  }
}

/** One corner's grasses, as [how far from the edge, height, bend toward the middle of the view, head rows], in shares of the tallest. */
const CORNER = [
  [0.05, 0.62, 0.34, 0],
  [0.2, 1, 0.1, 7],
  [0.36, 0.8, 0.5, 0],
  [0.5, 0.5, -0.22, 0],
  [0.68, 0.7, 0.05, 5],
  [0.86, 0.42, 0.4, 0],
  [1, 0.3, -0.3, 0],
] as const;
/** The fox needs this much room beside it for a corner to be planted. */
const FOX_ROOM = 24;

/** A few tall grasses and a bulrush or two in each bottom corner, for the front layer; none where the fox sits. */
export function paintCloseGrass({ ctx, w, h, t, foxX, dir }: VistaView): void {
  const reach = clamp(Math.round(w * 0.085), 7, 30);
  const highest = clamp(Math.round(h * 0.44), 9, 36);
  for (const side of [0, 1]) {
    if (side ? foxX > w - reach - FOX_ROOM : foxX < reach + FOX_ROOM) {
      continue;
    }
    const inward = side ? -1 : 1;
    CORNER.forEach(([out, share, bent, head], i) => {
      const x = side ? w - 2 - Math.round(out * reach) : Math.round(out * reach);
      const tall = Math.max(4, Math.round(highest * share));
      const lean = inward * bent * tall + push(t, x + i * 9) * (tall / 22);
      const thick = Math.round(tall * 0.55);
      ctx.fillStyle = CLOSE;
      stalk(ctx, x, h - 1, tall, lean, 0, thick, 2);
      stalk(ctx, x + (lean > 0 ? 1 : 0), h - 1, tall, lean, thick, tall, 1);
      if (head && tall > 12) {
        const top = tall - 3;
        ctx.fillRect(x + aside(lean, top, tall) - 1 + (lean > 0 ? 1 : 0), h - 1 - top, 3, head);
      }
      // The moon is on the side the fox looks to: it rims the thick foot of each blade.
      ctx.fillStyle = CLOSE_LIT;
      stalk(ctx, x + (dir > 0 ? 1 : 0), h - 1, tall, lean, 0, thick, 1);
    });
  }
}
