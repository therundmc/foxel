import { ramp, seeded } from './paint';
import { blend, Pixels, rgb, type Rgb } from './clouds-pixels';

// Cumulus clouds the way a background painter does them: heaps of round lobes, lit from one side in a few flat
// tones. Each lobe is a ball; a pixel shows the nearest ball and takes its tone from how that ball faces the sun.

/** One round lobe, placed from the middle of the cloud's base: `x` to the right, `y` going up. */
export interface Puff {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  /** How near it is: a nearer lobe hides a farther one. */
  readonly z: number;
  /** When it starts to swell out of the cloud, in seconds since the sky appeared. */
  readonly born: number;
  /** Where it is in its slow breathing. */
  readonly phase: number;
  /** How deep in the cloud's own shadow it lies: 0 in full sun, 2 under the base or on the far flank. */
  readonly level: number;
  /** The way it comes out of the cloud: up by default, outward for a bud on a flank. */
  readonly out?: readonly [number, number];
}

/** The few tones of a cloud, from the edge the sun warms to the hollow under a lobe. */
export interface Tones {
  readonly warm: Rgb;
  readonly lit: Rgb;
  readonly soft: Rgb;
  readonly shade: Rgb;
  readonly deep: Rgb;
}

export const CLOUD_TONES: Tones = {
  warm: rgb('#fff8e6'),
  lit: rgb('#ffffff'),
  soft: rgb('#dfe9f9'),
  shade: rgb('#bccdf0'),
  deep: rgb('#a3b5e4'),
};

/** The same tones seen through `amount` of air of colour `air`: far clouds melt into the sky. */
export function hazed(tones: Tones, air: Rgb, amount: number): Tones {
  const far = (c: Rgb): Rgb => blend(c, air, amount);
  return { warm: far(tones.warm), lit: far(tones.lit), soft: far(tones.soft), shade: far(tones.shade), deep: far(tones.deep) };
}

/** Each tone `amount` of the way from one cloud's to another's. */
export function between(from: Tones, to: Tones, amount: number): Tones {
  const at = (key: keyof Tones): Rgb => blend(from[key], to[key], amount);
  return { warm: at('warm'), lit: at('lit'), soft: at('soft'), shade: at('shade'), deep: at('deep') };
}

/** The sun is high, on the side the fox looks to, and a little in front of the clouds. */
const LIGHT = { x: 0.6, y: -0.72, z: 0.34 };
/**
 * Flat tones, the way a cel is painted: a lobe is one tone where it faces the sun and the next one down where
 * it turns away, with a thin darker crescent underneath. A lobe in the cloud's shadow starts further down.
 */
const WARM_ABOVE = 0.93;
const LIT_ABOVE = 0.04;
const CREASE_BELOW = -0.66;
const DARKEST = 3;
/** A lobe takes this long to swell out, starting this small and sunk this deep into the cloud. */
const SWELL_S = 11;
const SWELL_FROM = 0.3;
const SWELL_SUNK = 1.3;
/** Lobes breathe a little for ever, so that the cloud never freezes. */
const BREATH = 0.045;
const BREATH_RATE = 0.19;

