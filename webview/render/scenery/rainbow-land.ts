import { mix, prerender, px, seeded, type VistaView } from './paint';
import { hash, type Plan } from './rainbow-plan';

// The green land under the shower, painted once per view in two lights: grey while it rains, and in the warm sun
// after. Far hills misted blue-green; nearer ones in fresh grass with round trees on their backs and a little house
// with a red roof under the rainbow's far foot; a meadow running down to us with hedges and a few flowers.
// Only the smoke from the chimney moves.

/** Each tone in the grey of the shower, then in the sun. */
type Lit = readonly [string, string];
const FAR: Lit = ['#7d97a6', '#8db7b0'];
const FAR_RIM: Lit = ['#93aab6', '#bfe0c4'];
const HILL: Lit = ['#5f8d63', '#7dc05f'];
const HILL_RIM: Lit = ['#7aa375', '#b9e683'];
/** The meadow in three bands, from the hills down to us, and its hedges with their lit tops. */
const MEADOW: readonly Lit[] = [['#5a8761', '#86c560'], ['#517c58', '#76b354'], ['#47704f', '#68a34c']];
const HEDGE: Lit = ['#3c624c', '#3f7a48'];
const HEDGE_LIT: Lit = ['#4f775c', '#5ea04e'];
const FLOWERS: readonly Lit[] = [['#c8c4cc', '#fff6f0'], ['#c4a8b4', '#ffc4d6'], ['#c8c2a0', '#fff0a0']];
/** The cottage and its tree, by letter, as in the sprites. */
const COTTAGE_TONES: Readonly<Record<string, Lit>> = {
  R: ['#b07272', '#ee7462'],
  r: ['#8a5860', '#c4545a'],
  W: ['#d6d0c8', '#fff3de'],
  w: ['#b2aaa8', '#ecd0ae'],
  g: ['#e6d8a8', '#ffe79a'],
  d: ['#6a5656', '#8a5a44'],
  c: ['#8a7a80', '#a8786a'],
  T: ['#3e6450', '#3f7c4a'],
  L: ['#55806a', '#69ab58'],
  k: ['#5a4c48', '#7a5638'],
};
const COTTAGE = ['...R...', '..RRRc.', '.RRRRR.', 'rrrrrrr', '.WWWWw.', '.WgWdw.', '.WWWdw.'];
const TREE = ['.TLT.', 'TLLTT', 'TTTTT', '.TTT.', '..k..', '..k..'];
/** The same, for a view tall enough to show them closer. */
const COTTAGE_BIG = [
  '.......c...',
  '.....R.c...',
  '....RRRc...',
  '...RRRRR...',
  '..RRRRRRR..',
  '.rrrrrrrrr.',
  '..WWWWWWw..',
  '..WggWWdw..',
  '..WggWWdw..',
  '..WWWWWdw..',
];
const TREE_BIG = ['..TLT..', '.TLLLT.', 'TTLLTTT', 'TTTTTTT', '.TTTTT.', '..TkT..', '...k...', '...k...'];
/** From this height on, the cottage and its tree are drawn bigger. */
const BIG_VIEW = 80;
/** Where the chimney is from the middle of the house, in both sizes. */
const CHIMNEY = 2;
/** The bank of the pond: a darker lip on its far side, grass a little lighter on its near side. */
const BANK: Lit = ['#3f6a4c', '#4c8a4a'];
const BANK_NEAR: Lit = ['#6a946a', '#9cd472'];
const SMOKE = '#f4f2f0';

export interface Land {
  readonly key: string;
  /** The far hills and the near land, each in the grey and in the sun. */
  readonly far: readonly [HTMLCanvasElement, HTMLCanvasElement];
  readonly near: readonly [HTMLCanvasElement, HTMLCanvasElement];
}

let kept: Land | undefined;

