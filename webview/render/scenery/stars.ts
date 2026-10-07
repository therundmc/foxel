import { clamp01, gradient, mix, px, ramp, seeded, type VistaPainter, type VistaView } from './paint';
import { drawDust, drawStars, fieldFor, type Wave } from './stars-field';
import { drawFireflies, drawMist } from './stars-drift';
import { drawFar, drawGrass, drawNear, drawMoon, landFor, moonOf, type Moon } from './stars-land';
import { drawMilky, milkyFor } from './stars-milky';

// The night sky, in the order things come:
//   0 s   the dusk still glows on the horizon; the moon peeps over the far mountains and starts to climb
//   2 s   the great stars light up one by one, then the bright ones, then the small ones (until 21 s)
//  10 s   the star dust comes out
//  11 s   the Milky Way draws itself from the horizon up, behind the fox (until 29 s)
//  the great moment: a shooting star from above the fox, its sparks, then a ripple of light through the stars
//  +10 s and +16 s after it: two more, small and far
//  31 s   fireflies wake up near the ground, one after the other
//  all along: the land is still; only banks of mist drift along the valley

/** The stars stop three rows above the bottom edge: lower down there is only ground. */
const FOOT = 3;

/** The sky from the horizon up, by height in pixels: [height, at dusk, in the dead of night]. */
const SKY: readonly (readonly [number, string, string])[] = [
  [0, '#7c5a90', '#5a4b8b'],
  [9, '#52468b', '#423c83'],
  [24, '#2f3176', '#272b6c'],
  [50, '#1b2059', '#161b50'],
  [92, '#10153d', '#0d1136'],
  [160, '#080b24', '#070920'],
];
const SKY_SPAN = 160;
/** The last of the dusk drains away over this long. */
const NIGHTFALL_S = 45;

function paintSky(view: VistaView): void {
  const { h, t } = view;
  // A low panel shows the whole fall of the night, squeezed; a tall one lets it run its full height.
  const squeeze = Math.min(1, Math.max(0.5, h / 100));
  const span = Math.max(h, SKY_SPAN * squeeze);
  const night = ramp(t, 0, NIGHTFALL_S);
  gradient(
    view,
    h - span,
    h,
    SKY.map(([up, dusk, deep]) => [Math.max(0, 1 - (up * squeeze) / span), mix(dusk, deep, night)] as const),
  );
}

/** A shooting star: where it starts, how far it flies toward `dir`, how much it falls, and for how long. */
interface Flight {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  readonly drop: number;
  readonly secs: number;
  readonly strength: number;
  readonly sparks: number;
}

/** It slows down as it burns out. */
const EASE = 1.5;
const TRAIL = ['#ffffff', '#fff6c4', '#cfd8ff', '#8f9cf0'];
const SPARK_TINTS = ['#fff6c4', '#ffffff', '#ffd9b0', '#cfd8ff'];

