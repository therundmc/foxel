import { prerender, seeded, type VistaView } from './paint';

// A sea of sand, painted once for a view and in two lights: a far pale range, then three planes of great dunes,
// each a sharp crest with one face in the light and the other in shade. Nothing of it moves: the blown sand,
// the light, and what lives under the sand are painted over it.

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));

/** A colour at dawn, and once the morning has turned golden. */
export type Lights = readonly [dawn: string, morning: string];

/**
 * The planes of dunes from the farthest to the nearest: the level of their feet and the height of their dunes
 * (shares of all the land), and how far apart their crests are (in heights of land).
 */
const PLANES = [
  { foot: 0.74, high: 0.26, apart: 2.9, lit: ['#eaae90', '#f3c887'], shade: ['#b98499', '#d3a074'], rim: ['#f9cdaa', '#fbe0a8'] },
  { foot: 0.42, high: 0.32, apart: 3.5, lit: ['#e69970', '#eeb364'], shade: ['#9a6585', '#c18552'], rim: ['#fbc195', '#fbd68c'] },
  { foot: 0.1, high: 0.44, apart: 4.4, lit: ['#df8757', '#e9a24c'], shade: ['#77497a', '#a9663f'], rim: ['#f8b17d', '#f9cb78'] },
] as const;
const NEAREST = PLANES.length - 1;
/** The last plane painted behind the worm: it comes out from behind the next one. */
const BEHIND_WORM = 0;
/** The far range: pale swells on the horizon, hardly higher than a line. */
const RANGE: Lights = ['#d8adb2', '#eccfab'];
const RANGE_SWELL = 0.05;
/** How much of the view's height the land takes. */
const LAND = 0.52;
/** A dune's two faces: the long one, in the light, and the short steep one, as shares of the way to the next crest. */
const LONG_FACE = 0.95;
const SHORT_FACE = 0.44;
/** How hollow the steep face is. */
const HOLLOW = 1.5;
/** The spine of a dune comes toward us curving to the light, and its shade closes in a curve behind it. */
const SPINE = 1.5;
const SPINE_CURVE = 0.75;
const CLOSES = 0.45;
const CLOSES_CURVE = 1.5;
/** How far along its lit face a crest catches the light. */
const RIM = 0.4;
/** The nearest crests stand just ahead of the fox, so that it sits against their shaded faces. */
const CREST_AHEAD = 42;
const MID_CREST_AHEAD = 22;
const SHADE_BEHIND_FOX = 70;

/** One dune, along the view from behind the fox (negative) to ahead of it: its crest, its height, its two faces. */
interface Dune {
  readonly at: number;
  readonly high: number;
  readonly long: number;
  readonly short: number;
}

