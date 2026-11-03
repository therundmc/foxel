import { gradient, mix, prerender, seeded, type VistaView } from './paint';

// A calm turquoise sea on a summer afternoon, seen from the top of a cliff, painted once for a view: the sky, the
// sea with its lazy swell, and far out behind the fox's shoulder a green headland with a little lighthouse on it.
// Nothing of it moves; the glints, the clouds, the gulls, the boat and the whales are painted over it.

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));

/** The sky from the top down to the haze on the horizon. */
const SKY = [[0, '#58a6e4'], [0.45, '#86c4ef'], [0.82, '#bfe3f2'], [1, '#e2f4ee']] as const;
/** The sea from the horizon to our feet: pale and hazy far out, deep turquoise under the cliff. */
const SEA = [[0, '#86d0d0'], [0.07, '#58bcc6'], [0.4, '#33a3b8'], [1, '#1d86a0']] as const;
const HORIZON = '#eaf8f0';
/** The swell: the long lit backs of the waves and the shade in front of them. */
const SWELL_LIT = '#7fd2d6';
const SWELL_SHADE = '#2a8fa8';
/** The headland: its grass, the shade on it, its pale cliff, the cliff's shaded foot, the foam at its foot. */
const GRASS = ['#8fc072', '#74a85e'] as const;
const CLIFF = ['#efe2c4', '#cfbd9a'] as const;
const FOAM = '#f6fcf8';
/** The far things are paled this much toward the haze. */
const FAR_HAZE = 0.3;
/** The lighthouse: its white tower and red bands, the iron of its lantern, its glass, its red cap. */
const TOWER = '#fdf8ee';
const BAND = '#e46c5c';
const IRON = '#46546a';
const GLASS = '#fff1b8';

/** The share of the view the sky takes. */
const SKY_SHARE = 0.4;

/** A place on the sea, the row being where the water is there. */
export interface Spot {
  readonly x: number;
  readonly y: number;
}

export interface Sea {
  /** The sky alone, and in front of the clouds the sea and the headland. */
  readonly sky: HTMLCanvasElement;
  readonly image: HTMLCanvasElement;
  readonly horizon: number;
  /** The length of the big whale from its nose to its tail. */
  readonly whale: number;
  /** Where it comes up from the deep, where its calf leaps, and the two places it is first seen on the way. */
  readonly spot: Spot;
  readonly calf: Spot;
  readonly far: Spot;
  readonly mid: Spot;
  /** The column the sun's glitter on the sea is gathered round, and how far it spreads. */
  readonly glitter: number;
  readonly glitterSpread: number;
  /** The tip of the headland: the little boat sets off from there. */
  readonly tip: number;
}

/** How tall the headland stands `d` columns in from the edge of the view, `wide` columns long. */
function headlandAt(d: number, wide: number, tall: number): number {
  const along = d / wide;
  if (along >= 1) {
    return 0;
  }
  // A gentle grassy back, then the cliff falling to the sea near its tip.
  const back = 1 - 0.25 * along + 0.08 * Math.sin(d * 0.5);
  return Math.max(0, Math.round(tall * back * Math.min(1, ((1 - along) / 0.22) ** 0.7)));
}

function paintHeadland(ctx: CanvasRenderingContext2D, view: VistaView, horizon: number, wide: number, tall: number): number {
  const { w, h, dir } = view;
  const haze = (c: string): string => mix(c, HORIZON, FAR_HAZE);
  let top = 0;
  let towerX = 0;
  for (let d = 0; d < wide; d++) {
    const col = dir > 0 ? d : w - 1 - d;
    const high = headlandAt(d, wide, tall);
    if (high <= 0) {
      continue;
    }
    // The grass is a cap on the cliff, thicker on the back of the headland than at its tip.
    const grass = Math.max(1, Math.round(high * 0.35));
    ctx.fillStyle = haze(GRASS[0]);
    ctx.fillRect(col, horizon - high, 1, grass);
    ctx.fillStyle = haze(GRASS[1]);
    ctx.fillRect(col, horizon - high + grass, 1, 1);
    ctx.fillStyle = haze(d % 5 === 0 || (d * 7) % 11 === 0 ? CLIFF[1] : CLIFF[0]);
    ctx.fillRect(col, horizon - high + grass + 1, 1, Math.max(0, high - grass - 1));
    ctx.fillStyle = haze(CLIFF[1]);
    ctx.fillRect(col, horizon - 1, 1, 1);
    if (d === Math.round(wide * 0.66)) {
      top = horizon - high;
      towerX = col;
    }
  }
  // The foam at its foot, broken.
  ctx.fillStyle = FOAM;
  for (let d = 0; d < wide + 2; d++) {
    if ((d * 5) % 7 < 4) {
      ctx.fillRect(dir > 0 ? d : w - 1 - d, horizon, 1, 1);
    }
  }
  // The lighthouse stands near the tip: white with red bands, its lantern, and a red cap.
  const tower = clamp(Math.round(h * 0.13), 5, 13);
  const thick = h >= 80 ? 4 : 3;
  const left = towerX - (thick >> 1);
  const lantern = top - tower;
  for (let row = 0; row < tower; row++) {
    const band = tower >= 8 ? row % 4 === 1 : row === Math.round(tower * 0.45);
    ctx.fillStyle = haze(band ? BAND : TOWER);
    // A little narrower toward its top.
    const narrow = row > tower * 0.6 && thick > 3 ? 1 : 0;
    ctx.fillRect(left, top - 1 - row, thick - narrow, 1);
  }
  ctx.fillStyle = haze(IRON);
  ctx.fillRect(left - 1, lantern - 1, thick + 2, 1);
  ctx.fillRect(left, lantern - 3, 1, 2);
  ctx.fillRect(left + thick - 1, lantern - 3, 1, 2);
  ctx.fillStyle = haze(GLASS);
  ctx.fillRect(left + 1, lantern - 3, thick - 2, 2);
  ctx.fillStyle = haze(BAND);
  ctx.fillRect(left, lantern - 4, thick, 1);
  ctx.fillRect(left + 1, lantern - 5, thick - 2, 1);
  return dir > 0 ? wide : w - 1 - wide;
}

