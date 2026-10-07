import { clamp01, prerender, seeded, type VistaView } from './paint';

// The Milky Way: a slanted band of haze and fine star dust that draws itself from the horizon up.

/** It starts drawing itself once the first stars are out, and takes its time. */
const DRAW_FROM_S = 11;
const DRAW_TO_S = 29;
/** How wide the soft edge of what is being drawn is, and how finely it is cut into strips. */
const SOFT = 44;
const STRIP = 2;
/** The band is wider than its axis: the drawing starts and ends this far beyond its two ends. */
const MARGIN = 22;
/** How faint the densest haze stays: it must never compete with the stars. */
const HAZE_ALPHA = 0.6;
const HAZE_FLOOR = 0.04;
const LEVELS = 9;

const hexes = (ramp: readonly string[]): number[][] => ramp.map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
/** From its dim edge to its pale heart: one side of the band leans to teal, the other to rose. */
const COOL = hexes(['#2f4fa6', '#3d62b4', '#5578c2', '#7892cf', '#a3b4dd', '#d3daee']);
const WARM = hexes(['#4a3fa4', '#6048b0', '#7c58ba', '#9a70c4', '#bb92cf', '#e0c0dc']);
const DUST_TINTS = ['#e6e2ff', '#c3d2ff', '#ffffff', '#ffe8c8'];
/** Ordered dither, so that the haze thickens in pixels rather than in a blur. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

export interface Milky {
  /** The haze with its steady dust, then two sheets of dust that glitter in turn. */
  readonly sheets: readonly HTMLCanvasElement[];
  /** Where on the view it begins to draw itself, and where it ends. */
  readonly from: number;
  readonly to: number;
}

