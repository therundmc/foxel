import { clamp01, parallax, prerender, seeded, type VistaView } from './paint';
import { MOON_REACH, type Spot } from './stars-field';

// What the night sky rests on. Close to us, the hilltop the fox looks out from; far below and beyond it, a valley full of
// mist, a treeline, hills and mountains that glide past, each at its own pace. The moon rises behind them all.

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));

/** The far planes are pale and close in value, a little darker as they near; mist pools at the foot of the mountains. */
const FAR = '#272a66';
const FAR_MIST = '#34367a';
const HILLS = '#232660';
const TREES = '#1c1f52';
/** The moon catches the far slopes turned to it, and the edge of the hilltop. */
const FAR_LIT = '#3c4487';
const RIM = '#4a62a6';
/** How deep each plane lies: the nearer, the faster it slides. */
const FAR_DEPTH = 0.55;
const HILLS_DEPTH = 0.3;
const TREES_DEPTH = 0;
/** The far planes are painted this much wider than the view on each side, so that sliding never bares an edge. */
const MARGIN = 24;
/** The mist that fills the valley right behind the hilltop: the step from here to far away. */
const VALLEY = '#383e86';
/** The hilltop is the darkest thing in the picture; it falls to a few pixels at the edges of the view. */
const HILL = '#0c0e24';
const BLADE = '#181c46';
const HILL_EDGE = 2.4;
/** The fox sits in the grass, not on the edge of the picture: a row of ground and a few blades pass in front of it. */
const GRASS_ROWS = 4;

const MOON_LIGHT = '#fffbe6';
const MOON_BODY = '#fff0b8';
const MOON_SHADE = '#e2c98e';
/** The rest of its disc, barely lighter than the night. */
const MOON_DARK = '#3b4188';
const HALO = '207,216,255';
/** The moon climbs all through the contemplation, quicker at first, and slides a few pixels sideways. */
const MOON_CLIMB_S = 66;
const MOON_SLIDE = 9;

export interface Land {
  /** The far planes, from the farthest: mountains, bare hills, then a treeline. Mist drifts in front of the hills. */
  readonly far: HTMLCanvasElement;
  readonly hills: HTMLCanvasElement;
  readonly trees: HTMLCanvasElement;
  /** The valley mist and, in front of it, the hilltop: they do not move. */
  readonly lookout: HTMLCanvasElement;
  /** How high above the bottom edge the drifting mist rests. */
  readonly mistFoot: number;
  /** The moonlit edges, on their own so that they brighten as the moon climbs. */
  readonly rim: HTMLCanvasElement;
  /** The grass that stands in front of the fox's paws. */
  readonly grass: HTMLCanvasElement;
}

export interface Moon extends Spot {
  readonly r: number;
  /** How far up its climb it is, from 0 to 1. */
  readonly rise: number;
}

/** In a view `h` high: how high the hilltop and the valley mist stand, and how far each plane may rise out of that mist. */
function sizes(h: number) {
  const hill = h < 44 ? 5 : clamp(Math.round(h * 0.13), 7, 10);
  return {
    hill,
    mist: hill - 2,
    blade: h < 44 ? 3 : 4,
    pines: h < 44 ? 3 : 5,
    hills: clamp(Math.round(h * 0.05), 2, 8),
    far: clamp(Math.round(h * 0.2), 7, 20),
  };
}
type Sizes = ReturnType<typeof sizes>;

/** A wave folded into straight slopes, from 0 to 1. */
const fold = (v: number): number => 1 - Math.abs(((v % 2) + 2) % 2 - 1);

/** How high the far range stands at `x`: mountains of straight slopes, some tall, some small, overlapping. */
function farAt(x: number, size: Sizes): number {
  const range = Math.max(fold(x / 61 + 0.25), 0.72 * fold(x / 37 + 1.1), 0.5 * fold(x / 19.5 + 0.7));
  return size.mist + 3 + Math.round(size.far * (0.22 + 0.78 * range));
}

/** Long soft swells, from 0 to 1, for the hills and the ground the pines stand on. */
const swell = (x: number, long: number, short: number, phase: number): number =>
  0.5 + 0.3 * Math.sin(x / long + phase) + 0.2 * Math.sin(x / short + phase * 3);

