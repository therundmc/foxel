import { clamp01, seeded } from './paint';
import { blend, Pixels, rgb, wander, type Rgb } from './clouds-pixels';

// The land under the sky, painted once for a size: ranges of mountains fading into blue with distance,
// forested and green hills, and the meadow hilltop the fox sits on.

export interface Land {
  /** The farthest range, on its own so that mist can lie in front of it. */
  readonly far: HTMLCanvasElement;
  /** The nearer range, the hills and the meadow. */
  readonly near: HTMLCanvasElement;
  /** The hills as they look under the shadow of a cloud. */
  readonly shaded: HTMLCanvasElement;
  /** How big everything is drawn: 1 in a view 64 high. */
  readonly k: number;
  /** Where the sky ends, more or less: the usual height of the far crests. */
  readonly skyline: number;
  /** Where the far range is lost behind the nearer one: mist gathers there, and the clouds stand behind it. */
  readonly footY: number;
  /** The top of the nearer range, of the green hills and of the meadow, for each column. */
  readonly ridge: Int16Array;
  readonly hill: Int16Array;
  readonly meadow: Int16Array;
}

interface Peak {
  readonly x: number;
  readonly top: number;
  readonly slope: number;
  readonly snowy: boolean;
}

interface RangeLook {
  readonly lit: Rgb;
  readonly shade: Rgb;
  /** What its foot fades into. */
  readonly air: Rgb;
}

const FAR: RangeLook = { lit: rgb('#cfe0f7'), shade: rgb('#a3bdea'), air: rgb('#d3e6f7') };
const MID: RangeLook = { lit: rgb('#93b6e2'), shade: rgb('#7c9fd4'), air: rgb('#a9c8ea') };
const SNOW_LIT = rgb('#ffffff');
const SNOW_SHADE = rgb('#dce8f9');
const FOREST = { rim: rgb('#8cc6ac'), body: rgb('#6caba1'), deep: rgb('#5e9c9b') };
const HILL = { rim: rgb('#a9df72'), body: rgb('#84c964'), deep: rgb('#70b85f') };
const MEADOW = { rim: rgb('#cdf283'), body: rgb('#a0dc6b'), deep: rgb('#86cc62'), fleck: rgb('#b8e878'), dark: rgb('#74bf5c') };
const TREE = { body: rgb('#3f8f58'), lit: rgb('#63b05e'), deep: rgb('#35795a'), trunk: rgb('#6a5238') };
const PINE = { body: rgb('#4a8a80'), lit: rgb('#63a48f') };
/** What a cloud's shadow does to the hills: cooler and darker. */
const SHADOW = rgb('#2b5f78');
const SHADOW_DEPTH = 0.3;

/** How far down a range is filled under its foot: the next one hides the rest. */
const FOOT_DEPTH = 12;

const tri = (v: number): number => Math.abs((((v % 1) + 1) % 1) - 0.5) * 2;

/** The scale of the land for a view `h` high: the fox must keep some sky, even in the shortest panel. */
export const landScale = (h: number): number => Math.min(1.2, Math.max(0.42, (h - 16) / 48));

function peaksOf(random: () => number, w: number, spacing: number, top: (x: number) => number, slope: () => number): Peak[] {
  const peaks: Peak[] = [];
  for (let x = -spacing * random(); x < w + spacing; x += spacing * (0.65 + 0.7 * random())) {
    const peak = { x, top: top(x), slope: slope(), snowy: false };
    peaks.push(peak);
    // A shoulder or two on its flanks, so that a mountain is more than one triangle.
    for (let n = 0, count = 1 + Math.floor(random() * 2); n < count; n++) {
      const down = spacing * (0.1 + 0.16 * random());
      const side = random() < 0.5 ? -1 : 1;
      peaks.push({ x: x + (side * down * (0.5 + random() * 0.5)) / peak.slope, top: peak.top + down, slope: peak.slope * (1.15 + 0.5 * random()), snowy: false });
    }
  }
  return peaks;
}

