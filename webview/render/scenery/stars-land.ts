import { lookoutTop, paintLookout, paintLookoutFront, type LookoutTones } from './lookout';
import { clamp01, prerender, seeded, type VistaView } from './paint';
import { MOON_REACH, type Spot } from './stars-field';

// What the night sky rests on. Close to us, the lookout the fox sits on; far beyond it, a valley full of mist, low
// hills and a range of mountains in the distance, dark against the stars, their slopes lit by the moon that rises
// behind them. None of it moves.

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));

/** The far range from its highest crest down to its foot: it pales into the mist of the valley. */
const ROCK: readonly (readonly [number, string])[] = [[0, '#070920'], [0.55, '#0f1238'], [1, '#1f2259']];
const FAR_MIST = '#34367a';
const HILLS = '#232660';
/** The moon catches the slopes turned to it and the edge of the lookout. */
const FAR_LIT = '#3c4487';
const RIM = '#4a62a6';
/** The mist that fills the valley right behind the lookout: the step from here to far away. */
const VALLEY = '#383e86';
/** The lookout is the darkest thing in the picture: a deep indigo, its grass barely paler. */
const LOOKOUT: LookoutTones = {
  body: '#0e1030',
  rim: '#1a1e4e',
  deep: '#080a20',
  blades: ['#1a1e4c', '#12153c'],
  front: ['#14173e', '#0a0c26'],
};

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
  /** The far mountains and the bare hills before them. Mist drifts in front. */
  readonly far: HTMLCanvasElement;
  /** The valley mist, right behind the lookout. */
  readonly valley: HTMLCanvasElement;
  /** How high above the bottom edge the drifting mist rests. */
  readonly mistFoot: number;
  /** The edge of the lookout the moon lights, on its own so that it brightens as the moon climbs. */
  readonly moonlit: HTMLCanvasElement;
}

export interface Moon extends Spot {
  readonly r: number;
  /** How far up its climb it is, from 0 to 1. */
  readonly rise: number;
}

/** How high things stand above the bottom edge: the valley mist, the foot of the far range, and how far the hills and the mountains rise. */
function sizes(view: VistaView) {
  const rise = view.h - lookoutTop(view, view.foxX);
  // The mist pools beside the rise the fox sits on, not over it.
  return { mist: clamp(rise - 2, 3, 4), base: rise + 3, hills: clamp(Math.round(view.h * 0.05), 2, 8), far: clamp(Math.round(view.h * 0.28), 8, 24) };
}

/** A wave folded into straight slopes, from 0 to 1. */
const fold = (v: number): number => 1 - Math.abs(((v % 2) + 2) % 2 - 1);

/** How high the far range stands at `x`, from 0 to 1: mountains of straight slopes, some tall, some small, overlapping. */
const rangeAt = (x: number): number => 0.22 + 0.78 * Math.max(fold(x / 61 + 0.25), 0.72 * fold(x / 37 + 1.1), 0.5 * fold(x / 19.5 + 0.7));

/** Long soft swells, from 0 to 1, for the hills. */
const swell = (x: number, long: number, short: number, phase: number): number =>
  0.5 + 0.3 * Math.sin(x / long + phase) + 0.2 * Math.sin(x / short + phase * 3);

/** The moon: its size, the column it rises in and how high it ends above the bottom edge. */
function standing({ w, h, foxX, dir }: VistaView): { r: number; home: number; high: number } {
  const r = h < 44 ? 3 : h < 60 ? 5 : h < 120 ? 6 : 7;
  const room = dir > 0 ? w - foxX : foxX;
  // On the side the fox looks to, clear of its ears.
  const aside = Math.min(110, Math.max(20 + r, room * 0.5));
  return { r, home: clamp(Math.round(foxX + dir * aside), r + 3, w - r - 3), high: 4 + clamp((h - 4) * 0.5, 13, 42) };
}

