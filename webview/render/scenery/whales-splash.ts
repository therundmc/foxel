import { ramp, seeded } from './paint';

// What a whale leaves when it falls back into the sea: a white crown of water thrown up and falling in drops, a
// veil of spray that hangs in the air with a small rainbow in it, and rings that spread slowly over the water.

const WHITE = '#ffffff';
const SPRAY = '#e2f6f8';
const MIST = '#f2fbfd';
const RING = '#e8fbfa';
/** The rainbow's bands, from the outside in: soft, as seen through the spray. */
const RAINBOW = ['#ff9c9c', '#ffd27e', '#a8e49c', '#8cbcf4'] as const;

const hash = (a: number, b: number): number => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * The crown, `age` seconds after a body of `size` pixels fell in at (`x`, `water`): it shoots up, hangs, and falls
 * back in drops; the foam it leaves on the water fades last.
 */
export function paintSplash(ctx: CanvasRenderingContext2D, x: number, water: number, size: number, age: number, seed: number): void {
  if (age < 0 || age > 4) {
    return;
  }
  const wide = Math.max(4, size);
  const high = size * 0.75;
  // The crown: a ragged white dome, shot up in a third of a second and sinking back over the next second.
  const crown = Math.min(1, age / 0.3) ** 0.5 * (1 - ramp(age, 0.4, 1.5));
  if (crown > 0) {
    const half = Math.round(wide / 2);
    for (let dx = -half; dx <= half; dx++) {
      const shape = Math.max(0, 1 - (dx / (half + 0.5)) ** 2) ** 0.6;
      const tall = Math.round(high * crown * shape * (0.7 + 0.45 * hash(dx, seed)));
      if (tall <= 0) {
        continue;
      }
      ctx.fillStyle = SPRAY;
      ctx.fillRect(Math.round(x) + dx, water - tall, 1, tall);
      ctx.fillStyle = WHITE;
      ctx.fillRect(Math.round(x) + dx, water - tall, 1, Math.min(tall, 2));
    }
  }
  // The drops thrown out of it, each on its own arc.
  const random = seeded(seed);
  const fall = high * 4.5;
  const count = Math.round(10 + size * 1.6);
  for (let k = 0; k < count; k++) {
    const from = (random() - 0.5) * wide;
    const flight = 0.9 + 0.9 * random();
    const out = (from / wide) * (0.4 + random()) * size * 0.6 + (random() - 0.5) * 3;
    const late = 0.15 * random();
    const since = age - late;
    if (since < 0 || since > flight) {
      continue;
    }
    const up = fall * since * (flight - since) * 0.5;
    ctx.fillStyle = k % 3 ? WHITE : SPRAY;
    ctx.fillRect(Math.round(x + from + out * since), Math.round(water - up), size >= 24 && since < 0.5 ? 2 : 1, 1);
  }
  // The foam spread on the water, broken, fading.
  const foam = 1 - ramp(age, 0.8, 4);
  const across = Math.round(wide * (0.7 + 0.5 * ramp(age, 0, 1.2)));
  ctx.fillStyle = WHITE;
  for (let dx = -across; dx <= across; dx++) {
    const near = 1 - Math.abs(dx) / (across + 1);
    for (let row = -1; row <= 1; row++) {
      if (hash(dx + row * 31, seed) < near * foam * (row === 0 ? 1.1 : 0.55)) {
        ctx.globalAlpha = 0.85;
        ctx.fillRect(Math.round(x) + dx, water + row, 1, 1);
      }
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * The spray that stays in the air afterwards, `age` seconds after the fall, and the little rainbow in it, given to
 * be seen as much as `bow` (0 to 1). It thins away by itself.
 */
export function paintSpray(ctx: CanvasRenderingContext2D, x: number, water: number, size: number, age: number, seed: number, drift: number, bow: number): void {
  const veil = ramp(age, 0.5, 1.4) * (1 - ramp(age, 4.5, 11));
  if (veil <= 0) {
    return;
  }
  const high = size * 0.8;
  // The rainbow first, behind the spray: four thin bands of an arc, seen only where the spray catches the light.
  const shown = bow * ramp(age, 1.2, 2.8) * (1 - ramp(age, 6, 10.5));
  if (shown > 0) {
    const r = Math.max(5, Math.round(size * 0.62));
    const cx = x + drift * age * 0.6;
    RAINBOW.forEach((color, band) => {
      const radius = r - band;
      const steps = Math.ceil(Math.PI * radius * 1.2);
      ctx.fillStyle = color;
      for (let k = 0; k <= steps; k++) {
        const turn = Math.PI * (0.12 + (0.76 * k) / steps);
        const px = Math.round(cx + Math.cos(turn) * radius);
        const py = Math.round(water - 1 - Math.sin(turn) * radius * 0.9);
        // Brighter at its top, lost in the sea at its feet.
        const lift = Math.sin(turn);
        ctx.globalAlpha = shown * 0.62 * lift * (0.6 + 0.4 * hash(k, band + seed));
        ctx.fillRect(px, py, 1, 1);
      }
    });
  }
  // The spray: fine drops rising slowly and drifting with the breeze.
  const random = seeded(seed + 7);
  const count = Math.round(14 + size * 2.2);
  ctx.fillStyle = MIST;
  for (let k = 0; k < count; k++) {
    const dx = (random() - 0.5) * size * 1.5;
    const dy = random() ** 0.8 * high;
    const pace = 0.4 + random();
    const twinkle = 0.55 + 0.45 * Math.sin(age * (1.5 + random() * 2) + k);
    ctx.globalAlpha = veil * 0.7 * twinkle * (1 - dy / (high * 1.4));
    ctx.fillRect(Math.round(x + dx + drift * age * pace), Math.round(water - 1 - dy - age * pace * 0.7), 1, 1);
  }
  ctx.globalAlpha = 1;
}

/** Rings spreading on the water from where something fell in, `age` seconds ago: three, one after the other, flat with distance. */
export function paintRings(ctx: CanvasRenderingContext2D, x: number, water: number, size: number, age: number, above: number): void {
  ctx.fillStyle = RING;
  for (let k = 0; k < 3; k++) {
    const since = age - 0.3 - k * 0.9;
    const life = 9 - k;
    if (since <= 0 || since > life) {
      continue;
    }
    const rx = size * 0.3 + size * 0.3 * since ** 0.65;
    const ry = Math.max(1, rx * 0.22);
    // One pixel per column, the near half brighter than the far one, so that it reads as a line and not as dots.
    const fade = 0.42 * (1 - since / life) ** 1.6;
    for (let dx = -Math.floor(rx); dx <= Math.floor(rx); dx++) {
      const dy = Math.round(ry * Math.sqrt(1 - (dx / rx) ** 2));
      const across = Math.abs(dx) / rx;
      ctx.globalAlpha = fade * (0.55 + 0.45 * across);
      ctx.fillRect(Math.round(x) + dx, water + dy, 1, 1);
      if (water - dy > above) {
        ctx.globalAlpha = fade * 0.5;
        ctx.fillRect(Math.round(x) + dx, water - dy, 1, 1);
      }
    }
  }
  ctx.globalAlpha = 1;
}
