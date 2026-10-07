import { prerender, seeded, type VistaView } from './paint';

// A flooded plain at dusk, painted once for a view: the sky and the still water that mirrors it, twice (as the dusk
// begins and once it has deepened, for the painter to fade from one to the other), and over them what stands far
// out on the water: a railway line with its poles, a tiny stop, an island or two. Nothing of it moves.

type Rgb = readonly [number, number, number];
const rgb = (hex: string): Rgb => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const blend = (a: Rgb, b: Rgb, k: number): Rgb => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const css = (c: Rgb): string => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));

/** One hour of the dusk: the sky from the top (0) down to the horizon (1), the dark back of a cloud and its lit belly (high in the sky, then low), and what the water adds. */
interface Dusk {
  readonly sky: readonly (readonly [number, Rgb])[];
  readonly shade: Rgb;
  readonly lit: readonly [Rgb, Rgb];
  readonly depth: Rgb;
  /** The afterglow on the horizon, and how strong it is. */
  readonly glow: Rgb;
  readonly glowing: number;
}
const EARLY: Dusk = {
  sky: [[0, rgb('#5f6aa6')], [0.36, rgb('#8d7fb4')], [0.64, rgb('#cf93a8')], [0.84, rgb('#f2b79a')], [1, rgb('#fbe3b2')]],
  shade: rgb('#5c5488'),
  lit: [rgb('#ffb7b4'), rgb('#ffedbe')],
  depth: rgb('#3a3f78'),
  glow: rgb('#fff2cc'),
  glowing: 0.6,
};
const LATE: Dusk = {
  sky: [[0, rgb('#1d2350')], [0.36, rgb('#3a3872')], [0.64, rgb('#7c5488')], [0.84, rgb('#c98488')], [1, rgb('#f2c492')]],
  shade: rgb('#221f4c'),
  lit: [rgb('#c46c90'), rgb('#f8aa8c')],
  depth: rgb('#141a40'),
  glow: rgb('#ffd9a8'),
  glowing: 0.4,
};

/** How far the clouds travel in all: the sky is painted that much wider than the view. */
export const DRIFT = 14;
/** The share of the view the sky takes; the rest is its mirror. */
const SKY_SHARE = 0.44;
/** How much darker than the sky its mirror is at the horizon, and how much more at our feet. */
const SUNK = 0.1;
const SUNK_NEAR = 0.2;
/** How high the afterglow rises, as a share of the sky. */
const GLOW_TALL = 0.5;
/** How lit the flat base of a cloud is, next to its belly: both stay brighter than the sky, or the cloud would seem cut in two. */
const LIT_BASE = 0.7;

const HORIZON = '#fff3d2';
const RAIL = '#2b2440';
const ISLAND = '#6d5c8c';
const ISLAND_DARK = '#54466f';
const WALL = '#54466f';
const ROOF = '#3a3054';
const PLATFORM = '#6a5c80';
const SIGN = '#d9cbd8';
/** The poles of the line stand this far apart at most, and are this tall. */
const POLE_GAP = 58;
const POLE_TALL = 5;
/** The lamp of the stop stands this many pixels above the rail. */
const LAMP_TALL = 9;

/** A cloud as rows of pixels: [row, first column, length, how lit from below (0 its dark back, 1 its belly)]. */
type CloudRow = readonly [y: number, x: number, len: number, lit: number];

export interface Plain {
  /** The sky and its mirror as the dusk begins and once it has deepened, and the clouds of each, `DRIFT` wider than the view. */
  readonly early: HTMLCanvasElement;
  readonly late: HTMLCanvasElement;
  readonly cloudsEarly: HTMLCanvasElement;
  readonly cloudsLate: HTMLCanvasElement;
  /** What stands on the water. */
  readonly land: HTMLCanvasElement;
  /** The row of the horizon, and the row of the rail a little nearer to us. */
  readonly horizon: number;
  readonly rail: number;
  /** The lamp of the stop, the pixel that lights up, and the window of the house, two pixels wide from there. */
  readonly lamp: { readonly x: number; readonly y: number };
  readonly lit: { readonly x: number; readonly y: number } | undefined;
  /** Where the clouds are at most, as [left, top, right, bottom]: no star shows there. */
  readonly clouds: readonly (readonly [number, number, number, number])[];
}

function skyAt({ sky }: Dusk, p: number): Rgb {
  for (let i = 1; i < sky.length; i++) {
    if (p <= sky[i][0]) {
      return blend(sky[i - 1][1], sky[i][1], clamp((p - sky[i - 1][0]) / (sky[i][0] - sky[i - 1][0]), 0, 1));
    }
  }
  return sky[sky.length - 1][1];
}

/** The back of a cloud along its length, from 0 to 1: it rises quickly to its crest at `crest` and falls away slowly. */
const swell = (along: number, crest: number): number =>
  along <= 0 || along >= 1 ? 0 : along < crest ? (along / crest) ** 0.6 : ((1 - along) / (1 - crest)) ** 1.2;

