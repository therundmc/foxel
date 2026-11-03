import { seeded } from './paint';
import { hazed, type Puff, type Tones } from './clouds-cumulus';
import { Pixels, rgb, type Rgb } from './clouds-pixels';

// Cumulus the way the films paint them: big readable masses, a flat belly, a crown of round heads. Each is
// piled from a few columns of balls under a dome, with smaller buds on its outline, and shaded in four flat
// tones: cream where the sun falls, peach where it turns away, lilac-blue in its own shadow underneath.

/** Sunlit cream, the peach of the turning edge, the lilac belly and its deepest creases. */
export const CUMULUS: Tones = { lit: rgb('#fff8ec'), soft: rgb('#fbe0cc'), shade: rgb('#c6c2e4'), deep: rgb('#a6a6d6') };

/** One painted cloud, and where its base middle is on its canvas. */
export interface Cloud {
  readonly canvas: HTMLCanvasElement;
  readonly ox: number;
  readonly oy: number;
}

/** One dome of lobes: [middle, base, width, height, nearness] in pixels, its base on `y = base`, `y` going up. */
type Dome = readonly [number, number, number, number, number];

/** The sun is high, a little toward `sun`, a little in front. */
const LIGHT = { x: 0.42, y: -0.82, z: 0.4 };
/** Where a lobe turns from cream to peach, and from peach to its shaded crease. */
const LIT_ABOVE = -0.02;
const CREASE_BELOW = -0.62;
/** How much of a cloud's height its lilac belly and its peach waist take, from its base up. */
const BELLY = 0.2;
const WAIST = 0.42;

/**
 * Piles one dome: big balls to fill it, round heads along its outline, the biggest on top, and a few broad
 * ones on its face for its folds. Lobes on the far side from the sun keep in the cloud's own shadow.
 */
function pile(puffs: Puff[], random: () => number, [mid, base, wide, tall0, near]: Dome, sun: number): void {
  const a = wide * 0.45;
  const tall = tall0 * 0.88;
  const unit = Math.max(1.3, Math.min(wide, tall * 1.6));
  const lobe = (x: number, y: number, r: number, z: number): void => {
    const side = ((x - mid) / a) * sun;
    puffs.push({ x, y, r, z: near + z, level: side < -0.3 ? 1 : 0, born: -99, phase: random() * 6.28 });
  };
  for (let k = 0; k < 3; k++) {
    lobe(mid + (k - 1) * a * 0.45, base + tall * 0.4, Math.min(a * 0.6, tall * 0.6), -unit);
  }
  for (let th = 0.3; th < Math.PI - 0.25; ) {
    const r = Math.max(1.2, unit * (0.08 + 0.12 * Math.sin(th) ** 2) * (0.75 + random() * 0.6));
    const px = mid + a * Math.cos(th);
    const py = base + tall * Math.sin(th);
    // Inward along the normal of the ellipse, so the lobe's edge is the cloud's.
    const nx = Math.cos(th) / a;
    const ny = Math.sin(th) / tall;
    const n = Math.hypot(nx, ny);
    const inset = r * (0.45 + random() * 0.35);
    lobe(px - (nx / n) * inset, Math.max(base + r * 0.5, py - (ny / n) * inset), r, unit * 0.4 + random() * unit * 0.1);
    th += (r * (1.2 + random() * 0.4)) / Math.max(0.5, Math.hypot(a * Math.sin(th), tall * Math.cos(th)));
  }
  for (let k = Math.max(1, Math.round(wide / (unit * 0.45))); k > 0; k--) {
    const r = unit * (0.2 + random() * 0.08);
    lobe(mid + (random() - 0.5) * a * 1.1, base + tall * (0.35 + random() * 0.25), r, unit * 0.3);
  }
  // A few great heads crowning it, each standing out of the dome.
  const heads = Math.max(1, Math.round(wide / (unit * 0.36)));
  for (let k = 0; k < heads; k++) {
    const across = heads === 1 ? (random() - 0.5) * 0.3 : (k / (heads - 1) - 0.5) * 1.1 + (random() - 0.5) * 0.15;
    const x = mid + across * a;
    const r = unit * (0.15 + random() * 0.1) * (1 - Math.abs(across) * 0.3);
    const dome = tall * Math.sqrt(Math.max(0, 1 - across * across));
    lobe(x, base + Math.max(r * 0.8, dome - r * 0.35), r, unit * 0.5 + random() * unit * 0.1);
  }
  // The flat belly: a row of low lobes from one end to the other.
  const rb = Math.max(1.2, unit * 0.12);
  for (let x = mid - a + rb * 1.2; x <= mid + a - rb * 1.2; x += rb * 1.4) {
    lobe(x, base + rb * 0.6, rb * (0.9 + random() * 0.3), unit * 0.25);
  }
}

