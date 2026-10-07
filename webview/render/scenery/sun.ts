import { clamp01, gradient, px, ramp, seeded, type VistaPainter, type VistaView } from './paint';
import { drawMist, drawRidge, drawRim, layLand, layMist, type Land } from './sun-land';
import { blend, css, curve, tonesAt, type Mood, type Rgb, type Tones } from './sun-palette';
import { drawBeacon, drawFlecks, drawGlints, drawWater, laySea, type Sea } from './sun-sea';
import { drawBirds, drawBrightStar, drawClouds, drawStars, layClouds, layStars, type Cloud, type Flight } from './sun-sky';

// The sunrise and the sunset: two moods of one painter. Morning is fresh, misty and pale, over mountains;
// evening is rich and deep, over the sea. In both, the colours turn all through the minute, and the best
// comes with the great moment: the sun clears the ridge, or slips under the water and the afterglow flares.

/** The moment comes somewhere in this window: until then the sun waits, barely moving. */
const WAIT_FROM_S = 22.5;
const WAIT_TO_S = 27.5;
/** How long the moment takes to turn the sky, then how long the sky takes to settle into its last colours. */
const TURN_S = 5;
const SETTLE_FROM_S = 6.5;
const SETTLE_TO_S = 21;
/** The birds leave as the fox looks up. */
const TAKE_OFF_S = 0.3;

interface Scene {
  readonly key: string;
  readonly land: Land;
  readonly clouds: readonly Cloud[];
  readonly stars: Float32Array;
  readonly star: { readonly x: number; readonly y: number };
  readonly mist: Float32Array;
  readonly sea: Sea;
  /** Dew on the grass: x, phase, rate. */
  readonly dew: Float32Array;
  readonly flight: Flight;
}

// Laid out once per size and place, then only read: one scene kept per mood.
const scenes: Partial<Record<Mood, Scene>> = {};

