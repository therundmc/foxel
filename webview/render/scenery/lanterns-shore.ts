import { lookoutTop } from './lookout';
import { gradient, prerender, seeded, type VistaView } from './paint';

// The lake, painted once for a view: a deep blue night, a thin crescent moon, low hills on the far shore and, on the
// side the fox looks to, a little village with warm windows, a pagoda in the middle of it, all of it given back by the
// still water. Nothing of it moves: the stars, the moon and the windows on the water, and the lanterns go over it.

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));

/** The sky from the top down: deep blue, a little lighter and bluer over the far shore. */
const SKY = [[0, '#050822'], [0.4, '#0b1340'], [0.8, '#18245c'], [1, '#283470']] as const;
/** The water from the far shore to our feet. */
const WATER = [[0, '#1a2660'], [0.3, '#101a4a'], [1, '#070d2c']] as const;
/** The hills far behind, paled by the distance; the bank under the village, and its houses, darker. */
const HILLS = '#141d52';
const HILLS_MIRRORED = '#111a4c';
const BANK = '#0a0f30';
const BANK_MIRRORED = '#0b1238';
const ROOF = '#06091f';
/** Paper screens lit from within, from gold to a deeper orange. */
export const WINDOWS = ['#ffd98a', '#ffbe62', '#ff9c4a'] as const;
const MOON_LIGHT = '#fffbe6';
const MOON_BODY = '#fff0b8';
const MOON_SHADE = '#e2c98e';
const MOON_DARK = '#232e6a';
/** The moon's halo, as the three channels of its colour, and how strong it is from the moon outwards. */
const HALO = '196,208,255';
const HALO_FADES = [[0, 0.3], [0.3, 0.1], [1, 0]] as const;
const HALO_REACH = 5;
/** The warmth the lanterns will throw on the sky over the village and on the water. */
const WARMTH = '#ff9a4a';
const MIST = '#4a5a9a';

/** A house: its body as [width, height] and the eaves of its roof one pixel wider on each side. */
interface House {
  readonly x: number;
  readonly wide: number;
  readonly tall: number;
  /** A pagoda has a second, narrower storey with its own roof. */
  readonly tiers: number;
}

export interface Shore {
  readonly image: HTMLCanvasElement;
  /** The sky over the village and its water warmed, to lay over the rest as much as the lanterns light it. */
  readonly warmth: HTMLCanvasElement;
  /** The rows of the water: its far shore, and where the lookout hides it. */
  readonly shore: number;
  readonly foot: number;
  /** The middle of the village and half its width. */
  readonly villageX: number;
  readonly villageHalf: number;
  /** Every lit window, as x, y and colour index, for its light on the water. */
  readonly windows: Int16Array;
  readonly moonX: number;
  readonly moonY: number;
  readonly moonR: number;
}

/** Low rolling hills along the far shore, how tall in each column. */
function hills(w: number, high: number): Int16Array {
  const tall = new Int16Array(w);
  for (let x = 0; x < w; x++) {
    const v = 0.5 + 0.28 * Math.sin(x / 29 + 1.2) + 0.16 * Math.sin(x / 11.5 + 0.4) + 0.06 * Math.sin(x / 4.7);
    tall[x] = Math.max(1, Math.round(high * v));
  }
  return tall;
}

// The houses stand shoulder to shoulder on a low bank, taller toward the middle, a pagoda among them where there is room.
function village(cx: number, half: number, high: number, random: () => number): House[] {
  const houses: House[] = [];
  const pagoda = half >= 18 ? Math.round(cx + (random() - 0.5) * half * 0.4) : NaN;
  for (let x = Math.round(cx - half); x < cx + half - 3; ) {
    const middle = 1 - Math.abs(x + 2 - cx) / half;
    if (Math.abs(x - pagoda) < 4) {
      houses.push({ x: pagoda - 3, wide: 7, tall: Math.round(high * 0.9) + 1, tiers: 2 });
      x = pagoda + 6;
      continue;
    }
    const wide = 3 + Math.floor(random() * 3) + (high > 6 ? 1 : 0);
    const tall = clamp(Math.round(high * (0.35 + 0.45 * middle + 0.25 * random())), 2, high);
    houses.push({ x, wide, tall, tiers: 1 });
    x += wide + 2 + (random() < 0.25 ? 2 + Math.floor(random() * 3) : 0);
  }
  return houses;
}