function hash(x: number, y: number): number {
  let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** Smooth clumps, the size of `cell`. */
function clumps(x: number, y: number, cell: number): number {
  const fx = x / cell;
  const fy = y / cell;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const ux = (fx - ix) * (fx - ix) * (3 - 2 * (fx - ix));
  const uy = (fy - iy) * (fy - iy) * (3 - 2 * (fy - iy));
  const top = hash(ix, iy) + (hash(ix + 1, iy) - hash(ix, iy)) * ux;
  const bottom = hash(ix, iy + 1) + (hash(ix + 1, iy + 1) - hash(ix, iy + 1)) * ux;
  return top + (bottom - top) * uy;
}

/** The band, as seen from the fox: it climbs toward the side the fox looks to and passes well above its head. */
function bandOf(skyH: number) {
  const slope = Math.min(0.95, Math.max(0.38, skyH / 120));
  const norm = Math.hypot(1, slope);
  return {
    slope,
    norm,
    /** How high it passes over the fox: above its ears, even in a low panel. */
    over: Math.max(44, skyH * 0.56),
    width: Math.min(11, Math.max(5, skyH * 0.115)),
  };
}

function build(w: number, skyH: number, foxX: number, dir: 1 | -1): Milky {
  const band = bandOf(skyH);
  // `u` runs toward where the fox looks, `up` from the foot of the sky; `along` and `across` follow the band.
  // Its swollen heart sits halfway down to the horizon.
  const coreAlong = ((-0.5 * band.over) / band.slope + band.slope * 0.5 * band.over) / band.norm;
  const widthAt = (along: number): number => band.width * (1 + 0.55 * Math.exp(-(((along - coreAlong) / 46) ** 2)));
  // How much the haze leans to rose rather than teal here: it goes by sides, in large patches.
  const warmth = (x: number, y: number): number => {
    const u = (x - foxX) * dir;
    const up = skyH - 1 - y;
    const along = (u + band.slope * up) / band.norm;
    const across = (up - band.over - band.slope * u) / band.norm;
    return 0.5 - (0.6 * across) / band.width + 1.4 * (clumps(along, across, 17) - 0.5);
  };
  const density = (x: number, y: number): number => {
    const u = (x - foxX) * dir;
    const up = skyH - 1 - y;
    const along = (u + band.slope * up) / band.norm;
    const across = (up - band.over - band.slope * u) / band.norm;
    const width = widthAt(along);
    const body = Math.exp(-((across / width) ** 2));
    if (body < 0.02) {
      return 0;
    }
    const cloud = 0.45 * clumps(along, across, 13) + 0.35 * clumps(along + 40, across * 1.6, 6) + 0.2 * clumps(x, y, 3);
    // The dark rift that winds along its middle.
    const lane = Math.exp(-(((across - width * 0.28 * Math.sin(along / 19)) / (width * 0.2)) ** 2));
    const rift = lane * (0.35 + 0.55 * clumps(along + 90, 0, 22));
    return clamp01(body * (0.3 + 1.1 * cloud) * (1 - rift)) * clamp01((up - 1) / 12);
  };
  const dusted = (seed: number, count: number, bright: number) => (ctx: CanvasRenderingContext2D): void => {
    const random = seeded(seed);
    for (let i = 0; i < count; i++) {
      const x = Math.floor(random() * w);
      const y = Math.floor(random() * skyH);
      const here = density(x, y);
      const roll = random();
      const alpha = (0.16 + 0.84 * random() ** 3) * bright;
      const tint = DUST_TINTS[Math.floor(random() * DUST_TINTS.length)];
      // More dust where the haze is thick: the band is made of stars before it is made of light.
      if (roll < here * 1.25) {
        ctx.globalAlpha = Math.min(1, alpha * (0.5 + here));
        ctx.fillStyle = tint;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  };
  const area = w * skyH;
  const haze = prerender(w, skyH, (ctx) => {
    const image = ctx.createImageData(w, skyH);
    for (let y = 0; y < skyH; y++) {
      for (let x = 0; x < w; x++) {
        const level = Math.floor(density(x, y) * LEVELS + BAYER[(y & 3) * 4 + (x & 3)]);
        if (level > 0) {
          const ramp = warmth(x, y) > BAYER[((y + 2) & 3) * 4 + ((x + 1) & 3)] ? WARM : COOL;
          const [r, g, b] = ramp[Math.round(((Math.min(LEVELS, level) - 1) / (LEVELS - 1)) * (ramp.length - 1))];
          const at = (y * w + x) * 4;
          image.data[at] = r;
          image.data[at + 1] = g;
          image.data[at + 2] = b;
          image.data[at + 3] = Math.round(255 * (HAZE_FLOOR + ((HAZE_ALPHA - HAZE_FLOOR) * Math.min(LEVELS, level)) / LEVELS));
        }
      }
    }
    ctx.putImageData(image, 0, 0);
    dusted(0x3117, area / 7, 0.55)(ctx);
  });
  // Where the band meets the horizon, behind the fox, and where it leaves the view.
  const ends = [-band.over / band.slope, (skyH - band.over) / band.slope].map((u) => Math.min(w, Math.max(0, foxX + dir * u)));
  return {
    sheets: [haze, prerender(w, skyH, dusted(0x8a2f, area / 12, 1)), prerender(w, skyH, dusted(0x1c9d, area / 12, 1))],
    from: ends[0],
    to: ends[1],
  };
}

let kept: { key: string; milky: Milky } | undefined;

export function milkyFor(w: number, skyH: number, foxX: number, dir: 1 | -1): Milky {
  const key = `${w}x${skyH}@${Math.round(foxX)}${dir}`;
  if (kept?.key !== key) {
    kept = { key, milky: build(w, skyH, Math.round(foxX), dir) };
  }
  return kept.milky;
}

/** Paints `sheet` as far as it has drawn itself: all of what is behind the soft edge, then the edge strip by strip. */
function reveal(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, top: number, alpha: number, edge: number, way: number): void {
  const { width, height } = sheet;
  // Distances are counted from the side of the view it starts from.
  const full = Math.min(width, Math.max(0, Math.floor((edge - SOFT) / STRIP) * STRIP));
  if (full > 0) {
    const sx = way > 0 ? 0 : width - full;
    ctx.globalAlpha = alpha;
    ctx.drawImage(sheet, sx, 0, full, height, sx, top, full, height);
  }
  for (let d = full; d < edge && d < width; d += STRIP) {
    const sx = Math.max(0, way > 0 ? d : width - d - STRIP);
    ctx.globalAlpha = alpha * clamp01((edge - d - STRIP / 2) / SOFT);
    ctx.drawImage(sheet, sx, 0, STRIP, height, sx, top, STRIP, height);
  }
}

export function drawMilky({ ctx, t }: VistaView, milky: Milky, floorY: number): void {
  const drawn = (t - DRAW_FROM_S) / (DRAW_TO_S - DRAW_FROM_S);
  if (drawn <= 0) {
    return;
  }
  const way = milky.to >= milky.from ? 1 : -1;
  const width = milky.sheets[0].width;
  const start = (way > 0 ? milky.from : width - milky.from) - MARGIN;
  const edge = start + drawn * (Math.abs(milky.to - milky.from) + SOFT + MARGIN * 2);
  const top = floorY + 1 - milky.sheets[0].height;
  milky.sheets.forEach((sheet, i) => {
    // The haze breathes a little; the two sheets of dust glitter one after the other.
    const alpha = i === 0 ? 0.9 + 0.1 * Math.sin(t * 0.33) : 0.55 + 0.45 * Math.sin(t * 0.62 + i * 2.6);
    if (drawn >= 1) {
      ctx.globalAlpha = alpha;
      ctx.drawImage(sheet, 0, top);
    } else {
      reveal(ctx, sheet, top, alpha, edge, way);
    }
  });
  ctx.globalAlpha = 1;
}
