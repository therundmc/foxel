import { clamp01, parallax, seeded, type VistaView } from './paint';
import { blend, Pixels, rgb, wander, type Rgb } from './clouds-pixels';

// The land under the sky, painted once for a size: the dark grassy hilltop the fox looks out from and, far
// beyond it, pale hills and ranges of mountains fading into blue with distance.

/** One far plane of the land. It is painted `PAD` wider than the view on both sides, so that it can slide. */
interface Plane {
  readonly canvas: HTMLCanvasElement;
  /** How far it is, for `parallax`. */
  readonly depth: number;
}

export interface Land {
  /** From the farthest: two ranges of mountains, forested hills, green hills. */
  readonly planes: readonly Plane[];
  /** The hilltop the fox sits on, close to us, and its top for each column. It does not move. */
  readonly lookout: HTMLCanvasElement;
  readonly crest: Int16Array;
  /** How big everything is drawn: 1 in a view 64 high. */
  readonly k: number;
  /** Where the sky ends, more or less: the usual height of the far crests. */
  readonly skyline: number;
  /** Where the far range is lost behind the nearer one: mist gathers there, and the clouds stand behind it. */
  readonly footY: number;
  /** Where the hills are lost behind the lookout: haze lies there. */
  readonly hazeY: number;
}

/** The nearest plane slides a little less than this in a minute. */
const PAD = 20;

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
const FOREST = { rim: rgb('#98ccb6'), body: rgb('#7ab5ab'), deep: rgb('#6da8a8') };
const HILL = { rim: rgb('#b9e28e'), body: rgb('#93d187'), deep: rgb('#86c690') };
/** The lookout is close: the darkest, fullest greens of the picture. */
const LOOKOUT = { rim: rgb('#8fd557'), body: rgb('#4ba648'), deep: rgb('#3a8c4b'), fleck: rgb('#5fb850') };

/** How high the lookout still is at the edges of the view. */
const LOOKOUT_LOW = 2.5;
/** How far down a range is filled under its foot: the next one hides the rest. */
const FOOT_DEPTH = 12;

const tri = (v: number): number => Math.abs((((v % 1) + 1) % 1) - 0.5) * 2;

/** The scale of the land for a view `h` high: the fox must keep some sky, even in the shortest panel. */
const landScale = (h: number): number => Math.min(1.2, Math.max(0.42, (h - 16) / 48));

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
 * according to the side of that peak's spine it lies on.
 */
function paintRange(out: Pixels, peaks: readonly Peak[], look: RangeLook, foot: number, dir: number, snowLine: number, seed: number): void {
  const rough = wander(seed);
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
  out.flush();
}

export function paintLand(w: number, h: number, foxX: number, dir: 1 | -1): Land {
  const random = seeded(0xc10d + w * 31 + h);
  const k = landScale(h);
  const room = dir > 0 ? w - foxX : foxX;
  const wide = w + 2 * PAD;
  const [far, mid, forest, hills] = [0, 1, 2, 3].map(() => new Pixels(wide, h));
  const base = h - (4 + 2 * k);

  // The far range: sharp peaks, and one great snowy one on the side the fox looks to.
  const farFoot = Math.round(base - 12 * k);
  const heroX = PAD + foxX + dir * Math.min(150, Math.max(26, room * 0.4));
  const farPeaks = peaksOf(random, wide, 30 * k + 8, (x) => farFoot - k * (5 + 9 * random()) * (Math.abs(x - PAD - foxX) < 24 ? 0.6 : 1), () => 0.55 + 0.4 * random())
    .filter((p) => Math.abs(p.x - heroX) > 14 * k + 6);
  farPeaks.push({ x: heroX, top: farFoot - 20 * k, slope: 0.82, snowy: true });
  farPeaks.push({ x: heroX + dir * (38 * k + 20), top: farFoot - 15 * k, slope: 0.7, snowy: true });
  paintRange(far, farPeaks, FAR, farFoot + Math.ceil(4 * k), dir, farFoot - 13.5 * k, 11);

  // The nearer range: lower, rounder, bluer.
  const midFoot = Math.round(base - 8 * k);
  const midPeaks = peaksOf(random, wide, 46 * k + 10, () => midFoot - k * (3 + 6 * random()), () => 0.3 + 0.22 * random());
  paintRange(mid, midPeaks, MID, midFoot + Math.ceil(4 * k), dir, -1, 23);

  // Forested hills with a bumpy top, like treetops seen from afar, then bare green ones.
  const canopy = wander(37);
  const swells = [random() * 6, random() * 6, random() * 6, random() * 6, random() * 6];
  for (let x = 0; x < wide; x++) {
    const top = Math.round(base - k * (9.5 + 2.4 * Math.sin(x / (33 * k) + swells[0]) + 1.3 * Math.sin(x / (14 * k) + swells[1])) - (canopy(x * 0.8) > 0.2 ? 1 : 0));
    const hill = Math.round(base - k * (5.2 + 2.3 * Math.sin(x / (45 * k) + swells[2]) + 1.1 * Math.sin(x / (17 * k) + swells[3])));
    for (let y = top; y < h; y++) {
      forest.set(x, y, y === top ? FOREST.rim : y - top > 3 * k ? FOREST.deep : FOREST.body);
    }
    for (let y = hill; y < h; y++) {
      hills.set(x, y, y === hill ? HILL.rim : y - hill > 2.5 * k + 1 ? HILL.deep : HILL.body);
    }
  }
  forest.flush();
  hills.flush();

  // The lookout: highest under the fox, falling away gently to both edges of the view.
  const lookout = new Pixels(w, h);
  const crest = new Int16Array(w);
  const high = h < 44 ? 4.6 : Math.min(10, 6 + (h - 44) / 12);
  for (let x = 0; x < w; x++) {
    const reach = Math.max(28, (x < foxX ? foxX : w - foxX) * 0.42);
    crest[x] = Math.round(h - LOOKOUT_LOW - (high - LOOKOUT_LOW) * Math.exp(-(((x - foxX) / reach) ** 2)) - 0.5 * Math.sin(x / 23 + swells[4]));
    for (let y = crest[x]; y < h; y++) {
      const flat = y === crest[x] ? LOOKOUT.rim : h - y <= 2 ? LOOKOUT.deep : LOOKOUT.body;
      const fleck = random();
      lookout.set(x, y, y > crest[x] && fleck < 0.03 ? LOOKOUT.deep : y > crest[x] && fleck < 0.07 ? LOOKOUT.fleck : flat);
    }
  }
  lookout.flush();

  const depths = [0.75, 0.55, 0.3, 0];
  return {
    planes: [far, mid, forest, hills].map(({ canvas }, n) => ({ canvas, depth: depths[n] })),
    lookout: lookout.canvas,
    crest,
    k,
    skyline: farFoot - 8 * k,
    footY: farFoot,
    hazeY: Math.round(base - 3 * k),
  };
}

/** One plane of the land, slid as far as its depth lets it. */
export function drawPlane(view: VistaView, { canvas, depth }: Plane): void {
  view.ctx.drawImage(canvas, parallax(view, depth) - PAD, 0);
}
