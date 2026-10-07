import { lookoutTop, paintLookout, paintLookoutFront, type LookoutTones } from './lookout';
import { clamp01, gradient, ramp, seeded, type VistaPainter, type VistaView } from './paint';
import { drawMist, drawRidge, drawRim, layLand, layMist, type Land } from './sun-land';
import { blend, css, curve, tonesAt, type Mood, type Rgb, type Tones } from './sun-palette';
import { drawReflection, drawWater } from './sun-sea';
import { drawBirds, drawBrightStar, drawClouds, drawStars, layClouds, layStars, type Cloud } from './sun-sky';

// The sunrise and the sunset: two moods of one painter. Morning is fresh, misty and pale, over mountains;
// evening is rich and deep, over the sea. The fox watches from its grassy lookout, close to us; the land is far
// and still. The sun is a big plain ball; the subject is the light: the colours turn all through the minute,
// and the best comes with the great moment, when the ball clears the gap in the far mountains and the
// morning blooms, or slips under the water and the afterglow flares.

/** The moment comes somewhere in this window: until then the sun waits, barely moving. */
const WAIT_FROM_S = 22.5;
const WAIT_TO_S = 27.5;
/** How long the moment takes to turn the sky, then how long the sky takes to settle into its last colours. */
const TURN_S = 5;
const SETTLE_FROM_S = 6.5;
const SETTLE_TO_S = 21;
/** The birds come in sight as the fox looks up. */
const BIRDS_S = 0.3;
interface Scene {
  readonly key: string;
  readonly land: Land;
  readonly clouds: readonly Cloud[];
  readonly stars: Float32Array;
  readonly star: { readonly x: number; readonly y: number };
  readonly mist: Float32Array;
  /** Where the birds come in sight. */
  readonly birds: { readonly x: number; readonly y: number };
}

// Laid out once per size and place, then only read: only the last scene is kept.
let kept: Scene | undefined;

function sceneFor(view: VistaView, mood: Mood): Scene {
  const { w, h, foxX, dir } = view;
  const key = `${mood}:${w}:${h}:${Math.round(foxX)}:${dir}`;
  if (kept?.key === key) {
    return kept;
  }
  const morning = mood === 'sunrise';
  const land = layLand(mood, view);
  const { horizon, sunX, sunLine, radius } = land;
  const scene: Scene = {
    key,
    land,
    clouds: layClouds(w, morning ? sunLine - Math.round(radius * 0.6) : horizon - 1, morning ? 0xc10d : 0xc1e4),
    stars: layStars(w, 1, Math.round(horizon * 0.62), morning ? 0x57a2 : 0x57a3),
    star: { x: Math.min(w - 4, Math.max(3, sunX + dir * radius * 2)), y: Math.max(3, Math.round(sunLine - Math.max(radius * 3.2, horizon * 0.55))) },
    mist: morning ? layMist(w, horizon, seeded(0xd3a1)) : new Float32Array(0),
    // Toward the side the fox looks to, and over its head when the view is tall enough.
    birds: { x: foxX + dir * 18, y: Math.max(5, Math.min(horizon - 8, h - 40)) },
  };
  kept = scene;
  return scene;
}

/** Where the sky is in its story, on the stages the palette is keyed on. */
function stageAt(t: number, moment: number | undefined): number {
  const before = (at: number): number => (0.95 * (1 - Math.exp(-Math.min(at, WAIT_TO_S) / 16))) / (1 - Math.exp(-WAIT_TO_S / 16));
  if (moment === undefined) {
    return before(t);
  }
  const from = before(t - moment);
  return from + (2 - from) * ramp(moment, 0, TURN_S) + ramp(moment, SETTLE_FROM_S, SETTLE_TO_S);
}

/**
 * How high the sun's centre is above its line, in radii. It never jumps: whenever the moment comes,
 * the sun starts from where it was waiting.
 */
function altitudeAt(mood: Mood, t: number, moment: number | undefined): number {
  const at = moment === undefined ? t : t - moment;
  const wait = clamp01((at - WAIT_FROM_S) / (WAIT_TO_S - WAIT_FROM_S));
  if (mood === 'sunrise') {
    const waiting = -1.3 + 1.4 * Math.sin((Math.PI / 2) * clamp01((at - 8) / (WAIT_FROM_S - 8))) + 0.2 * wait;
    if (moment === undefined) {
      return waiting;
    }
    return waiting + (1.3 - waiting) * ramp(moment, 0.2, 3.8) + 1.3 * (1 - Math.exp(-Math.max(0, moment - 3) / 12));
  }
  const waiting = 2.6 - 2.25 * Math.sin((Math.PI / 2) * clamp01(at / WAIT_FROM_S)) - 0.25 * wait;
  return moment === undefined ? waiting : waiting + (-1.4 - waiting) * ramp(moment, 0.2, TURN_S);
}