function build(view: VistaView): Land {
  const { w, h, dir } = view;
  const foxX = Math.round(view.foxX);
  const size = sizes(view);
  const { home } = standing(view);
  const rows = size.base + size.far + 1;
  const rangeTall = (x: number): number => size.base + Math.round(size.far * rangeAt(x));
  const far = prerender(w, rows, (ctx) => {
    const rock = ctx.createLinearGradient(0, 0, 0, rows - size.base);
    ROCK.forEach(([at, color]) => rock.addColorStop(at, color));
    ctx.fillStyle = rock;
    ctx.fillRect(0, 0, w, rows);
    for (let x = 0; x < w; x++) {
      const tall = rangeTall(x);
      ctx.clearRect(x, 0, 1, rows - tall);
      // A slope that falls toward the moon is lit along its crest.
      const facing = tall - rangeTall(x + (x < home ? 2 : -2));
      if (facing > 0) {
        ctx.fillStyle = FAR_LIT;
        ctx.fillRect(x, rows - tall, 1, Math.min(4, facing + 1));
      }
      // Mist lies at the foot, its edge broken into a line of dots.
      const thick = size.mist + Math.round((tall - size.mist) * 0.3);
      ctx.fillStyle = FAR_MIST;
      ctx.fillRect(x, rows - thick - (x % 2), 1, thick + 1);
      ctx.fillStyle = HILLS;
      const hill = size.mist + 2 + Math.round(size.hills * swell(x, 43, 19, 1.3));
      ctx.fillRect(x, rows - hill, 1, hill);
    }
  });
  const valley = prerender(w, size.mist + 1, (ctx) => {
    ctx.fillStyle = VALLEY;
    for (let x = 0; x < w; x++) {
      ctx.fillRect(x, x % 2, 1, size.mist);
    }
  });
  const random = seeded(0x9111);
  const moonlit = prerender(w, rows, (ctx) => {
    ctx.fillStyle = RIM;
    ctx.globalAlpha = 0.6;
    for (let x = 0; x < w; x++) {
      // Only the side of the lookout turned to the moon is lit, and the light breaks up as the ground turns away.
      const turned = clamp01(((x - foxX) * dir + 30) / 36) * clamp01(((foxX + dir * 150 - x) * dir) / 60);
      if (random() < turned) {
        ctx.fillRect(x, lookoutTop(view, x) - (h - rows), 1, 1);
      }
    }
  });
  return { far, valley, moonlit, mistFoot: size.mist + 1 };
}

let kept: { key: string; land: Land } | undefined;

export function landFor(view: VistaView): Land {
  const key = `${view.w}x${view.h}@${view.foxX}${view.dir}`;
  if (kept?.key !== key) {
    kept = { key, land: build(view) };
  }
  return kept.land;
}

export function drawFar({ ctx, h }: VistaView, land: Land): void {
  ctx.drawImage(land.far, 0, h - land.far.height);
}

export function drawNear(view: VistaView, land: Land, moonlight: number): void {
  const { ctx, h } = view;
  ctx.drawImage(land.valley, 0, h - land.valley.height);
  paintLookout(view, LOOKOUT);
  ctx.globalAlpha = 0.2 + 0.65 * moonlight;
  ctx.drawImage(land.moonlit, 0, h - land.moonlit.height);
  ctx.globalAlpha = 1;
}

/** The blades that stand in front of the fox's paws. */
export function drawGrass(view: VistaView): void {
  paintLookoutFront(view, LOOKOUT);
}

/** Where the moon is now: rising from behind the far range, on the side the fox looks to. */
export function moonOf(view: VistaView): Moon {
  const { w, h, t, dir } = view;
  const { r, home, high } = standing(view);
  const size = sizes(view);
  const rise = 1 - (1 - clamp01(t / MOON_CLIMB_S)) ** 2;
  const low = size.base + size.far * rangeAt(home) - r * 0.2;
  const x = clamp(home + dir * MOON_SLIDE * (t / 60 - 0.5), r + 2, w - r - 2);
  return { x: Math.round(x), y: Math.round(h - (low + (high - low) * rise)), r, rise, reach2: (r * MOON_REACH) ** 2 };
}

let cut: { key: string; sprite: HTMLCanvasElement } | undefined;

/** A crescent cut pixel by pixel from two discs, its lit limb low and turned away from the fox. */
function crescent(r: number, dir: 1 | -1): HTMLCanvasElement {
  const key = `${r}${dir}`;
  if (cut?.key !== key) {
    const size = r * 2 + 1;
    const away = { x: -dir * r * 0.56, y: -r * 0.5, r: r * 1.02 };
    const sprite = prerender(size, size, (ctx) => {
      for (let j = -r; j <= r; j++) {
        for (let i = -r; i <= r; i++) {
          const fromCentre = Math.hypot(i, j);
          if (fromCentre > r + 0.3) {
            continue;
          }
          const fromCut = Math.hypot(i - away.x, j - away.y) - away.r;
          ctx.globalAlpha = fromCut > 0 ? 1 : 0.55;
          ctx.fillStyle = fromCut <= 0 ? MOON_DARK : fromCut < 0.9 ? MOON_SHADE : fromCentre > r - 0.8 ? MOON_LIGHT : MOON_BODY;
          ctx.fillRect(i + r, j + r, 1, 1);
        }
      }
    });
    cut = { key, sprite };
  }
  return cut.sprite;
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
