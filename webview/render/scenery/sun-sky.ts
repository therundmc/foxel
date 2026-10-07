import { clamp01, px, ramp, seeded } from './paint';
import { blend, css, type Rgb } from './sun-palette';

// What lives in the sky of the sunrise and the sunset: long clouds lit from below, a few stars, and the birds.

const TAU = Math.PI * 2;

export interface Cloud {
  readonly x: number;
  readonly y: number;
  /** Pixels a second: the higher the cloud, the closer, the faster. */
  readonly speed: number;
  /** 0 for the first to catch the light, 1 for the last. */
  readonly rank: number;
  readonly depth: number;
  /** Its rows of pixels, top down: row, x offset, length. */
  readonly rows: Int16Array;
}

/** A long streak with a flat belly and a stepped back, and a shred or two torn off its ends. */
function streak(length: number, depth: number, random: () => number): Int16Array {
  const rows: number[] = [depth - 1, 0, length];
  let from = 0;
  let len = length;
  for (let row = depth - 2; row >= 0; row--) {
    from += 2 + Math.floor(random() * len * 0.25);
    len = length - from - 2 - Math.floor(random() * len * 0.3);
    len = Math.min(len, length - from);
    if (len < 4) {
      break;
    }
    if (len > 22 && random() < 0.45) {
      // Two bumps rather than one long back.
      const cut = Math.floor(len * (0.35 + random() * 0.3));
      rows.push(row, from, cut - 2, row, from + cut + 2, len - cut - 2);
    } else {
      rows.push(row, from, len);
    }
  }
  if (random() < 0.7) {
    const shred = 3 + Math.floor(random() * 5);
    rows.push(depth - 1, -2 - shred, shred);
  }
  if (random() < 0.7) {
    rows.push(depth - 1, length + 2, 2 + Math.floor(random() * 5));
  }
  return Int16Array.from(rows);
}

/**
 * Clouds from just above `floor` up to the top: thin and long near the horizon, fuller higher up.
 * `rankOf` says when each one takes or loses the light, from where it is.
 */
export function layClouds(
  w: number,
  floor: number,
  seed: number,
  rankOf: (x: number, y: number, level: number) => number,
): Cloud[] {
  const random = seeded(seed);
  const sky = Math.max(8, floor - 3);
  const count = Math.round(Math.min(14, Math.max(3, (w * sky) / 1400)));
  const margin = 50;
  const clouds: Cloud[] = [];
  for (let i = 0; i < count; i++) {
    const level = (i + 0.2 + 0.6 * random()) / count;
    const y = Math.round(floor - 3 - level ** 1.15 * (sky - 4));
    const depth = sky < 26 ? 1 + Math.round(level) : level < 0.3 ? 1 + Math.floor(random() * 2) : 2 + Math.floor(random() * 2.4);
    const length = Math.round((20 + random() * 36) * (1.25 - 0.5 * level) * Math.min(1.3, Math.max(0.7, w / 200)));
    const x = ((i * 0.618034 + random() * 0.25) % 1) * (w + 2 * margin) - margin - length / 2;
    clouds.push({ x, y, speed: 0.22 + 0.5 * level, rank: clamp01(rankOf(x + length / 2, y, level)), depth, rows: streak(length, depth, random) });
  }
  return clouds;
}

/** `lightOf` gives, for a cloud's rank, how much of the light its belly catches (0 to 1). */
export function drawClouds(
  ctx: CanvasRenderingContext2D,
  clouds: readonly Cloud[],
  drift: number,
  tones: { readonly cloud: Rgb; readonly cloudLit: Rgb; readonly cloudShade: Rgb },
  lightOf: (rank: number) => number,
): void {
  for (const cloud of clouds) {
    const x = Math.round(cloud.x + drift * cloud.speed);
    const light = lightOf(cloud.rank);
    const belly = css(blend(tones.cloud, tones.cloudLit, light));
    const body = css(blend(tones.cloud, tones.cloudLit, light * 0.4));
    const back = css(blend(tones.cloud, tones.cloudShade, 0.7));
    const { rows, depth } = cloud;
    for (let i = 0; i < rows.length; i += 3) {
      const row = rows[i];
      ctx.fillStyle = row === depth - 1 ? belly : row === 0 && depth > 2 ? back : body;
      ctx.fillRect(x + rows[i + 1], cloud.y - (depth - 1) + row, rows[i + 2], 1);
    }
  }
}

/** Stars over the top of the sky: x, y, how late it stays (or how early it comes), shine, twinkle rate, phase. */
export function layStars(w: number, top: number, bottom: number, seed: number): Float32Array {
  const random = seeded(seed);
  const tall = Math.max(4, bottom - top);
  const count = Math.round(Math.min(110, Math.max(6, (w * tall) / 230)));
  const stars = new Float32Array(count * 6);
  for (let i = 0; i < count; i++) {
    const high = random() ** 1.6;
    stars.set([Math.floor(random() * w), top + Math.floor(high * tall), clamp01(0.65 * (1 - high) + 0.35 * random()), 0.45 + 0.55 * random(), 0.6 + random() * 1.6, random() * TAU], i * 6);
  }
  return stars;
}

