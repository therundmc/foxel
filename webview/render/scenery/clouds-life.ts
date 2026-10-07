import { clamp01, px, ramp, seeded, type VistaView } from './paint';
import type { Land } from './clouds-land';

// What moves over the land: the wind in the grass, the shadows of the clouds, seeds and petals, and the birds.

/** The wind is a breath at first, picks up while the fox settles, and freshens again after the birds. */
const WIND_FROM_S = 9;
const WIND_FULL_S = 19;
const CALM = 0.3;

/** How hard it blows at `t`, from `CALM` to 1 and a little over. */
export function windAt({ t, moment }: VistaView): number {
  const after = moment === undefined ? 0 : 0.25 * ramp(moment, 1, 5);
  return CALM + (1 - CALM) * ramp(t, WIND_FROM_S, WIND_FULL_S) + after;
}

/** Gusts run over the meadow toward `dir`: -1 to 1, the same wave for whatever stands at `x`. */
function gust(x: number, t: number, dir: number): number {
  return 0.62 * Math.sin(t * 1.35 - x * dir * 0.085) + 0.38 * Math.sin(t * 0.52 - x * dir * 0.027 + 1.7);
}

export interface Tuft {
  readonly x: number;
  readonly y: number;
  readonly tall: number;
  readonly color: string;
  /** A flower's colour, if it carries one. */
  readonly bloom?: string;
}

const BLADES = ['#cdf283', '#b8e878', '#74bf5c', '#86cc62'];
const BLOOMS = ['#ffffff', '#ffffff', '#ffe36e', '#ffb3c6', '#fff3b0'];
const STEM = '#6fb85a';
/** Around the fox the grass is left alone, so that nothing fights with its outline. */
const FOX_CLEAR = 17;

/** Grass standing on the crest of the meadow and scattered over it, with a few flowers. */
export function plantMeadow(land: Land, w: number, h: number, foxX: number): Tuft[] {
  const random = seeded(0x9a55 + w);
  const tufts: Tuft[] = [];
  for (let x = 2 * random(); x < w; x += 2 + random() * 5) {
    const at = Math.floor(x);
    const top = land.meadow[at];
    const crest = random() < 0.55;
    const y = crest ? top : top + 1 + Math.floor(random() * Math.max(1, h - top - 2));
    const bloom = random() < 0.22 && Math.abs(at - foxX) > FOX_CLEAR ? BLOOMS[Math.floor(random() * BLOOMS.length)] : undefined;
    tufts.push({ x: at, y, tall: crest ? 1 + Math.floor(random() * 2.3) : 1, color: BLADES[Math.floor(random() * (crest ? 2 : 4))], bloom });
  }
  return tufts;
}

/** The grass and the flowers, leaning with each gust. */
export function drawMeadow(view: VistaView, tufts: readonly Tuft[]): void {
  const { ctx, t, dir } = view;
  const wind = windAt(view);
  for (const tuft of tufts) {
    const push = gust(tuft.x, t, dir) * wind;
    const lean = push > 0.42 ? dir : push < -0.85 ? -dir : 0;
    if (tuft.bloom) {
      px(ctx, tuft.x, tuft.y - 1, STEM);
      px(ctx, tuft.x + lean, tuft.y - 2, tuft.bloom);
      continue;
    }
    for (let n = 1; n <= tuft.tall; n++) {
      // Only the tip leans: a blade bends, it does not slide.
      px(ctx, tuft.x + (n === tuft.tall ? lean : 0), tuft.y - n, tuft.color);
    }
  }
}

/** Shadows of clouds sliding over the hills, toward the side the wind blows to. */
export function drawShadows({ ctx, w, t, dir }: VistaView, land: Land): void {
  const random = seeded(0x5ade);
  const count = Math.max(2, Math.round(w / 110));
  for (let n = 0; n < count; n++) {
    const rx = (13 + random() * 15) * land.k;
    const ry = Math.max(2, Math.round((1.6 + random()) * land.k + 1));
    const span = w + 2 * rx + 60 + random() * 80;
    // They all start out of sight, and come in one after the other.
    const along = ((n / count) * span * 0.9 + random() * 20 + t * (2 + random() * 1.4) * land.k) % span;
    const x = dir > 0 ? along - rx - 40 : w + rx + 40 - along;
    const column = Math.min(w - 1, Math.max(0, Math.round(x)));
    const y = land.hill[column] + Math.round((land.meadow[column] - land.hill[column]) * (0.2 + 0.5 * random()));
    for (let dy = -ry; dy <= ry; dy++) {
      const half = Math.round(rx * Math.sqrt(1 - (dy / (ry + 0.5)) ** 2));
      const from = Math.max(0, Math.round(x) - half);
      const to = Math.min(w, Math.round(x) + half);
      if (to > from && y + dy >= 0) {
        ctx.drawImage(land.shaded, from, y + dy, to - from, 1, from, y + dy, to - from, 1);
      }
    }
  }
}

