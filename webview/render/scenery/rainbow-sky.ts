import { clamp01, gradient, mix, prerender, px, ramp, seeded, type VistaView } from './paint';
import { blend, css, hash, rainAt, rgb, toneAt, type Plan, type Rgb } from './rainbow-plan';

// The sky of the sunshower: a soft sky that clears from grey to blue, the sun out of sight behind us, a few small
// clouds drifting, and on the side the fox looks to, the shower's own cloud moving off with its veil of rain under
// it. It is the dark wall the rainbow comes out on. Later, a few little birds fly through the rainbow.

type Three = readonly [Rgb, Rgb, Rgb];
const three = (a: string, b: string, c: string): Three => [rgb(a), rgb(b), rgb(c)];

/** The sky from the top down, at the three lights. */
const SKY_TOP = three('#8b97bb', '#6f9fd8', '#5fa4ea');
const SKY_MID = three('#acb6cf', '#a7c6e8', '#a2d2f4');
const SKY_LOW = three('#d8d5dc', '#f6e2c8', '#eef4e0');
/** The sun behind us, warming the corner of the sky it is in. */
const SUN = '255,240,200';
/** The shower's cloud: its shaded belly, its body, its top in the sun; grey in the shower, lit warm when it has passed. */
const BANK_GREY = ['#7c80a3', '#9599b9', '#c4c6da'] as const;
const BANK_LIT = ['#7f84ae', '#9ca1c8', '#fff0e2'] as const;
/** Small fair-weather clouds: grey under the shower, white after. */
const PUFF_GREY = ['#a4a8c0', '#c4c6d6', '#dcdde8'] as const;
const PUFF_LIT = ['#c6cce6', '#eef0f8', '#ffffff'] as const;
const VEIL = '#a8b0cc';
const BIRD = '#545a7c';

/** The rain under the far cloud: streaks this many pixels long, falling this fast. */
const VEIL_DASH = 4;
const VEIL_SPEED = 22;
/** Pixels a second the clouds drift with the wind, away the way the fox looks. */
const DRIFT = 0.25;

interface Puff {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/**
 * A cloud as a heap of round puffs: in each column, a lit crest on top, a soft step under it, the body, and a
 * shaded belly; here and there the crest of a puff in front shows faintly across the body, as in a heap of cotton.
 */
function paintPuffs(ctx: CanvasRenderingContext2D, puffs: readonly Puff[], [shade, body, lit]: readonly [string, string, string], floor = (_x: number) => Infinity): void {
  const from = Math.floor(Math.min(...puffs.map((p) => p.x - p.r - 1)));
  const to = Math.ceil(Math.max(...puffs.map((p) => p.x + p.r + 1)));
  const soft = mix(body, lit, 0.45);
  for (let x = from; x <= to; x++) {
    let top = Infinity;
    let bottom = -Infinity;
    for (const p of puffs) {
      const reach = (p.r + 0.4) ** 2 - (x - p.x) ** 2;
      if (reach >= 0) {
        top = Math.min(top, Math.round(p.y - Math.sqrt(reach)));
        bottom = Math.max(bottom, Math.round(p.y + Math.sqrt(reach)));
      }
    }
    // A belly that only sways a little: no puff hangs under it.
    bottom = Math.min(bottom, floor(x));
    if (bottom - top < 3) {
      continue;
    }
    ([[lit, top, 1], [soft, top + 1, 1], [body, top + 2, bottom - top - 4], [shade, bottom - 2, 3]] as const).forEach(([color, y, tall]) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, tall);
    });
  }
  // Every third puff, if it is big enough, draws the top of its crest over the body behind it: a soft arc.
  ctx.fillStyle = soft;
  puffs.forEach(({ x, y, r }, i) => {
    if (i % 3 === 1 && r > 4) {
      for (let dx = -Math.floor(r * 0.7); dx <= Math.floor(r * 0.7); dx++) {
        ctx.fillRect(Math.round(x + dx), Math.round(y + 0.6 - Math.sqrt((r - 1) ** 2 - dx * dx)), 1, 1);
      }
    }
  });
}

interface Clouds {
  readonly key: string;
  /** The shower's cloud in the grey and in the sun, and where it is laid. */
  readonly bank: readonly [HTMLCanvasElement, HTMLCanvasElement];
  readonly left: number;
  /** Its foot in each column it covers (-1 where it does not), and where the veil of rain under it starts. */
  readonly base: Int16Array;
  /** Small clouds, each painted in both lights, and where each sits. */
  readonly puffs: readonly { readonly x: number; readonly y: number; readonly images: readonly [HTMLCanvasElement, HTMLCanvasElement] }[];
}

let kept: Clouds | undefined;

