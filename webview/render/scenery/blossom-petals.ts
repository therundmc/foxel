import { boughsOf } from './blossom-boughs';
import { breezeAt, clamp, hash } from './blossom-wind';
import { lookoutTop } from './lookout';
import { ramp, type VistaView } from './paint';

// The petals. A few at a time let go of the boughs and come down rocking and turning, carried a little by the
// breeze. At the great moment a breath of wind takes a whole stream of them at once: hanafubuki, a blizzard of
// blossom, a long curling ribbon flowing across the view. Some end on the grass of the lookout.

/** A petal is near-white, pale pink or a deeper pink; the same as `r,g,b` for the ones that settle. */
const PETALS = ['#fffaf9', '#fbcfdb', '#f0a5be'] as const;
const SETTLED = ['255,248,247', '251,211,221', '241,174,196'] as const;

// One petal, turning as it goes: now facing us, now edge on. A big one is two pixels across.
function petal(ctx: CanvasRenderingContext2D, x: number, y: number, turn: number, big: boolean): void {
  const face = Math.floor(turn) % 3;
  ctx.fillRect(Math.round(x), Math.round(y), face === 2 && big ? 1 : big || face === 0 ? 2 : 1, big && face !== 1 ? 2 : 1);
}

/** One depth of falling petals: [seed, square pixels for each, pixels a second, how far it rocks, whether it is close to us]. */
export type Fall = readonly [seed: number, area: number, speed: number, rock: number, big: boolean];
export const FAR_PETALS: Fall = [1, 210, 7, 3, false];
export const NEAR_PETALS: Fall = [2, 800, 10, 5, true];
const MOST_FALLING = 400;
/** Pixels a second the breeze carries a falling petal sideways. */
const DRIFTS = 5;
/** Of the petals that fall, how many come from the boughs in view, the others from the tree over our heads; and how many of those from the greater bough. */
const FROM_BOUGHS = 0.7;
const FROM_GREAT = 0.62;
/** Of all the petals that could fall: how many do in still air, how many more in the breeze, and after the breath of wind. */
const FALLING = 0.22;
const IN_BREEZE = 0.3;
const AFTER_GUST = 0.38;

function fallingAt(time: number, gustAt: number | undefined): number {
  const breeze = breezeAt(time);
  return FALLING + IN_BREEZE * breeze * breeze + (gustAt === undefined ? 0 : AFTER_GUST * ramp(time - gustAt, 0.5, 4));
}

/**
 * Petals coming down. Each is a little clock: it lets go, comes down rocking, then starts again elsewhere. Whether
 * it falls at all is settled when it lets go, so they come in handfuls with the breeze.
 */
export function paintFalling(view: VistaView, [seed, area, speed, rock, big]: Fall): void {
  const { ctx, w, h, t, moment, dir } = view;
  const { size } = boughsOf(view);
  const gustAt = moment === undefined ? undefined : t - moment;
  const count = Math.min(MOST_FALLING, Math.ceil((w * h) / area));
  PETALS.forEach((color, tone) => {
    ctx.fillStyle = color;
    for (let i = tone; i < count; i += PETALS.length) {
      const pace = speed * (0.75 + 0.5 * hash(i, seed));
      const cycle = (h + 8) / pace;
      const at = t + hash(i, seed + 10) * cycle;
      const fall = Math.floor(at / cycle);
      const since = at - fall * cycle;
      if (hash(i + seed * 0.37, fall) >= fallingAt(t - since, gustAt)) {
        continue;
      }
      const where = hash(fall, i + seed * 3.1);
      const spot = hash(fall + 0.5, i + seed * 5.3);
      const great = where < FROM_BOUGHS * FROM_GREAT;
      const aside = spot * size * (great ? 1.9 : 1.2);
      const fromBough = where < FROM_BOUGHS;
      const x0 = !fromBough ? spot * w : (great ? -dir : dir) < 0 ? aside : w - aside;
      const y0 = fromBough ? size * (0.2 + 0.5 * hash(i, fall + 3)) : -3;
      const swing = since * (1.5 + 0.7 * hash(i, seed + 4)) + i;
      // It dips in the middle of each swing and hangs at its ends, like anything light that falls.
      const y = y0 + since * pace + 1.2 * Math.cos(2 * swing);
      if (y < h) {
        ctx.globalAlpha = Math.min(1, since * 2);
        petal(ctx, x0 + rock * Math.sin(swing) + dir * since * DRIFTS * (0.6 + 0.8 * hash(i, seed + 6)), y, since * 2.2 + i, big);
      }
    }
  });
  ctx.globalAlpha = 1;
}