function build(w: number, h: number, foxX: number, dir: 1 | -1): Land {
  const size = sizes(h);
  const random = seeded(0x9111);
  const pick = (from: number, to: number): number => from + Math.floor(random() * (to - from + 1));
  const wide = w + 2 * MARGIN;
  const rows = size.mist + 3 + size.far + 1;
  // A few stands of small pines, with long clearings between them.
  const pineTops = new Float32Array(wide);
  for (let x = pick(0, 20); x < wide; x += pick(16, 44)) {
    for (let n = pick(2, 5), at = x; n > 0 && at < wide - 1; n--, at += pick(2, 3)) {
      const tall = 2 + random() * (size.pines - 2);
      for (let dx = -1; dx <= 1; dx++) {
        pineTops[at + dx] = Math.max(pineTops[at + dx], tall - Math.abs(dx) * 2);
      }
    }
  }
  /** One far plane, a plain silhouette from the height of its crest; `more` adds what only that plane has. */
  const plane = (crestAt: (x: number) => number, body: string, more?: (ctx: CanvasRenderingContext2D, at: number, tall: number) => void): HTMLCanvasElement =>
    prerender(wide, rows, (ctx) => {
      for (let at = 0; at < wide; at++) {
        const tall = crestAt(at - MARGIN);
        ctx.fillStyle = body;
        ctx.fillRect(at, rows - tall, 1, tall);
        more?.(ctx, at, tall);
      }
    });
  const far = plane((x) => farAt(x, size), FAR, (ctx, at, tall) => {
    // A slope that falls toward the moon is lit along its crest.
    const facing = tall - farAt(at - MARGIN + dir * 2, size);
    if (facing > 0) {
      ctx.fillStyle = FAR_LIT;
      ctx.fillRect(at, rows - tall, 1, Math.min(4, facing + 1));
    }
    // Mist lies at the foot, its edge broken into a line of dots.
    const thick = size.mist + Math.round((tall - size.mist) * 0.3);
    ctx.fillStyle = FAR_MIST;
    ctx.fillRect(at, rows - thick - (at % 2), 1, thick + 1);
  });
  const hills = plane((x) => size.mist + 2 + Math.round(size.hills * swell(x, 43, 19, 1.3)), HILLS);
  // The ground the pines stand on barely clears the mist of the valley.
  const trees = plane((x) => Math.round(size.mist + 2 * swell(x, 29, 13, 2.7) + pineTops[x + MARGIN]), TREES);

  // The hilltop is highest under the fox and falls away gently on both sides.
  const spread = clamp(w * 0.24, 18, 60);
  const hillAt = (x: number): number => {
    const away = (x - foxX) / spread;
    return Math.round(size.hill - (size.hill - HILL_EDGE) * (1 - 1 / (1 + away * away)));
  };
  // Grass grows in a few tufts: a tall blade with a short one at its foot, and sometimes a third a pixel away.
  const tuft = (blades: Uint8Array, x: number, tallest: number): void => {
    blades[x] = pick(1, 2);
    blades[x + 1] = pick(3, tallest);
    blades[x + 3] = random() < 0.5 ? pick(2, tallest - 1) : 0;
  };
  const crest = new Uint8Array(w + 4);
  const paws = new Uint8Array(w + 4);
  for (let x = pick(0, 20); x < w; x += pick(14, 36)) {
    tuft(crest, x, size.blade);
  }
  // Two tufts stand in front of the fox, either side of its paws.
  tuft(paws, Math.max(0, foxX - 13), 3);
  tuft(paws, Math.max(0, foxX + 8), 3);
  const stray = Array.from({ length: w }, () => random());
  const top = size.hill + size.blade;
  const lookout = prerender(w, top, (ctx) => {
    for (let x = 0; x < w; x++) {
      ctx.fillStyle = VALLEY;
      ctx.fillRect(x, top - size.mist + (x % 2), 1, size.mist);
      const tall = hillAt(x) + crest[x];
      ctx.fillStyle = HILL;
      ctx.fillRect(x, top - tall, 1, tall);
      if (crest[x] > 2) {
        ctx.fillStyle = BLADE;
        ctx.fillRect(x, top - tall, 1, 1);
      }
    }
  });
  const rim = prerender(w, top, (ctx) => {
    ctx.fillStyle = RIM;
    for (let x = 0; x < w; x++) {
      // Only the side turned to the moon is lit, and the light breaks up as the ground turns away.
      const turned = clamp01(((x - foxX) * dir + 30) / 36) * clamp01((foxX + dir * 150 - x) * dir / 60);
      if (stray[x] < turned) {
        ctx.globalAlpha = crest[x] > 0 ? 0.85 : 0.45;
        ctx.fillRect(x, top - hillAt(x) - crest[x], 1, 1);
      }
    }
  });
  const grass = prerender(w, GRASS_ROWS, (ctx) => {
    for (let x = 0; x < w; x++) {
      ctx.fillStyle = HILL;
      ctx.fillRect(x, GRASS_ROWS - 1 - paws[x], 1, paws[x] + 1);
      if (paws[x] > 1) {
        ctx.fillStyle = BLADE;
        ctx.fillRect(x, GRASS_ROWS - 1 - paws[x], 1, 1);
      }
    }
  });
  return { far, hills, trees, lookout, rim, grass, mistFoot: size.mist + 1 };
}

