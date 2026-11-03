import { ramp } from './paint';

// A whale, round-headed and soft blue, drawn pixel by pixel at any angle: leaping, lying at the surface, or showing
// its tail as it dives. The mother is long, deep blue, with grooves on her throat; her calf is short and plump, its
// head rounder and its blue paler. What is under the water is only a faint shadow; where it breaks the surface, a
// little foam. And its breath: a white plume that rises, opens and drifts off.

/** The tones of one whale: its back, the light along it, its outline, its pale belly and the grooves of it, its flipper. */
interface Coat {
  readonly back: string;
  readonly lit: string;
  readonly outline: string;
  readonly belly: string;
  readonly groove: string;
  readonly flipper: string;
  /** How thick it is, as a share of its length, and where along it its round head begins. */
  readonly girth: number;
  readonly head: number;
}

const MOTHER: Coat = { back: '#4a6ca0', lit: '#6e95c8', outline: '#28406a', belly: '#e4eff4', groove: '#bccfdc', flipper: '#d2e3ec', girth: 0.19, head: 0.62 };
const CALF: Coat = { back: '#6f9ad0', lit: '#98bfe8', outline: '#35558a', belly: '#f2f8fb', groove: '#f2f8fb', flipper: '#e2eef6', girth: 0.25, head: 0.52 };
const EYE = '#1a2342';
const BLUSH = '#f6a2b6';
/** What is seen of it under the water, and how much. */
const UNDER = '#1c6886';
const UNDER_ALPHA = 0.4;
const FOAM = '#ffffff';
const BREATH = ['#ffffff', '#dff3f8'] as const;

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
  /** How its flipper is raised, from -1 (along its side) through 0 (straight down) to 1 (held out forward). */
  readonly flipper?: number;
  /** How much its tail curls up, from 0 (straight out behind) to 1. */
  readonly curl?: number;
  /** How much its flukes are seen spread out across, as when its tail stands out of the water, from 0 to 1. */
  readonly spread?: number;
  /** Whether it is the calf. */
  readonly calf?: boolean;
}

/** What each pixel of it is. */
const Part = { None: 0, Back: 1, Lit: 2, Belly: 3, Groove: 4, Flipper: 5 } as const;
type Part = (typeof Part)[keyof typeof Part];
const colors = (coat: Coat): readonly string[] => ['', coat.back, coat.lit, coat.belly, coat.groove, coat.flipper];

/** Its half thickness above and below its middle line, in girths, `s` along it from its tail (0) to its nose (1): a big round head from `head` on, on a plump body. */
function girth(s: number, head: number): number {
  if (s >= head) {
    return Math.sqrt(Math.max(0, 1 - ((s - head) / (1 - head)) ** 2));
  }
  return 1 - 0.78 * Math.min(1, (head - s) / (head - 0.1)) ** 1.3;
}

/** Where the tail ends, along it, and how much its tail curls up toward its back there, in girths. */
const TAIL_END = 0.1;
const CURL = 1.25;
const curling = (s: number, curl: number): number => (s < 0.42 ? curl * CURL * ((0.42 - s) / (0.42 - TAIL_END)) ** 2 : 0);

/** What is at a point of the whale, `s` along it and `v` pixels from its middle line toward its back. */
function partAt(s: number, v: number, girthPx: number, len: number, flipper: number, curl: number, head: number, spread: number): Part {
  // The flipper: long and pale, from under its chin, swept back along its side, swung forward to wave.
  const root = [0.64 * len, -0.5 * girthPx];
  const turn = -2.75 + 0.95 * (flipper + 1);
  const tip = [root[0] + 1.75 * girthPx * Math.cos(turn), root[1] + 1.75 * girthPx * Math.sin(turn)];
  const fx = tip[0] - root[0];
  const fy = tip[1] - root[1];
  const along = Math.min(1, Math.max(0, ((s * len - root[0]) * fx + (v - root[1]) * fy) / (fx * fx + fy * fy)));
  const off = Math.hypot(s * len - root[0] - along * fx, v - root[1] - along * fy);
  if (spread < 0.5 && off < Math.max(0.6, girthPx * 0.3 * (1 - 0.5 * along))) {
    return Part.Flipper;
  }
  // Its tail, standing out of the water: two broad flukes spread across, their tips swept up, a notch between them.
  const du = Math.abs((s - TAIL_END) * len);
  if (spread > 0) {
    const out = (TAIL_END - s) * len;
    const across = Math.abs(v);
    const wide = girthPx * (0.6 + 1.6 * spread);
    const mid = 0.45 * across - girthPx * 0.2;
    const thick = Math.max(0.7, girthPx * 0.55 * (1 - (across / wide) ** 2));
    if (across <= wide && Math.abs(out - mid) <= thick && !(across < 0.8 && out > mid)) {
      return Part.Back;
    }
  }
  const reach = girthPx * 1.5;
  if (spread < 0.5 && du <= reach) {
    const dv = v - girthPx * (curl * CURL + 0.15) - 0.45 * du;
    if (Math.abs(dv) <= Math.max(0.55, girthPx * 0.32 * (1 - du / reach) ** 0.6)) {
      return Part.Back;
    }
  }
  if (s >= TAIL_END && s <= 1) {
    const g = v / girthPx - curling(s, curl);
    const r = girth(s, head);
    if (g > r || g < -r * 1.06) {
      return Part.None;
    }
    if (g < -0.2 && s > 0.3 && s < 0.97) {
      return len >= 22 && head > 0.6 && s > 0.45 && Math.floor(-v) % 2 === 1 && g > -r + 0.3 ? Part.Groove : Part.Belly;
    }
    return g > r - 1.2 / girthPx && s > 0.3 && s < 0.9 ? Part.Lit : Part.Back;
  }
  return Part.None;
}

