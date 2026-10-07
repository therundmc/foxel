import { clamp01, prerender, px, ramp, seeded, type VistaView } from './paint';
import { hash, type Plan } from './rain-plan';

// The storm's lights: far lightning, soft and slow to fade, and the pale rainbow it leaves behind.

/** The first flash, and the calm between two of them. */
const FIRST_FLASH = 9.5;
const CALM = [5, 9] as const;
/** A flash swells quickly and dies slowly; the last one, as the storm leaves, is larger and lingers. */
const SWELLS = 0.09;
const DIES = 0.2;
const LAST_DIES = 0.34;
const FLICKER_AFTER = 0.3;
const OVER = 1.8;
const BOLT = '#f3eeff';
/** The light a flash throws on the clouds, the air and the land. */
export const FLASH = '#d6cff5';
export const FLASH_RGB = '214,207,245';

export interface Flash {
  /** Tells one flash from another: which cloud it picks, the path of its bolt. */
  readonly seed: number;
  /** How bright it is right now, from 0 to 1. */
  readonly glow: number;
  /** The last one of the storm, on the side the fox looks to. */
  readonly last: boolean;
  /** Whether a bolt drops to the hills, or the cloud only lights up from inside. */
  readonly bolt: boolean;
}

const pulse = (since: number, dies: number): number =>
  since < 0 ? 0 : since < SWELLS ? since / SWELLS : Math.exp(-(since - SWELLS) / dies);

/** The flash that is lighting the sky at this instant, if any. */
export function flashOf({ t, w, foxX }: VistaView, { clearAt }: Plan): Flash | undefined {
  // Another view, another storm.
  const salt = w + foxX * 0.37;
  let id = -1;
  let at = 0;
  for (let next = FIRST_FLASH + 2 * hash(salt, 1); next <= t && (clearAt === undefined || next < clearAt); ) {
    id++;
    at = next;
    next += CALM[0] + (CALM[1] - CALM[0]) * hash(salt, id + 2);
  }
  // The storm's farewell, never right on the heels of another flash.
  const farewell = clearAt === undefined ? Infinity : Math.max(clearAt + 0.4, at + 1.6);
  const last = t >= farewell;
  const since = t - (last ? farewell : at);
  if ((id < 0 && !last) || since > OVER) {
    return undefined;
  }
  const seed = last ? salt + 99 : salt + id * 7;
  const flicker = last || hash(seed, 4) < 0.45 ? 0.5 * pulse(since - FLICKER_AFTER, DIES * 0.8) : 0;
  return {
    seed,
    glow: (last ? 1 : 0.75) * clamp01(pulse(since, last ? LAST_DIES : DIES) + flicker),
    last,
    bolt: last || hash(seed, 6) < 0.35,
  };
}

/** A thin forked bolt from (`x`, `from`) down to row `to`: small, far away, gone before the glow. */
export function paintBolt(ctx: CanvasRenderingContext2D, flash: Flash, x: number, from: number, to: number): void {
  const alpha = Math.min(1, flash.glow * flash.glow * 2);
  if (!flash.bolt || alpha < 0.03) {
    return;
  }
  const random = seeded(Math.round(flash.seed * 13));
  const lean = random() < 0.5 ? -1 : 1;
  const forksAt = Math.round(from + (to - from) * (0.25 + 0.3 * random()));
  const forkEnds = forksAt + (to - from) * 0.4;
  let fork = x;
  for (let y = from; y < to; y++) {
    const step = random();
    x += step < 0.3 ? lean : step < 0.42 ? -lean : 0;
    px(ctx, x, y, BOLT, alpha);
    if (y === forksAt) {
      fork = x;
    } else if (y > forksAt && y < forkEnds) {
      fork -= random() < 0.65 ? lean : 0;
      px(ctx, fork, y, BOLT, alpha * 0.7);
    }
  }
}

/** A soft round light of colour `rgb` ("r,g,b"), `rx` by `ry` pixels: for what glows, never for shapes. */
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rgb: string, alpha: number): void {
  if (alpha < 0.01) {
    return;
  }
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(1, ry / rx);
  const light = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  light.addColorStop(0, `rgba(${rgb},${alpha})`);
  light.addColorStop(0.45, `rgba(${rgb},${alpha * 0.4})`);
  light.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = light;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

const BOW = ['#eaa3ab', '#f1cf9d', '#f3ecb0', '#b6dfba', '#aac8ea'];
const BOW_STRENGTH = 0.4;
const BOW_FROM = 4;
const BOW_DRAWN = 13;
let bowImage: HTMLCanvasElement | undefined;

// A thin arc, one pixel for each colour, its feet melting into the mist.
function bowOf(r: number): HTMLCanvasElement {
  if (bowImage?.height !== r) {
    bowImage = prerender(r * 2, r, (ctx) => {
      for (let y = 0; y < r; y++) {
        for (let x = 0; x < r * 2; x++) {
          const stripe = Math.floor(r - Math.hypot(x + 0.5 - r, y + 0.5 - r));
          if (stripe >= 0 && stripe < BOW.length) {
            px(ctx, x, y, BOW[stripe], 0.3 + 0.7 * clamp01((r - y) / (r * 0.5)));
          }
        }
      }
    });
  }
  return bowImage;
}

/** A pale rainbow draws itself in the washed air, from its foot near the fox, up and over to the side it looks to. */
export function paintRainbow({ ctx, moment, foxX, dir }: VistaView, { base, rise, room }: Plan): void {
  const drawn = moment === undefined ? 0 : ramp(moment, BOW_FROM, BOW_DRAWN);
  if (drawn <= 0) {
    return;
  }
  // The whole arc when there is room for it, else the foot of a greater one rising beside the fox.
  const r = Math.round(Math.min(64, Math.max(30, Math.min(room * 0.4, (base - rise) * 0.95))));
  const x = Math.round(foxX + dir * (16 + r));
  const y = base - Math.round(rise * 0.4);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let a = 0; a < Math.PI * drawn + 0.1; a += 0.1) {
    const upTo = Math.min(a, Math.PI * drawn);
    ctx.lineTo(x - dir * Math.cos(upTo) * r * 2, y - Math.sin(upTo) * r * 2);
  }
  ctx.clip();
  ctx.globalAlpha = BOW_STRENGTH * (0.5 + 0.5 * drawn);
  ctx.drawImage(bowOf(r), x - r, y - r);
  ctx.restore();
}