// The swell: long thin strokes, short and close together far out, longer and further apart toward us.
function paintSwell(ctx: CanvasRenderingContext2D, w: number, h: number, horizon: number): void {
  const random = seeded(0x5e11);
  const deep = h - horizon;
  for (let row = 2; row < deep; row++) {
    const near = row / deep;
    const every = Math.max(2, Math.round(1 + near * 5));
    if (row % every !== 0) {
      continue;
    }
    for (let x = Math.floor(-random() * 30); x < w; ) {
      const len = Math.round(3 + near * 16 + random() * (4 + near * 14));
      if (random() < 0.55) {
        ctx.globalAlpha = 0.18 + 0.25 * near;
        ctx.fillStyle = SWELL_LIT;
        ctx.fillRect(x, horizon + row, len, 1);
        ctx.fillStyle = SWELL_SHADE;
        ctx.globalAlpha = 0.12 + 0.16 * near;
        ctx.fillRect(x + 2, horizon + row + 1, Math.max(1, len - 4), 1);
      }
      x += len + Math.round(4 + random() * (10 + near * 20));
    }
  }
  ctx.globalAlpha = 1;
}

function build(view: VistaView): Sea {
  const { w, h, foxX, dir } = view;
  const horizon = Math.round(h * SKY_SHARE);
  const deep = h - horizon;
  const room = dir > 0 ? w - foxX : foxX;
  const whale = clamp(Math.round(h * 0.4), 15, 42);
  const spotY = horizon + Math.max(4, Math.round(deep * 0.3));
  const spotX = Math.round(clamp(foxX + dir * clamp(room * 0.48, whale * 1.1 + 12, 170), whale, w - whale));
  const calfX = Math.round(clamp(spotX + dir * whale * 0.95, 6, w - 7));
  const farX = Math.round(clamp(spotX + dir * clamp(room * 0.3, 10, 90), 6, w - 7));
  const midX = Math.round((farX + spotX * 2) / 3 + dir * whale * 0.3);
  const wide = clamp(Math.round(w * 0.2), 22, 90);
  const tall = clamp(Math.round(h * 0.11), 4, 12);
  let tip = 0;
  const sky = prerender(w, horizon, (ctx) => gradient({ ...view, ctx }, 0, horizon, SKY));
  const image = prerender(w, h, (ctx) => {
    gradient({ ...view, ctx }, horizon, h, SEA);
    paintSwell(ctx, w, h, horizon);
    ctx.fillStyle = HORIZON;
    ctx.fillRect(0, horizon, w, 1);
    tip = paintHeadland(ctx, view, horizon, wide, tall);
  });
  return {
    sky,
    image,
    horizon,
    whale,
    spot: { x: spotX, y: spotY },
    calf: { x: calfX, y: spotY + 1 },
    far: { x: farX, y: horizon + 2 },
    mid: { x: midX, y: horizon + Math.max(3, Math.round((spotY - horizon) * 0.55)) },
    glitter: Math.round(foxX + dir * room * 0.62),
    glitterSpread: Math.max(14, room * 0.3),
    tip,
  };
}

let kept: { key: string; sea: Sea } | undefined;

/** The sea of this view, painted the first time it is asked for. */
export function seaOf(view: VistaView): Sea {
  const key = `${view.w}:${view.h}:${view.foxX}:${view.dir}`;
  if (kept?.key !== key) {
    kept = { key, sea: build(view) };
  }
  return kept.sea;
}