/** A canvas a cloud is shaded on, redone only when the cloud has changed. */
export class CloudSheet {
  /** What it shows now: the caller's own word for it. */
  key = '';
  private readonly pixels: Pixels;
  private readonly near: Float32Array;
  /** For each pixel, which tone it takes: 0 for the warm edge, then from lit to deep. */
  private readonly tone: Uint8Array;

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.pixels = new Pixels(w, h);
    this.near = new Float32Array(w * h);
    this.tone = new Uint8Array(w * h);
  }

  get canvas(): HTMLCanvasElement {
    return this.pixels.canvas;
  }

  begin(): void {
    this.near.fill(-Infinity);
  }

  /** Adds a ball at (`x`, `y`) of the sheet, `y` going down; `dir` is the side the sun is on. */
  add(x: number, y: number, r: number, z: number, dir: number, level = 0): void {
    const { w, h, near, tone } = this;
    const r2 = r * r;
    const lx = LIGHT.x * dir;
    for (let py = Math.max(0, Math.floor(y - r)); py <= Math.min(h - 1, Math.ceil(y + r)); py++) {
      const dy = py + 0.5 - y;
      for (let px = Math.max(0, Math.floor(x - r)); px <= Math.min(w - 1, Math.ceil(x + r)); px++) {
        const dx = px + 0.5 - x;
        const d2 = dx * dx + dy * dy;
        if (d2 >= r2) {
          continue;
        }
        const rise = Math.sqrt(r2 - d2);
        const i = py * w + px;
        if (z + rise > near[i]) {
          near[i] = z + rise;
          const facing = (dx * lx + dy * LIGHT.y + rise * LIGHT.z) / r;
          const turned = facing > LIT_ABOVE ? 0 : facing > CREASE_BELOW ? 1 : 2;
          tone[i] = facing > WARM_ABOVE && level === 0 ? 0 : 1 + Math.min(DARKEST, level + turned);
        }
      }
    }
  }

  /** Turns the balls into flat tones. Rows from `floor` down are cut off: the flat base of a fair-weather cloud. */
  develop(tones: Tones, floor = this.h): void {
    const { w, h, near, tone, pixels } = this;
    const ramp = [tones.warm, tones.lit, tones.soft, tones.shade, tones.deep];
    pixels.clear();
    for (let y = 0; y < Math.min(h, floor); y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (near[i] !== -Infinity) {
          pixels.set(x, y, ramp[tone[i]]);
        }
      }
    }
    pixels.flush();
  }
}

/** How much of its full size a lobe has reached at `t`, or 0 before it is born. */
export function swell(p: Puff, t: number): number {
  if (t <= p.born) {
    return 0;
  }
  const grown = ramp(t, p.born, p.born + SWELL_S);
  return (SWELL_FROM + (1 - SWELL_FROM) * grown) * (1 + BREATH * Math.sin(t * BREATH_RATE + p.phase));
}

/** How far from its place a lobe still is at `t`, while it swells out of the cloud: [to the right, up]. */
export function sunk(p: Puff, t: number): readonly [number, number] {
  const deep = (1 - ramp(t, p.born, p.born + SWELL_S)) * p.r * SWELL_SUNK;
  return p.out ? [-p.out[0] * deep, -p.out[1] * deep] : [0, -deep];
}

/** The first lobes of a tower are there before the sky appears; its crown is born this long after. */
const TOWER_OLDEST = -12;
const TOWER_YOUNGEST = 27;

/**
 * A towering cumulus, `width` by `height`, leaning to the side of `lean`: rows of lobes inside a dome,
 * with smaller ones budding on its outline. It builds itself from the base up over half a minute.
 */
export function tower(seed: number, width: number, height: number, lean: number): Puff[] {
  const random = seeded(seed);
  const puffs: Puff[] = [];
  const big = Math.min(13, Math.max(3.5, Math.min(width, height) * 0.27));
  const bulge = random() * 6;
  const birth = (u: number): number => TOWER_OLDEST + (TOWER_YOUNGEST - TOWER_OLDEST) * u ** 1.3 + random() * 3;
  const bud = (parent: Puff, angle: number): void => {
    const r = parent.r * (0.34 + random() * 0.24);
    const reach = parent.r * (0.72 + random() * 0.22);
    puffs.push({
      x: parent.x + Math.cos(angle) * reach,
      y: parent.y + Math.sin(angle) * reach,
      r: Math.max(1.6, r),
      z: parent.z + random() * 3 - 1,
      level: parent.level,
      // Not before the lobe it buds from is well out.
      born: parent.born + SWELL_S * 0.55 + random() * 8,
      phase: random() * 6.28,
      out: [Math.cos(angle), Math.sin(angle)],
    });
  };
  const rows = Math.max(2, Math.round((height - big) / (big * 0.85)) + 1);
  for (let row = 0; row < rows; row++) {
    const u = row / (rows - 1);
    const r0 = big * (1 - 0.22 * u);
    const y = big * 0.5 + u * (height - big * 0.5 - r0);
    // A dome that bulges here and there, like a real tower of cloud.
    const half = Math.max(0, (width / 2) * (1 - u) ** 0.55 * (1 + 0.22 * Math.sin(u * 7 + bulge)) - r0 * 0.8);
    const middle = lean * u * width * 0.2;
    const count = Math.max(1, Math.round((half * 2) / (r0 * 1.15)) + 1);
    for (let n = 0; n < count; n++) {
      const across = count === 1 ? 0 : (n / (count - 1)) * 2 - 1;
      // The flank away from the sun and the low parts lie in the cloud's own shadow, in ragged patches.
      const shadow = (1 - u) * 0.8 - across * Math.sign(lean) * 0.55 + (random() - 0.5) * 0.35;
      const lobe: Puff = {
        level: shadow > 0.95 ? 2 : shadow > 0.45 ? 1 : 0,
        x: middle + across * half + (random() - 0.5) * r0 * 0.5,
        y: y + (random() - 0.5) * r0 * 0.5 - Math.abs(across) * r0 * 0.3,
        r: r0 * (0.8 + random() * 0.4),
        z: random() * big * 0.7 + (1 - Math.abs(across)) * big * 0.4,
        born: birth(u),
        phase: random() * 6.28,
      };
      puffs.push(lobe);
      // Buds on the outline: upward on the crown, outward on the flanks.
      const outer = count === 1 || n === 0 || n === count - 1;
      if (outer || row === rows - 1) {
        const side = count === 1 ? (random() < 0.5 ? -1 : 1) : Math.sign(across);
        bud(lobe, Math.PI / 2 - side * (0.5 + random() * 0.8));
        bud(lobe, Math.PI / 2 - side * (1.2 + random() * 0.5));
        if (row === rows - 1) {
          bud(lobe, Math.PI / 2 + side * (0.3 + random() * 0.7));
        }
      }
    }
  }
  return puffs;
}