const MIST = '#eaf4fc';

/** Long thin veils of mist lying at the foot of the far range, hardly moving. */
export function drawMist({ ctx, w, t, dir }: VistaView, land: Land): void {
  const random = seeded(0x3157);
  const count = Math.max(2, Math.round(w / 70));
  for (let n = 0; n < count; n++) {
    const length = Math.round(24 + random() * 46 * land.k);
    const span = w + 140;
    const x = ((((n / count) * span + random() * 30 + dir * t * (0.25 + random() * 0.25)) % span) + span) % span - 70;
    const y = land.footY - Math.round(random() * 5 * land.k);
    px(ctx, x, y, MIST, 0.8, length, 1);
    px(ctx, x + Math.round(length * 0.2), y - 1, MIST, 0.8, Math.round(length * 0.5), 1);
    px(ctx, x - 4, y + 1, MIST, 0.5, length + 8, 1);
  }
}

/** Seeds do not fly before the wind has picked up; each one lives this long. */
const SEEDS_FROM_S = 13;
const SEED_LIFE_S = 17;
const SEED = '#ffffff';
const SEED_TAIL = '#efe6c8';
const PETAL = '#ffc4d4';
const PETAL_DARK = '#f59fb8';

/** Dandelion seeds lifting off the meadow and, once the birds have passed, petals come from somewhere upwind. */
export function drawDrift(view: VistaView, land: Land): void {
  const { ctx, w, h, t, dir, moment } = view;
  const count = Math.min(14, Math.max(4, Math.round(w / 24)));
  for (let n = 0; n < count; n++) {
    const first = SEEDS_FROM_S + (n * 5.3) % 19 + n * 0.4;
    const since = t - first;
    if (since < 0) {
      continue;
    }
    const round = Math.floor(since / SEED_LIFE_S);
    const age = since - round * SEED_LIFE_S;
    const random = seeded(n * 977 + round * 131 + 7);
    const from = random() * w;
    const column = Math.min(w - 1, Math.max(0, Math.floor(from)));
    const speed = 5 + random() * 5;
    const lift = 1.1 + random() * 1.6;
    const sway = random() * 6.28;
    // Carried along, rising, and rocked by each gust.
    const x = from + dir * (speed * age + 2.5 * Math.sin(age * 0.9 + sway));
    const y = land.meadow[column] - 1 - lift * age - 1.8 * Math.sin(age * 1.4 + sway) * ramp(age, 0, 2);
    const alpha = Math.min(ramp(age, 0, 0.8), 1 - ramp(age, SEED_LIFE_S - 2.5, SEED_LIFE_S));
    px(ctx, x, y, SEED, alpha);
    px(ctx, x - dir * 0.6, y + 1, SEED_TAIL, alpha * 0.75);
  }
  if (moment === undefined) {
    return;
  }
  const petals = Math.min(9, Math.max(3, Math.round(w / 40)));
  for (let n = 0; n < petals; n++) {
    const random = seeded(n * 613 + 29);
    const age = moment - 3.5 - n * 1.7 - random() * 2;
    if (age < 0) {
      continue;
    }
    const speed = 9 + random() * 6;
    const fall = 2.2 + random() * 1.8;
    const sway = random() * 6.28;
    // They come in from upwind, a little above the fox's head, and sink as they cross.
    const along = -6 + speed * age + 3 * Math.sin(age * 1.1 + sway);
    const x = dir > 0 ? along : w - along;
    const y = Math.max(2, h - 46) + random() * 14 + fall * age + 2 * Math.sin(age * 1.7 + sway);
    if (y < h - 1) {
      // A petal tumbles: seen flat, then edge on.
      const flat = Math.sin(age * 5 + sway) > 0;
      px(ctx, x, y, PETAL, 1, flat ? 2 : 1, 1);
      px(ctx, x, y + 1, PETAL_DARK, flat ? 0 : 1);
    }
  }
}

