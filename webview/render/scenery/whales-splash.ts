import { ramp, seeded } from './paint';

// What a whale leaves when it falls back into the sea: a white crown of water thrown up and falling in drops, a
// veil of spray that hangs in the air with a small rainbow in it, and rings that spread slowly over the water.

const WHITE = '#ffffff';
const SPRAY = '#f2fcfd';
const SPRAY_DEEP = '#cdeef2';
const MIST = '#f2fbfd';
const RING = '#e8fbfa';
/** The rainbow's bands, from the outside in: soft, as seen through the spray. */
const RAINBOW = ['#ff9c9c', '#ffd27e', '#a8e49c', '#8cbcf4'] as const;

const hash = (a: number, b: number): number => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * The crown, `age` seconds after a body of `size` pixels fell in at (`x`, `water`): two white walls of water thrown
 * up on either side of where it went in, a few beads on their rims, which shoot up, hang and sink back; drops flung
 * out on clean arcs; and the foam it leaves on the water, which fades last. A `rising` one, where something comes out
 * of the sea, is only a low skirt of water round it.
 */
export function paintSplash(ctx: CanvasRenderingContext2D, x: number, water: number, size: number, age: number, seed: number, rising: boolean): void {
  if (age < 0 || age > 4) {
    return;
  }
  const cx = Math.round(x);
  const half = Math.max(3, Math.round(size * (rising ? 0.55 : 0.5)));
  const high = Math.max(3, size * (rising ? 0.2 : 0.42));
  // Up in a quarter of a second, sinking back over the next second.
  const crown = (1 - (1 - Math.min(1, age / 0.25)) ** 2) * (1 - ramp(age, 0.35, 1.4));
  if (crown > 0) {
    const spread = half * (0.75 + 0.35 * ramp(age, 0, 0.8));
    const reach = Math.round(spread);
    for (let dx = -reach; dx <= reach; dx++) {
      const u = Math.abs(dx) / (spread + 0.5);
      // Low in the middle, highest a little way out on each side, falling away at the ends.
      const shape = (0.68 + 0.32 * Math.sin(Math.PI * Math.min(1, u * 1.1))) * Math.sqrt(Math.max(0, 1 - u ** 3));
      // A ragged rim, the same on both sides.
      const jag = shape > 0.3 ? [0, 1, 0, 2][Math.abs(dx) % 4] * Math.min(1, crown * 1.5) : 0;
      const tall = Math.round(high * crown * shape + jag);
      if (tall <= 0) {
        continue;
      }
      const left = cx + dx;
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = SPRAY_DEEP;
      ctx.fillRect(left, water - Math.ceil(tall / 3), 1, Math.ceil(tall / 3));
      ctx.fillStyle = SPRAY;
      ctx.fillRect(left, water - tall, 1, tall - Math.ceil(tall / 3));
      ctx.globalAlpha = 1;
      ctx.fillStyle = WHITE;
      ctx.fillRect(left, water - tall, 1, tall >= 6 ? 2 : 1);
    }
    // The beads on its rims, at the tops of the two walls, coming off as it falls.
    if (!rising) {
      const off = ramp(age, 0.3, 0.9);
      for (const side of [-1, 1]) {
        for (const at of [0.45, 0.8]) {
          const dx = Math.round(side * spread * at);
          const u = Math.abs(dx) / (spread + 0.5);
          const shape = (0.68 + 0.32 * Math.sin(Math.PI * Math.min(1, u * 1.1))) * Math.sqrt(Math.max(0, 1 - u ** 3));
          const lift = 2 + Math.round(off * high * 0.25 + (at > 0.6 ? 0 : 1));
          ctx.fillStyle = WHITE;
          ctx.fillRect(cx + dx + side * Math.round(off * 2), water - Math.round(high * crown * shape) - lift, 1, 1);
        }
      }
    }
  }
  // The drops flung out of it, in pairs on either side, each on its own arc.
  const random = seeded(seed);
  const pairs = rising ? 2 : Math.round(3 + size * 0.12);
  for (let k = 0; k < pairs; k++) {
    const out = (0.5 + 0.9 * random()) * half;
    const up = high * (0.8 + 0.7 * random());
    const flight = 0.7 + 0.5 * random();
    const since = age - 0.08 * k;
    if (since < 0 || since > flight) {
      continue;
    }
    const q = since / flight;
    for (const side of [-1, 1]) {
      ctx.fillStyle = WHITE;
      ctx.fillRect(Math.round(x + side * (half * 0.4 + out * q)), Math.round(water - up * 4 * q * (1 - q)), 1, 1);
    }
  }
  // The foam spread on the water: a white line with a paler one each side, breaking up as it fades.
  const foam = 1 - ramp(age, 0.6, 4);
  const across = Math.round(half * (rising ? 1 : 0.9 + 0.5 * ramp(age, 0, 1.2)));
  ctx.fillStyle = WHITE;
  for (let dx = -across; dx <= across; dx++) {
    const near = 1 - Math.abs(dx) / (across + 1);
    if (hash(dx >> 1, seed) > foam * 1.6 * Math.sqrt(near)) {
      continue;
    }
    ctx.globalAlpha = 0.9 * Math.min(1, foam * 2);
    ctx.fillRect(cx + dx, water, 1, 1);
    if (Math.abs(dx) < across * 0.7) {
      ctx.globalAlpha = 0.45 * foam;
      ctx.fillRect(cx + dx, water + 1, 1, 1);
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
  const count = Math.round(8 + size * 1.2);
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