function cloudsOf(view: VistaView, plan: Plan): Clouds {
  const { w, h, dir } = view;
  if (kept?.key === plan.key) {
    return kept;
  }
  const random = seeded(0xb0a7);
  // The bank stands from just behind the rainbow's near foot to past the edge the fox looks to; its top slopes up
  // away from the fox, and it ends a little over the far hills.
  const r = Math.max(4, Math.round(h * 0.1));
  const foot = plan.horizon - Math.round(h * 0.1);
  const highest = Math.max(r * 1.5, foot - h * 0.25);
  const start = plan.bowX - dir * plan.radius * 1.05;
  const end = dir > 0 ? w + r * 3 : -r * 3;
  const span = Math.abs(end - start);
  const puffs: Puff[] = [];
  for (let along = 0; along < span; along += r * (0.9 + 0.6 * random())) {
    const x = start + dir * along;
    // How many puffs are stacked at this point: few at its edge, up to the top of the view further in.
    const tall = Math.min(highest, r * 0.8 + along * 0.4) * (0.75 + 0.25 * Math.sin(along * 0.09));
    for (let up = 0; up < tall; up += r * (0.8 + 0.4 * random())) {
      puffs.push({ x: x + (random() - 0.5) * r, y: foot - up + (random() - 0.5) * r * 0.4, r: r * (0.7 + 0.7 * random() ** 2) });
    }
  }
  const left = Math.floor(Math.min(...puffs.map((p) => p.x - p.r))) - 2;
  const right = Math.ceil(Math.max(...puffs.map((p) => p.x + p.r))) + 2;
  const local = puffs.map((p) => ({ ...p, x: p.x - left }));
  const bank = [BANK_GREY, BANK_LIT].map((tones) => prerender(right - left, foot + r + 2, (ctx) => paintPuffs(ctx, local, tones, (x) => foot + Math.round(1.6 * Math.sin((x + left) * 0.13) + Math.sin((x + left) * 0.05))))) as [HTMLCanvasElement, HTMLCanvasElement];
  const base = new Int16Array(w).fill(-1);
  for (const p of puffs) {
    for (let x = Math.max(0, Math.ceil(p.x - p.r * 0.6)); x <= Math.min(w - 1, p.x + p.r * 0.6); x++) {
      base[x] = Math.max(base[x], Math.round(p.y + p.r * 0.6));
    }
  }
  // A few small clouds over the rest of the sky, the fox's side, high up.
  const small: Clouds['puffs'][number][] = [];
  const count = Math.max(2, Math.round(w / 90));
  for (let i = 0; i < count; i++) {
    const size = Math.max(2, Math.round(h * (0.04 + 0.03 * random())));
    const parts: Puff[] = [];
    const long = 2 + Math.floor(random() * 3);
    for (let k = 0; k < long; k++) {
      const pr = size * (k === 1 ? 1.25 : 0.8 + 0.3 * random());
      parts.push({ x: size * 1.5 + k * size * 1.3, y: size * 2.2 - (k === 1 ? size * 0.4 : 0), r: pr });
    }
    const wide = Math.ceil(size * (3 + long * 1.3));
    const images = [PUFF_GREY, PUFF_LIT].map((tones) => prerender(wide, size * 4, (ctx) => paintPuffs(ctx, parts, tones))) as [HTMLCanvasElement, HTMLCanvasElement];
    const x = ((i + 0.3 * random()) / count) * (w + wide) - wide;
    small.push({ x, y: Math.round(h * (0.02 + 0.2 * random())), images });
  }
  kept = { key: plan.key, bank, left, base, puffs: small };
  return kept;
}

/** Where the sky's gradient turns from its top tone to its middle one. */
const SKY_MIDDLE = 0.55;

/** The sky's colour on row `y`, for the water that gives it back. */
export function skyAt(plan: Plan, light: number, y: number): Rgb {
  const at = clamp01(y / (plan.horizon + 2));
  return at < SKY_MIDDLE
    ? blend(toneAt(SKY_TOP, light), toneAt(SKY_MID, light), at / SKY_MIDDLE)
    : blend(toneAt(SKY_MID, light), toneAt(SKY_LOW, light), (at - SKY_MIDDLE) / (1 - SKY_MIDDLE));
}

