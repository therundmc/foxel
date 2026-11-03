import type { Craft } from './balloons-craft';
import type { Valley } from './balloons-land';
import { clamp01, seeded, type VistaView } from './paint';

// Who flies, when and where. Before the great moment one balloon, small and far, is puffed up on the valley
// floor and lifts. At the moment the whole festival rises out of the mist, one after another, behind the far
// hills, from the floor, from behind the slopes; a while later a big one, a fox's head, comes up from below the
// lookout and passes close by. All drift up and away with the breeze, toward the side the fox looks to.

/** The planes a balloon may rise from behind: the far hills, the middle slopes, the nearest slopes, the lookout. */
export type Depth = 0 | 1 | 2 | 3;

export interface Flight {
  readonly craft: Craft;
  readonly r: number;
  readonly depth: Depth;
  /** How far into the haze its distance takes it. */
  readonly haze: number;
  /** Where it starts: the column of its middle, the row of the foot of its basket. */
  readonly x: number;
  readonly y: number;
  /** When it lets go: seconds of the sky for the first one, of the great moment for the others. */
  readonly from: number;
  readonly early: boolean;
  /** Pixels a second, up once it is going and across with the breeze. */
  readonly rise: number;
  readonly drift: number;
  /** Its burner's own rhythm: seconds between two bursts, and where it starts in it. */
  readonly burns: number;
  readonly phase: number;
}

/** Where a balloon is in this frame. */
export interface Place {
  readonly x: number;
  readonly y: number;
  /** 1 once its envelope is full; less while it is still being puffed up on the ground. */
  readonly puff: number;
  readonly alpha: number;
  /** How hard its burner is going, from 0 to 1. */
  readonly burn: number;
}

/** The first balloon: it starts being puffed up, stands full, and lets go, in seconds of the sky. */
const PUFF_FROM_S = 2.5;
const PUFF_STEPS = [0.35, 0.55, 0.75, 0.9, 1] as const;
const PUFF_STEP_S = 1.8;
const LIFT_S = 12;
/** The festival: the first lets go this long after the moment, the others one after another. */
const FESTIVAL_S = 0.3;
const FESTIVAL_LAST_S = 13;
/** The big one passes close a little after the others have started. */
const CLOSE_S = 5;
/** Seconds a balloon takes to come out of the mist, and to get going once it has let go. */
const APPEAR_S = 1.2;
const LAG_S = 1.5;
/** How each plane's balloons fly, from the farthest: radius for a view 64 high, haze, rise and drift for the same. */
const PLANES = [
  { r: 2, haze: 0.38, rise: 0.6, drift: 0.35 },
  { r: 3, haze: 0.2, rise: 0.85, drift: 0.55 },
  { r: 4, haze: 0.06, rise: 1.2, drift: 0.8 },
  { r: 8, haze: 0, rise: 2.6, drift: 1.1 },
] as const;
/** The planes the festival's balloons rise from, in turn. */
const TURNS: readonly Depth[] = [1, 0, 2, 1, 0, 2, 1, 0, 1, 2, 0, 1, 2, 0, 1, 2, 1, 0, 2, 1];

const CORAL = '#ff8a8a';
const CREAM = '#fff3dc';
const BUTTER = '#ffd86b';
const MINT = '#8fdcb8';
const SKY = '#86c2f0';
const LILAC = '#bf9cf0';
const PINK = '#ffb0c8';
const PEACH = '#ffb27a';
const TEAL = '#58b4ae';
const BERRY = '#e8607a';

/** The cloths of the festival, in turn. */
const CRAFTS: readonly Craft[] = [
  { pattern: 'gores', colors: [CORAL, CREAM] },
  { pattern: 'rainbow', colors: [BERRY, PEACH, BUTTER, MINT, SKY, LILAC] },
  { pattern: 'heart', colors: [PINK, CREAM, BERRY] },
  { pattern: 'band', colors: [SKY, BUTTER, TEAL] },
  { pattern: 'patch', colors: [MINT, BUTTER, PINK] },
  { pattern: 'dots', colors: [LILAC, CREAM, '#9a7ad8'] },
  { pattern: 'gores', colors: [TEAL, BUTTER] },
  { pattern: 'band', colors: [PEACH, CREAM, CORAL] },
];
const FIRST: Craft = { pattern: 'gores', colors: [BERRY, BUTTER] };
const FOX: Craft = { pattern: 'fox', colors: ['#f39a3d', '#fff1d6'] };

const sizeFor = (depth: Depth, h: number): number =>
  depth === 3 ? Math.round(Math.min(12, Math.max(5, h * 0.13))) : Math.max(PLANES[depth].r, Math.round((PLANES[depth].r * h) / 64 - 0.2));

function flight(view: VistaView, depth: Depth, x: number, y: number, from: number, early: boolean, craft: Craft, random: () => number): Flight {
  const plane = PLANES[depth];
  const scale = Math.max(0.7, view.h / 64);
  return {
    craft,
    r: sizeFor(depth, view.h),
    depth,
    haze: plane.haze,
    x: Math.round(x),
    y: Math.round(y),
    from,
    early,
    rise: plane.rise * scale * (0.85 + 0.3 * random()),
    drift: plane.drift * (0.8 + 0.4 * random()),
    burns: 3.5 + 3 * random(),
    phase: random() * 4,
  };
}