/** The stream: when it lets go once the moment has begun, how long it is thick, how long it takes to thin out, and when the last of it is gone. */
const LETS_GO_S = 0.15;
const THICK_S = 3.5;
const THINS_S = 6;
const OVER_S = 34;
/** How many petals it carries for each pixel of width, at least and at most; how many of them pass in front of the fox. */
const CARRIES = 7;
const FEWEST = 400;
const MOST = 2200;
const IN_FRONT = 0.07;
/** In the stream there are more pink petals than white ones, so it shows against the pale sky. */
const STREAM_TONES = [0, 1, 2, 1] as const;
/** How many leave the ribbon on the way and come down, how fast they then sink, in pixels a second, and how long they take to slow. */
const LEAVE = 0.3;
const SINKS = 9;
const SLOWS_S = 0.4;

/** What is settled once for each petal of the stream: when it lets go, its pace, where it leaves the ribbon, where it starts, its place across the ribbon. */
const [WAIT, PACE, LEAVES, ASIDE, LANE, HEIGHT, FIELDS] = [0, 1, 2, 3, 4, 5, 6];
let carried: Float32Array | undefined;

function streamOf(count: number): Float32Array {
  if (carried?.length !== count * FIELDS) {
    carried = new Float32Array(count * FIELDS);
    for (let i = 0; i < count; i++) {
      const order = hash(i, 60);
      carried.set(
        [
          order < 0.7 ? (order / 0.7) * THICK_S : THICK_S + ((order - 0.7) / 0.3) ** 1.6 * THINS_S,
          0.8 + 0.4 * hash(i, 61),
          hash(i, 62) < LEAVE ? 0.25 + 0.75 * hash(i, 63) : Infinity,
          hash(i, 64),
          (hash(i, 65) + hash(i, 66) + hash(i, 67)) / 1.5 - 1,
          0.15 + 0.6 * hash(i, 68),
        ],
        i * FIELDS,
      );
    }
  }
  return carried;
}

/**
 * The blizzard of blossom: petals let go all along the greater bough, gather into one ribbon that waves and
 * twists as it flows toward the side the fox looks to, and some drop out of it on the way.
 */