/** Draws a whale as it lies, clipped by the sea. */
export function paintWhale(ctx: CanvasRenderingContext2D, pose: WhalePose): void {
  const { x, y, angle, len, facing, water } = pose;
  const coat = pose.calf ? CALF : MOTHER;
  const tones = colors(coat);
  const girthPx = Math.max(1.6, len * coat.girth);
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
      parts[j * size + i] = partAt(s, dx * bx + dy * by, girthPx, len, pose.flipper ?? 0, pose.curl ?? 1, coat.head, pose.spread ?? 0);
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
      ctx.fillStyle = under ? UNDER : edge ? coat.outline : tones[part];
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
  if (pose.calf) {
    face(0.84, -0.12, EYE);
    face(0.77, -0.55, BLUSH);
  } else {
    face(0.87, -0.15, EYE);
    if (len >= 16) {
      face(0.8, -0.55, BLUSH);
    }
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
      ctx.globalAlpha = 0.9;
      const first = left + through[0];
      const last = left + through[through.length - 1];
      ctx.fillRect(first - 2, water, 2, 1);
      ctx.fillRect(last + 1, water, 2, 1);
      ctx.fillRect(first - 1, water - 1, 1, 1);
      ctx.fillRect(last + 1, water - 1, 1, 1);
      ctx.globalAlpha = 1;
    }
  }
}

/**
 * Its breath, `age` seconds after it blew from (`x`, `from`): a thin column shooting up `tall` pixels, opening at its
 * top into a soft puff of two lobes, which drifts with the breeze toward `drift`, rises a little and thins away.
 */
export function paintBreath(ctx: CanvasRenderingContext2D, x: number, from: number, tall: number, age: number, drift: number): void {
  if (age < 0 || age > 3.2) {
    return;
  }
  const up = Math.round(tall * (1 - (1 - Math.min(1, age / 0.4)) ** 2));
  const column = 1 - ramp(age, 0.4, 1.1);
  const thick = tall >= 12 ? 2 : 1;
  const left = Math.round(x) - (thick >> 1);
  if (column > 0 && up > 0) {
    ctx.fillStyle = BREATH[1];
    ctx.globalAlpha = 0.75 * column;
    ctx.fillRect(left, Math.round(from) - up, thick, up);
  }
  const open = ramp(age, 0.25, 1.2);
  if (open > 0) {
    const r = 0.8 + tall * 0.24 * open;
    const cx = left + (thick - 1) / 2 + drift * age * 1.5;
    const cy = Math.round(from) - up - r * 0.4 - age * 0.7;
    const fade = 1 - ramp(age, 1.3, 3.2);
    // Two round lobes leaning out from the top of the column, the brighter for being nearer their middles.
    for (const side of [-1, 1]) {
      const lx = cx + side * r * 0.35;
      const reach = Math.ceil(r);
      for (let dy = -reach; dy <= reach; dy++) {
        for (let dx = -reach; dx <= reach; dx++) {
          const d = Math.hypot((lx + dx - cx) / (r * 1.35), dy / (r * 0.8));
          if (d > 1) {
            continue;
          }
          ctx.fillStyle = BREATH[d < 0.6 ? 0 : 1];
          ctx.globalAlpha = fade * (d < 0.6 ? 0.8 : 0.5);
          ctx.fillRect(Math.round(lx + dx), Math.round(cy + dy), 1, 1);
        }
      }
    }
  }
  ctx.globalAlpha = 1;
}