function paintHouse(ctx: CanvasRenderingContext2D, { x, wide, tall, tiers }: House, ground: number, lit: (x: number, y: number) => void): void {
  // The body, then its roof: a row of eaves wider than the walls and a narrower ridge above.
  let top = ground - tall;
  ctx.fillStyle = BANK;
  ctx.fillRect(x, top, wide, tall);
  for (let tier = 0; tier < tiers; tier++) {
    const inset = tier * 2;
    const storey = tier === 0 ? tall : Math.max(2, Math.round(tall * 0.55));
    if (tier > 0) {
      top -= storey;
      ctx.fillStyle = BANK;
      ctx.fillRect(x + inset, top, wide - inset * 2, storey);
    }
    ctx.fillStyle = ROOF;
    ctx.fillRect(x + inset - 1, top - 1, wide - inset * 2 + 2, 1);
    ctx.fillRect(x + inset, top - 2, wide - inset * 2, 1);
    if (wide - inset * 2 > 4) {
      ctx.fillRect(x + inset + 1, top - 3, wide - inset * 2 - 2, 1);
    }
    // Its windows: one row of them under the eaves, every other column.
    for (let i = x + inset + 1; i < x + wide - inset - 1; i += 2) {
      lit(i, top + 1);
    }
    if (tier === 0 && tall >= 5) {
      for (let i = x + 1; i < x + wide - 1; i += 2) {
        lit(i, top + 3);
      }
    }
  }
  if (tiers > 1) {
    ctx.fillStyle = ROOF;
    ctx.fillRect(x + Math.floor(wide / 2), top - 5, 1, 2);
  }
}