/** A small picture drawn from rows of letters, its bottom middle at (x, y). */
function glyph(ctx: CanvasRenderingContext2D, rows: readonly string[], x: number, y: number, light: 0 | 1, flip = false): void {
  const wide = rows[0].length;
  rows.forEach((row, r) => {
    for (let c = 0; c < wide; c++) {
      const letter = row[flip ? wide - 1 - c : c];
      const tone = COTTAGE_TONES[letter];
      if (tone) {
        ctx.fillStyle = tone[light];
        ctx.fillRect(x - (wide >> 1) + c, y - rows.length + r, 1, 1);
      }
    }
  });
}

function paintFar(ctx: CanvasRenderingContext2D, plan: Plan, w: number, light: 0 | 1): void {
  for (let x = 0; x < w; x++) {
    const top = plan.far[x];
    ctx.fillStyle = FAR[light];
    ctx.fillRect(x, top, 1, plan.near[x] + 2 - top);
    ctx.fillStyle = FAR_RIM[light];
    ctx.fillRect(x, top, 1, 1);
  }
}

function paintNear(ctx: CanvasRenderingContext2D, view: VistaView, plan: Plan, light: 0 | 1): void {
  const { w, h, dir } = view;
  const random = seeded(0x6a7d);
  for (let x = 0; x < w; x++) {
    const top = plan.near[x];
    const deep = h - top;
    // The bands of the meadow meet in a stepped, dithered line, never a straight cut.
    let y = top;
    MEADOW.forEach((tone, band) => {
      const until = band === MEADOW.length - 1 ? h : top + Math.round(deep * (band + 1) * 0.3) + (hash(x, band) < 0.5 ? 0 : 1);
      ctx.fillStyle = tone[light];
      ctx.fillRect(x, y, 1, until - y);
      if (band > 0 && x % 2 === 0) {
        ctx.fillRect(x, y - 1, 1, 1);
      }
      y = until;
    });
    ctx.fillStyle = HILL[light];
    ctx.fillRect(x, top, 1, 2);
    ctx.fillStyle = HILL_RIM[light];
    ctx.fillRect(x, top, 1, 1);
  }
  const { pond, cottage } = plan;
  const clearOf = (x: number, y: number, room: number): boolean =>
    Math.abs(x - cottage.x) > room + 6 &&
    !(y >= pond.y - 3 && y <= pond.y + pond.tall + 1 && Math.abs(x - pond.x) <= pond.rows[pond.tall >> 1][1] / 2 + room + 2) &&
    Math.abs(x - view.foxX) > room + 12;
  // Hedges across the meadow: long dark lines with lit tops, with gaps, following the lie of the land.
  const lines = Math.max(1, Math.round((h - plan.horizon) / 16));
  for (let line = 0; line < lines; line++) {
    for (let x = Math.floor(random() * 12); x < w; ) {
      const run = 6 + Math.floor(random() * 16);
      for (let k = 0; k < run && x < w; k++, x++) {
        const y = plan.near[x] + Math.round((h - plan.near[x]) * (0.3 + 0.28 * line) + 1.5 * Math.sin(x * 0.06 + line * 2));
        if (clearOf(x, y, 1) && y < h - 6) {
          const bump = (k + line) % 4 === 1 && k > 0 && k < run - 1;
          ctx.fillStyle = HEDGE_LIT[light];
          ctx.fillRect(x, y - (bump ? 1 : 0), 1, 1);
          ctx.fillStyle = HEDGE[light];
          ctx.fillRect(x, y + 1, 1, 1);
        }
      }
      x += 8 + Math.floor(random() * 26);
    }
  }
  // Round trees on the backs of the hills, alone or in twos.
  for (let x = Math.floor(random() * 30); x < w; x += 18 + Math.floor(random() * 40)) {
    const y = plan.near[x] + 1;
    if (clearOf(x, y, 3)) {
      glyph(ctx, TREE.slice(1), x, y, light);
      if (random() < 0.4 && clearOf(x + 4, y, 3)) {
        glyph(ctx, TREE.slice(2), x + 4, plan.near[Math.min(w - 1, x + 4)] + 1, light);
      }
    }
  }
  // Tufts of grass, more and taller toward us, a shade lighter or darker than the meadow round them.
  for (let i = 0; i < (w * (h - plan.horizon)) / 40; i++) {
    const x = Math.floor(random() * w);
    const near = random() ** 0.7;
    const y = plan.near[x] + 3 + Math.round((h - plan.near[x] - 3) * near);
    if (clearOf(x, y, 0) && y < h - 1) {
      const band = Math.min(MEADOW.length - 1, Math.floor(near * MEADOW.length));
      ctx.fillStyle = mix(MEADOW[band][light], random() < 0.5 ? HILL_RIM[light] : HEDGE[light], 0.45);
      ctx.fillRect(x, y, 1, near > 0.5 ? 2 : 1);
    }
  }
  // Flowers here and there in the nearest band.
  for (let i = 0; i < w / 6; i++) {
    const x = Math.floor(random() * w);
    const y = plan.near[x] + Math.round((h - plan.near[x]) * (0.55 + 0.4 * random()));
    if (clearOf(x, y, 0)) {
      px(ctx, x, y, FLOWERS[i % FLOWERS.length][light]);
    }
  }
  // The pond's banks; the water itself is painted every frame.
  pond.rows.forEach(([from, wide], row) => {
    const prev = row > 0 ? pond.rows[row - 1] : undefined;
    ctx.fillStyle = BANK[light];
    if (!prev) {
      ctx.fillRect(from + 1, pond.y - 1, wide - 2, 1);
    } else if (prev[0] > from) {
      ctx.fillRect(from, pond.y + row - 1, prev[0] - from, 1);
      ctx.fillRect(prev[0] + prev[1], pond.y + row - 1, prev[0] - from, 1);
    }
  });
  const last = pond.rows[pond.tall - 1];
  ctx.fillStyle = BANK_NEAR[light];
  ctx.fillRect(last[0] + 1, pond.y + pond.tall, last[1] - 2, 1);
  // The cottage, its tree beside it on the side away from the rainbow.
  const big = h >= BIG_VIEW;
  glyph(ctx, big ? COTTAGE_BIG : COTTAGE, cottage.x, cottage.y + 1, light, dir < 0);
  const treeX = cottage.x + dir * (big ? 9 : 6);
  glyph(ctx, big ? TREE_BIG : TREE, treeX, plan.near[Math.max(0, Math.min(w - 1, treeX))] + 1, light);
}