/**
 * Paints one range into `out`: each pixel belongs to the nearest peak that covers it, and is lit or not
 * according to the side of that peak's spine it lies on. Returns the top of the range for each column.
 */
function paintRange(out: Pixels, peaks: readonly Peak[], look: RangeLook, foot: number, dir: number, snowLine: number, seed: number): Int16Array {
  const rough = wander(seed);
  const tops = new Int16Array(out.w).fill(foot);
  // Lower peaks stand in front of higher ones.
  const order = [...peaks].sort((a, b) => b.top - a.top);
  const height = Math.max(1, foot - Math.min(...peaks.map((p) => p.top)));
  const from = Math.max(0, Math.floor(foot - height) - 3);
  for (let x = 0; x < out.w; x++) {
    // Whatever stands in front hides the rows further down.
    for (let y = from; y < Math.min(out.h, foot + FOOT_DEPTH); y++) {
      const owner = order.find((p, n) => y >= p.top + Math.abs(x - p.x) * p.slope + rough(x * 0.31 + n * 9) * 1.4);
      if (!owner && y < foot) {
        continue;
      }
      tops[x] = Math.min(tops[x], y);
      const down = owner ? y - owner.top : 0;
      // The spine zigzags down from the summit, drifting to the shaded side.
      const sunny = owner !== undefined && (x - owner.x) * dir > tri(down / 6) * 2 - down * 0.18 - 1;
      const snow = owner?.snowy && y < snowLine + tri(x / 5 + owner.x) * 2.6 - (sunny ? 0 : 1.5);
      const base = snow ? (sunny ? SNOW_LIT : SNOW_SHADE) : sunny ? look.lit : look.shade;
      // Flat steps of haze toward the foot.
      const haze = snow ? 0 : Math.floor(clamp01((y - (foot - height * 0.7)) / (height * 0.7)) * 2.99) / 2;
      out.set(x, y, blend(base, look.air, haze * 0.5));
    }
  }
  return tops;
}

function stampTree(put: (x: number, y: number, c: Rgb) => void, x: number, foot: number, size: number, dir: number, pine: boolean): void {
  const rows: number[] = pine ? (size > 1 ? [0, 0, 1, 1, 2] : [0, 1, 1]) : size > 1 ? [1, 2, 2, 1] : [0, 1, 1];
  const top = foot - rows.length;
  rows.forEach((half, n) => {
    for (let dx = -half; dx <= half; dx++) {
      const sunny = n < rows.length - 1 && (n === 0 || dx * dir === half) && (half > 0 || n === 0);
      const body = pine ? PINE.body : n === rows.length - 1 ? TREE.deep : TREE.body;
      put(x + dx, top + n, sunny ? (pine ? PINE.lit : TREE.lit) : body);
    }
  });
  if (!pine) {
    put(x, foot, TREE.trunk);
  }
}