type Stops = readonly (readonly [number, Rgb])[];

/** The sky from the top down. A tall sky keeps its warm bands near the horizon instead of stretching them. */
function skyStops(tones: Tones, sky: number): Stops {
  const k = Math.min(1, Math.max(0.5, 52 / sky));
  return [[0, tones.skyTop], [1 - 0.75 * Math.sqrt(k), tones.skyHigh], [1 - 0.42 * k, tones.skyMid], [1 - 0.16 * k, tones.skyLow], [1, tones.skyRim]];
}

function skyAt(stops: Stops, at: number): Rgb {
  let i = 0;
  while (i < stops.length - 2 && at > stops[i + 1][0]) {
    i++;
  }
  return blend(stops[i][1], stops[i + 1][1], (at - stops[i][0]) / (stops[i + 1][0] - stops[i][0]));
}

/** A soft dome of light, wider than tall: the one thing here that is not hard pixels. */
function glow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, stretch: number, color: Rgb, alpha: number): void {
  if (alpha <= 0.01) {
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(stretch, 1);
  const fill = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  fill.addColorStop(0, css(color, Math.min(0.999, alpha)));
  fill.addColorStop(0.35, css(color, alpha * 0.55));
  fill.addColorStop(0.7, css(color, alpha * 0.16));
  fill.addColorStop(1, css(color, 0));
  ctx.fillStyle = fill;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  ctx.restore();
}

/** A disc of pixels in one colour, row by row, cut off at `clip` (the sea line). */
function disc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, clip: number, alpha: number, color: string): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let dy = -r; dy <= r && cy + dy < clip; dy++) {
    const half = Math.floor(Math.sqrt((r + 0.5) ** 2 - dy * dy));
    ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
  ctx.globalAlpha = 1;
}

/** The sun: a big plain ball with a softer edge, in a wide glow that tints the sky. `up` is how much of it shows. */
function paintSun(ctx: CanvasRenderingContext2D, land: Land, tones: Tones, sunY: number, clip: number, up: number, flare: number): void {
  const { sunX, radius } = land;
  glow(ctx, sunX, Math.min(sunY, clip), radius * (3 + 1.5 * flare), 1, tones.sunCore, 0.5 * (0.35 + 0.65 * up) + 0.15 * flare);
  disc(ctx, sunX, Math.round(sunY), radius + 1, clip, 0.4, css(tones.sun));
  disc(ctx, sunX, Math.round(sunY), radius, clip, 1, css(tones.sunCore));
}

type PlaneName = 'far' | 'mid' | 'near';

/** How much of the haze each plane takes, at its crest and at its foot. The morning hills are flat tones: bands of haze would stripe them. */
const HAZE: Record<Mood, Record<PlaneName, readonly [number, number]>> = {
  sunrise: { far: [0.1, 0.95], mid: [0.45, 0.5], near: [0.4, 0.4] },
  sunset: { far: [0.4, 0.55], mid: [0.2, 0.4], near: [0.12, 0.4] },
};
/** How much of the light each skyline catches. */
const RIM: Record<PlaneName, number> = { far: 0.9, mid: 0.6, near: 0.45 };
/** The band of haze behind the lookout, the step between what is near and what is far. */
const VEIL: Record<Mood, number> = { sunrise: 0.9, sunset: 0.35 };

// Numbers keyed on the same stages as the palette.
const DOME = { sunrise: [0.3, 0.45, 0.62, 0.8, 0.75, 0.42], sunset: [0.55, 0.62, 0.75, 0.85, 0.85, 0.28] } as const;
const LIT = { sunrise: [0, 0.1, 0.4, 0.85, 1, 0.6], sunset: [0.8, 0.8, 0.7, 0.4, 0.25, 0] } as const;
/** The morning mist thins as the day comes; the evening haze stays. */
const MIST = { sunrise: [1, 1, 0.95, 0.88, 0.76, 0.55], sunset: [1, 1, 1, 1, 1, 1] } as const;

