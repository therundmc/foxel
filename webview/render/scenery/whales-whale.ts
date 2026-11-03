import { ramp, seeded } from './paint';

// A whale, round-headed and soft blue, drawn pixel by pixel at any angle: leaping, rolling its back, or showing its
// tail as it dives. What is under the water is only a faint shadow; where it breaks the surface, a ring of foam.
// And its breath: a white plume that rises, opens and drifts off.

/** Its back, the light along it, its outline, its pale belly and the grooves of it, its long flipper. */
const BACK = '#4a6ca0';
const BACK_LIT = '#6e95c8';
const OUTLINE = '#28406a';
const BELLY = '#e4eff4';
const GROOVE = '#bccfdc';
const FLIPPER = '#d2e3ec';
const EYE = '#1a2342';
const BLUSH = '#f6a2b6';
/** What is seen of it under the water, and how much. */
const UNDER = '#1c6886';
const UNDER_ALPHA = 0.4;
const FOAM = '#ffffff';
const BREATH = ['#ffffff', '#dff3f8'] as const;

/** How thick it is, as a share of its length. */
const GIRTH = 0.19;

/** Where a whale is and how it lies. */
export interface WhalePose {
  /** Its middle, in pixels: it may fall between them. */
  readonly x: number;
  readonly y: number;
  /** Radians, nose up when positive. */
  readonly angle: number;
  readonly len: number;
  readonly facing: 1 | -1;
  /** The row of the sea's surface where it is: nothing of it below shows but a shadow. */
  readonly water: number;
  /** How its flipper is raised, from -1 (along its side) to 1 (held out). */
  readonly flipper?: number;
  /** How much its tail curls up, from 0 (straight out behind) to 1. */
  readonly curl?: number;
}

/** What each pixel of it is. */
const Part = { None: 0, Back: 1, Lit: 2, Belly: 3, Groove: 4, Flipper: 5 } as const;
type Part = (typeof Part)[keyof typeof Part];
const COLORS = ['', BACK, BACK_LIT, BELLY, GROOVE, FLIPPER] as const;

/** Its half thickness above and below its middle line, in girths, `s` along it from its tail (0) to its nose (1): a big round head on a plump body. */
function girth(s: number): number {
  if (s >= 0.62) {
    return Math.sqrt(Math.max(0, 1 - ((s - 0.62) / 0.38) ** 2));
  }
  return 1 - 0.78 * Math.min(1, (0.62 - s) / 0.52) ** 1.3;
}

/** Where the tail ends, along it, and how much its tail curls up toward its back there, in girths. */
const TAIL_END = 0.1;
const CURL = 1.25;
const curling = (s: number, curl: number): number => (s < 0.42 ? curl * CURL * ((0.42 - s) / (0.42 - TAIL_END)) ** 2 : 0);

/** What is at a point of the whale, `s` along it and `v` pixels from its middle line toward its back. */
function partAt(s: number, v: number, girthPx: number, len: number, flipper: number, curl: number): Part {
  // The flipper: long and pale, swept back from under its chin, held out further when it waves.
  const root = [0.64 * len, -0.5 * girthPx];
  const tip = [(0.45 + 0.08 * flipper) * len, (-1.75 - 0.6 * flipper) * girthPx];
  const fx = tip[0] - root[0];
  const fy = tip[1] - root[1];
  const along = Math.min(1, Math.max(0, ((s * len - root[0]) * fx + (v - root[1]) * fy) / (fx * fx + fy * fy)));
  const off = Math.hypot(s * len - root[0] - along * fx, v - root[1] - along * fy);
  if (off < Math.max(0.6, girthPx * 0.3 * (1 - 0.5 * along))) {
    return Part.Flipper;
  }
  // Its tail: at the end of the curl, two flukes spread forward and back in a wide V.
  const du = Math.abs((s - TAIL_END) * len);
  const reach = girthPx * 1.5;
  if (du <= reach) {
    const dv = v - girthPx * (curl * CURL + 0.15) - 0.45 * du;
    if (Math.abs(dv) <= Math.max(0.55, girthPx * 0.32 * (1 - du / reach) ** 0.6)) {
      return Part.Back;
    }
  }
  if (s >= TAIL_END && s <= 1) {
    const g = v / girthPx - curling(s, curl);
    const r = girth(s);
    if (g > r || g < -r * 1.06) {
      return Part.None;
    }
    if (g < -0.2 && s > 0.3 && s < 0.97) {
      return len >= 22 && s > 0.45 && Math.floor(-v) % 2 === 1 && g > -r + 0.3 ? Part.Groove : Part.Belly;
    }
    return g > r - 1.2 / girthPx && s > 0.3 && s < 0.9 ? Part.Lit : Part.Back;
  }
  return Part.None;
}