/** Long flat banks of cloud, the higher the larger: a low back drawn out by the wind, a flat base, and a short belly that catches the light. */
function layClouds(w: number, horizon: number, dir: number): CloudRow[] {
  const random = seeded(0x7a11);
  const rows: CloudRow[] = [];
  // As many as the sky has room for: a tall narrow one would otherwise be a pile of them.
  const count = clamp(1 + Math.round(horizon / 14), 2, Math.min(6, 1 + Math.round(w / 40)));
  for (let i = 0; i < count; i++) {
    const share = 0.3 + (0.56 * (i + 0.5 * random())) / count;
    const base = Math.round(horizon * share);
    const len = Math.round(clamp(w * (0.48 - (0.14 * i) / count + 0.1 * random()), 44, 200));
    // Never thick for its length: a short thick cloud would be a mound, and these are sheets.
    const thick = clamp(Math.round(horizon * 0.32 * (1 - share)), 1, Math.min(6, Math.round(len / 14)));
    // They alternate sides, the highest and largest on the side the fox looks to.
    const side = i % 2 === 0 ? dir : -dir;
    const left = Math.round(DRIFT / 2 + w / 2 + side * w * (0.14 + 0.16 * random()) - len / 2);
    rows.push([base, left, len, LIT_BASE]);
    rows.push([base + 1, left + Math.round(len * (0.14 + 0.2 * random())), Math.round(len * (0.42 + 0.2 * random())), 1]);
    // Its back: one long swell, thick toward one end and drawn out thin toward the other, and a lower one in its tail.
    const crest = 0.26 + 0.2 * random();
    const turned = random() < 0.5;
    const back = new Int8Array(len + 1);
    for (let x = 0; x < len; x++) {
      const along = (turned ? len - 1 - x : x) / (len - 1);
      back[x] = Math.round(thick * Math.max(swell(along, crest), 0.5 * swell((along - 0.45) / 0.55, 0.4)));
    }
    for (let j = 1; j <= thick; j++) {
      for (let x = 0, from = -1; x <= len; x++) {
        if (back[x] >= j && from < 0) {
          from = x;
        } else if (back[x] < j && from >= 0) {
          rows.push([base - j, left + from, x - from, 0]);
          from = -1;
        }
      }
    }
    // A wisp left behind, past the end the wind comes from.
    const wisp = Math.round(len * 0.12);
    rows.push([base, dir > 0 ? left - 3 - wisp : left + len + 3, wisp, LIT_BASE]);
  }
  return rows;
}

/** The sky and its mirror, with the afterglow where the sun went down: `glowX` on the horizon, `reach` wide. */
function paintWorld(ctx: CanvasRenderingContext2D, dusk: Dusk, w: number, h: number, horizon: number, glowX: number, reach: number): void {
  for (let y = 0; y < h; y++) {
    ctx.fillStyle = css(rowColour(dusk, y, h, horizon));
    ctx.fillRect(0, y, w, 1);
  }
  // A low wide glow lying on the horizon, half of it in the sky and half, a little duller, in the water.
  ([[0, horizon, 1], [horizon, h - horizon, 0.7]] as const).forEach(([top, tall, strength]) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top, w, tall);
    ctx.clip();
    ctx.translate(glowX, horizon);
    ctx.scale(1, (horizon * GLOW_TALL) / reach);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, reach);
    const [r, g, b] = dusk.glow;
    glow.addColorStop(0, `rgba(${r},${g},${b},${dusk.glowing * strength})`);
    glow.addColorStop(0.5, `rgba(${r},${g},${b},${dusk.glowing * strength * 0.4})`);
    glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(-reach, -reach, reach * 2, reach * 2);
    ctx.restore();
  });
}

/** The colour of row `y`: the sky above the horizon, and under it the same sky upside down, a little darker toward us. */
function rowColour(dusk: Dusk, y: number, h: number, horizon: number): Rgb {
  if (y < horizon) {
    return skyAt(dusk, (y + 0.5) / horizon);
  }
  // Where the water is deeper than the sky is tall, it mirrors what is above the picture: more of the same blue.
  const mirrored = skyAt(dusk, Math.max(0, (2 * horizon - y - 0.5) / horizon));
  return blend(mirrored, dusk.depth, SUNK + (SUNK_NEAR * (y - horizon)) / (h - horizon));
}

/** The clouds alone, and what the water gives back of each row, the same distance under the horizon. */
function paintClouds(ctx: CanvasRenderingContext2D, dusk: Dusk, h: number, horizon: number, clouds: readonly CloudRow[]): void {
  for (const [y, x, len, lit] of clouds) {
    const share = (y + 0.5) / horizon;
    const behind = skyAt(dusk, share);
    // High clouds catch the rose of the dusk, low ones its gold.
    const tone = lit > 0 ? blend(behind, blend(dusk.lit[0], dusk.lit[1], share), 0.8 * lit) : blend(behind, dusk.shade, 0.5);
    ctx.fillStyle = css(tone);
    ctx.fillRect(x, y, len, 1);
    const under = 2 * horizon - 1 - y;
    if (under < h) {
      ctx.fillStyle = css(blend(tone, dusk.depth, SUNK + (SUNK_NEAR * (under - horizon)) / (h - horizon)));
      ctx.fillRect(x, under, len, 1);
    }
  }
}

