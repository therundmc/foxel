import { mix, prerender, type VistaView } from './paint';

// A sea of sand, painted once for a view and in two lights: soft dunes lying one behind the other, each a single
// long swell in one flat colour, paler with the distance, their outlines crossing like tongues. A crest catches
// a line of light, and the sand darkens a little in the hollow behind the next crest: that is all the modelling
// there is. Far away a great pale massif stands on a flat horizon. Nothing of it moves.

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));

/** A colour at dawn, and once the morning has turned golden. */
export type Lights = readonly [dawn: string, morning: string];

/**
 * The dunes from the farthest to the nearest. Each stands on a level of its own (a share of all the land) and is
 * made of a swell or two: [where along the view (0 at the fox, 1 a length of land ahead of it), how high (a share
 * of the land), how far it reaches behind that place and how far ahead of it (in lengths of land)]. A swell
 * rises long and gently on one side and comes down quicker on the other, and from one dune to the next the
 * sides alternate: that is what makes their outlines cross.
 */
const DUNES = [
  { level: 0.5, swells: [[0.74, 0.6, 0.4, 0.17], [-0.4, 0.34, 0.24, 0.34]], tone: ['#e0a48e', '#eab77c'] },
  { level: 0.24, swells: [[0.24, 0.46, 0.15, 0.42], [1.25, 0.4, 0.34, 0.24]], tone: ['#cf8669', '#dc9a58'] },
  { level: 0.02, swells: [[-0.28, 0.66, 0.26, 0.6], [1.08, 0.4, 0.4, 0.26]], tone: ['#b9684b', '#c97a3a'] },
] as const;
/** The last dune painted behind the worm: it comes out from behind the next one. */
const BEHIND_WORM = 0;
/** The massif on the horizon, the flat desert at its foot, and what a crest in the light is tinted with. */
const MASSIF: Lights = ['#ecc9c2', '#f3d8b4'];
const HORIZON: Lights = ['#e3b6ac', '#ecc79f'];
const SUNLIT = '#fff1da';
const HOLLOW = '#7a3d3a';
/** How much of the view's height the land takes, and the least length of land a view shows the dunes over. */
const LAND = 0.64;
const LENGTHS = 4.2;
/**
 * How light a crest is and the sand just under it (over how many rows); how dark the hollow behind the next
 * crest, in two steps, and how far up that hollow reaches (a share of the land).
 */
const CREST_LIGHT = 0.45;
const SHOULDER_LIGHT = 0.14;
const SHOULDER_ROWS = 2;
const HOLLOW_DARK = [0.07, 0.15] as const;
const HOLLOW_DEEP = 0.2;
/** The massif: how far above the horizon it stands, how wide it is and where (as for the dunes). */
const MASSIF_HIGH = 0.24;
const MASSIF_WIDE = 0.34;
const MASSIF_AT = -0.02;

/** The top of a dune, where the wind lifts the sand off it. */
export interface Crest {
  readonly x: number;
  readonly y: number;
  /** How near it is, from 0 to 1. */
  readonly near: number;
}

export interface DunesLand {
  /** What lies behind the worm and what lies in front of it, each at dawn and in the golden morning. */
  readonly far: readonly [HTMLCanvasElement, HTMLCanvasElement];
  readonly near: readonly [HTMLCanvasElement, HTMLCanvasElement];
  /** The row the sky is hidden from. */
  readonly skyFoot: number;
  /** For each column, the row from which the dunes in front of the worm hide it. */
  readonly screen: Int16Array;
  readonly crests: readonly Crest[];
  /** How high all the land stands, in pixels: the measure of everything in it. */
  readonly tall: number;
}

/** A soft swell: 1 at its middle, dying away to nothing on both sides. */
const swell = (off: number): number => Math.exp(-off * off * 2.4);
/** How high above its level a dune stands at a place, as a share of the land: its highest swell there. */
const liftOf = (swells: readonly (readonly [number, number, number, number])[], at: number): number =>
  Math.max(...swells.map(([where, high, behind, ahead]) => high * swell((at - where) / (at < where ? behind : ahead))));