/** Draws a whale as it lies, clipped by the sea. */
export function paintWhale(ctx: CanvasRenderingContext2D, pose: WhalePose): void {
  const { x, y, angle, len, facing, water } = pose;
  const girthPx = Math.max(1.6, len * GIRTH);
  const hx = facing * Math.cos(angle);
  const hy = -Math.sin(angle);
  const bx = facing * hy;
  const by = -facing * hx;
  const reach = Math.ceil(len * 0.62 + girthPx * 2);
  const left = Math.floor(x) - reach;
  const top = Math.floor(y) - reach;
  const size = reach * 2 + 1;
  const parts = new Uint8Array(size * size);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const dx = left + i + 0.5 - x;
      const dy = top + j + 0.5 - y;
      const s = (dx * hx + dy * hy) / len + 0.5;
      parts[j * size + i] = partAt(s, dx * bx + dy * by, girthPx, len, pose.flipper ?? 0, pose.curl ?? 1);
    }
  }
  const at = (i: number, j: number): Part => (i < 0 || j < 0 || i >= size || j >= size ? Part.None : (parts[j * size + i] as Part));
  for (let j = 0; j < size; j++) {
    const row = top + j;
    const under = row >= water;
    if (under && row > water + girthPx * 1.6) {
      break;
    }
    for (let i = 0; i < size; i++) {
      const part = parts[j * size + i];
      const edge = part === Part.None && (at(i - 1, j) || at(i + 1, j) || at(i, j - 1) || at(i, j + 1));
      if (!part && !edge) {
        continue;
      }
      ctx.globalAlpha = under ? UNDER_ALPHA * (1 - (row - water) / (girthPx * 1.7)) : 1;
      ctx.fillStyle = under ? UNDER : edge ? OUTLINE : COLORS[part];
      ctx.fillRect(left + i, row, 1, 1);
    }
  }
  ctx.globalAlpha = 1;
  // Its face: a dark eye, and a rosy cheek when it is big enough to have one.
  const point = (s: number, g: number): [number, number] => {
    const u = (s - 0.5) * len;
    const v = g * girthPx;
    return [Math.floor(x + u * hx + v * bx), Math.floor(y + u * hy + v * by)];
  };
  const face = (s: number, g: number, color: string): void => {
    const [fx, fy] = point(s, g);
    if (fy < water) {
      ctx.fillStyle = color;
      ctx.fillRect(fx, fy, 1, 1);
    }
  };
  face(0.86, 0.02, EYE);
  if (len >= 16) {
    face(0.8, -0.42, BLUSH);
  }
  // Foam where it breaks the surface.
  const surface = water - top;
  if (surface >= 0 && surface < size) {
    // Only at the two ends of where it comes through: a rolling back is not a boat.
    const through: number[] = [];
    for (let i = 0; i < size; i++) {
      if (at(i, surface) && at(i, surface - 1)) {
        through.push(i);
      }
    }
    if (through.length) {
      ctx.fillStyle = FOAM;
      const first = left + through[0];
      const last = left + through[through.length - 1];
      ctx.fillRect(first - 2, water, 2, 1);
      ctx.fillRect(last + 1, water, 2, 1);
      ctx.fillRect(first - 1, water - 1, 1, 1);
      ctx.fillRect(last + 1, water - 1, 1, 1);
    }
  }
}

/**
 * Its breath, `age` seconds after it blew from (`x`, `water`): a column shooting up `tall` pixels, opening into a
 * small cloud at its top that drifts with the breeze toward `drift` and thins away.
 */
export function paintBreath(ctx: CanvasRenderingContext2D, x: number, water: number, tall: number, age: number, drift: number, seed: number): void {
  if (age < 0 || age > 3.4) {
    return;
  }
  const up = tall * (1 - (1 - Math.min(1, age / 0.45)) ** 2);
  const column = 1 - ramp(age, 0.45, 1.3);
  ctx.fillStyle = BREATH[0];
  ctx.globalAlpha = 0.9 * column;
  ctx.fillRect(Math.round(x), Math.round(water - up), tall >= 9 ? 2 : 1, Math.round(up));
  const open = ramp(age, 0.25, 1.5);
  if (open > 0) {
    const random = seeded(seed);
    const r = 1 + tall * 0.42 * open;
    const cx = x + drift * age * 1.2;
    const cy = water - up - r * 0.2 - age * 0.8;
    const fade = 1 - ramp(age, 1.2, 3.4);
    const count = Math.round(6 + tall * 1.4);
    for (let k = 0; k < count; k++) {
      const turn = Math.PI * (0.05 + 0.9 * random()) + (random() < 0.3 ? Math.PI : 0);
      const far = r * Math.sqrt(random());
      ctx.fillStyle = BREATH[k % 2];
      ctx.globalAlpha = fade * (0.55 + 0.45 * random());
      ctx.fillRect(Math.round(cx + Math.cos(turn) * far), Math.round(cy - Math.sin(turn) * far * 0.75), 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}