function crescent(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, dir: 1 | -1): void {
  // Cut from two discs; its lit limb is turned toward the fox, to the village's side of the sky.
  const away = { x: dir * r * 0.6, y: -r * 0.35, r: r * 1.0 };
  for (let j = -r; j <= r; j++) {
    for (let i = -r; i <= r; i++) {
      const fromCentre = Math.hypot(i, j);
      if (fromCentre > r + 0.3) {
        continue;
      }
      const fromCut = Math.hypot(i - away.x, j - away.y) - away.r;
      ctx.globalAlpha = fromCut > 0 ? 1 : 0.6;
      ctx.fillStyle = fromCut <= 0 ? MOON_DARK : fromCut < 0.9 ? MOON_SHADE : fromCentre > r - 0.8 ? MOON_LIGHT : MOON_BODY;
      ctx.fillRect(cx + i, cy + j, 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}

/** One silhouette given back by the water: a little shorter, and broken into dashes further from the shore. */
function mirror(ctx: CanvasRenderingContext2D, tall: Int16Array, shore: number, color: string): void {
  ctx.fillStyle = color;
  for (let x = 0; x < tall.length; x++) {
    const given = Math.round(tall[x] * 0.7);
    for (let row = 0; row < given; row++) {
      if (row < 2 || Math.floor((x + row * 5) / (3 + (row % 3))) % 2 === 0) {
        ctx.fillRect(x, shore + row, 1, 1);
      }
    }
  }
}

// The light of the lanterns over the village: a wide soft dome on the sky, and its reflection, fainter, on the water.
function warmthOf(w: number, foot: number, shore: number, cx: number, half: number): HTMLCanvasElement {
  const wide = half * 1.5 + 10;
  const tall = shore * 0.55;
  return prerender(w, foot, (ctx) => {
    ctx.fillStyle = WARMTH;
    for (let y = 0; y < foot; y++) {
      const up = y < shore ? (shore - y) / tall : ((y - shore) / tall) * 2.2;
      for (let x = 0; x < w; x++) {
        const near = Math.exp(-(((x - cx) / wide) ** 2) - up * up * 1.6) * (y < shore ? 1 : 0.6);
        if (near > 0.01) {
          ctx.globalAlpha = near;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    ctx.globalAlpha = 1;
  });
}

function build(view: VistaView): Shore {
  const { w, h, foxX, dir } = view;
  const foot = h - 3;
  const shore = foot - clamp(Math.round(h * 0.4), 13, 50);
  const room = dir > 0 ? w - foxX : foxX;
  const high = clamp(Math.round(h * 0.08), 3, 9);
  const villageHalf = Math.round(clamp(room * 0.22, 12, 70));
  const villageX = Math.round(clamp(foxX + dir * clamp(room * 0.48, 34, 260), villageHalf + 2, w - villageHalf - 2));
  const moonR = h < 50 ? 3 : h < 80 ? 4 : 5;
  const moonX = Math.round(clamp(foxX + dir * clamp(room * 0.8, 44, 400), moonR + 3, w - moonR - 3));
  const moonY = Math.max(moonR + 2, Math.round(shore * 0.28));
  const random = seeded(0x1a7e);
  const far = hills(w, Math.round(high * 1.3));
  const houses = village(villageX, villageHalf, high, random);
  // The bank the houses stand on swells a little under the village, and the hills behind it sink.
  const bank = new Int16Array(w);
  for (let x = 0; x < w; x++) {
    const inside = 1 - Math.abs(x - villageX) / (villageHalf + 6);
    bank[x] = inside > 0 ? Math.max(1, Math.round(1 + 2 * Math.sqrt(inside))) : Math.sin(x * 0.21) > 0.3 ? 1 : 0;
  }
  const windows: number[] = [];
  const image = prerender(w, h, (ctx) => {
    const painted: VistaView = { ...view, ctx };
    gradient(painted, 0, shore, SKY);
    const halo = ctx.createRadialGradient(moonX, moonY, moonR * 0.8, moonX, moonY, moonR * HALO_REACH);
    HALO_FADES.forEach(([at, alpha]) => halo.addColorStop(at, `rgba(${HALO},${alpha})`));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, shore);
    crescent(ctx, moonX, moonY, moonR, dir);
    gradient(painted, shore, h, WATER);
    ctx.fillStyle = HILLS;
    for (let x = 0; x < w; x++) {
      ctx.fillRect(x, shore - far[x], 1, far[x]);
    }
    mirror(ctx, far, shore, HILLS_MIRRORED);
    ctx.fillStyle = BANK;
    for (let x = 0; x < w; x++) {
      ctx.fillRect(x, shore - bank[x], 1, bank[x]);
    }
    const tall = new Int16Array(w);
    const lit = (x: number, y: number): void => {
      if (random() < 0.78) {
        windows.push(x, y, Math.floor(random() * WINDOWS.length));
      }
    };
    for (const house of houses) {
      const ground = shore - bank[clamp(house.x + (house.wide >> 1), 0, w - 1)] + 1;
      paintHouse(ctx, house, ground, lit);
      for (let x = house.x - 1; x <= house.x + house.wide; x++) {
        if (x >= 0 && x < w) {
          tall[x] = Math.max(tall[x], shore - ground + house.tall + 2);
        }
      }
    }
    for (let x = 0; x < w; x++) {
      tall[x] = Math.max(tall[x], bank[x]);
    }
    mirror(ctx, tall, shore, BANK_MIRRORED);
    for (let i = 0; i < windows.length; i += 3) {
      ctx.fillStyle = WINDOWS[windows[i + 2]];
      ctx.fillRect(windows[i], windows[i + 1], 1, 1);
    }
    // A breath of mist where the water meets the far shore.
    ctx.fillStyle = MIST;
    [[0, 0.22], [1, 0.08]].forEach(([row, alpha]) => {
      ctx.globalAlpha = alpha;
      ctx.fillRect(0, shore + row, w, 1);
    });
    ctx.globalAlpha = 1;
  });
  const warmth = warmthOf(w, Math.min(foot, lookoutTop(view, villageX)), shore, villageX, villageHalf);
  return { image, warmth, shore, foot, villageX, villageHalf, windows: Int16Array.from(windows), moonX, moonY, moonR };
}

let kept: { key: string; shore: Shore } | undefined;

/** The lake of this view, painted the first time it is asked for. */
export function shoreOf(view: VistaView): Shore {
  const key = `${view.w}:${view.h}:${view.foxX}:${view.dir}`;
  if (kept?.key !== key) {
    kept = { key, shore: build(view) };
  }
  return kept.shore;
}
