import { mix, prerender, seeded, type VistaView } from './paint';
import type { Sea } from './whales-sea';

// The air over the sea: a few big soft clouds drifting slowly toward the side the fox looks to, gulls gliding in
// lazy loops, and far out a little white sail creeping along the horizon.

/** A cloud in full sun, the soft shade of its lower half, its flat base. */
const CLOUD = ['#ffffff', '#e4eef8', '#c8d9ec'] as const;
const HAZE = '#e2f4ee';
/** Pixels a second for the nearest cloud. */
const CLOUD_DRIFT = 0.9;
/** Clouds go out of the view and come back this far beyond it. */
const OUTSIDE = 50;

const GULL = '#ffffff';
const GULL_TIP = '#56657a';
/** A gull's wings up, held out, and down, from its left tip to its right one: [dx, dy, a dark tip]. */
const WINGS = [
  [[-2, -1, 1], [-1, 0, 0], [0, 1, 0], [1, 0, 0], [2, -1, 1]],
  [[-2, 0, 1], [-1, -1, 0], [0, 0, 0], [1, -1, 0], [2, 0, 1]],
  [[-2, 1, 1], [-1, 0, 0], [0, 0, 0], [1, 0, 0], [2, 1, 1]],
] as const;

const HULL = '#7b5a4a';
const SAIL = '#fffaf0';
/** Pixels a second the boat makes. */
const SAILING = 0.22;

interface Cloud {
  readonly image: HTMLCanvasElement;
  readonly near: number;
  readonly start: number;
  readonly base: number;
}

/** A heap of round puffs on one flat base, white on top and softly shaded underneath. */
function paintCloud(wide: number, tall: number, near: number, random: () => number): HTMLCanvasElement {
  const tones = CLOUD.map((tone) => mix(tone, HAZE, 0.4 * (1 - near)));
  const puffs: [number, number][] = [];
  const count = 2 + Math.round(wide / 14);
  for (let i = 0; i < count; i++) {
    const along = (i + 0.5) / count;
    // The biggest puff a little off the middle, the smaller ones at the ends.
    const r = tall * (0.45 + 0.55 * Math.sin(Math.PI * along) ** 0.7) * (0.75 + 0.3 * random());
    puffs.push([along * wide, r]);
  }
  return prerender(wide, tall, (ctx) => {
    for (let x = 0; x < wide; x++) {
      let high = 0;
      for (const [cx, r] of puffs) {
        const d = (x + 0.5 - cx) / (r * 1.15);
        if (Math.abs(d) < 1) {
          high = Math.max(high, r * Math.sqrt(1 - d * d));
        }
      }
      const top = Math.round(Math.min(tall, high));
      if (top <= 0) {
        continue;
      }
      const shade = Math.round(top * 0.3);
      ctx.fillStyle = tones[0];
      ctx.fillRect(x, tall - top, 1, top);
      ctx.fillStyle = tones[1];
      ctx.fillRect(x, tall - shade - 1, 1, shade + 1);
      ctx.fillStyle = tones[2];
      ctx.fillRect(x, tall - 1, 1, 1);
    }
  });
}

let kept: { key: string; clouds: readonly Cloud[] } | undefined;

function cloudsOf({ w }: VistaView, horizon: number): readonly Cloud[] {
  const key = `${w}:${horizon}`;
  if (kept?.key !== key) {
    const random = seeded(0xc10d5);
    const count = Math.min(5, Math.max(2, Math.round(w / 95)));
    const clouds: Cloud[] = [];
    for (let i = 0; i < count; i++) {
      const near = (i + 0.5) / count;
      const tall = Math.max(3, Math.round(Math.min(4 + 8 * near, horizon * (0.18 + 0.16 * near))));
      const wide = Math.round(tall * (2.6 + 1.2 * random()) + 4);
      // The far ones low over the horizon, the near ones high.
      const base = Math.max(tall + 3, Math.round(horizon - 3 - (horizon - tall - 4) * (0.1 + 0.6 * near)));
      clouds.push({ image: paintCloud(wide, tall, near, random), near, start: (0.15 + i * 0.618 + 0.1 * random()) % 1, base });
    }
    kept = { key, clouds };
  }
  return kept.clouds;
}

export function paintClouds(view: VistaView, { horizon }: Sea): void {
  const { ctx, w, t, dir } = view;
  const round = w + 2 * OUTSIDE;
  for (const cloud of cloudsOf(view, horizon)) {
    const along = (cloud.start * round + CLOUD_DRIFT * (0.4 + 0.6 * cloud.near) * t) % round;
    const middle = dir > 0 ? along - OUTSIDE : w + OUTSIDE - along;
    ctx.drawImage(cloud.image, Math.round(middle - cloud.image.width / 2), cloud.base - cloud.image.height);
  }
}

// Two or three gulls, each going round its own slow loop over the sea; they beat their wings when they climb.
export function paintGulls(view: VistaView, { horizon }: Sea): void {
  const { ctx, w, t, foxX, dir } = view;
  const count = w >= 200 ? 3 : 2;
  for (let i = 0; i < count; i++) {
    const cx = foxX + dir * w * (0.12 + 0.24 * i) + Math.sin(i * 2.3) * 8;
    const cy = horizon * (0.32 + 0.16 * (i % 2));
    const rx = 10 + 6 * i + w * 0.04;
    const ry = Math.max(2, horizon * 0.14);
    const turn = t * (0.16 + 0.04 * i) * (i % 2 ? -1 : 1) + i * 2.1;
    const x = Math.round(cx + Math.cos(turn) * rx);
    const y = Math.round(cy + Math.sin(turn) * ry);
    const climbing = Math.cos(turn) * (i % 2 ? -1 : 1) < -0.2;
    const pose = climbing ? Math.floor(t * 5 + i) % 3 : 1;
    for (const [dx, dy, tip] of WINGS[pose]) {
      ctx.fillStyle = tip ? GULL_TIP : GULL;
      ctx.fillRect(x + dx, y + dy, 1, 1);
    }
  }
}

// A little sailing boat sets off from behind the headland and goes very slowly on along the horizon.
export function paintBoat(view: VistaView, { horizon, tip }: Sea): void {
  const { ctx, h, t, dir } = view;
  const x = Math.round(tip + dir * (3 + SAILING * t));
  const sail = h >= 80 ? 5 : 4;
  ctx.fillStyle = HULL;
  ctx.fillRect(x - 2, horizon - 1, 5, 1);
  ctx.fillRect(x - 1, horizon, 3, 1);
  ctx.fillStyle = SAIL;
  for (let row = 0; row < sail; row++) {
    const wide = Math.max(1, Math.round(((row + 1) / sail) * 3));
    ctx.fillRect(dir > 0 ? x : x - wide + 1, horizon - 2 - sail + 1 + row, wide, 1);
  }
}