/** The flight of the birds: this long from the hills to the great cloud. */
const FLIGHT_S = 10;
const FLOCK = 7;
/** The last two stay behind and wheel in the sky for as long as the fox watches. */
const WHEELERS = 2;
const WHEEL_FROM_S = 4.5;
const WHEEL_BY_S = 9;
const WHEEL_TURN_S = 9;
const FLAPS_PER_S = 3.2;
const BIRD = '#3f4d78';
const BIRD_FAR = '#6679a6';
/** Past this much of the way they are small and far, and pass behind the great cloud. */
const FAR_AFTER = 0.62;

export interface Flyway {
  /** Where the birds rise from, the point they pass over, and where they are lost to sight. */
  readonly from: readonly [number, number];
  readonly over: readonly [number, number];
  readonly to: readonly [number, number];
  /** The middle of the circle the last two keep turning in. */
  readonly wheel: readonly [number, number];
}

/** Wings up, level, down, level: rows of pixels around the body. */
const WINGS: readonly (readonly (readonly [number, number])[])[] = [
  [[-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1]],
  [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0]],
  [[-2, 1], [-1, 0], [0, 0], [1, 0], [2, 1]],
];
const WINGS_FAR: readonly (readonly (readonly [number, number])[])[] = [
  [[-1, -1], [0, 0], [1, -1]],
  [[-1, 0], [0, 0], [1, 0]],
  [[-1, 1], [0, 0], [1, 1]],
];

/**
 * The flock, `moment` seconds after it took off. It is drawn in two goes: the `far` birds before the great
 * clouds, so that they are lost behind them, the others in front of the far mountains.
 */
export function drawBirds({ ctx, dir, moment }: VistaView, way: Flyway, far: boolean): void {
  if (moment === undefined) {
    return;
  }
  for (let n = 0; n < FLOCK; n++) {
    const row = Math.ceil(n / 2);
    const side = n % 2 === 0 ? -1 : 1;
    const wheeler = n >= FLOCK - WHEELERS;
    // They slow down as they get far: most of the way is flown in the first seconds, when the fox follows them.
    const p = 1 - (1 - clamp01((moment - row * 0.14) / FLIGHT_S)) ** 2.4;
    if (p <= 0 || (p >= 1 && !wheeler)) {
      continue;
    }
    // A curve through the three points: over the middle one at 0.45 of the way.
    const curve = (i: 0 | 1): number => {
      const bend = (way.over[i] - 0.3025 * way.from[i] - 0.2025 * way.to[i]) / 0.495;
      return (1 - p) ** 2 * way.from[i] + 2 * p * (1 - p) * bend + p ** 2 * way.to[i];
    };
    const spread = 0.35 + 0.65 * ramp(p, 0, 0.2);
    let x = curve(0) - dir * row * 4.4 * spread + Math.sin(moment * 1.3 + n) * 0.8;
    let y = curve(1) + side * row * 2.1 * spread + Math.sin(moment * 2.1 + n * 2) * 0.7;
    let small = p > FAR_AFTER;
    if (wheeler) {
      const stay = ramp(moment, WHEEL_FROM_S, WHEEL_BY_S);
      const turn = (moment / WHEEL_TURN_S + (n - FLOCK) * 0.5) * Math.PI * 2;
      x += (way.wheel[0] + Math.cos(turn) * 8 * dir - x) * stay;
      y += (way.wheel[1] + Math.sin(turn) * 2.6 - y) * stay;
      small = moment > WHEEL_FROM_S;
    }
    if ((small && !wheeler) !== far) {
      continue;
    }
    // Far birds glide more than they beat.
    const beat = (moment * (small ? FLAPS_PER_S * 0.6 : FLAPS_PER_S) + n * 0.37) % 1;
    const pose = beat < 0.3 ? 0 : beat < 0.5 ? 1 : beat < 0.8 ? 2 : 1;
    for (const [dx, dy] of (small ? WINGS_FAR : WINGS)[pose]) {
      px(ctx, Math.round(x) + dx, Math.round(y) + dy, small ? BIRD_FAR : BIRD);
    }
  }
}