function build(view: VistaView): DunesLand {
  const { w, h, dir } = view;
  const foxX = Math.round(view.foxX);
  const base = h - 3;
  const tall = clamp(Math.round(h * LAND), 14, 76);
  // A narrow view shows a part of the same wide land, not all of it squeezed.
  const long = Math.max(w, tall * LENGTHS);
  const along = (x: number): number => (dir * (x - foxX)) / long;

  const tops = DUNES.map((dune) => Int16Array.from({ length: w }, (_unused, x) => Math.round(base - tall * (dune.level + liftOf(dune.swells, along(x))))));
  const horizon = Math.round(base - tall * 0.9);
  const massifTop = Int16Array.from({ length: w }, (_unused, x) => {
    const at = along(x);
    const up = MASSIF_HIGH * swell((at - MASSIF_AT) / MASSIF_WIDE) + MASSIF_HIGH * 0.45 * swell((at - MASSIF_AT - 0.75) / (MASSIF_WIDE * 0.7));
    return horizon - Math.round(tall * up);
  });
  /** The row a dune is hidden from, column by column: the top of the next one, or the foot of the view. */
  const cover = (n: number): Int16Array => tops[n + 1] ?? new Int16Array(w).fill(h);

  const paintDune = (ctx: CanvasRenderingContext2D, n: number, light: 0 | 1): void => {
    const top = tops[n];
    const hidden = cover(n);
    const tone = DUNES[n].tone[light];
    ctx.fillStyle = tone;
    for (let x = 0; x < w; x++) {
      ctx.fillRect(x, top[x], 1, h - top[x]);
    }
    // The hollow behind the next crest, a little darker, in two soft steps.
    const deep = Math.max(2, Math.round(tall * HOLLOW_DEEP));
    [deep, Math.ceil(deep / 2)].forEach((rows, step) => {
      ctx.fillStyle = mix(tone, HOLLOW, HOLLOW_DARK[step]);
      for (let x = 0; x < w; x++) {
        const from = Math.max(top[x] + 1 + SHOULDER_ROWS, hidden[x] - rows);
        ctx.fillRect(x, from, 1, Math.max(0, hidden[x] - from));
      }
    });
    // Its crest catches the light all along, and the sand just under it a little of it.
    ctx.fillStyle = mix(tone, SUNLIT, SHOULDER_LIGHT);
    for (let x = 0; x < w; x++) {
      ctx.fillRect(x, top[x] + 1, 1, Math.max(0, Math.min(SHOULDER_ROWS, hidden[x] - top[x] - 1)));
    }
    ctx.fillStyle = mix(tone, SUNLIT, CREST_LIGHT);
    for (let x = 0; x < w; x++) {
      ctx.fillRect(x, top[x], 1, 1);
    }
  };

  const picture = (from: number, to: number, light: 0 | 1): HTMLCanvasElement =>
    prerender(w, h, (ctx) => {
      if (from === 0) {
        ctx.fillStyle = MASSIF[light];
        for (let x = 0; x < w; x++) {
          ctx.fillRect(x, massifTop[x], 1, h - massifTop[x]);
        }
        ctx.fillStyle = HORIZON[light];
        ctx.fillRect(0, horizon, w, h - horizon);
      }
      for (let n = from; n <= to; n++) {
        paintDune(ctx, n, light);
      }
    });

  // The crests the wind takes sand from: the highest point of each dune in front of the worm, where it shows.
  const crests: Crest[] = [];
  for (let n = BEHIND_WORM + 1; n < DUNES.length; n++) {
    let x = 0;
    for (let i = 1; i < w; i++) {
      x = tops[n][i] < tops[n][x] ? i : x;
    }
    if (x > 2 && x < w - 3 && tops[n][x] < cover(n)[x]) {
      crests.push({ x, y: tops[n][x], near: n / (DUNES.length - 1) });
    }
  }
  return {
    far: [picture(0, BEHIND_WORM, 0), picture(0, BEHIND_WORM, 1)],
    near: [picture(BEHIND_WORM + 1, DUNES.length - 1, 0), picture(BEHIND_WORM + 1, DUNES.length - 1, 1)],
    skyFoot: horizon + 1,
    screen: tops[BEHIND_WORM + 1],
    crests,
    tall,
  };
}

let kept: { key: string; land: DunesLand } | undefined;

/** The land of this view, painted the first time it is asked for. */
export function dunesLand(view: VistaView): DunesLand {
  const key = `${view.w}:${view.h}:${view.foxX}:${view.dir}`;
  if (kept?.key !== key) {
    kept = { key, land: build(view) };
  }
  return kept.land;
}
