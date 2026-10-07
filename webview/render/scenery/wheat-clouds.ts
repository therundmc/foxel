import { mix, prerender, seeded, type VistaView } from './paint';
import type { WheatLand } from './wheat-land';
import { patch } from './wheat-wind';

// Fair-weather clouds: a few of them, flat underneath and softly heaped on top, drifting toward the side the fox
// looks to. The big ones are near and high, the small ones far and low on the horizon; each lays its shadow on a field.

/** A cloud in full sun, where it turns from it, its flat grey base and the shadow line under that. */
const CLOUD = ['#fffdf5', '#e9eef3', '#c6d4e6', '#aabdd8'] as const;
/** Far clouds melt into the air over the horizon. */
const AIR = '#f1ecd0';
const SHADOW = '#7a5630';
/** How dark a shadow is at its edge, and again in its middle. */
const SHADOW_ALPHA = 0.12;
/** Only clouds this near lay a shadow we can see. */
const SHADOW_FROM = 0.45;
/** Pixels a second for the nearest cloud; the farthest goes at a third of it. */
const DRIFT = 2.4;
/** Clouds leave the view and come back this far outside it. */
const OUTSIDE = 64;

interface Cloud {
  readonly image: HTMLCanvasElement;
  /** How near it is, from 0 to 1. */
  readonly near: number;
  readonly wide: number;
  /** Where it starts, as a share of its whole round, and the row of its base. */
  readonly start: number;
  readonly base: number;
}

function paintCloud(wide: number, tall: number, near: number, dir: number, random: () => number): HTMLCanvasElement {
  const tones = CLOUD.map((tone) => mix(tone, AIR, 0.45 * (1 - near)));
  const lean = 0.8 + 0.5 * random();
  const waves = [7 + 5 * random(), 6.3 * random(), 17 + 9 * random(), 6.3 * random()];
  return prerender(wide, tall, (ctx) => {
    for (let x = 0; x < wide; x++) {
      const across = ((x + 0.5) / wide) ** lean;
      // One mass, heaped off-centre, with a few broad lumps along its top: not a pile of balls.
      const heap = Math.sin(Math.PI * across) ** 0.6 * (0.64 + 0.22 * Math.sin(across * waves[0] + waves[1]) + 0.14 * Math.sin(across * waves[2] + waves[3]));
      const high = Math.max(1, Math.round(tall * heap));
      // Flat underneath, but for its two ends, which curl up.
      const foot = tall - (high <= 1 && tall > 3 ? 1 : 0);
      const sunward = dir > 0 ? 1 - (x + 0.5) / wide : (x + 0.5) / wide;
      const shade = Math.round(high * (0.38 - 0.2 * sunward));
      ctx.fillStyle = tones[0];
      ctx.fillRect(x, foot - high, 1, high);
      if (high >= 3) {
        ctx.fillStyle = tones[1];
        ctx.fillRect(x, foot - shade - 1, 1, shade + 1);
        ctx.fillStyle = tones[2];
        ctx.fillRect(x, foot - shade, 1, shade);
        ctx.fillStyle = tones[3];
        ctx.fillRect(x, foot - 1, 1, 1);
      } else {
        ctx.fillStyle = tones[2];
        ctx.fillRect(x, foot - 1, 1, 1);
      }
    }
  });
}

let kept: { key: string; clouds: readonly Cloud[] } | undefined;

function cloudsOf({ w, dir }: VistaView, horizon: number): readonly Cloud[] {
  const key = `${w}:${horizon}:${dir}`;
  if (kept?.key !== key) {
    const random = seeded(0xc10d);
    const count = Math.min(6, Math.max(2, Math.round(w / 85)));
    const sky = Math.max(8, horizon - 3);
    const clouds: Cloud[] = [];
    for (let i = 0; i < count; i++) {
      // Evenly from far to near, and well apart across the sky whatever their number.
      const near = (i + 0.5) / count;
      const tall = Math.max(3, Math.round(Math.min(5 + 7 * near, sky * (0.16 + 0.14 * near))));
      const wide = Math.round(tall * (3.6 + 1.2 * random()) + 6);
      const base = Math.round(sky - 2 - (sky - tall - 3) * (0.08 + 0.8 * near ** 0.8));
      const start = (0.2 + i * 0.618 + 0.15 * random()) % 1;
      clouds.push({ image: paintCloud(wide, tall, near, dir, random), near, wide, start, base });
    }
    kept = { key, clouds };
  }
  return kept.clouds;
}

/** The column the middle of a cloud is over right now. */
function cloudX({ w, t, dir }: VistaView, cloud: Cloud): number {
  const round = w + 2 * OUTSIDE;
  const along = (cloud.start * round + (DRIFT * (1 + 2 * cloud.near) * t) / 3) % round;
  return dir > 0 ? along - OUTSIDE : w + OUTSIDE - along;
}

export function paintClouds(view: VistaView, land: WheatLand): void {
  for (const cloud of cloudsOf(view, land.horizon)) {
    view.ctx.drawImage(cloud.image, Math.round(cloudX(view, cloud) - cloud.wide / 2), cloud.base - cloud.image.height);
  }
}

/** The shadows the clouds lay on field `depth`: the near clouds on the near fields, darker in the middle than at the edge. */
export function paintShadows(view: VistaView, land: WheatLand, depth: number): void {
  const { ctx } = view;
  const field = land.fields[depth];
  ctx.fillStyle = SHADOW;
  ctx.globalAlpha = SHADOW_ALPHA;
  cloudsOf(view, land.horizon).forEach((cloud, i) => {
    if (cloud.near < SHADOW_FROM || Math.min(land.fields.length - 1, Math.floor(cloud.near * land.fields.length)) !== depth) {
      return;
    }
    // The sun is behind the fox's shoulder: the shadow falls ahead of its cloud.
    const x = cloudX(view, cloud) + view.dir * 14;
    const long = cloud.wide * (0.45 + 0.25 * cloud.near);
    const high = Math.max(1.5, field.deep * 0.42);
    patch(view, field, x, field.deep * 0.5, long, high, 3, i + 90);
    patch(view, field, x, field.deep * 0.5, long * 0.7, high * 0.6, 3, i + 95);
  });
  ctx.globalAlpha = 1;
}