function build({ w, h, foxX, dir }: VistaView): Plain {
  const horizon = clamp(Math.round(h * SKY_SHARE), 12, h - 16);
  const rail = horizon + clamp(Math.round((h - horizon) * 0.12), 2, 8);
  const rows = layClouds(w, horizon, dir);
  // The stop stands out on the side the fox looks to, against the afterglow; the island with the house behind its shoulder if there is room.
  const room = dir > 0 ? w - foxX : foxX;
  const behind = w - room;
  const glowX = Math.round(foxX + dir * room * 0.62);
  const reach = clamp(w * 0.34, 44, 160);
  const world = (dusk: Dusk): HTMLCanvasElement => prerender(w, h, (ctx) => paintWorld(ctx, dusk, w, h, horizon, glowX, reach));
  const banks = (dusk: Dusk): HTMLCanvasElement => prerender(w + DRIFT, h, (ctx) => paintClouds(ctx, dusk, h, horizon, rows));
  const stop = Math.round(clamp(foxX + dir * clamp(room * 0.56, 36, 170), 12, w - 13));
  const home = behind > 64 ? Math.round(foxX - dir * clamp(behind * 0.6, 44, 150)) : room > 170 ? Math.round(foxX + dir * room * 0.88) : undefined;
  const islet = behind > 64 && room > 170 ? Math.round(foxX + dir * room * 0.9) : undefined;
  const lamp = { x: stop + dir * 3, y: rail - LAMP_TALL };

  const land = prerender(w, h, (ctx) => {
    const bar = (x: number, y: number, wide: number, tall: number, color: string, alpha = 1): void => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, wide, tall);
    };
    bar(0, horizon, w, 1, HORIZON, 0.6);
    /** A low island on the horizon, `half` wide each side, and what the water gives back of it. */
    const island = (x: number, half: number): void => {
      [[1, 0], [0.8, 1], [0.45, 2]].forEach(([share, up]) => {
        const reach = Math.round(half * share);
        bar(x - reach, horizon - up, reach * 2 + 1, 1, up === 0 ? ISLAND_DARK : ISLAND, 0.92);
        bar(x - reach, horizon + 1 + up, reach * 2 + 1, 1, ISLAND_DARK, 0.3 - 0.08 * up);
      });
    };
    if (islet !== undefined) {
      island(islet, 8);
    }
    if (home !== undefined) {
      island(home + 2, 14);
      // The house: three rows of wall under a low hipped roof, and a tall tree beside it.
      bar(home - 3, horizon - 5, 7, 3, WALL);
      bar(home - 4, horizon - 6, 9, 1, ROOF);
      bar(home - 3, horizon - 7, 7, 1, ROOF);
      bar(home + 7, horizon - 9, 1, 1, ISLAND_DARK);
      bar(home + 6, horizon - 8, 3, 4, ISLAND_DARK);
      bar(home + 7, horizon - 4, 1, 2, ISLAND_DARK);
    }
    // The line, just above the water, and its poles at long intervals, none at the stop itself.
    bar(0, rail, w, 1, RAIL, 0.9);
    bar(0, rail + 1, w, 1, RAIL, 0.28);
    const gap = clamp(Math.round(w / 6), 34, POLE_GAP);
    for (let x = stop - Math.ceil(stop / gap) * gap - Math.round(gap / 2); x < w; x += gap) {
      bar(x, rail - POLE_TALL, 1, POLE_TALL, RAIL, 0.85);
      bar(x, rail + 2, 1, POLE_TALL - 2, RAIL, 0.22);
    }
    // The stop: a short platform, a sign on its post, and the lamp leaning over them from the far end.
    bar(stop - 7, rail - 1, 15, 1, PLATFORM);
    bar(stop - dir * 4, rail - 4, 1, 3, RAIL);
    bar(stop - dir * 4 - 1, rail - 6, 3, 2, SIGN, 0.85);
    bar(stop + dir * 4, rail - LAMP_TALL + 1, 1, LAMP_TALL - 2, RAIL);
    bar(stop + dir * 4, rail - LAMP_TALL, 1, 1, RAIL);
    bar(stop - 7, rail + 2, 15, 1, RAIL, 0.2);
  });

  // A cloud slides from `DRIFT` to the left of where it is painted up to there, or the other way round.
  const clouds = rows.map(([y, x, len]) => [x - DRIFT - 1, y - 1, x + len + 1, y + 1] as const);
  return { early: world(EARLY), late: world(LATE), cloudsEarly: banks(EARLY), cloudsLate: banks(LATE), land, horizon, rail, lamp, lit: home === undefined ? undefined : { x: home - 2, y: horizon - 4 }, clouds };
}

let kept: { key: string; plain: Plain } | undefined;

/** The plain of this view, painted the first time it is asked for. */
export function floodedPlain(view: VistaView): Plain {
  const key = `${view.w}:${view.h}:${view.foxX}:${view.dir}`;
  if (kept?.key !== key) {
    kept = { key, plain: build(view) };
  }
  return kept.plain;
}