/** A small fair-weather cloud `width` wide, flat underneath: its base is the line `y = 0`. */
export function puffball(seed: number, width: number): Puff[] {
  const random = seeded(seed);
  const puffs: Puff[] = [];
  const count = 3 + Math.floor(width / 7);
  const mid = width * 0.13 + 1.3;
  for (let n = 0; n < count; n++) {
    const hump = Math.sin((Math.PI * (n + 0.5)) / count);
    const r = mid * (0.55 + 0.6 * hump) * (0.9 + random() * 0.25);
    const x = ((n + 0.5) / count - 0.5) * (width - mid * 1.4);
    puffs.push({ x, y: r * 0.55, r, z: random() * 2, level: 0, born: -99, phase: random() * 6.28 });
  }
  const crown = mid * (1 + random() * 0.2);
  puffs.push({ x: (random() - 0.5) * width * 0.3, y: mid * 1.15, r: crown, z: 1 + random(), level: 0, born: -99, phase: random() * 6.28 });
  return puffs;
}

type Ball = readonly [x: number, y: number, r: number, z: number];

/** A little cloud like any other, flat underneath... */
const PLAIN: readonly Ball[] = [
  [-6.5, 1.6, 2.9, 0.5],
  [6.3, 1.4, 2.7, 0.4],
  [-0.4, 3.2, 4.3, 1.5],
  [-3.4, 2.4, 3.3, 2],
  [3.3, 2.2, 3.2, 2.2],
  [-1, 1.4, 2.8, 2.6],
  [1.6, 1.2, 2.4, 2.8],
];
/** ...and the heart its same lobes gather into, drawn around its middle. */
const HEART: readonly Ball[] = [
  [-4.3, 2.7, 4.5, 1.2],
  [4.3, 2.7, 4.5, 1],
  [0, 0.3, 4.1, 0.6],
  [-2.7, -1.4, 3.5, 1.6],
  [2.7, -1.4, 3.5, 1.5],
  [0, -3.8, 2.9, 2],
  [0, -6.2, 1.7, 2.4],
];
/** How far the middle of the heart sits above the flat base of the plain cloud. */
export const HEART_MIDDLE = 6;
export const HEART_HALF = 12;

/** The lobes of the cloud that turns into a heart, `shaped` of the way there, from the heart's middle (`y` up). */
export function heartLobes(shaped: number, t: number): Ball[] {
  return PLAIN.map((from, n) => {
    const to = HEART[n];
    // Each lobe takes its own road, so the cloud seems to roll itself into shape.
    const k = ramp(shaped, n * 0.05, 0.7 + n * 0.05);
    const breath = 1 + BREATH * Math.sin(t * 0.5 + n * 1.9) * (1 - 0.6 * k);
    const at = (i: 0 | 1 | 2 | 3): number => from[i] + (to[i] - from[i]) * k;
    return [at(0), at(1) - (1 - k) * HEART_MIDDLE, at(2) * breath, at(3)];
  });
}
