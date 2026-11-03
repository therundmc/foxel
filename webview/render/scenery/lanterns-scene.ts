import { cloudsOf, drawClouds } from './lanterns-clouds';
import { layOut, type Town } from './lanterns-town';
import { lookoutTop } from './lookout';
import { clamp01, gradient, prerender, ramp, seeded, type VistaView } from './paint';

// What does not move, painted once for a view and twice over: at dusk and by night, the one fading into the other.
// The sky, with big soft clouds lit from below while the sun has just gone; far blue mountains; the town in its
// colours of that hour; and the still water giving it all back, broken by faint ripples.

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));

/** How far the clouds may drift over the minute of the sky. */
const DRIFT = 10;

/** One hour's colours. */
interface Light {
  readonly sky: readonly (readonly [number, string])[];
  readonly water: readonly (readonly [number, string])[];
  /** The clouds: their shaded tops, their bodies, and their undersides lit from below, the lowest row brightest. */
  readonly cloud: readonly [string, string, string, string];
  readonly mountains: readonly [string, string];
  /** The town's tones, in the order of `T`. */
  readonly town: readonly string[];
  /** The sun just gone below the mountains, as the channels of its colour, or none. */
  readonly sun?: string;
  /** How much the town is given back by the water. */
  readonly mirrored: number;
  readonly ripple: string;
}

const DUSK: Light = {
  sky: [[0, '#2c2c6e'], [0.3, '#4e3a84'], [0.58, '#a2527e'], [0.8, '#e88466'], [1, '#ffbf72']],
  water: [[0, '#d07a74'], [0.18, '#94507c'], [0.55, '#46347a'], [1, '#1e1c50']],
  cloud: ['#7a5296', '#93619c', '#ee967c', '#ffd294'],
  mountains: ['#6c4e8e', '#4e3a78'],
  town: ['#a43a34', '#6a2230', '#d8664c', '#3c3462', '#e8946a', '#2c284e', '#7a6086', '#4c3c6c', '#5a2838', '#5a3044', '#c84634', '#5a3a50', '#6e3040', '#3a2a5c'],
  sun: '255,190,120',
  mirrored: 0.62,
  ripple: '#f2a888',
};
const NIGHT: Light = {
  sky: [[0, '#05081f'], [0.45, '#0e1440'], [0.8, '#1c2258'], [1, '#2e2a62']],
  water: [[0, '#1e2256'], [0.3, '#121844'], [1, '#070a26']],
  cloud: ['#0c1136', '#11173f', '#171c4a', '#1e2252'],
  mountains: ['#151b4c', '#0f1440'],
  town: ['#561e2c', '#34121e', '#7a2a30', '#141433', '#4a2232', '#0c0d26', '#26284e', '#181a3c', '#2a1222', '#26141e', '#6a2028', '#20142a', '#3a1622', '#0d1236'],
  mirrored: 0.7,
  ripple: '#3a3c78',
};

export interface Scene extends Town {
  /** Dusk and night, each as its sky, its clouds and its land and water. */
  readonly dusk: readonly [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement];
  readonly night: readonly [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement];
  /** The lanterns' warmth over the town and on the water, laid over the rest as much as they light it. */
  readonly warmth: HTMLCanvasElement;
  readonly sunX: number;
}

/** Two ridges of far mountains: how tall each is in each column. */
function ridges(w: number, high: number, seed: number): [Int16Array, Int16Array] {
  const far = new Int16Array(w);
  const near = new Int16Array(w);
  for (let x = 0; x < w; x++) {
    const a = 0.55 + 0.25 * Math.sin(x / 23 + seed) + 0.15 * Math.sin(x / 9.3 + seed * 2) + 0.05 * Math.sin(x / 3.1);
    const b = 0.3 + 0.2 * Math.sin(x / 15 + seed * 3) + 0.08 * Math.sin(x / 5.2 + 1);
    far[x] = Math.max(1, Math.round(high * a));
    near[x] = Math.max(1, Math.round(high * b));
  }
  return [far, near];
}

/** What stands on the far shore, on a canvas of its own so that the water can give it back. */
function far(view: VistaView, town: Town, light: Light, hills: [Int16Array, Int16Array]): HTMLCanvasElement {
  const { w } = view;
  const { shore, ground, rects } = town;
  return prerender(w, shore, (ctx) => {
    hills.forEach((tall, i) => {
      ctx.fillStyle = light.mountains[i];
      for (let x = 0; x < w; x++) {
        const top = (i === 0 ? shore : ground + 1) - tall[x];
        ctx.fillRect(x, top, 1, shore - top);
      }
    });
    for (let i = 0; i < rects.length; i += 5) {
      ctx.fillStyle = light.town[rects[i + 4]];
      ctx.fillRect(rects[i], rects[i + 1], rects[i + 2], rects[i + 3]);
    }
  });
}