export function drawStars(ctx: CanvasRenderingContext2D, stars: Float32Array, t: number, color: string, litOf: (late: number) => number): void {
  for (let i = 0; i < stars.length; i += 6) {
    const lit = litOf(stars[i + 2]);
    if (lit > 0) {
      px(ctx, stars[i], stars[i + 1], color, lit * stars[i + 3] * (0.72 + 0.28 * Math.sin(t * stars[i + 4] + stars[i + 5])));
    }
  }
}

/** The one bright star: a pixel with four fainter ones around it that breathe. */
export function drawBrightStar(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, lit: number): void {
  if (lit <= 0) {
    return;
  }
  const breath = 0.5 + 0.5 * Math.sin(t * 1.1);
  px(ctx, x, y, '#ffffff', lit);
  const arms = lit * (0.18 + 0.3 * breath);
  px(ctx, x - 1, y, '#fff6d8', arms);
  px(ctx, x + 1, y, '#fff6d8', arms);
  px(ctx, x, y - 1, '#fff6d8', arms);
  px(ctx, x, y + 1, '#fff6d8', arms);
}

// A bird is a few pixels: wings up, level, down, level. Seen big when close, then small, then a dash far away.
const BIG: readonly (readonly number[])[] = [
  [-2, -1, -1, 0, 0, 0, 1, 0, 2, -1],
  [-2, 0, -1, 0, 0, 0, 1, 0, 2, 0],
  [-2, 1, -1, 0, 0, 0, 1, 0, 2, 1],
  [-2, 0, -1, 0, 0, 0, 1, 0, 2, 0],
];
const SMALL: readonly (readonly number[])[] = [
  [-1, -1, 0, 0, 1, -1],
  [-1, 0, 0, 0, 1, 0],
  [-1, 1, 0, 0, 1, 1],
  [-1, 0, 0, 0, 1, 0],
];
const DASH: readonly number[] = [0, 0, 1, 0];
const BIRDS = 7;
const CRUISE = 13.5;
/** How long a bird is seen: it shrinks into the distance, then fades. */
const SHRINK_S = 8;
const SPECK_S = 14;
const GONE_S = 20;

export interface Flight {
  readonly x: number;
  readonly y: number;
  readonly dir: 1 | -1;
  /** How high they climb. */
  readonly lift: number;
  /** In a line, wing to wing, rather than scattering. */
  readonly formation: boolean;
  readonly small: boolean;
}

/** Each bird's own way of flying: delay, speed, climb, phase. */
const WAYS = ((): Float32Array => {
  const random = seeded(0xb12d);
  const ways = new Float32Array(BIRDS * 4);
  for (let i = 0; i < BIRDS; i++) {
    ways.set([i === 0 ? 0 : random() * 1.3, 0.85 + random() * 0.4, 0.45 + random() * 0.55, random() * TAU], i * 4);
  }
  return ways;
})();

function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, age: number, wing: number, small: boolean, color: string): void {
  // Wings beat fast at take-off, then settle into a slow rowing.
  const beat = Math.floor((1.5 * age + 3.5 * (1 - Math.exp(-age / 2.5))) * 4 + wing) % 4;
  const shape = age > SPECK_S ? DASH : age > SHRINK_S || small ? SMALL[beat] : BIG[beat];
  const alpha = 1 - ramp(age, GONE_S - 4, GONE_S);
  for (let i = 0; i < shape.length; i += 2) {
    px(ctx, Math.round(x) + shape[i], Math.round(y) + shape[i + 1], color, alpha);
  }
}

/** The birds, `since` seconds after they took off. They rise from behind the knoll: paint them before it. */
export function drawBirds(ctx: CanvasRenderingContext2D, flight: Flight, since: number, color: string): void {
  const { dir, lift, formation, small } = flight;
  for (let i = 0; i < BIRDS; i++) {
    if (formation) {
      // An arrowhead that opens as it climbs: each bird flies in the wake of the one ahead.
      const place = Math.ceil(i / 2);
      const age = since - 0.34 * place;
      if (age > 0 && age < GONE_S) {
        const side = i % 2 === 0 ? 1 : -1;
        const y = flight.y - lift * (1 - Math.exp(-age / 3.2)) - 0.3 * age + side * place * 2 * ramp(age, 0.8, 4);
        drawBird(ctx, flight.x + dir * CRUISE * age, y, age, i, small, color);
      }
    } else {
      const age = since - WAYS[i * 4];
      if (age > 0 && age < GONE_S) {
        const x = flight.x + dir * (CRUISE * WAYS[i * 4 + 1] * age - (i % 3) * 3);
        const y = flight.y - lift * WAYS[i * 4 + 2] * (1 - Math.exp(-age / 2.4)) - 0.45 * age + 1.3 * Math.sin(age * 1.6 + WAYS[i * 4 + 3]);
        drawBird(ctx, x, y, age, WAYS[i * 4 + 3], small, color);
      }
    }
  }
}
