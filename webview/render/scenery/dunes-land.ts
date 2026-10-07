import { mix, prerender, seeded, type VistaView } from './paint';

// A sea of sand, painted once for a view and in two lights. The sun rises behind the fox's shoulder, behind one
// great dune that towers over everything: its crest is rimmed with light, a sinuous spine runs down it toward
// us, and the fox sits in its long shadow. Beyond it the desert lies in the light: planes of dunes one behind the
// other, great and warm close by, small and pale far away, each a long wave with a gentle lit face, a crest, and
// a short steep face whose shadow sweeps toward us in a crescent. Nothing of it moves.

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));
const TURN = Math.PI * 2;

/** A colour at dawn, and once the morning has turned golden. */
export type Lights = readonly [dawn: string, morning: string];

/**
 * The planes of dunes from the farthest to the nearest: the level of their feet and the height of their dunes
 * (shares of all the land), and how long a dune is from one hollow to the next (in heights of land). The last
 * is only the low ground the great dune stands on.
 */
const PLANES = [
  { foot: 0.86, high: 0.12, long: 2 },
  { foot: 0.66, high: 0.2, long: 3.1 },
  { foot: 0.4, high: 0.3, long: 4.8 },
  { foot: 0.05, high: 0.14, long: 5.4 },
] as const;
const NEAREST = PLANES.length - 1;
/** The last plane painted behind the worm: it comes out from behind the next one. */
const BEHIND_WORM = 1;
/** Sand in the light, in shade, and where a crest catches the light: far away, and close to us. */
const LIT: readonly [Lights, Lights] = [['#edbba3', '#f5d39c'], ['#e08a58', '#eaa049']];
const SHADE: readonly [Lights, Lights] = [['#c79aa8', '#deb487'], ['#74487a', '#a66340']];
const RIM: readonly [Lights, Lights] = [['#f9d6bb', '#fce7b6'], ['#ffc694', '#ffdc8c']];
/** The great dune's shadow, deeper and cooler than any other: the fox sits against it. */
const GREAT_SHADE: Lights = ['#5d3c6c', '#8b5049'];
/** The far range: pale swells on the horizon, hardly higher than a line. */
const RANGE: Lights = ['#dcb5b8', '#efd6b2'];
const RANGE_SWELL = 0.04;
/** How much of the view's height the land takes. */
const LAND = 0.56;
/** The share of a dune's length that is its steep face, and how peaked its crest is. */
const STEEP = 0.34;
const GENTLE = 1 - STEEP;
const PEAKED = 1.25;
/** No two dunes are as long, nor as high: how much they differ, and over how many dunes. */
const UNEVEN = 0.16;
const UNEVEN_OVER = 2.7;
const SMALLER = 0.4;
const SMALLER_OVER = 3.7;
/** The spine of a dune comes toward us curving away from the light, and its shadow dies away over this many heights of it. */
const SPINE = 1.3;
const SPINE_CURVE = 0.8;
const SHADOW_LONG = 2.4;
const SHADOW_CURVE = 1.5;
/** How far before its crest the sand catches the light. */
const RIM_LONG = 0.1;
/**
 * The great dune: how high it stands (a share of the land: it rises above the horizon), how far behind the fox
 * its crest is (a share of the room there, within these bounds), how long its lit face is (in heights of land)
 * and how far ahead of the fox its shaded one comes down (a share of the room ahead, within these bounds).
 */
const GREAT_HIGH = 1.14;
const GREAT_BEHIND = 0.55;
const GREAT_BEHINDS = [18, 84] as const;
const GREAT_LIT_FACE = 1.25;
const GREAT_AHEAD = 0.5;
const GREAT_AHEADS = [60, 190] as const;
const GREAT_HOLLOW = 1.7;
const GREAT_FULL = 1.7;
/** Its spine swings toward the light, then back across and on toward us: shares of its height. */
const GREAT_SWING = 0.2;
const GREAT_DRIFT = 0.42;
/** The spine never comes closer to the fox than this: the fox stays in the shade. */
const SPINE_CLEAR = 20;
/** How far down its shaded face the crest is rimmed with light. */
const GREAT_RIM = 0.45;

/** One plane's dunes as a wave along the view, measured from the fox toward where it looks. */
interface Wave {
  readonly long: number;
  readonly high: number;
  readonly phase: number;
  readonly uneven: number;
  readonly smaller: number;
}

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