function sceneFor({ w, h, foxX, dir }: VistaView, mood: Mood): Scene {
  const key = `${w}:${h}:${Math.round(foxX)}:${dir}`;
  const kept = scenes[mood];
  if (kept?.key === key) {
    return kept;
  }
  const morning = mood === 'sunrise';
  const land = layLand(mood, w, h, Math.round(foxX), dir);
  const { horizon, sunX, sunLine, radius } = land;
  const random = seeded(morning ? 0xd3a1 : 0xe7e2);
  const reach = Math.max(90, w * 0.6);
  // Morning clouds catch fire from the sun outward; evening ones go out from the horizon up.
  const clouds = layClouds(w, morning ? Math.round((land.far.crest + sunLine) / 2) : horizon - 1, morning ? 0xc10d : 0xc1e4, (x, y, level) =>
    morning ? Math.hypot(x - sunX, 2 * (y - sunLine)) / reach : level,
  );
  const dew = new Float32Array(Math.round(w / 11) * 3);
  for (let i = 0; i < dew.length; i += 3) {
    dew.set([Math.floor(random() * w), random() * Math.PI * 2, 0.5 + random() * 0.9], i);
  }
  const perchRoom = Math.max(4, land.perch.y - 4);
  const scene: Scene = {
    key,
    land,
    clouds,
    stars: layStars(w, 1, Math.round(horizon * 0.62), morning ? 0x57a2 : 0x57a3),
    star: { x: Math.min(w - 4, Math.max(3, sunX + dir * radius * 2)), y: Math.max(3, Math.round(sunLine - Math.max(radius * 3.2, horizon * 0.55))) },
    mist: morning ? layMist(w, [horizon, land.near.crest + Math.round((h - land.near.crest) * 0.45)], random) : new Float32Array(0),
    sea: laySea(w, h - horizon, radius, 0x5ea5),
    dew,
    flight: { x: land.perch.x, y: land.perch.y, dir, lift: Math.min(30, perchRoom * 0.55), formation: !morning, small: h < 40 },
  };
  scenes[mood] = scene;
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

/** A disc of pixels, row by row, cut off at `clip` (the sea line). `colorOf` is given 0 at its top, 1 at its bottom. */
function disc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, clip: number, alpha: number, colorOf: (k: number) => string): void {
  ctx.globalAlpha = alpha;
  for (let dy = -r; dy <= r; dy++) {
    if (cy + dy < clip) {
      const half = Math.floor(Math.sqrt((r + 0.5) ** 2 - dy * dy));
      ctx.fillStyle = colorOf((dy + r) / (2 * r));
      ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}

// Sixteen rays, as pixel steps: the eight straight and diagonal ones, and the eight in between.
const RAYS: readonly (readonly [number, number])[] = [
  [1, 0], [1, 0.5], [1, 1], [0.5, 1], [0, 1], [-0.5, 1], [-1, 1], [-1, 0.5],
  [-1, 0], [-1, -0.5], [-1, -1], [-0.5, -1], [0, -1], [0.5, -1], [1, -1], [1, -0.5],
];

/** The burst of the morning sun. The long rays and the short ones breathe in turn, slowly. */
function rays(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: number, burst: number, color: string): void {
  if (burst <= 0.02) {
    return;
  }
  RAYS.forEach(([vx, vy], i) => {
    const step = Math.hypot(vx, vy);
    const breath = 1 + 0.25 * Math.sin(t * 0.7 + (i % 2) * Math.PI);
    const count = Math.round((burst * breath * r * (i % 2 === 0 ? 1.5 : 0.85)) / step);
    const first = Math.ceil((r + 2.5) / step);
    for (let n = 0; n < count; n++) {
      px(ctx, cx + Math.floor(vx * (first + n) + 0.5), cy + Math.floor(vy * (first + n) + 0.5), color, 0.62 * (1 - n / (count + 1)) ** 0.8);
    }
  });
}

function paintSun(view: VistaView, land: Land, tones: Tones, sunY: number, clip: number, flare: number, burst: number): void {
  const { ctx, t } = view;
  const { sunX, radius } = land;
  const cy = Math.round(sunY);
  const up = clamp01((clip - (sunY - radius)) / (2 * radius));
  glow(ctx, sunX, Math.min(sunY, clip), radius * (3 + flare), 1, tones.sunCore, 0.55 * (0.35 + 0.65 * up) + 0.2 * flare);
  rays(ctx, sunX, cy, radius, t, burst, css(tones.sunCore));
  const halo = css(tones.sunCore);
  disc(ctx, sunX, cy, radius + 3, clip, 0.13 + 0.1 * flare, () => halo);
  disc(ctx, sunX, cy, radius + 1, clip, 0.25, () => halo);
  disc(ctx, sunX, cy, radius, clip, 1, (k) => css(blend(tones.sunCore, tones.sun, k * k * 1.3)));
}

// Numbers keyed on the same stages as the palette.
const DOME = { sunrise: [0.3, 0.45, 0.62, 0.8, 0.75, 0.42], sunset: [0.55, 0.62, 0.75, 0.85, 0.85, 0.28] } as const;
const FAR_HAZE = [0.95, 0.95, 0.9, 0.85, 0.75, 0.6] as const;
const MID_HAZE = [0.9, 0.9, 0.85, 0.75, 0.6, 0.4] as const;
const NEAR_HAZE = [0.5, 0.5, 0.45, 0.35, 0.25, 0.12] as const;
const MIST = [0.75, 0.75, 0.7, 0.6, 0.45, 0.22] as const;
const RIM_FAR = [0, 0.15, 0.5, 0.9, 1, 0.5] as const;
const RIM_NEAR = { sunrise: [0, 0, 0.1, 0.6, 0.9, 0.7], sunset: [0.8, 0.8, 0.7, 0.4, 0.25, 0] } as const;

function paintMorning(view: VistaView, scene: Scene, tones: Tones, stage: number): void {
  const { ctx, w, t, moment, dir } = view;
  const { land } = scene;
  const haze = tones.haze;
  const rim = css(tones.rim);
  const reach = 50 + w * 0.12;
  drawRidge(ctx, land.far, tones.far, haze, 0.18, curve(FAR_HAZE, stage));
  drawRim(ctx, land.far, rim, curve(RIM_FAR, stage), land.sunX, reach);
  const mist = curve(MIST, stage);
  drawMist(ctx, scene.mist.subarray(0, scene.mist.length >> 1), w, t, dir, css(haze), mist);
  if (land.mid) {
    drawRidge(ctx, land.mid, tones.mid, haze, 0.05, curve(MID_HAZE, stage));
    drawRim(ctx, land.mid, rim, curve(RIM_FAR, stage) * 0.6, land.sunX, reach * 0.8);
  }
  if (moment !== undefined && moment > TAKE_OFF_S) {
    drawBirds(ctx, scene.flight, moment - TAKE_OFF_S, css(tones.bird));
  }
  drawMist(ctx, scene.mist.subarray(scene.mist.length >> 1), w, t, dir, css(haze), mist * 0.8);
}

function paintEvening(view: VistaView, scene: Scene, tones: Tones, stage: number, stops: Stops, sunY: number): void {
  const { ctx, t, moment } = view;
  const { land, sea } = scene;
  const up = clamp01((land.horizon - (sunY - land.radius)) / (2 * land.radius));
  // The path of light dims as the sun sinks, but the afterglow keeps a little of it.
  const path = Math.max(up, 0.45 * (1 - ramp(stage, 2, 3)));
  drawFlecks(ctx, sea, land.horizon, t, css(blend(tones.skyLow, tones.skyRim, 0.5)), 0.4);
  drawGlints(ctx, sea, land.sunX, land.horizon, t, css(blend(tones.sunCore, tones.skyRim, 1 - up)), 0.9 * path);
  drawRidge(ctx, land.far, tones.far, tones.haze, 0.1, 0.4);
  if (land.beacon && moment !== undefined) {
    drawBeacon(ctx, land.beacon.x, land.beacon.y, land.horizon, t, ramp(moment, 8.5, 10.5));
  }
  if (moment !== undefined && moment > TAKE_OFF_S) {
    drawBirds(ctx, scene.flight, moment - TAKE_OFF_S, css(tones.bird));
  }
  void stops;
}

function paint(view: VistaView, mood: Mood): void {
  const { ctx, w, h, t, moment, dir } = view;
  const scene = sceneFor(view, mood);
  const { land } = scene;
  const morning = mood === 'sunrise';
  const stage = stageAt(t, moment);
  const tones = tonesAt(mood, stage);
  const since = moment ?? 0;
  const sunY = land.sunLine - altitudeAt(mood, t, moment) * land.radius;
  // Morning: the burst as the sun clears the ridge. Evening: the afterglow that swells once it is gone.
  const flare = moment === undefined ? 0 : morning ? Math.sin(Math.PI * clamp01(since / 4)) ** 2 : ramp(since, 1.5, 6) * (1 - ramp(since, 9, 20));
  const burst = morning && moment !== undefined ? ramp(since, 0.4, 2.6) * (1 - 0.4 * ramp(since, 5, 15)) : 0;

  const stops = skyStops(tones, land.horizon);
  gradient(view, 0, land.horizon, stops.map(([at, color]) => [at, css(color)] as const));
  if (!morning) {
    drawWater(ctx, w, land.horizon, h, (depth) => css(blend(skyAt(stops, 1 - 0.5 * depth), tones.sea, 0.3 + 0.45 * depth)));
  }
  const dome = Math.min(90, Math.max(26, land.horizon * 0.95));
  glow(ctx, land.sunX, land.sunLine, dome, 2.1, tones.glow, curve(DOME[mood], stage));
  if (!morning) {
    glow(ctx, land.sunX, land.sunLine, dome * 1.25, 1.5, tones.skyLow, 0.5 * flare);
  }

  const starry = morning ? (late: number) => 1 - ramp(t, 2 + late * 13, 5 + late * 13) : (late: number) => (moment === undefined ? 0 : ramp(since, 6 + (1 - late) * 13, 9 + (1 - late) * 13));
  drawStars(ctx, scene.stars, t, '#fff6dc', starry);
  drawBrightStar(ctx, scene.star.x, scene.star.y, t, morning ? 1 - ramp(t, 15, 21) : moment === undefined ? 0 : ramp(since, 4, 6.5));

  paintSun(view, land, tones, sunY, morning ? h : land.horizon, flare, burst);
  const fire = ramp(stage, 0.3, 1.9);
  const dusk = Math.max(0, stage - 2);
  drawClouds(ctx, scene.clouds, dir * t, tones, morning ? (rank) => clamp01((fire * 1.6 - rank) / 0.6) : (rank) => 1 - clamp01((dusk * 1.7 - rank) / 0.7));

  if (morning) {
    paintMorning(view, scene, tones, stage);
  } else {
    paintEvening(view, scene, tones, stage, stops, sunY);
  }

  const rim = css(tones.rim);
  const lit = curve(RIM_NEAR[mood], stage);
  drawRidge(ctx, land.near, tones.near, tones.haze, 0, morning ? curve(NEAR_HAZE, stage) : 0.12);
  drawRim(ctx, land.near, rim, lit * 0.8, land.sunX, 40 + w * 0.15);
  drawRidge(ctx, land.ground, tones.ground, tones.haze, 0, 0);
  drawRim(ctx, land.ground, rim, lit * 0.55, land.sunX, 60 + w * 0.2);
  if (morning && moment !== undefined) {
    // Dew: brief glints on the grass once the light reaches it.
    const dew = ramp(since, 2.5, 6);
    for (let i = 0; i < scene.dew.length; i += 3) {
      const x = scene.dew[i];
      px(ctx, x, land.ground.tops[x], '#ffffff', dew * Math.max(0, Math.sin(t * scene.dew[i + 2] + scene.dew[i + 1])) ** 8);
    }
    // The light floods everything for a breath.
    px(ctx, 0, 0, rim, 0.12 * flare, w, h);
  }
}

export const sunrise: VistaPainter = { back: (view) => paint(view, 'sunrise') };
export const sunset: VistaPainter = { back: (view) => paint(view, 'sunset') };