export function paintLand(w: number, h: number, foxX: number, dir: 1 | -1): Land {
  const random = seeded(0xc10d + w * 31 + h);
  const k = landScale(h);
  const room = dir > 0 ? w - foxX : foxX;
  const far = new Pixels(w, h);
  const near = new Pixels(w, h);
  const shaded = new Pixels(w, h);
  const meadowBase = h - (4 + 2 * k);

  // The far range: sharp peaks, and one great snowy one on the side the fox looks to.
  const farFoot = Math.round(meadowBase - 12 * k);
  const heroX = foxX + dir * Math.min(150, Math.max(26, room * 0.4));
  const farPeaks = peaksOf(random, w, 30 * k + 8, (x) => farFoot - k * (5 + 9 * random()) * (Math.abs(x - foxX) < 24 ? 0.6 : 1), () => 0.55 + 0.4 * random())
    .filter((p) => Math.abs(p.x - heroX) > 14 * k + 6);
  farPeaks.push({ x: heroX, top: farFoot - 20 * k, slope: 0.82, snowy: true });
  const second = heroX + dir * (38 * k + 20);
  farPeaks.push({ x: second, top: farFoot - 15 * k, slope: 0.7, snowy: true });
  paintRange(far, farPeaks, FAR, farFoot + Math.ceil(4 * k), dir, farFoot - 13.5 * k, 11);
  far.flush();

  // The nearer range: lower, rounder, bluer.
  const midFoot = Math.round(meadowBase - 8 * k);
  const midPeaks = peaksOf(random, w, 46 * k + 10, () => midFoot - k * (3 + 6 * random()), () => 0.3 + 0.22 * random());
  const ridge = paintRange(near, midPeaks, MID, midFoot + Math.ceil(4 * k), dir, -1, 23);

  const hill = new Int16Array(w);
  const meadow = new Int16Array(w);
  const canopy = wander(37);
  const swells = [random() * 6, random() * 6, random() * 6, random() * 6, random() * 6];
  // The meadow is in front of all this, and no cloud's shadow is drawn on it: the fox would not be under it.
  const both = (x: number, y: number, c: Rgb): void => {
    if (y >= meadow[x]) {
      return;
    }
    near.set(x, y, c);
    shaded.set(x, y, blend(c, SHADOW, SHADOW_DEPTH));
  };
  for (let x = 0; x < w; x++) {
    // Forested hills: a bumpy top, like treetops seen from afar.
    const forest = Math.round(meadowBase - k * (9.5 + 2.4 * Math.sin(x / (33 * k) + swells[0]) + 1.3 * Math.sin(x / (14 * k) + swells[1])) - (canopy(x * 0.8) > 0.2 ? 1 : 0));
    hill[x] = Math.round(meadowBase - k * (5.2 + 2.3 * Math.sin(x / (45 * k) + swells[2]) + 1.1 * Math.sin(x / (17 * k) + swells[3])));
    meadow[x] = Math.round(meadowBase - 1.6 * k * Math.exp(-(((x - foxX) / 55) ** 2)) - 0.7 * Math.sin(x / 27 + swells[4]));
    for (let y = forest; y < hill[x]; y++) {
      both(x, y, y === forest ? FOREST.rim : y - forest > 3 * k ? FOREST.deep : FOREST.body);
    }
    for (let y = hill[x]; y < meadow[x]; y++) {
      both(x, y, y === hill[x] ? HILL.rim : y - hill[x] > 2.5 * k + 1 ? HILL.deep : HILL.body);
    }
    for (let y = meadow[x]; y < h; y++) {
      const fleck = random();
      const flat = y === meadow[x] ? MEADOW.rim : h - y <= 2 ? MEADOW.deep : MEADOW.body;
      near.set(x, y, y > meadow[x] && fleck < 0.03 ? MEADOW.dark : y > meadow[x] && fleck < 0.07 ? MEADOW.fleck : flat);
    }
  }

  // Pines on the forested hills, round trees in small groups on the green ones: never right behind the fox.
  const clear = (x: number): boolean => Math.abs(x - foxX) > 15 && x > 2 && x < w - 3;
  for (let x = 6 * random(); x < w; x += 5 + 22 * random()) {
    const at = Math.round(x);
    if (clear(at) && k > 0.55) {
      stampTree(both, at, hill[at] - Math.round(2 * k + random() * 2 * k), k > 1.1 && random() < 0.5 ? 2 : 1, dir, true);
    }
  }
  for (let x = 14 * random(); x < w; x += 16 + 40 * random()) {
    for (let n = 0, count = 1 + Math.floor(random() * 3.4); n < count; n++) {
      const at = Math.round(x + n * (3 + random() * 2));
      const foot = at < w ? hill[at] + Math.round((meadow[at] - hill[at]) * (0.25 + 0.5 * random())) : 0;
      if (clear(at) && foot < meadow[at] - 1) {
        stampTree(both, at, foot, k > 0.9 && random() < 0.55 ? 2 : 1, dir, false);
      }
    }
  }
  near.flush();
  shaded.flush();
  return { far: far.canvas, near: near.canvas, shaded: shaded.canvas, k, skyline: farFoot - 8 * k, footY: farFoot, ridge, hill, meadow };
}