/** The row a balloon of this plane rises from behind, in column `x`. */
function cover(valley: Valley, depth: Depth, x: number, h: number): number {
  const at = Math.max(0, Math.min(valley.far.tops.length - 1, Math.round(x)));
  switch (depth) {
    case 0:
      return valley.far.tops[at];
    case 1:
      return Math.min(valley.hollow, valley.mid.tops[at]);
    case 2:
      return Math.min(h - 3, valley.near.tops[at]);
    case 3:
      return h;
  }
}

function plan(view: VistaView, valley: Valley): Flight[] {
  const { w, h, dir } = view;
  const foxX = Math.round(view.foxX);
  const random = seeded(0xf1a7);
  const flights: Flight[] = [];
  // The first one is puffed up on the floor, by the river, a little short of the middle of the valley.
  const firstY = Math.round(valley.horizon + (valley.hollow - valley.horizon) * 0.7);
  const [, riverX, wide] = valley.river[firstY - valley.horizon];
  flights.push(flight(view, 1, riverX + dir * (wide / 2 + 5), firstY, LIFT_S, true, FIRST, random));

  // The festival: spread over the view, more of them toward the side the fox looks to, none starting right behind it.
  const count = Math.round(Math.min(20, Math.max(5, w / 18)));
  const behind = dir > 0 ? foxX : w - foxX;
  for (let i = 0; i < count; i++) {
    const depth = TURNS[i % TURNS.length];
    const spread = (0.5 + i * 0.618) % 1;
    let x = foxX + dir * (-behind + 6 + spread * (w - 12));
    if (Math.abs(x - foxX) < 16) {
      x += dir * 24;
    }
    // Bunched at first, so that the moment comes all at once, then more spaced out.
    const from = FESTIVAL_S + (FESTIVAL_LAST_S - FESTIVAL_S) * (i / Math.max(1, count - 1)) ** 1.5 + random() * 0.5;
    const r = sizeFor(depth, h);
    const y = cover(valley, depth, x, h) + Math.round(r * 0.6);
    flights.push(flight(view, depth, x, y, from, false, CRAFTS[i % CRAFTS.length], random));
  }

  // The big one comes up from below the lookout ahead of the fox, well clear of its head.
  const r = sizeFor(3, h);
  const ahead = dir > 0 ? w - foxX : foxX;
  const closeX = foxX + dir * Math.max(r + 14, Math.min(ahead * 0.3, 120));
  flights.push(flight(view, 3, closeX, h + Math.round(r * 2.6), CLOSE_S, false, FOX, random));
  // Nearer ones are painted over farther ones.
  return flights.sort((a, b) => a.depth - b.depth || a.r - b.r);
}

let kept: { key: string; flights: Flight[] } | undefined;

/** Every balloon of this view, laid out the first time it is asked for. */
export function flightsOf(view: VistaView, valley: Valley): readonly Flight[] {
  const key = `${view.w}:${view.h}:${Math.round(view.foxX)}:${view.dir}`;
  if (kept?.key !== key) {
    kept = { key, flights: plan(view, valley) };
  }
  return kept.flights;
}

/** How hard a burner is going `s` seconds into a rhythm of a burst every `every` seconds. */
function burst(s: number, every: number, share: number): number {
  const k = (((s / every) % 1) + 1) % 1;
  return k < share ? Math.sin((Math.PI * k) / share) : 0;
}

/** Where a balloon is now, or undefined when it has not come yet. */
export function placeOf(f: Flight, { t, moment, dir }: VistaView): Place | undefined {
  let s: number;
  let puff = 1;
  let alpha = 1;
  let burn: number;
  if (f.early) {
    const since = t - PUFF_FROM_S;
    if (since < 0) {
      return undefined;
    }
    puff = PUFF_STEPS[Math.min(PUFF_STEPS.length - 1, Math.floor(since / PUFF_STEP_S))];
    alpha = clamp01(since / APPEAR_S);
    s = t - f.from;
    // Its burner roars in long bursts while it is being filled, then now and then.
    burn = s < 0 ? burst(since, 1.6, 0.55) : Math.max(burst(s + f.phase, f.burns, 0.22), 1 - clamp01(s / 2));
  } else {
    if (moment === undefined || moment < f.from) {
      return undefined;
    }
    s = moment - f.from;
    alpha = clamp01(s / APPEAR_S);
    burn = Math.max(burst(s + f.phase, f.burns, 0.22), 1 - clamp01(s / 1.5));
  }
  const going = Math.max(0, s);
  const climb = f.rise * (going - LAG_S * (1 - Math.exp(-going / LAG_S)));
  // Higher up the breeze is stronger.
  const across = f.drift * going + 0.15 * climb;
  return { x: Math.round(f.x + dir * across), y: Math.round(f.y - climb), puff, alpha, burn };
}
