import { clamp01, px, ramp, seeded, type VistaView } from './paint';
import type { Land } from './clouds-land';

// What moves over the land: the mist and the birds.

const MIST = '#eaf4fc';

/** Long thin veils of mist lying at the foot of the far range, hardly moving. */
export function drawMist(view: VistaView, land: Land): void {
  const { ctx, w, t, dir } = view;
  const random = seeded(0x3157);
  const count = Math.max(2, Math.round(w / 70));
  for (let n = 0; n < count; n++) {
    const length = Math.round(24 + random() * 46 * land.k);
    const span = w + 140;
    const x = ((((n / count) * span + random() * 30 + dir * t * (0.1 + random() * 0.1)) % span) + span) % span - 70;
    const y = land.footY - Math.round(random() * 5 * land.k);
    px(ctx, x, y, MIST, 0.8, length, 1);
    px(ctx, x + Math.round(length * 0.2), y - 1, MIST, 0.8, Math.round(length * 0.5), 1);
    px(ctx, x - 4, y + 1, MIST, 0.5, length + 8, 1);
  }
}

/** The flight of the birds: this long from the hills to the great cloud, where they are lost in the distance. */
const FLIGHT_S = 10;
const FLOCK = 5;
const FLAPS_PER_S = 3.2;
const BIRD = '#3f4d78';
const BIRD_FAR = '#6679a6';
/** Past this much of the way they are small and far, and then they fade. */
const FAR_AFTER = 0.62;
const LOST_AFTER = 0.88;

export interface Flyway {
  /** Where the birds rise from, the point they pass over, and where they are lost to sight. */
  readonly from: readonly [number, number];
  readonly over: readonly [number, number];
  readonly to: readonly [number, number];
}

/** Wings up, level, down, level: rows of pixels around the body. */
const WINGS: readonly (readonly (readonly [number, number])[])[] = [
  [[-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1]],
  [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0]],
  [[-2, 1], [-1, 0], [0, 0], [1, 0], [2, 1]],
];
const WINGS_FAR: readonly (readonly (readonly [number, number])[])[] = [
  [[-1, -1], [0, 0], [1, -1]],
  [[-1, 0], [0, 0], [1, 0]],
  [[-1, 1], [0, 0], [1, 1]],
];

/** The flock, `moment` seconds after it took off. */
export function drawBirds({ ctx, dir, moment }: VistaView, way: Flyway): void {
  if (moment === undefined) {
    return;
  }
  for (let n = 0; n < FLOCK; n++) {
    const row = Math.ceil(n / 2);
    const side = n % 2 === 0 ? -1 : 1;
    // They slow down as they get far: most of the way is flown in the first seconds, when the fox follows them.
    const p = 1 - (1 - clamp01((moment - row * 0.14) / FLIGHT_S)) ** 2.4;
    if (p <= 0 || p >= 1) {
      continue;
    }
    // A curve through the three points: over the middle one at 0.45 of the way.
    const curve = (i: 0 | 1): number => {
      const bend = (way.over[i] - 0.3025 * way.from[i] - 0.2025 * way.to[i]) / 0.495;
      return (1 - p) ** 2 * way.from[i] + 2 * p * (1 - p) * bend + p ** 2 * way.to[i];
    };
    const spread = 0.35 + 0.65 * ramp(p, 0, 0.2);
    const x = curve(0) - dir * row * 4.4 * spread + Math.sin(moment * 1.3 + n) * 0.8;
    const y = curve(1) + side * row * 2.1 * spread + Math.sin(moment * 2.1 + n * 2) * 0.7;
    const small = p > FAR_AFTER;
    // Far birds glide more than they beat.
    const beat = (moment * (small ? FLAPS_PER_S * 0.6 : FLAPS_PER_S) + n * 0.37) % 1;
    const pose = beat < 0.3 ? 0 : beat < 0.5 ? 1 : beat < 0.8 ? 2 : 1;
    for (const [dx, dy] of (small ? WINGS_FAR : WINGS)[pose]) {
      px(ctx, Math.round(x) + dx, Math.round(y) + dy, small ? BIRD_FAR : BIRD, 1 - ramp(p, LOST_AFTER, 1));
    }
  }
}