/** The top of a dune, where the wind lifts the sand off it. */
export interface Crest {
  readonly x: number;
  readonly y: number;
  /** 0 for the farthest plane of dunes. */
  readonly plane: number;
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

function lift(dune: Dune, at: number): number {
  const off = at - dune.at;
  if (off >= 0) {
    return off < dune.long ? dune.high * 0.5 * (1 + Math.cos((Math.PI * off) / dune.long)) : 0;
  }
  return -off < dune.short ? dune.high * (1 + off / dune.short) ** HOLLOW : 0;
}

function build(view: VistaView): DunesLand {
  const { w, h, dir } = view;
  const foxX = Math.round(view.foxX);
  const base = h - 3;
  const tall = clamp(Math.round(h * LAND), 14, 72);
  const behind = dir > 0 ? foxX : w - foxX;
  const ahead = w - behind;
  const random = seeded(0xd07e);
  const column = (at: number): number => Math.round(foxX + dir * at);
  const level = (plane: number): number => Math.round(base - tall * PLANES[plane].foot);

  /** Dunes of one plane in a row, from one whose crest is at `first`, out to both ends of the view. */
  const row = (plane: number, first: number, shortest = 0): Dune[] => {
    const { high, apart } = PLANES[plane];
    const gap = Math.max(40, tall * apart);
    const dune = (at: number, share: number): Dune => ({ at, high: tall * high * share, long: gap * LONG_FACE, short: Math.max(shortest, gap * SHORT_FACE) });
    const dunes = [dune(first, 1)];
    for (let at = first - gap * (0.8 + 0.4 * random()); at > -behind - gap; at -= gap * (0.8 + 0.4 * random())) {
      dunes.push(dune(at, 0.6 + 0.4 * random()));
    }
    for (let at = first + gap * (0.8 + 0.4 * random()); at < ahead + gap; at += gap * (0.8 + 0.4 * random())) {
      dunes.push(dune(at, 0.6 + 0.4 * random()));
    }
    return dunes;
  };
  const rows = [row(0, clamp(ahead * 0.4, 20, 150)), row(1, MID_CREST_AHEAD), row(NEAREST, CREST_AHEAD, SHADE_BEHIND_FOX)];
  // For each plane and column: the row of its top, and whether that top is a crest in the light.
  const tops = rows.map((dunes, plane) => {
    const top = new Int16Array(w);
    const lit = new Uint8Array(w);
    for (let x = 0; x < w; x++) {
      const at = dir * (x - foxX);
      let most = 0;
      for (const dune of dunes) {
        const up = lift(dune, at);
        if (up > most) {
          most = up;
          lit[x] = at >= dune.at && at - dune.at < dune.long * RIM ? 1 : 0;
        }
      }
      top[x] = level(plane) - Math.round(most);
    }
    return { top, lit };
  });
  const rangeTop = Int16Array.from({ length: w }, (_unused, x) => {
    const at = dir * (x - foxX);
    return Math.round(base - tall * (1 + RANGE_SWELL * (Math.cos(at * 0.021 + 1.2) + 0.5 * Math.cos(at * 0.047))));
  });

  const plane = (index: number, light: 0 | 1): HTMLCanvasElement =>
    prerender(w, h, (ctx) => {
      const { top, lit } = tops[index];
      const tones = PLANES[index];
      ctx.fillStyle = tones.lit[light];
      for (let x = 0; x < w; x++) {
        ctx.fillRect(x, top[x], 1, h - top[x]);
      }
      // The shaded faces only show where there is sand of this plane.
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = tones.shade[light];
      for (const dune of rows[index]) {
        const crest = level(index) - Math.round(dune.high);
        for (let s = 0; crest + s < h; s++) {
          const spine = SPINE * s ** SPINE_CURVE;
          const foot = s < dune.high ? -dune.short * (1 - (1 - s / dune.high) ** (1 / HOLLOW)) : -dune.short + CLOSES * (s - dune.high) ** CLOSES_CURVE;
          if (s > 0 && foot >= spine) {
            break;
          }
          const from = column(dune.at + (dir > 0 ? foot : spine));
          const to = column(dune.at + (dir > 0 ? spine : foot));
          ctx.fillRect(from, crest + s, to - from + 1, 1);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = tones.rim[light];
      for (let x = 0; x < w; x++) {
        if (lit[x]) {
          ctx.fillRect(x, top[x], 1, 1);
        }
      }
    });

  const far = ([0, 1] as const).map((light) =>
    prerender(w, h, (ctx) => {
      ctx.fillStyle = RANGE[light];
      for (let x = 0; x < w; x++) {
        ctx.fillRect(x, rangeTop[x], 1, h - rangeTop[x]);
      }
      for (let index = 0; index <= BEHIND_WORM; index++) {
        ctx.drawImage(plane(index, light), 0, 0);
      }
    }),
  ) as [HTMLCanvasElement, HTMLCanvasElement];
  const near = ([0, 1] as const).map((light) =>
    prerender(w, h, (ctx) => {
      for (let index = BEHIND_WORM + 1; index < PLANES.length; index++) {
        ctx.drawImage(plane(index, light), 0, 0);
      }
    }),
  ) as [HTMLCanvasElement, HTMLCanvasElement];

  const crests: Crest[] = [];
  rows.forEach((dunes, index) => {
    for (const dune of dunes) {
      const x = column(dune.at);
      // Only a crest that shows: one hidden behind a nearer dune loses no sand that we can see.
      if (x >= 0 && x < w && tops.slice(index + 1).every(({ top }) => top[x] > tops[index].top[x])) {
        crests.push({ x, y: tops[index].top[x], plane: index });
      }
    }
  });
  return {
    far,
    near,
    skyFoot: Math.max(...rangeTop) + 1,
    screen: tops[BEHIND_WORM + 1].top,
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