let kept: { key: string; land: Land } | undefined;

export function landFor(w: number, h: number, foxX: number, dir: 1 | -1): Land {
  const key = `${w}x${h}@${Math.round(foxX)}${dir}`;
  if (kept?.key !== key) {
    kept = { key, land: build(w, h, Math.round(foxX), dir) };
  }
  return kept.land;
}

/** A far plane where the parallax has brought it by now. */
function slid(view: VistaView, plane: HTMLCanvasElement, depth: number): void {
  view.ctx.drawImage(plane, clamp(parallax(view, depth), -MARGIN, MARGIN) - MARGIN, view.h - plane.height);
}

export function drawFar(view: VistaView, land: Land): void {
  slid(view, land.far, FAR_DEPTH);
  slid(view, land.hills, HILLS_DEPTH);
}

export function drawNear(view: VistaView, land: Land, moonlight: number): void {
  const { ctx, h } = view;
  slid(view, land.trees, TREES_DEPTH);
  const top = h - land.lookout.height;
  ctx.drawImage(land.lookout, 0, top);
  ctx.globalAlpha = 0.25 + 0.75 * moonlight;
  ctx.drawImage(land.rim, 0, top);
  ctx.globalAlpha = 1;
}

export function drawGrass({ ctx, h }: VistaView, land: Land): void {
  ctx.drawImage(land.grass, 0, h - land.grass.height);
}

/** Where the moon is now: on the side the fox looks to, rising from behind the far hills. */
export function moonOf({ w, h, t, foxX, dir }: VistaView): Moon {
  const r = h < 44 ? 3 : h < 60 ? 5 : h < 120 ? 6 : 7;
  const room = dir > 0 ? w - foxX : foxX;
  const rise = 1 - (1 - clamp01(t / MOON_CLIMB_S)) ** 2;
  const reach = clamp(room * 0.5, 22, 104);
  const home = clamp(foxX + dir * reach, r + 3, w - r - 3);
  const low = farAt(Math.round(home), sizes(h)) - r * 0.2;
  const high = 4 + clamp((h - 4) * 0.5, 13, 42);
  const x = clamp(home + dir * MOON_SLIDE * (t / 60 - 0.5), r + 2, w - r - 2);
  return { x: Math.round(x), y: Math.round(h - (low + (high - low) * rise)), r, rise, reach2: (r * MOON_REACH) ** 2 };
}

const crescents = new Map<string, HTMLCanvasElement>();

/** A crescent cut pixel by pixel from two discs, its lit limb low and turned away from the fox. */
function crescent(r: number, dir: 1 | -1): HTMLCanvasElement {
  const key = `${r}${dir}`;
  let sprite = crescents.get(key);
  if (!sprite) {
    const size = r * 2 + 1;
    const cut = { x: -dir * r * 0.56, y: -r * 0.5, r: r * 1.02 };
    sprite = prerender(size, size, (ctx) => {
      for (let j = -r; j <= r; j++) {
        for (let i = -r; i <= r; i++) {
          const fromCentre = Math.hypot(i, j);
          if (fromCentre > r + 0.3) {
            continue;
          }
          const fromCut = Math.hypot(i - cut.x, j - cut.y) - cut.r;
          ctx.globalAlpha = fromCut > 0 ? 1 : 0.55;
          ctx.fillStyle = fromCut <= 0 ? MOON_DARK : fromCut < 0.9 ? MOON_SHADE : fromCentre > r - 0.8 ? MOON_LIGHT : MOON_BODY;
          ctx.fillRect(i + r, j + r, 1, 1);
        }
      }
    });
    crescents.set(key, sprite);
  }
  return sprite;
}

export function drawMoon({ ctx, t, dir }: VistaView, moon: Moon): void {
  const reach = moon.r * MOON_REACH;
  // A soft halo, breathing slowly: the one thing here that is allowed not to be made of pixels.
  const breath = 0.9 + 0.1 * Math.sin(t * 0.45);
  const halo = ctx.createRadialGradient(moon.x + 0.5, moon.y + 0.5, 0, moon.x + 0.5, moon.y + 0.5, reach);
  halo.addColorStop(0, `rgba(${HALO},${0.36 * breath})`);
  halo.addColorStop(0.28, `rgba(${HALO},${0.17 * breath})`);
  halo.addColorStop(0.62, `rgba(${HALO},${0.05 * breath})`);
  halo.addColorStop(1, `rgba(${HALO},0)`);
  ctx.fillStyle = halo;
  ctx.fillRect(moon.x - reach, moon.y - reach, reach * 2 + 1, reach * 2 + 1);
  ctx.drawImage(crescent(moon.r, dir), moon.x - moon.r, moon.y - moon.r);
}
