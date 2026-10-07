import { mix, prerender, seeded, type VistaView } from './paint';

// A sea of sand, painted once for a view and in two lights. The sun rises behind the fox's shoulder, behind one
// great dune that towers over everything: its crest is rimmed with light, a sinuous spine runs down it toward
// us, and the fox sits in its long shadow. Beyond it only a few dunes, but mighty ones: a rank of them ahead,
// and paler giants far away that stand above the horizon. Every dune is built the same way: a full round face
// in the light, a horn of a crest, a long hollow face in shade. Nothing of it moves.

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));
const TURN = Math.PI * 2;

/** A colour at dawn, and once the morning has turned golden. */
export type Lights = readonly [dawn: string, morning: string];

/**
 * The ranks of dunes from the farthest to the nearest: the level they stand on, how high they are at least and
 * at most (shares of all the land), where one of them has its crest (a share of the room ahead of the fox),
 * and how pale the distance makes them (0 the farthest tones, 1 the nearest).
 */
const RANKS = [
  { foot: 0.6, high: [0.34, 0.56], crestAhead: 0.3, near: 0 },
  { foot: 0.28, high: [0.46, 0.7], crestAhead: 0.66, near: 0.55 },
  // The nearest is the great dune alone, on open ground.
  { foot: 0.04, high: [0, 0], crestAhead: 0, near: 1 },
] as const;
const NEAREST = RANKS.length - 1;
/** The last rank painted behind the worm: it comes out from behind the next one. */
const BEHIND_WORM = 0;
/** Sand in the light, in shade, and where a crest catches the light: far away, and close to us. */
const LIT: readonly [Lights, Lights] = [['#edbba3', '#f5d39c'], ['#e08a58', '#eaa049']];
const SHADE: readonly [Lights, Lights] = [['#c79aa8', '#deb487'], ['#74487a', '#a66340']];
const RIM: readonly [Lights, Lights] = [['#f9d6bb', '#fce7b6'], ['#ffc694', '#ffdc8c']];
/** The great dune's shadow, deeper and cooler than any other: the fox sits against it. */
const GREAT_SHADE: Lights = ['#5d3c6c', '#8b5049'];
/** The flat desert on the horizon, behind everything. */
const HORIZON: Lights = ['#dcb5b8', '#efd6b2'];
/** How much of the view's height the land takes. */
const LAND = 0.56;
/** A dune's two faces, in heights of it: the one in the light, and the long one in shade. No two dunes are quite alike. */
const LIT_FACE = 1.45;
const SHADED_FACE = 3.1;
const UNALIKE = 0.3;
/** How round its lit face is, and how hollow its shaded one. */
const FULL = 1.7;
const HOLLOW = 1.7;
/** Its spine swings toward the light, then back across and on toward us: shares of its height. */
const SWING = 0.2;
const DRIFT = 0.42;
/** How far down its shaded face the crest is rimmed with light. */
const RIMMED = 0.45;
/** The ground between the dunes of a rank rolls a little: by this share of the land, over this many pixels. */
const ROLL = 0.025;
const ROLL_OVER = 90;
/**
 * The great dune: how high it stands (a share of the land: it rises above the horizon), how far behind the fox
 * its crest is (a share of the room there, within these bounds) and how far ahead of the fox its shaded face
 * comes down (a share of the room ahead, within these bounds).
 */
const GREAT_HIGH = 1.14;
const GREAT_BEHIND = 0.55;
const GREAT_BEHINDS = [18, 84] as const;
const GREAT_AHEAD = 0.5;
const GREAT_AHEADS = [60, 190] as const;
/** Its spine never comes closer to the fox than this: the fox stays in the shade. */
const SPINE_CLEAR = 20;

/** One dune, along the view from the fox toward where it looks: its crest, its height, its two faces, its spine. */
interface Dune {
  readonly at: number;
  readonly high: number;
  readonly lit: number;
  readonly shaded: number;
  readonly drift: number;
  readonly great?: true;
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

function lift(dune: Dune, at: number): number {
  const off = at - dune.at;
  if (off < 0) {
    return -off < dune.lit ? dune.high * (1 - (-off / dune.lit) ** FULL) : 0;
  }
  return off < dune.shaded ? dune.high * (1 - off / dune.shaded) ** HOLLOW : 0;
}

/** Where a dune's spine is, `s` rows under its crest. */
function spine(dune: Dune, s: number): number {
  const down = clamp(s / dune.high, 0, 1);
  return dune.at - SWING * dune.high * Math.sin(TURN * down * 0.62) * (1 - down) + dune.drift * down * down;
}

/** Stretches of one row in one tone: [column, row, width]. */
type Runs = [number, number, number][];
/** What a pixel of sand is: in the light, in shade, a crest catching the light, in the great dune's shadow. */
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
  const level = (rank: number): number => Math.round(base - tall * RANKS[rank].foot);