function paint(view: VistaView, mood: Mood): void {
  const { ctx, w, h, t, moment, dir } = view;
  const scene = sceneFor(view, mood);
  const { land } = scene;
  const morning = mood === 'sunrise';
  const stage = stageAt(t, moment);
  const tones = tonesAt(mood, stage);
  const since = moment ?? 0;
  const sunY = land.sunLine - altitudeAt(mood, t, moment) * land.radius;
  const up = clamp01((land.sunLine - (sunY - land.radius)) / (2 * land.radius));
  // The moment is the light itself. Morning: the glow widens and stays. Evening: the afterglow swells once the sun is gone.
  const flare = moment === undefined ? 0 : morning ? ramp(since, 0.4, 4.5) * (1 - 0.5 * ramp(since, 9, 20)) : ramp(since, 1.5, 6) * (1 - ramp(since, 9, 20));

  const stops = skyStops(tones, land.horizon);
  gradient(view, 0, land.horizon, stops.map(([at, color]) => [at, css(color)] as const));
  if (!morning) {
    drawWater(ctx, w, land.horizon, h, (depth) => css(blend(skyAt(stops, 1 - 0.5 * depth), tones.sea, 0.3 + 0.45 * depth)));
  }
  const dome = Math.min(90, Math.max(26, land.horizon * 0.95));
  glow(ctx, land.sunX, land.sunLine, dome * (morning ? 1 + 0.25 * flare : 1), 2.1, tones.glow, curve(DOME[mood], stage));
  if (!morning) {
    glow(ctx, land.sunX, land.sunLine, dome * 1.25, 1.5, tones.skyLow, 0.5 * flare);
  }

  const starry = morning ? (late: number) => 1 - ramp(t, 2 + late * 13, 5 + late * 13) : (late: number) => (moment === undefined ? 0 : ramp(since, 6 + (1 - late) * 13, 9 + (1 - late) * 13));
  drawStars(ctx, scene.stars, t, '#fff6dc', starry);
  drawBrightStar(ctx, scene.star.x, scene.star.y, t, morning ? 1 - ramp(t, 15, 21) : moment === undefined ? 0 : ramp(since, 4, 6.5));

  paintSun(ctx, land, tones, sunY, morning ? h : land.horizon, up, flare);
  // Morning clouds catch fire from the horizon up; evening ones go out the same way.
  const fire = ramp(stage, 0.3, 1.9);
  const dusk = Math.max(0, stage - 2);
  drawClouds(ctx, scene.clouds, -dir * t, tones, morning ? (level) => clamp01((fire * 1.6 - level) / 0.6) : (level) => 1 - clamp01((dusk * 1.7 - level) / 0.7));
  if (moment !== undefined && moment > BIRDS_S) {
    drawBirds(ctx, scene.birds.x, scene.birds.y, dir, moment - BIRDS_S, css(tones.bird));
  }

  const rim = css(tones.rim);
  const lit = curve(LIT[mood], stage);
  const mist = curve(MIST[mood], stage);
  const reach = 50 + w * 0.12;
  const plane = (name: PlaneName): void => {
    const ridge = land[name];
    if (ridge) {
      const [crest, foot] = HAZE[mood][name];
      drawRidge(ctx, ridge, tones[name], tones.haze, crest, foot * mist);
      drawRim(ctx, ridge, rim, lit * RIM[name], land.sunX, reach);
    }
  };
  if (!morning) {
    // The path of light dims as the sun sinks, but the afterglow keeps a little of it.
    drawReflection(ctx, land.sunX, land.horizon, h, land.radius, t, css(blend(tones.sunCore, tones.skyRim, 1 - up)), 0.9 * Math.max(up, 0.45 * (1 - ramp(stage, 2, 3))));
  }
  plane('far');
  drawMist(ctx, scene.mist, w, -dir * t, t, css(tones.haze), 0.75 * mist);
  plane('mid');
  plane('near');

  // The step in depth, then the lookout.
  const veil = Math.round(Math.min(14, Math.max(5, h * 0.14)));
  gradient(view, lookoutTop(view, view.foxX) - veil, h, [[0, css(tones.haze, 0)], [1, css(tones.haze)]], VEIL[mood] * mist);
  paintLookout(view, lookoutTones(mood, tones, stage));
}

const DARK: Rgb = [6, 6, 18];
/** Pale flowers in the morning grass: they come out of the dark with the day. */
const FLOWERS: readonly Rgb[] = [[255, 246, 236], [255, 214, 226], [255, 240, 176], [232, 224, 255]];

/** The lookout in this light: dark blue-green then fresh green in the morning, olive sinking to violet in the evening. */
function lookoutTones(mood: Mood, { ground, grass }: Tones, stage: number): LookoutTones {
  const shown = 0.9 * ramp(stage, 0.9, 2);
  return {
    body: css(ground),
    rim: css(blend(ground, grass, 0.55)),
    deep: css(blend(ground, DARK, 0.3)),
    blades: [css(grass), css(blend(ground, grass, 0.4))],
    front: [css(blend(ground, grass, 0.7)), css(blend(ground, DARK, 0.15))],
    flowers: mood === 'sunrise' ? FLOWERS.map((pale) => css(blend(grass, pale, shown))) : undefined,
  };
}

const front = (mood: Mood) => (view: VistaView): void => {
  const stage = stageAt(view.t, view.moment);
  paintLookoutFront(view, lookoutTones(mood, tonesAt(mood, stage), stage));
};

export const sunrise: VistaPainter = { back: (view) => paint(view, 'sunrise'), front: front('sunrise') };
export const sunset: VistaPainter = { back: (view) => paint(view, 'sunset'), front: front('sunset') };