/**
 * The lobes of a cloud `wide` by `tall`, its base on `y = 0`, `y` going up. A towering one piles slimmer domes
 * on the first, each a little toward the sun and behind the one below, for the great clouds of summer.
 */
export function cumulus(seed: number, wide: number, tall: number, sun: number, towering = false): Puff[] {
  const random = seeded(seed);
  const puffs: Puff[] = [];
  const domes: Dome[] = towering
    ? [
        [0, 0, wide, tall * 0.5, 0],
        [sun * wide * 0.06 + (random() - 0.5) * wide * 0.1, tall * 0.3, wide * 0.8, tall * 0.42, -wide * 0.4],
        [sun * wide * 0.12, tall * 0.55, wide * 0.55, tall * 0.45, -wide * 0.8],
      ]
    : [[0, 0, wide, tall, 0]];
  domes.forEach((dome) => pile(puffs, random, dome, sun));
  return puffs;
}

/**
 * A cloud painted once, through `haze` of air of colour `air`. Each pixel shows the nearest lobe, in the tone
 * of how that lobe faces the sun; low down, the cloud's belly is in its own shade whatever the lobe.
 */
export function paintCloud(puffs: readonly Puff[], sun: number, haze: number, air: Rgb, tones: Tones = CUMULUS): Cloud {
  const left = Math.min(...puffs.map((p) => p.x - p.r));
  const right = Math.max(...puffs.map((p) => p.x + p.r));
  const top = Math.max(...puffs.map((p) => p.y + p.r));
  const w = Math.ceil(right - left) + 4;
  const h = Math.ceil(top) + 3;
  const ox = Math.round(2 - left);
  const oy = h - 1;
  const near = new Float32Array(w * h).fill(-Infinity);
  const tone = new Uint8Array(w * h);
  for (const p of puffs) {
    const cx = ox + p.x;
    const cy = oy - p.y;
    for (let py = Math.max(0, Math.ceil(cy - p.r - 0.5)); py <= Math.min(oy, Math.floor(cy + p.r - 0.5)); py++) {
      const dy = py + 0.5 - cy;
      const half = Math.sqrt(Math.max(0, p.r * p.r - dy * dy));
      for (let px = Math.max(0, Math.ceil(cx - half - 0.5)); px <= Math.min(w - 1, Math.floor(cx + half - 0.5)); px++) {
        const dx = px + 0.5 - cx;
        const rise = Math.sqrt(Math.max(0, p.r * p.r - dx * dx - dy * dy));
        const i = py * w + px;
        if (p.z + rise > near[i]) {
          near[i] = p.z + rise;
          const facing = (dx * LIGHT.x * sun + dy * LIGHT.y + rise * LIGHT.z) / p.r;
          tone[i] = Math.min(3, p.level + (facing > LIT_ABOVE ? 0 : facing > CREASE_BELOW ? 1 : 2));
        }
      }
    }
  }
  const ramp = [tones.lit, tones.soft, tones.shade, tones.deep].map((c) => hazed({ lit: c, soft: c, shade: c, deep: c }, air, haze).lit);
  // A crease one pixel thin, or a lone pixel of shade, is a scratch rather than a fold: it takes its neighbours'.
  const at = (x: number, y: number): number => (x < 0 || y < 0 || x >= w || y >= h || near[y * w + x] === -Infinity ? -1 : tone[y * w + x]);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const t = at(px, py);
      const up = at(px, py - 1);
      const down = at(px, py + 1);
      const l = at(px - 1, py);
      const r = at(px + 1, py);
      if (t > 0 && up >= 0 && down >= 0 && up < t && down < t) {
        tone[py * w + px] = Math.max(up, down);
      } else if (t > 0 && l >= 0 && r >= 0 && l < t && r < t) {
        tone[py * w + px] = Math.max(l, r);
      }
    }
  }
  const out = new Pixels(w, h);
  out.clear();
  for (let py = 0; py <= oy; py++) {
    const up = (oy - py) / Math.max(1, top);
    // The belly's edge is not ruled straight: it follows the lobes a little.
    for (let px = 0; px < w; px++) {
      const i = py * w + px;
      if (near[i] === -Infinity) {
        continue;
      }
      const wobble = Math.sin(px * 0.35) * 0.025 + Math.sin(px * 0.13 + 1) * 0.03;
      const floor = up < BELLY + wobble ? (tone[i] >= 2 ? 3 : 2) : up < WAIST + wobble ? 1 : 0;
      out.set(px, py, ramp[Math.max(tone[i], floor)]);
    }
  }
  out.flush();
  return { canvas: out.canvas, ox, oy };
}

/** A cloud placed on the view by its base middle. */
export function drawCloud(ctx: CanvasRenderingContext2D, cloud: Cloud, x: number, y: number, alpha = 1): void {
  if (alpha <= 0) {
    return;
  }
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(cloud.canvas, Math.round(x) - cloud.ox, Math.round(y) - cloud.oy);
  ctx.globalAlpha = 1;
}