/** How many dunes along a wave `at` is: the whole part counts them, the rest says where on the dune. */
const along = (wave: Wave, at: number): number => at / wave.long + wave.phase + UNEVEN * Math.sin((TURN * at) / (wave.long * UNEVEN_OVER) + wave.uneven);

function lift(wave: Wave, at: number): number {
  const turn = along(wave, at);
  const on = turn - Math.floor(turn);
  const raw = on < GENTLE ? 0.5 - 0.5 * Math.cos((Math.PI * on) / GENTLE) : 0.5 + 0.5 * Math.cos((Math.PI * (on - GENTLE)) / STEEP);
  const size = 1 - SMALLER * (0.5 - 0.5 * Math.sin((TURN * at) / (wave.long * SMALLER_OVER) + wave.smaller));
  return wave.high * raw ** PEAKED * size;
}

/** Stretches of one row in one tone: [column, row, width]. */
type Runs = [number, number, number][];
/** What a pixel of sand is: in the light, in shade, a crest catching it, in the great dune's shadow. */
const enum Sand {
  Lit,
  Shade,
  Rim,
  Deep,
}

function build(view: VistaView): DunesLand {
  const { w, h, dir } = view;
  const foxX = Math.round(view.foxX);
  const base = h - 3;
  const tall = clamp(Math.round(h * LAND), 14, 76);
  const behind = dir > 0 ? foxX : w - foxX;
  const ahead = w - behind;
  const random = seeded(0xd07e);
  const level = (plane: number): number => Math.round(base - tall * PLANES[plane].foot);
  const waves = PLANES.map(({ high, long }): Wave => ({ long: Math.max(30, tall * long), high: tall * high, uneven: random() * TURN, smaller: random() * TURN, phase: random() }));

  // The great dune: a crest behind the fox's shoulder, a short face in the light and a long hollow one in shade.
  const great = {
    at: -clamp(behind * GREAT_BEHIND, GREAT_BEHINDS[0], GREAT_BEHINDS[1]),
    high: Math.min(tall * GREAT_HIGH, base - 4),
    lit: Math.max(26, tall * GREAT_LIT_FACE),
    shaded: clamp(ahead * GREAT_AHEAD, GREAT_AHEADS[0], GREAT_AHEADS[1]),
  };
  const greatLift = (at: number): number => {
    const off = at - great.at;
    if (off < 0) {
      // Its face in the light is full and round, the one in shade long and hollow: the crest between them is a horn.
      return -off < great.lit ? great.high * (1 - (-off / great.lit) ** GREAT_FULL) : 0;
    }
    return off < great.shaded - great.at ? great.high * (1 - off / (great.shaded - great.at)) ** GREAT_HOLLOW : 0;
  };
  const greatTop = base - Math.round(great.high);
  const drift = Math.min(GREAT_DRIFT * great.high, Math.max(0, -great.at - SPINE_CLEAR));
  /** Where the great dune's spine is, `s` rows under its crest. */
  const greatSpine = (s: number): number => {
    const down = Math.min(1, s / great.high);
    return great.at - GREAT_SWING * great.high * Math.sin(TURN * down * 0.62) * (1 - down) + drift * down * down;
  };

  const tops = waves.map((wave, plane) => Int16Array.from({ length: w }, (_unused, x) => level(plane) - Math.round(lift(wave, dir * (x - foxX)))));
  const ground = tops[NEAREST];
  /** Columns where the great dune stands above the low ground. */
  const isGreat = new Uint8Array(w);
  tops[NEAREST] = Int16Array.from({ length: w }, (_unused, x) => {
    const row = base - Math.round(greatLift(dir * (x - foxX)));
    isGreat[x] = row < ground[x] ? 1 : 0;
    return Math.min(row, ground[x]);
  });
  const rangeTop = Int16Array.from({ length: w }, (_unused, x) => {
    const at = dir * (x - foxX);
    return Math.round(base - tall * (1 + RANGE_SWELL * (Math.cos(at * 0.021 + 1.2) + 0.5 * Math.cos(at * 0.047))));
  });
  /** The row a plane is hidden from, column by column: the top of the next one, or the foot of the view. */
  const cover = (plane: number): Int16Array => tops[plane + 1] ?? new Int16Array(w).fill(h);

  // What each plane shows of itself, worked out once for both lights.
  const faces = waves.map((wave, plane) => {
    const top = tops[plane];
    const hidden = cover(plane);
    const dies = (wave.long * STEEP) / (SHADOW_LONG * wave.high) ** SHADOW_CURVE;
    const runs: Runs[] = [[], [], [], []];
    const sandAt = (x: number, y: number): Sand => {
      const at = dir * (x - foxX);
      if (plane === NEAREST && isGreat[x]) {
        if (at < greatSpine(y - greatTop)) {
          return Sand.Lit;
        }
        return y === top[x] && at - great.at < (great.shaded - great.at) * GREAT_RIM ? Sand.Rim : Sand.Deep;
      }
      const s = y - (plane === NEAREST ? ground[x] : top[x]);
      const spine = SPINE * Math.max(0, y - level(plane) + wave.high) ** SPINE_CURVE;
      const turn = along(wave, at - spine);
      const on = turn - Math.floor(turn);
      if (on >= GENTLE) {
        // The shadow narrows as it comes toward us: its far edge sweeps faster than the spine.
        return Math.floor(along(wave, at - spine + dies * s ** SHADOW_CURVE)) === Math.floor(turn) ? Sand.Shade : Sand.Lit;
      }
      return s === 0 && on > GENTLE - RIM_LONG ? Sand.Rim : Sand.Lit;
    };
    for (let y = Math.min(...top); y < h; y++) {
      let from = 0;
      let sand = Sand.Lit;
      for (let x = 0; x <= w; x++) {
        const now = x < w && y >= top[x] && y < hidden[x] ? sandAt(x, y) : Sand.Lit;
        if (now !== sand) {
          runs[sand].push([from, y, x - from]);
          from = x;
          sand = now;
        }
      }
    }
    return runs;
  });

  const tone = (ends: readonly [Lights, Lights], plane: number, light: 0 | 1): string => mix(ends[0][light], ends[1][light], (plane / NEAREST) ** 0.85);
  const paintPlane = (ctx: CanvasRenderingContext2D, plane: number, light: 0 | 1): void => {
    const top = tops[plane];
    ctx.fillStyle = tone(LIT, plane, light);
    for (let x = 0; x < w; x++) {
      ctx.fillRect(x, top[x], 1, h - top[x]);
    }
    const fill = (sand: Sand, color: string): void => {
      ctx.fillStyle = color;
      faces[plane][sand].forEach(([x, y, wide]) => ctx.fillRect(x, y, wide, 1));
    };
    fill(Sand.Shade, tone(SHADE, plane, light));
    fill(Sand.Deep, GREAT_SHADE[light]);
    fill(Sand.Rim, tone(RIM, plane, light));
  };

  const picture = (from: number, to: number, light: 0 | 1): HTMLCanvasElement =>
    prerender(w, h, (ctx) => {
      if (from === 0) {
        ctx.fillStyle = RANGE[light];
        for (let x = 0; x < w; x++) {
          ctx.fillRect(x, rangeTop[x], 1, h - rangeTop[x]);
        }
      }
      for (let plane = from; plane <= to; plane++) {
        paintPlane(ctx, plane, light);
      }
    });

  // The crests the wind takes sand from: those in front of the worm that show, and the great one.
  const crests: Crest[] = [];
  for (let plane = BEHIND_WORM + 1; plane < PLANES.length; plane++) {
    for (let at = -behind + 1; at < ahead; at++) {
      const before = along(waves[plane], at - 1);
      const here = along(waves[plane], at);
      const x = foxX + dir * at;
      if (Math.floor(before) === Math.floor(here) && before - Math.floor(before) < GENTLE && here - Math.floor(here) >= GENTLE && tops[plane][x] < cover(plane)[x] && !(plane === NEAREST && isGreat[x])) {
        crests.push({ x, y: tops[plane][x], near: plane / NEAREST });
      }
    }
  }
  const greatX = foxX + dir * Math.round(great.at);
  if (greatX >= 0 && greatX < w) {
    crests.push({ x: greatX, y: greatTop, near: 1 });
  }
  return {
    far: [picture(0, BEHIND_WORM, 0), picture(0, BEHIND_WORM, 1)],
    near: [picture(BEHIND_WORM + 1, NEAREST, 0), picture(BEHIND_WORM + 1, NEAREST, 1)],
    skyFoot: Math.max(...rangeTop, ...tops[0]) + 1,
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