  const dune = (at: number, high: number): Dune => {
    const lit = high * LIT_FACE * (1 - UNALIKE / 2 + UNALIKE * random());
    return { at, high, lit, shaded: high * SHADED_FACE * (1 - UNALIKE / 2 + UNALIKE * random()), drift: DRIFT * high };
  };
  /** A rank of dunes: one with its crest at its place, then others out to both ends of the view, overlapping. */
  const rankOf = (index: number): Dune[] => {
    const { high, crestAhead } = RANKS[index];
    const sized = (): number => tall * (high[0] + (high[1] - high[0]) * random());
    const first = dune(ahead * crestAhead, tall * high[1]);
    const dunes = [first];
    for (let last = first; last.at < ahead; ) {
      const next = sized();
      last = dune(last.at + last.shaded * (0.5 + 0.3 * random()) + next * LIT_FACE * 0.5, next);
      dunes.push(last);
    }
    for (let last = first; last.at > -behind; ) {
      const next = sized();
      last = dune(last.at - last.lit * 0.6 - next * SHADED_FACE * (0.5 + 0.3 * random()), next);
      dunes.push(last);
    }
    return dunes;
  };
  const ranks = RANKS.map((_, index) => (index < NEAREST ? rankOf(index) : []));
  // The great dune: a crest behind the fox's shoulder, and a shaded face that comes down well ahead of it.
  const greatAt = -clamp(behind * GREAT_BEHIND, GREAT_BEHINDS[0], GREAT_BEHINDS[1]);
  const greatHigh = Math.min(tall * GREAT_HIGH, base - 4) - tall * RANKS[NEAREST].foot;
  ranks[NEAREST].push({
    at: greatAt,
    high: greatHigh,
    lit: Math.max(26, tall * 1.25),
    shaded: clamp(ahead * GREAT_AHEAD, GREAT_AHEADS[0], GREAT_AHEADS[1]) - greatAt,
    drift: Math.min(DRIFT * greatHigh, Math.max(0, -greatAt - SPINE_CLEAR)),
    great: true,
  });

  // For each rank and column: the row of its top, and the dune that stands highest there (-1 on open ground).
  const shapes = ranks.map((dunes, index) => {
    const top = new Int16Array(w);
    const owner = new Int16Array(w).fill(-1);
    const ground = new Int16Array(w);
    for (let x = 0; x < w; x++) {
      const at = dir * (x - foxX);
      ground[x] = level(index) - Math.round(tall * ROLL * (1 + Math.sin((TURN * at) / ROLL_OVER + index * 2.3)));
      let most = 0;
      dunes.forEach((d, n) => {
        const up = lift(d, at);
        if (up > most) {
          most = up;
          owner[x] = n;
        }
      });
      top[x] = Math.min(ground[x], level(index) - Math.round(most));
      if (top[x] === ground[x]) {
        owner[x] = -1;
      }
    }
    return { top, owner, ground };
  });
  const tops = shapes.map(({ top }) => top);
  const horizon = Math.round(base - tall * 0.9);
  /** The row a rank is hidden from, column by column: the top of the next one, or the foot of the view. */
  const cover = (index: number): Int16Array => tops[index + 1] ?? new Int16Array(w).fill(h);

  // What each rank shows of itself, worked out once for both lights.
  const faces = ranks.map((dunes, index) => {
    const { top, owner, ground } = shapes[index];
    const hidden = cover(index);
    const runs: Runs[] = [[], [], [], []];
    const sandAt = (x: number, y: number): Sand => {
      const d = dunes[owner[x]];
      // Open ground, and the ground a dune stands on, lie in the light.
      if (!d || y >= ground[x]) {
        return Sand.Lit;
      }
      const at = dir * (x - foxX);
      if (at < spine(d, y - (level(index) - Math.round(d.high)))) {
        return Sand.Lit;
      }
      if (y === top[x] && at - d.at < d.shaded * RIMMED) {
        return Sand.Rim;
      }
      return d.great ? Sand.Deep : Sand.Shade;
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

  const tone = (ends: readonly [Lights, Lights], index: number, light: 0 | 1): string => mix(ends[0][light], ends[1][light], RANKS[index].near);
  const paintRank = (ctx: CanvasRenderingContext2D, index: number, light: 0 | 1): void => {
    const top = tops[index];
    ctx.fillStyle = tone(LIT, index, light);
    for (let x = 0; x < w; x++) {
      ctx.fillRect(x, top[x], 1, h - top[x]);
    }
    const fill = (sand: Sand, color: string): void => {
      ctx.fillStyle = color;
      faces[index][sand].forEach(([x, y, wide]) => ctx.fillRect(x, y, wide, 1));
    };
    fill(Sand.Shade, tone(SHADE, index, light));
    fill(Sand.Deep, GREAT_SHADE[light]);
    fill(Sand.Rim, tone(RIM, index, light));
  };

  const picture = (from: number, to: number, light: 0 | 1): HTMLCanvasElement =>
    prerender(w, h, (ctx) => {
      if (from === 0) {
        ctx.fillStyle = HORIZON[light];
        ctx.fillRect(0, horizon, w, h - horizon);
      }
      for (let index = from; index <= to; index++) {
        paintRank(ctx, index, light);
      }
    });

  // The crests the wind takes sand from: those in front of the worm that show.
  const crests: Crest[] = [];
  for (let index = BEHIND_WORM + 1; index < RANKS.length; index++) {
    for (const d of ranks[index]) {
      const x = foxX + dir * Math.round(d.at);
      if (x >= 0 && x < w && shapes[index].owner[x] >= 0 && tops[index][x] < cover(index)[x]) {
        crests.push({ x, y: tops[index][x], near: RANKS[index].near });
      }
    }
  }
  return {
    far: [picture(0, BEHIND_WORM, 0), picture(0, BEHIND_WORM, 1)],
    near: [picture(BEHIND_WORM + 1, NEAREST, 0), picture(BEHIND_WORM + 1, NEAREST, 1)],
    skyFoot: Math.max(horizon, ...tops[0]) + 1,
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
