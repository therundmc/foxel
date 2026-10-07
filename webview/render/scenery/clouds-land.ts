import { clamp01, seeded } from './paint';
import { peakOf, type Peak } from './peak';
import { paintPeak } from './clouds-peak';
import { blend, Pixels, rgb, wander, type Rgb } from './clouds-pixels';

// The land under the sky, painted once for a size and never moving: far ranges of mountains fading into blue,
// the great peak standing over them, and nearer, forested then green hills.

export interface Land {
  /** The far range with the great peak in front of it, and what hides their feet: a nearer range and the hills. */
  readonly far: HTMLCanvasElement;
  readonly near: HTMLCanvasElement;
  readonly peak: Peak;
  /** The row of the great peak's summit. */
  readonly summitY: number;
  /** How big everything but the peak is drawn: 1 in a view 64 high. */
  readonly k: number;
  /** Where the sky ends, more or less: the usual height of the far crests. */
  readonly skyline: number;
  /** Where the far range is lost behind the nearer one: mist gathers there, and the clouds stand behind it. */
  readonly footY: number;
}

interface Summit {
  readonly x: number;
  readonly top: number;
  readonly slope: number;
}

interface RangeLook {
  readonly lit: Rgb;
  readonly shade: Rgb;
  /** What its foot fades into. */
  readonly air: Rgb;
}

const FAR: RangeLook = { lit: rgb('#cfe0f7'), shade: rgb('#a3bdea'), air: rgb('#d3e6f7') };
const MID: RangeLook = { lit: rgb('#93b6e2'), shade: rgb('#7c9fd4'), air: rgb('#a9c8ea') };
const FOREST = { rim: rgb('#98ccb6'), body: rgb('#7ab5ab'), deep: rgb('#6da8a8') };
const HILL = { rim: rgb('#b9e28e'), body: rgb('#93d187') };

/** How high the far range stands, as shares of the great peak: its tallest summit comes to about half of it. */
const FAR_HIGH = [0.2, 0.5] as const;
/** The mountains right behind the fox stay this much lower, to leave it some sky. */
const BEHIND_FOX = 0.6;
/** How far down a range is filled under its foot: the next one hides the rest. */
const FOOT_DEPTH = 12;

const tri = (v: number): number => Math.abs((((v % 1) + 1) % 1) - 0.5) * 2;

/** The scale of the land for a view `h` high: the fox must keep some sky, even in the shortest panel. */
const landScale = (h: number): number => Math.min(1.2, Math.max(0.42, (h - 16) / 48));

function summitsOf(random: () => number, w: number, spacing: number, top: (x: number) => number, slope: () => number): Summit[] {
  const summits: Summit[] = [];
  for (let x = -spacing * random(); x < w + spacing; x += spacing * (0.65 + 0.7 * random())) {
    const summit = { x, top: top(x), slope: slope() };
    summits.push(summit);
    // A shoulder or two on its flanks, so that a mountain is more than one triangle.
    for (let n = 0, count = 1 + Math.floor(random() * 2); n < count; n++) {
      const down = spacing * (0.1 + 0.16 * random());
      const side = random() < 0.5 ? -1 : 1;
      summits.push({ x: x + (side * down * (0.5 + random() * 0.5)) / summit.slope, top: summit.top + down, slope: summit.slope * (1.15 + 0.5 * random()) });
    }
  }
  return summits;
}

/**
 * Paints one range into `out`: each pixel belongs to the nearest summit that covers it, and is lit or not
 * according to the side of that summit's spine it lies on.
 */
function paintRange(out: Pixels, summits: readonly Summit[], look: RangeLook, foot: number, dir: number, seed: number): void {
  const rough = wander(seed);
  // Lower summits stand in front of higher ones.
  const order = [...summits].sort((a, b) => b.top - a.top);
  const height = Math.max(1, foot - Math.min(...summits.map((p) => p.top)));
  const from = Math.max(0, Math.floor(foot - height) - 3);
  for (let x = 0; x < out.w; x++) {
    // Whatever stands in front hides the rows further down.
    for (let y = from; y < Math.min(out.h, foot + FOOT_DEPTH); y++) {
      const owner = order.find((p, n) => y >= p.top + Math.abs(x - p.x) * p.slope + rough(x * 0.31 + n * 9) * 1.4);
      if (!owner && y < foot) {
        continue;
      }
      const down = owner ? y - owner.top : 0;
      // The spine zigzags down from the summit, drifting to the shaded side.
      const sunny = owner !== undefined && (x - owner.x) * dir > tri(down / 6) * 2 - down * 0.18 - 1;
      // Flat steps of haze toward the foot.
      const haze = Math.floor(clamp01((y - (foot - height * 0.7)) / (height * 0.7)) * 2.99) / 2;
      out.set(x, y, blend(sunny ? look.lit : look.shade, look.air, haze * 0.5));
    }
  }
}

export function paintLand(w: number, h: number, foxX: number, dir: 1 | -1): Land {
  const random = seeded(0xc10d + w * 31 + h);
  const k = landScale(h);
  const peak = peakOf({ w, h, foxX, dir });
  const far = new Pixels(w, h);
  const near = new Pixels(w, h);
  const base = h - (4 + 2 * k);

  // The far range: sharp summits, all of them well under the great peak that stands in front of them.
  const farFoot = Math.round(base - 12 * k);
  const farFill = farFoot + Math.ceil(4 * k);
  const farHigh = (x: number): number => peak.tall * (FAR_HIGH[0] + (FAR_HIGH[1] - FAR_HIGH[0]) * random()) * (Math.abs(x - foxX) < 24 ? BEHIND_FOX : 1);
  paintRange(far, summitsOf(random, w, 30 * k + 8, (x) => farFoot - farHigh(x), () => 0.55 + 0.4 * random()), FAR, farFill, dir, 11);
  const peakFoot = farFoot + Math.round(2 * k);
  paintPeak(far, peak, peakFoot, farFill, dir);
  far.flush();

  // The nearer range: lower, rounder, bluer.
  const midFoot = Math.round(base - 8 * k);
  paintRange(near, summitsOf(random, w, 46 * k + 10, () => midFoot - k * (4 + 7 * random()), () => 0.3 + 0.22 * random()), MID, midFoot + Math.ceil(4 * k), dir, 23);

  // Forested hills with a bumpy top, like treetops seen from afar, then bare green ones.
  const canopy = wander(37);
  const swells = [random() * 6, random() * 6, random() * 6, random() * 6];
  for (let x = 0; x < w; x++) {
    const top = Math.round(base - k * (9.5 + 2.4 * Math.sin(x / (33 * k) + swells[0]) + 1.3 * Math.sin(x / (14 * k) + swells[1])) - (canopy(x * 0.8) > 0.2 ? 1 : 0));
    const hill = Math.round(base - k * (5.2 + 2.3 * Math.sin(x / (45 * k) + swells[2]) + 1.1 * Math.sin(x / (17 * k) + swells[3])));
    for (let y = top; y < hill; y++) {
      near.set(x, y, y === top ? FOREST.rim : y - top > 3 * k ? FOREST.deep : FOREST.body);
    }
    for (let y = hill; y < h; y++) {
      near.set(x, y, y === hill ? HILL.rim : HILL.body);
    }
  }
  near.flush();

  return { far: far.canvas, near: near.canvas, peak, summitY: peakFoot - peak.tall, k, skyline: farFoot - 8 * k, footY: farFoot };
}