function drawFlight(ctx: CanvasRenderingContext2D, f: Flight, dir: 1 | -1, age: number, seed: number): void {
  if (age < 0 || age > f.secs + 4) {
    return;
  }
  const fallAt = (p: number): number => f.y + f.drop * (0.55 * p + 0.45 * p * p);
  const flown = clamp01(age / f.secs);
  const head = 1 - (1 - flown) ** EASE;
  const reached = Math.floor(head * f.len);
  // Every pixel of its path remembers when the head went through, and cools from white to blue.
  for (let i = 0; i <= reached; i++) {
    const p = i / f.len;
    const since = age - (1 - (1 - p) ** (1 / EASE)) * f.secs;
    const heat = Math.exp(-since / 0.26) + 0.25 * Math.exp(-since / 0.9);
    if (heat > 0.03) {
      const tint = TRAIL[since < 0.06 ? 0 : since < 0.24 ? 1 : since < 0.6 ? 2 : 3];
      px(ctx, f.x + dir * i, fallAt(p), tint, heat * f.strength);
      // Just behind the head the streak is two pixels thick.
      px(ctx, f.x + dir * i, fallAt(p) + 1, tint, (heat - 0.55) * f.strength);
    }
  }
  if (flown < 1) {
    // The head: a point with a small cross of light, fading as it dies.
    const alive = f.strength * (1 - ramp(flown, 0.8, 1)) * ramp(flown, 0, 0.08);
    const x = Math.round(f.x + dir * reached);
    const y = Math.round(fallAt(reached / f.len));
    px(ctx, x - 1, y, TRAIL[1], alive * 0.5, 3, 1);
    px(ctx, x, y - 1, TRAIL[1], alive * 0.5, 1, 3);
    px(ctx, x, y, TRAIL[0], alive);
  }
  // Sparks shed along the way: they hang, sink a little and go out one by one.
  const random = seeded(seed);
  for (let i = 0; i < f.sparks; i++) {
    const p = 0.08 + 0.84 * random();
    const life = 1.1 + random() * 1.9;
    const side = random() - 0.5;
    const tint = SPARK_TINTS[Math.floor(random() * SPARK_TINTS.length)];
    const since = age - (1 - (1 - p) ** (1 / EASE)) * f.secs;
    if (since > 0 && since < life) {
      const fade = 1 - since / life;
      const blink = 0.6 + 0.4 * Math.sin(since * 11 + i * 2.1);
      px(ctx, f.x + dir * (p * f.len - since * 1.5) + side * 2, fallAt(p) + 1 + since * (1.6 + side * 2) + since * since * 0.9, tint, fade * blink * f.strength);
    }
  }
}

/** When the fox sees the shooting star, where it goes, and when the sky answers. */
const SHOOT_AT_S = 0.25;
const SHOOT_S = 2.05;
const WAVE_AT_S = 2.7;
const WAVE_SPEED = 52;
const LATER = [
  { at: 10.4, toward: 0.74, high: 0.12, len: 20, seed: 0x51 },
  { at: 16.3, toward: -0.62, high: 0.3, len: 26, seed: 0x52 },
];

function paintMoment(view: VistaView, moon: Moon): Wave | undefined {
  const { ctx, w, h, moment, foxX, dir } = view;
  if (moment === undefined) {
    return undefined;
  }
  // From just behind the fox's head, over it, and away to the side it looks to: it passes above the moon.
  const x = foxX - dir * 8;
  const y = Math.max(2, Math.round(Math.min(h - 66, h * 0.42)));
  const len = Math.min(150, Math.max(30, (dir > 0 ? w - x : x) - 12));
  const drop = Math.min(30, Math.max(1, Math.min(len * 0.2, moon.y - moon.r - 6 - y)));
  drawFlight(ctx, { x, y, len, drop, secs: SHOOT_S, strength: 1, sparks: 16 }, dir, moment - SHOOT_AT_S, 0x77);
  for (const later of LATER) {
    const room = later.toward > 0 === dir > 0 ? w - foxX : foxX;
    const fromX = foxX + dir * later.toward * Math.abs(room);
    const flight = { x: fromX, y: 2 + Math.round(h * later.high * 0.6), len: later.len, drop: later.len * 0.3, secs: 0.85, strength: 0.5, sparks: 0 };
    drawFlight(ctx, flight, dir, moment - later.at, later.seed);
  }
  const since = moment - WAVE_AT_S;
  return since > 0 && since < 9 ? { x: x + dir * len, y: y + drop, radius: since * WAVE_SPEED, strength: 1 - ramp(since, 3, 9) } : undefined;
}

export const stars: VistaPainter = {
  back(view) {
    const { w, h, foxX, dir } = view;
    const skyH = h - FOOT;
    const floorY = skyH - 1;
    const moon = moonOf(view);
    const field = fieldFor(w, skyH);
    paintSky(view);
    drawMilky(view, milkyFor(w, skyH, foxX, dir), floorY);
    drawDust(view, field, floorY);
    const wave = paintMoment(view, moon);
    drawStars(view, field, floorY, moon, wave);
    drawMoon(view, moon);
    const land = landFor(view);
    drawFar(view, land);
    drawMist(view, h - land.mistFoot);
    drawNear(view, land, moon.rise);
  },
  front(view) {
    drawGrass(view);
    drawFireflies(view);
  },
};