function land(view: VistaView, town: Town, light: Light, hills: [Int16Array, Int16Array]): HTMLCanvasElement {
  const { w, h } = view;
  const { shore, foot } = town;
  const above = far(view, town, light, hills);
  return prerender(w, h, (ctx) => {
    const painted: VistaView = { ...view, ctx };
    gradient(painted, shore, h, light.water);
    ctx.drawImage(above, 0, 0);
    // The water gives the shore back row by row, a little shaken and paler further out.
    for (let row = 0; row < Math.min(shore, foot - shore + 3); row++) {
      const shake = row < 2 ? 0 : Math.round(Math.sin(row * 1.9) * (0.4 + row * 0.05));
      ctx.globalAlpha = light.mirrored * (1 - row / (foot - shore + 6)) * (row % 4 === 3 ? 0.55 : 1);
      ctx.drawImage(above, 0, shore - 1 - row, w, 1, shake, shore + row, w, 1);
    }
    // A few long faint ripples catching the sky.
    const random = seeded(0x41b);
    ctx.fillStyle = light.ripple;
    for (let i = 0; i < (w * (foot - shore)) / 260; i++) {
      const row = shore + 2 + Math.floor(random() ** 0.8 * (foot - shore));
      ctx.globalAlpha = 0.18 + 0.2 * random();
      ctx.fillRect(Math.floor(random() * w), row, 3 + Math.floor(random() * 10), 1);
    }
    ctx.globalAlpha = 0.25;
    ctx.fillRect(0, shore, w, 1);
    ctx.globalAlpha = 1;
  });
}

function hour(view: VistaView, town: Town, light: Light, sunX: number, hills: [Int16Array, Int16Array]): [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement] {
  const { w, dir } = view;
  const { shore } = town;
  const sky = prerender(w, shore, (ctx) => {
    gradient({ ...view, ctx }, 0, shore, light.sky);
    if (light.sun) {
      const glow = ctx.createRadialGradient(sunX, shore, 0, sunX, shore, shore * 1.3);
      [[0, 0.55], [0.35, 0.2], [1, 0]].forEach(([at, alpha]) => glow.addColorStop(at, `rgba(${light.sun},${alpha})`));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, shore);
    }
  });
  // A little wider than the view, for the clouds to drift into it.
  const cloudy = prerender(w + DRIFT * 2, shore, (ctx) => {
    ctx.translate(DRIFT, 0);
    drawClouds(ctx, cloudsOf(w, shore, sunX, dir), light.cloud);
  });
  return [sky, cloudy, land(view, town, light, hills)];
}

// The lanterns' light over the town: a wide soft dome on the sky, and its reflection, fainter, on the water.
function warmthOf(w: number, bottom: number, { shore, cx, half }: Town): HTMLCanvasElement {
  const wide = half * 1.3 + 10;
  const tall = shore * 0.6;
  return prerender(w, bottom, (ctx) => {
    ctx.fillStyle = '#ff8a4a';
    for (let y = 0; y < bottom; y++) {
      const up = y < shore ? (shore - y) / tall : ((y - shore) / tall) * 2.2;
      for (let x = 0; x < w; x++) {
        const near = Math.exp(-(((x - cx) / wide) ** 2) - up * up * 1.6) * (y < shore ? 1 : 0.6);
        if (near > 0.01) {
          ctx.globalAlpha = near;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    ctx.globalAlpha = 1;
  });
}

function build(view: VistaView): Scene {
  const town = layOut(view);
  const { w, foxX, dir } = view;
  const room = dir > 0 ? w - foxX : foxX;
  const sunX = Math.round(clamp(foxX + dir * clamp(room * 0.86, 50, 420), 4, w - 4));
  const hills = ridges(w, clamp(Math.round(town.shore * 0.36), 5, 26), 1.7);
  return {
    ...town,
    dusk: hour(view, town, DUSK, sunX, hills),
    night: hour(view, town, NIGHT, sunX, hills),
    warmth: warmthOf(w, Math.min(town.foot, lookoutTop(view, town.cx)), town),
    sunX,
  };
}

let kept: { key: string; scene: Scene } | undefined;

/** The scene of this view, painted the first time it is asked for. */
export function sceneOf(view: VistaView): Scene {
  const key = `${view.w}:${view.h}:${view.foxX}:${view.dir}`;
  if (kept?.key !== key) {
    kept = { key, scene: build(view) };
  }
  return kept.scene;
}

/** How far the night has come, from 0 at dusk to 1: it is always night by the great moment. */
export function nightfall({ t, moment }: VistaView): number {
  return Math.max(ramp(t, 3, 32), moment === undefined ? 0 : ramp(moment, -4, 4));
}

/** Dusk, fading into night: the sky and its clouds, for under the stars; then the land and the water. */
export function paintSky(view: VistaView, scene: Scene): void {
  const { ctx } = view;
  const k = nightfall(view);
  ctx.drawImage(scene.dusk[0], 0, 0);
  ctx.globalAlpha = k;
  ctx.drawImage(scene.night[0], 0, 0);
  ctx.globalAlpha = 1;
}

export function paintClouds(view: VistaView, scene: Scene): void {
  const { ctx, t, dir } = view;
  const k = nightfall(view);
  // The clouds drift very slowly the way the fox looks.
  const drift = Math.round(clamp(dir * t * 0.12, -DRIFT, DRIFT)) - DRIFT;
  ctx.globalAlpha = 1 - k;
  ctx.drawImage(scene.dusk[1], drift, 0);
  ctx.globalAlpha = clamp01(k);
  ctx.drawImage(scene.night[1], drift, 0);
  ctx.globalAlpha = 1;
}

export function paintLand(view: VistaView, scene: Scene): void {
  const { ctx } = view;
  ctx.drawImage(scene.dusk[2], 0, 0);
  ctx.globalAlpha = nightfall(view);
  ctx.drawImage(scene.night[2], 0, 0);
  ctx.globalAlpha = 1;
}
