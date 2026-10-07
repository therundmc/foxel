import { clamp01, prerender, seeded, type VistaView } from './paint';
import { MOON_REACH, type Spot } from './stars-field';

// What the night sky rests on: far hills, a line of pines, the hilltop the fox sits on, and the moon that rises behind them.

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));

/** Three planes, each darker and nearer than the last; mist pools pale at the foot of the far ones. */
const FAR = '#272a66';
const FAR_LIT = '#3c4487';
const FAR_MIST = '#34367a';
const PINES = '#1b1d4a';
const PINES_MIST = '#25275a';
const HILL = '#0f112b';
const BLADE = '#171a3e';
/** The moon catches the far slopes turned to it, and the edge of the hilltop. */
const RIM = '#4a62a6';

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
  /** The far mountains, then the pines and the hilltop: mist drifts between the two. */
  readonly far: HTMLCanvasElement;
  readonly near: HTMLCanvasElement;
  /** How high above the bottom edge the mist rests. */
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

/** How tall the far mountains, the pines and the hilltop may stand in a view `h` high. */
const sizes = (h: number) => ({
  far: clamp(Math.round(h * 0.26), 8, 21),
  pines: clamp(Math.round(h * 0.13), 4, 9),
  hill: h < 44 ? 4 : 5,
});

/** A wave folded into straight slopes, from 0 to 1. */
const fold = (v: number): number => 1 - Math.abs(((v % 2) + 2) % 2 - 1);

/** The far range is the same whatever the view: mountains of straight slopes, some tall, some small, overlapping. */
function farAt(x: number, tallest: number): number {
  const range = Math.max(fold(x / 61 + 0.25), 0.72 * fold(x / 37 + 1.1), 0.5 * fold(x / 19.5 + 0.7));
  return Math.round(tallest * (0.22 + 0.78 * range));
}

function build(w: number, h: number, foxX: number, dir: 1 | -1): Land {
  const size = sizes(h);
  const rows = size.far + 1;
  const random = seeded(0x9111);
  // Pines in small stands, each of its own height, with clearings between them.
  const pineTops = new Float32Array(w + 16);
  for (let x = -6; x < w + 6; ) {
    const stand = 1 + Math.floor(random() * 5);
    for (let n = 0; n < stand; n++) {
      const tall = 2.5 + random() * (size.pines - 2.5);
      for (let dx = -2; dx <= 2; dx++) {
        const at = x + dx + 8;
        if (at >= 0 && at < pineTops.length) {
          pineTops[at] = Math.max(pineTops[at], tall - Math.abs(dx) * 2);
        }
      }
      x += 2 + Math.floor(random() * 3);
    }
    x += 3 + Math.floor(random() * 9);
  }
  const pinesAt = (x: number): number => {
    const swell = 0.5 + 0.3 * Math.sin(x / 29 + 2.7) + 0.2 * Math.sin(x / 13 + 0.4);
    return Math.round(size.pines * (0.22 + 0.2 * swell) + pineTops[x + 8]);
  };
  // The hilltop is highest under the fox and falls away gently on both sides.
  const tufts = Array.from({ length: w }, () => random());
  const hillAt = (x: number): number => {
    const away = (x - foxX) / 40;
    return Math.max(1, Math.round(size.hill - 3.2 * (1 - 1 / (1 + away * away))));
  };
  const column = (ctx: CanvasRenderingContext2D, x: number, tall: number, body: string, mist: string): void => {
    ctx.fillStyle = body;
    ctx.fillRect(x, rows - tall, 1, tall);
    ctx.fillStyle = mist;
    // Mist lies at the foot, its edge broken into a line of dots.
    const thick = Math.round(tall * 0.3);
    ctx.fillRect(x, rows - thick, 1, thick);
    if (x % 2 === 0) {
      ctx.fillRect(x, rows - thick - 1, 1, 1);
    }
  };
  const far = prerender(w, rows, (ctx) => {
    for (let x = 0; x < w; x++) {
      const far = farAt(x, size.far);
      column(ctx, x, far, FAR, FAR_MIST);
      // A slope that falls toward the moon is lit along its crest.
      const facing = far - farAt(x + dir * 2, size.far);
      if (facing > 0) {
        ctx.fillStyle = FAR_LIT;
        ctx.fillRect(x, rows - far, 1, Math.min(4, facing + 1));
      }
    }
  });
  const near = prerender(w, rows, (ctx) => {
    for (let x = 0; x < w; x++) {
      column(ctx, x, pinesAt(x), PINES, PINES_MIST);
      const top = hillAt(x);
      ctx.fillStyle = HILL;
      ctx.fillRect(x, rows - top, 1, top);
      if (tufts[x] < 0.22) {
        ctx.fillStyle = BLADE;
        ctx.fillRect(x, rows - top - 1, 1, 1);
      }
    }
  });
  const rim = prerender(w, rows, (ctx) => {
    ctx.fillStyle = RIM;
    for (let x = 0; x < w; x++) {
      // Only the side turned to the moon is lit, and the light breaks up as the ground turns away.
      const turned = clamp01(((x - foxX) * dir + 30) / 36) * clamp01((foxX + dir * 150 - x) * dir / 60);
      if (turned > 0 && tufts[(x * 7 + 3) % w] < turned) {
        const blade = tufts[x] < 0.22;
        ctx.globalAlpha = blade ? 0.85 : 0.45;
        ctx.fillRect(x, rows - hillAt(x) - (blade ? 1 : 0), 1, 1);
      }
    }
  });
  const grass = prerender(w, GRASS_ROWS, (ctx) => {
    for (let x = 0; x < w; x++) {
      const tall = tufts[(x * 5 + 1) % w] < 0.3 ? 2 : tufts[(x * 3 + 2) % w] < 0.55 ? 1 : 0;
      ctx.fillStyle = HILL;
      ctx.fillRect(x, GRASS_ROWS - 1 - tall, 1, tall + 1);
      if (tall === 2) {
        ctx.fillStyle = BLADE;
        ctx.fillRect(x, 0, 1, 1);
      }
    }
  });
  return { far, near, rim, grass, mistFoot: Math.round(size.pines * 0.45) + 1 };
}

/** The fox sits in the grass, not on the edge of the picture: a row of ground and a few blades pass in front of it. */
const GRASS_ROWS = 3;

let kept: { key: string; land: Land } | undefined;

export function landFor(w: number, h: number, foxX: number, dir: 1 | -1): Land {
  const key = `${w}x${h}@${Math.round(foxX)}${dir}`;
  if (kept?.key !== key) {
    kept = { key, land: build(w, h, Math.round(foxX), dir) };
  }
  return kept.land;
}

export function drawFar({ ctx, h }: VistaView, land: Land): void {
  ctx.drawImage(land.far, 0, h - land.far.height);
}

export function drawNear({ ctx, h }: VistaView, land: Land, moonlight: number): void {
  const top = h - land.near.height;
  ctx.drawImage(land.near, 0, top);
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
  const low = farAt(Math.round(home), sizes(h).far) - r * 0.2;
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