/** The land of this view, painted the first time it is asked for. */
export function landOf(view: VistaView, plan: Plan): Land {
  if (kept?.key === plan.key) {
    return kept;
  }
  const { w, h } = view;
  const lights = [0, 1] as const;
  kept = {
    key: plan.key,
    far: lights.map((light) => prerender(w, h, (ctx) => paintFar(ctx, plan, w, light))) as unknown as [HTMLCanvasElement, HTMLCanvasElement],
    near: lights.map((light) => prerender(w, h, (ctx) => paintNear(ctx, view, plan, light))) as unknown as [HTMLCanvasElement, HTMLCanvasElement],
  };
  return kept;
}

/** One of the land's pictures, grey and sunny laid over each other as the light warms. */
export function paintLand({ ctx }: VistaView, images: readonly [HTMLCanvasElement, HTMLCanvasElement], sun: number): void {
  ctx.drawImage(images[0], 0, 0);
  ctx.globalAlpha = sun;
  ctx.drawImage(images[1], 0, 0);
  ctx.globalAlpha = 1;
}

/** Puffs of smoke rising from the chimney, drifting the way the wind goes, fading as they climb. */
export function paintSmoke({ ctx, t, h, dir }: VistaView, plan: Plan): void {
  const x = plan.cottage.x + (dir < 0 ? -CHIMNEY : CHIMNEY);
  const y = plan.cottage.y - (h >= BIG_VIEW ? 10 : 6);
  const every = 1.4;
  for (let i = 0; i < 5; i++) {
    const age = (t + i * every) % (every * 5);
    const rise = age * 2.2;
    const alpha = 0.55 * (1 - age / (every * 5));
    px(ctx, x + dir * Math.round(age * 1.1 + Math.sin(age * 1.7)), y - Math.round(rise), SMOKE, alpha, age > 3 ? 2 : 1, 1);
  }
}