export function paintStream(view: VistaView, near: boolean): void {
  const { ctx, w, h, t, moment, dir } = view;
  if (moment === undefined || moment > OVER_S) {
    return;
  }
  const { size } = boughsOf(view);
  const count = Math.round(clamp(w * CARRIES, FEWEST, MOST));
  const petals = streamOf(count);
  // The first of them are the ones that pass in front.
  const [first, last] = near ? [0, Math.round(count * IN_FRONT)] : [Math.round(count * IN_FRONT), count];
  const speed = clamp(w * 0.33, 55, 115);
  const wave = (2 * Math.PI) / clamp(w * 0.45, 60, 150);
  // It runs just over the fox's head; higher, in the sky, where the view is tall, and never diving too steeply where it is narrow.
  const cruise = Math.min(Math.max(h * 0.3, h - 46), h * 0.3 + 22, size * 0.5 + w * 0.5);
  const swell = clamp(h * 0.1, 3, 9);
  const thick = clamp(h * 0.13, 5, 14);
  STREAM_TONES.forEach((tone, pass) => {
    ctx.fillStyle = PETALS[tone];
    for (let i = first + pass; i < last; i += STREAM_TONES.length) {
      const at = i * FIELDS;
      const age = moment - LETS_GO_S - petals[at + WAIT];
      if (age <= 0) {
        continue;
      }
      const pace = speed * petals[at + PACE];
      // Once it has left the ribbon it slows down, sinks and rocks like any falling petal.
      const out = Math.max(0, age - (petals[at + LEAVES] * w) / pace);
      const run = pace * (age - out) + pace * SLOWS_S * (1 - Math.exp(-out / SLOWS_S)) + 6 * out;
      const along = petals[at + ASIDE] * 1.7 * size - 6 + run;
      if (along > w + 8) {
        continue;
      }
      const twist = 0.35 + 0.65 * Math.abs(Math.sin(along * wave * 0.5 - t * 0.9 + 1));
      const ribbon = cruise + swell * Math.sin(along * wave - t * 1.5 + 0.7 * Math.sin(along * 0.011 + t * 0.4)) + petals[at + LANE] * thick * twist + 1.5 * Math.sin(age * 5 + i);
      const start = size * petals[at + HEIGHT];
      const y = start + (ribbon - start) * ramp(run, 0, size * 1.3) + SINKS * out + 2 * Math.sin(out * 1.8 + i);
      if (y < h) {
        ctx.globalAlpha = Math.min(1, age * 4);
        petal(ctx, (dir > 0 ? 0 : w) + dir * along + 3 * Math.sin(out * 1.8 + i) * Math.min(1, out), y, age * 5 + i, near || i % 3 === 0);
      }
    }
  });
  ctx.globalAlpha = 1;
}

/** One petal on the ground for this many pixels of width; how wide the fox's place is, and the bird's beside it, kept clear. */
const GROUND_EVERY = 11;
const FOX_PLACE = [-19, 30] as const;
/** Of those, how many are there before the breath of wind, arriving one by one from then to then (seconds); the others come with it. */
const EARLY = 0.3;
const EARLY_S = [6, 24] as const;
const LATE_S = [1.5, 10] as const;
const LANDS_S = 0.8;

/** How much of a petal that lands at `at` (in seconds of the view, or of the moment if `late`) is there. */
function landed({ t, moment }: VistaView, late: boolean, at: number): number {
  return late ? (moment === undefined ? 0 : ramp(moment - at, 0, LANDS_S)) : ramp(t - at, 0, LANDS_S);
}

/** Petals lying on the grass of the lookout, in front: they gather one by one, and many more after the blizzard. */
export function paintSettled(view: VistaView): void {
  const { ctx, w, h, foxX, dir } = view;
  const count = Math.round(w / GROUND_EVERY);
  SETTLED.forEach((rgb, tone) => {
    ctx.fillStyle = `rgb(${rgb})`;
    for (let i = tone; i < count; i += SETTLED.length) {
      const x = Math.floor(((i + hash(i, 71)) / count) * w);
      const aside = (x - foxX) * dir;
      if (aside > FOX_PLACE[0] && aside < FOX_PLACE[1]) {
        continue;
      }
      const top = lookoutTop(view, x);
      const late = hash(i, 72) >= EARLY;
      const span = late ? LATE_S : EARLY_S;
      ctx.globalAlpha = landed(view, late, span[0] + hash(i, 73) * (span[1] - span[0]));
      ctx.fillRect(x, Math.min(h - 1, top + Math.floor(hash(i, 74) * (h - top))), 1, 1);
    }
  });
  ctx.globalAlpha = 1;
}

/** When each of the lookout's flowers comes: a petal caught on a blade of grass. The first before the breath of wind, in seconds of the view; the others after it. */
const CAUGHT_EARLY_S = [8, 14, 20] as const;
const CAUGHT_LATE_S = [2, 3.2, 4.4, 6, 8] as const;

/** The petals caught on the tallest blades of the lookout, as its flowers: each fades in when its time comes. */
export function caughtPetals(view: VistaView): string[] {
  return [...CAUGHT_EARLY_S, ...CAUGHT_LATE_S].map((at, i) => `rgba(${SETTLED[i % SETTLED.length]},${landed(view, i >= CAUGHT_EARLY_S.length, at).toFixed(2)})`);
}