/** The sky's gradient, the sun's warmth in the corner behind the fox, and a veil of shower over it all at first. */
export function paintSky(view: VistaView, plan: Plan, light: number): void {
  const { ctx, w, h, dir } = view;
  const stops = [[0, toneAt(SKY_TOP, light)], [SKY_MIDDLE, toneAt(SKY_MID, light)], [1, toneAt(SKY_LOW, light)]] as const;
  gradient(view, 0, plan.horizon + 2, stops.map(([at, tone]) => [at, css(tone)] as const));
  const sunX = dir > 0 ? -w * 0.1 : w * 1.1;
  const reach = Math.max(w * 0.7, h * 2);
  const warm = ctx.createRadialGradient(sunX, -h * 0.3, 0, sunX, -h * 0.3, reach);
  const strength = 0.25 + 0.3 * Math.min(1, light);
  warm.addColorStop(0, `rgba(${SUN},${strength.toFixed(3)})`);
  warm.addColorStop(0.5, `rgba(${SUN},${(strength * 0.35).toFixed(3)})`);
  warm.addColorStop(1, `rgba(${SUN},0)`);
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, w, plan.horizon + 2);
}

/** Small clouds drifting, then the shower's cloud with its rain hanging under it. */
export function paintClouds(view: VistaView, plan: Plan, light: number): void {
  const { ctx, w, t, dir, moment } = view;
  const clouds = cloudsOf(view, plan);
  const sun = Math.min(1, light);
  const drift = dir * DRIFT * t;
  for (const { x, y, images } of clouds.puffs) {
    const wide = images[0].width;
    const at = Math.round(((((x + drift * 1.4 + wide) % (w + wide)) + w + wide) % (w + wide)) - wide);
    ctx.drawImage(images[0], at, y);
    ctx.globalAlpha = sun;
    ctx.drawImage(images[1], at, y);
    ctx.globalAlpha = 1;
  }
  // The rain under the far cloud: thin streaks, going as the rain goes.
  const rain = rainAt(t, moment);
  const shift = Math.round(drift);
  if (rain > 0.02) {
    ctx.fillStyle = VEIL;
    for (let x = 0; x < w; x++) {
      const from = clouds.base[(((x - shift) % w) + w) % w];
      if (from < 0 || hash(x - shift, 3) > 0.45) {
        continue;
      }
      const to = plan.far[x];
      const fall = (t * VEIL_SPEED + hash(x - shift, 7) * 40) % (VEIL_DASH * 3);
      ctx.globalAlpha = 0.22 * rain;
      for (let y = from - VEIL_DASH * 3 + Math.round(fall); y < to; y += VEIL_DASH * 3) {
        // Fainter toward the hills: the shower is far, the air between thickens it to nothing.
        const top = Math.max(from, y);
        ctx.globalAlpha = 0.24 * rain * (1 - 0.6 * ramp(top, from, to));
        ctx.fillRect(x, top, 1, Math.max(0, Math.min(VEIL_DASH, to - top)));
      }
    }
    ctx.globalAlpha = 1;
  }
  const leaving = moment === undefined ? 0 : ramp(moment, 18, 45);
  ctx.globalAlpha = 1 - 0.4 * leaving;
  ctx.drawImage(clouds.bank[0], clouds.left + shift, 0);
  ctx.globalAlpha = (1 - 0.4 * leaving) * sun;
  ctx.drawImage(clouds.bank[1], clouds.left + shift, 0);
  ctx.globalAlpha = 1;
}

/** Each bird's place in the little flock: how far behind the first, how far below, its own beat. */
const FLOCK = [[0, 0, 0], [-7, 3, 1.3], [-12, -2, 2.1], [-17, 4, 0.6]] as const;
/** Wings up, then down: offsets from the bird's body. */
const WINGS = [
  [-1, -1, 0, 0, 1, -1],
  [-1, 1, 0, 0, 1, 1],
] as const;
const BIRDS_FROM_S = 6.5;
const BIRDS_FOR_S = 16;
/** Pixels a second. */
const BIRD_SPEED = 13;

/** A few little birds come out from behind the fox and fly away through the rainbow, rising a little. */
export function paintBirds({ ctx, h, dir, moment, foxX }: VistaView, plan: Plan): void {
  if (moment === undefined || moment < BIRDS_FROM_S || moment > BIRDS_FROM_S + BIRDS_FOR_S) {
    return;
  }
  const since = moment - BIRDS_FROM_S;
  const count = h < 50 ? 3 : FLOCK.length;
  const startY = plan.bowY - plan.radius * 0.55;
  for (let i = 0; i < count; i++) {
    const [back, down, beat] = FLOCK[i];
    const x = Math.round(foxX + dir * (BIRD_SPEED * since + back - 6));
    const y = Math.round(startY + down - since * 0.9 + 1.5 * Math.sin(since * 1.1 + beat));
    const wings = WINGS[Math.floor(since * 5 + beat * 1.7) % WINGS.length];
    const alpha = ramp(since, 0, 0.6);
    for (let k = 0; k < wings.length; k += 2) {
      px(ctx, x + wings[k], y + wings[k + 1], BIRD, alpha);
    }
  }
}
