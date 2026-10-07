import { clamp01, px, ramp, seeded } from './paint';
import { blend, css, type Rgb } from './sun-palette';

// What lives in the sky of the sunrise and the sunset: a handful of long clouds lit from below, a few stars,
// and some far birds.

const TAU = Math.PI * 2;
/** Clouds are laid this far past both edges of the view, so the wind never uncovers an empty side. */
const PAST = 50;

export interface Cloud {
  readonly x: number;
  readonly y: number;
  /** Pixels a second: the higher the cloud, the closer, the faster. */
  readonly speed: number;
  /** How high it is in the sky, from 0 just over the horizon to 1 at the top: the light climbs and leaves in that order. */
  readonly level: number;
  readonly depth: number;
  /** Its rows of pixels, top down: row, x offset, length. */
  readonly rows: Int16Array;
}

/** A long cloud with a flat belly and a stepped back, in one or two swells. */
function streak(length: number, depth: number, random: () => number): Int16Array {
  const rows: number[] = [depth - 1, 0, length];
  let from = 0;
  let len = length;
  for (let row = depth - 2; row >= 0; row--) {
    from += 2 + Math.floor(random() * len * 0.25);
    len = Math.min(length - from - 2 - Math.floor(random() * len * 0.3), length - from);
    if (len < 4) {
      break;
    }
    if (len > 22 && random() < 0.45) {
      const cut = Math.floor(len * (0.35 + random() * 0.3));
      rows.push(row, from, cut - 2, row, from + cut + 2, len - cut - 2);
    } else {
      rows.push(row, from, len);
    }
  }
  return Int16Array.from(rows);
}

/** A handful of clouds from just above `floor` up to the top: thin and long near the horizon, fuller higher up. */
export function layClouds(w: number, floor: number, seed: number): Cloud[] {
  const random = seeded(seed);
  const sky = Math.max(8, floor - 3);
  const count = Math.round(Math.min(6, Math.max(3, ((w + 2 * PAST) * sky) / 3200)));
  const clouds: Cloud[] = [];
  for (let i = 0; i < count; i++) {
    const level = (i + 0.2 + 0.6 * random()) / count;
    const y = Math.round(floor - 3 - level ** 1.15 * (sky - 4));
    const depth = sky < 26 ? 1 + Math.round(level) : level < 0.3 ? 2 : 3 + Math.floor(random() * 2);
    const length = Math.round((36 + random() * 44) * (1.25 - 0.5 * level) * Math.min(1.3, Math.max(0.7, w / 200)));
    const x = ((i * 0.618034 + random() * 0.25) % 1) * (w + 2 * PAST) - PAST - length / 2;
    clouds.push({ x, y, speed: 0.15 + 0.35 * level, level, depth, rows: streak(length, depth, random) });
  }
  return clouds;
}

/**
 * `pan` is how far the whole bank has slid, `wind` how far a cloud of speed 1 has been blown on top of it.
 * `lightOf` gives, for a cloud's level, how much of the light its belly catches (0 to 1).
 */
export function drawClouds(
  ctx: CanvasRenderingContext2D,
  clouds: readonly Cloud[],
  pan: number,
  wind: number,
  tones: { readonly cloud: Rgb; readonly cloudLit: Rgb; readonly cloudShade: Rgb },
  lightOf: (level: number) => number,
): void {
  for (const cloud of clouds) {
    const x = Math.round(cloud.x + pan + wind * cloud.speed);
    const light = lightOf(cloud.level);
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
  const count = Math.round(Math.min(60, Math.max(5, (w * tall) / 380)));
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
  const arms = lit * (0.18 + 0.15 * (1 + Math.sin(t * 1.1)));
  px(ctx, x, y, '#ffffff', lit);
  px(ctx, x - 1, y, '#fff6d8', arms);
  px(ctx, x + 1, y, '#fff6d8', arms);
  px(ctx, x, y - 1, '#fff6d8', arms);
  px(ctx, x, y + 1, '#fff6d8', arms);
}

// A far bird is three pixels: wings up, level, down, level. Farther still, a dash.
const WINGS: readonly (readonly number[])[] = [
  [-1, -1, 0, 0, 1, -1],
  [-1, 0, 0, 0, 1, 0],
  [-1, 1, 0, 0, 1, 1],
  [-1, 0, 0, 0, 1, 0],
];
const DASH: readonly number[] = [0, 0, 1, 0];
/** Where each one flies behind and beside the first, and the phase of its wings. */
const SKEIN: readonly (readonly [number, number, number])[] = [[0, 0, 0], [-7, 3, 1.3], [-13, -2, 2.1], [-20, 4, 0.6]];
/** Pixels a second: far away, so slow. */
const CRUISE = 6;
const SPECK_S = 13;
const GONE_S = 20;

/** A few birds crossing the sky toward `dir`, `since` seconds after they came in sight from (`x`, `y`). */
export function drawBirds(ctx: CanvasRenderingContext2D, x: number, y: number, dir: 1 | -1, since: number, color: string): void {
  const alpha = ramp(since, 0, 1.5) * (1 - ramp(since, GONE_S - 5, GONE_S));
  if (alpha <= 0) {
    return;
  }
  for (const [back, down, phase] of SKEIN) {
    const bx = Math.round(x + dir * (CRUISE * since + back));
    const by = Math.round(y - 0.45 * since + down + Math.sin(since * 0.8 + phase));
    const shape = since > SPECK_S ? DASH : WINGS[Math.floor(since * 2.2 + phase) % 4];
    for (let i = 0; i < shape.length; i += 2) {
      px(ctx, bx + shape[i], by + shape[i + 1], color, alpha);
    }
  }
}
