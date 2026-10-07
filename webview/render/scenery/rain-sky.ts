import { clamp01, gradient, mix, prerender, px, ramp, seeded, type VistaView } from './paint';
import { tone, type Plan } from './rain-plan';

// The sky of the rain: an overcast in slow rolls, the opening the light comes through, and the rainbow.

type Tones = readonly [light: string, body: string, shade: string, deep: string];

/** Sky colours from top to hills: before the shower, under it, and washed. */
const SKY_EARLY = ['#8494ad', '#a6b4c2', '#c3cfcc'] as const;
const SKY_SHOWER = ['#687995', '#90a1b4', '#b3c2c1'] as const;
const SKY_FRESH = ['#5a9bd8', '#a5d4ee', '#fde9c4'] as const;

/** Clouds get bigger, darker and quicker the nearer (the higher) they are. */
interface Level {
  readonly w: readonly [number, number];
  readonly h: readonly [number, number];
  /** Distance between two clouds of a band, and between two bands. */
  readonly gapX: number;
  readonly stepY: number;
  /** Pixels per second. */
  readonly speed: number;
  /** Used up to this height above the horizon. */
  readonly upTo: number;
}
const LEVELS: readonly Level[] = [
  { w: [16, 26], h: [5, 7], gapX: 11, stepY: 5, speed: 0.3, upTo: 8 },
  { w: [24, 36], h: [8, 10], gapX: 17, stepY: 7, speed: 0.5, upTo: 21 },
  { w: [34, 50], h: [11, 14], gapX: 24, stepY: 10, speed: 0.8, upTo: 42 },
  { w: [46, 66], h: [15, 19], gapX: 33, stepY: 13, speed: 1.15, upTo: 84 },
  { w: [60, 88], h: [20, 25], gapX: 45, stepY: 17, speed: 1.5, upTo: Infinity },
];
const SHAPES = 6;
const RAIN_FAR: Tones = ['#bfcbcc', '#adbbc0', '#9eacb6', '#939fb0'];
const RAIN_NEAR: Tones = ['#8796ad', '#71809a', '#616d8b', '#595d81'];
const FRESH_FAR: Tones = ['#fffdf2', '#f8e9dc', '#dfd3e0', '#cbc3dc'];
const FRESH_NEAR: Tones = ['#ffffff', '#f0f1f6', '#c2c8e3', '#a0aad3'];

interface Puff {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** One cloud, drawn column by column: a bumpy top, a flat belly, and the shadow following the bumps. */
function drawPuff(ctx: CanvasRenderingContext2D, puff: Puff, tones: Tones, random: () => number): void {
  const { w, h } = puff;
  const count = Math.max(3, Math.round(w / (h * 0.8)));
  const lumps = Array.from({ length: count }, (_, i) => {
    const along = i / (count - 1);
    // Bigger in the middle, but never evenly: a row of equal bumps would read as scales.
    const r = h * (0.3 + 0.2 * Math.sin(Math.PI * along) + 0.2 * random());
    return { x: r + (w - 2 * r) * along + (random() - 0.5) * 3, y: h - r * 0.5, r };
  });
  const rim = h > 12 ? 2 : 1;
  for (let x = 0; x < w; x++) {
    let top = h;
    let bottom = 0;
    for (const lump of lumps) {
      const dx = x + 0.5 - lump.x;
      if (Math.abs(dx) < lump.r) {
        const half = Math.sqrt(lump.r * lump.r - dx * dx);
        top = Math.min(top, Math.round(lump.y - half));
        bottom = Math.max(bottom, Math.round(lump.y + half * 0.6));
      }
    }
    bottom = Math.min(bottom, h - (x % 5 === 2 && h > 6 ? 1 : 0));
    const shade = Math.round(h * 0.5 + top * 0.5);
    const deep = Math.round(h * 0.82 + top * 0.12);
    const marks = [top, top + rim, shade, deep, bottom];
    for (let i = 0; i < 4; i++) {
      const from = Math.min(marks[i], bottom);
      const to = Math.min(marks[i + 1], bottom);
      if (to > from) {
        ctx.fillStyle = tones[i];
        ctx.fillRect(puff.x + x, puff.y + from, 1, to - from);
      }
    }
  }
}

interface Atlas {
  readonly rain: HTMLCanvasElement;
  readonly fresh: HTMLCanvasElement;
  /** `puffs[level][shape]`. */
  readonly puffs: readonly (readonly Puff[])[];
}
let atlas: Atlas | undefined;

// Every cloud shape, painted once in its rainy and its sunlit colours.
function atlasOf(): Atlas {
  if (atlas) {
    return atlas;
  }
  const random = seeded(0xc10d);
  let y = 0;
  let width = 0;
  const puffs = LEVELS.map((level) => {
    let x = 0;
    const row = Array.from({ length: SHAPES }, () => {
      const puff = {
        x,
        y,
        w: Math.round(level.w[0] + random() * (level.w[1] - level.w[0])),
        h: Math.round(level.h[0] + random() * (level.h[1] - level.h[0])),
      };
      x += puff.w + 1;
      return puff;
    });
    y += level.h[1] + 1;
    width = Math.max(width, x);
    return row;
  });
  const paint = (far: Tones, near: Tones) =>
    prerender(width, y, (ctx) => {
      const shapes = seeded(0xf10c);
      puffs.forEach((row, level) => {
        const depth = level / (LEVELS.length - 1);
        const tones = far.map((color, i) => mix(color, near[i], depth)) as unknown as Tones;
        row.forEach((puff) => drawPuff(ctx, puff, tones, shapes));
      });
    });
  atlas = { rain: paint(RAIN_FAR, RAIN_NEAR), fresh: paint(FRESH_FAR, FRESH_NEAR), puffs };
  return atlas;
}

interface Cloud {
  /** Where it starts along its band, and its bottom row. */
  readonly x: number;
  readonly y: number;
  readonly puff: Puff;
  /** Drawn once per cloud: which ones melt away when the sky clears, and when. */
  readonly fate: number;
}
interface Band {
  readonly clouds: readonly Cloud[];
  readonly speed: number;
  /** The clouds go round a loop wider than the view, so they come and go off stage. */
  readonly loop: number;
  readonly margin: number;
}
const SKIPPED = 0.14;
let bandsKey = '';
let bands: Band[] = [];

// Bands of clouds stacked from the horizon up, the nearest and biggest at the top.
function bandsOf(w: number, horizon: number): Band[] {
  const key = `${w}:${horizon}`;
  if (key === bandsKey) {
    return bands;
  }
  const { puffs } = atlasOf();
  const random = seeded(0xba2d + w * 31 + horizon);
  bands = [];
  for (let above = 1; horizon - above > 3; ) {
    let index = LEVELS.findIndex((level) => above < level.upTo);
    // A cloud cut by the top of the view must still show its bumps, not just a strip of belly.
    while (index > 0 && horizon - above < LEVELS[index].h[1] * 0.7) {
      index--;
    }
    const level = LEVELS[index];
    const margin = LEVELS[Math.min(index + 1, LEVELS.length - 1)].w[1] + 16;
    const count = Math.ceil((w + 2 * margin) / level.gapX);
    const clouds: Cloud[] = [];
    for (let i = 0; i < count; i++) {
      // Now and then a smaller or a bigger one, or none: the cover is uneven, with lighter sky showing through.
      const pick = random();
      const size = Math.min(LEVELS.length - 1, Math.max(0, index + (pick < 0.22 ? -1 : pick > 0.86 ? 1 : 0)));
      const cloud = {
        x: (i + (random() - 0.5) * 0.9) * level.gapX,
        y: horizon - above + Math.round((random() - 0.3) * level.stepY * 0.7),
        puff: puffs[size][Math.floor(random() * SHAPES)],
        fate: random(),
      };
      if (random() > SKIPPED) {
        clouds.push(cloud);
      }
    }
    bands.push({ clouds, speed: level.speed * (0.85 + random() * 0.3), loop: count * level.gapX, margin });
    above += level.stepY;
  }
  // The far ones are painted last: each roll shows its lit top against the belly of the one above.
  bands.reverse();
  bandsKey = key;
  return bands;
}

/** How far the clouds are pushed aside by the opening, and how much of the cover melts away everywhere. */
const PUSH = 12;
const THINNING = 0.45;
const MELT_S = 3.2;

function paintClouds({ ctx, w, t, moment, dir }: VistaView, { horizon, gap, fresh }: Plan): void {
  const sheet = atlasOf();
  for (const band of bandsOf(w, horizon)) {
    const drift = Math.floor(band.speed * t);
    for (const cloud of band.clouds) {
      const { puff } = cloud;
      const along = (((cloud.x + dir * drift) % band.loop) + band.loop) % band.loop;
      let x = Math.round(along) - band.margin;
      let alpha = 1;
      if (moment !== undefined) {
        const dx = (x + puff.w / 2 - gap.x) / gap.rx;
        const dy = (cloud.y - puff.h / 2 - gap.y) / gap.ry;
        const far = Math.hypot(dx, dy);
        // Inside the opening every cloud melts; around it fewer and fewer do, and later.
        const melts = clamp01((1.15 - (1.15 - THINNING) * clamp01(far - 1) - cloud.fate) / 0.12);
        const from = 0.2 + Math.min(far, 2.5) * 1.3 + cloud.fate * 1.6;
        alpha = 1 - melts * ramp(moment, from, from + MELT_S);
        x += Math.round(Math.sign(dx) * PUSH * ramp(moment, 0.2, 6) * clamp01(1.8 - far));
      }
      if (alpha <= 0.02 || x >= w || x + puff.w <= 0) {
        continue;
      }
      const top = cloud.y - puff.h;
      if (fresh < 1) {
        ctx.globalAlpha = alpha;
        ctx.drawImage(sheet.rain, puff.x, puff.y, puff.w, puff.h, x, top, puff.w, puff.h);
      }
      if (fresh > 0) {
        ctx.globalAlpha = alpha * fresh;
        ctx.drawImage(sheet.fresh, puff.x, puff.y, puff.w, puff.h, x, top, puff.w, puff.h);
      }
    }
  }
  ctx.globalAlpha = 1;
}

// A deliberate soft glow: the sun behind the last veil, where the clouds have parted.
function paintOpening({ ctx, moment }: VistaView, { gap }: Plan): void {
  if (moment === undefined) {
    return;
  }
  const open = ramp(moment, 0.3, 7);
  const radius = gap.rx * 1.9;
  ctx.save();
  ctx.translate(Math.round(gap.x), Math.round(gap.y));
  ctx.scale(1, Math.max(0.45, (gap.ry * 1.5) / gap.rx));
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  glow.addColorStop(0, `rgba(255,252,236,${0.95 * open})`);
  glow.addColorStop(0.16, `rgba(255,244,204,${0.7 * open})`);
  glow.addColorStop(0.55, `rgba(255,236,190,${0.25 * open})`);
  glow.addColorStop(1, 'rgba(255,236,190,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  ctx.restore();
}

/** The whole sky: its colours, the opening, the clouds. */
export function paintSky(view: VistaView, plan: Plan): void {
  const stops = SKY_EARLY.map((early, i) => {
    const rainy = tone(early, SKY_SHOWER[i], plan.gloom);
    return plan.fresh > 0 ? mix(SKY_SHOWER[i], SKY_FRESH[i], plan.fresh) : rainy;
  });
  gradient(view, 0, plan.ground, [[0, stops[0]], [0.55, stops[1]], [1, stops[2]]]);
  paintOpening(view, plan);
  paintClouds(view, plan);
}

/** Shafts of light, from the opening down to the hills: [where it leaves the opening, width, how it widens, strength]. */
const SHAFTS = [[-10, 4, 0.1, 0.2], [-1, 7, 0.15, 0.26], [10, 3, 0.08, 0.18]] as const;
const SHAFT_COLOR = '#fff2c6';

export function paintShafts({ ctx, t, moment, dir }: VistaView, { gap, ground, room }: Plan): void {
  if (moment === undefined || moment < 1) {
    return;
  }
  const top = Math.round(gap.y) + 1;
  const bottom = ground + 3;
  // The light leans back toward the fox without ever falling on it.
  const lean = -dir * Math.min(0.42, (room * 0.22) / (bottom - top));
  const reach = top + (bottom - top + 8) * ramp(moment, 1.2, 5.5);
  SHAFTS.forEach(([from, width, widening, strength], i) => {
    const breath = 0.78 + 0.22 * Math.sin(t * 0.45 + i * 2.1);
    for (let y = top; y < bottom && y < reach; y++) {
      const down = y - top;
      const wide = Math.round(width + down * widening);
      const x = gap.x + dir * from * (gap.rx / 40) + lean * down - wide / 2;
      const alpha = strength * breath * clamp01((reach - y) / 8) * clamp01(down / 4);
      px(ctx, x, y, SHAFT_COLOR, alpha, wide, 1);
    }
  });
}

const BOW = ['#f08c93', '#f6b680', '#f8e791', '#a8dfa0', '#8ec7ee', '#b4a3e8'];
const BOW_STRENGTH = 0.62;
/** Pixels of arc drawn per second, and the bounds of how long the whole of it takes. */
const BOW_PACE = 11;
const BOW_STARTS = 3.5;

interface Bow {
  readonly image: HTMLCanvasElement;
  readonly x: number;
  readonly y: number;
  readonly r: number;
  /** The stretch of the arc that is in the view, as angles from the foot nearest the fox. */
  readonly from: number;
  readonly to: number;
}
let bowKey = '';
let bow: Bow | undefined;

// Where the rainbow stands: a whole arc beside the fox when there is room, one over it in a tall view, else a foot.
function bowOf({ w, foxX, dir }: VistaView, { horizon, room }: Plan): Bow {
  const key = `${w}:${horizon}:${foxX}:${dir}`;
  if (bow && key === bowKey) {
    return bow;
  }
  const beside = Math.min((room - 26) / 2, horizon - 3);
  let r = beside;
  let x = foxX + dir * (22 + r);
  if (beside < 16 && horizon >= 78) {
    r = Math.min(w * 0.62, horizon * 0.6);
    x = foxX + dir * (room - 5 - r);
  } else if (beside < 16) {
    r = Math.max(34, horizon * 1.5);
    x = foxX + dir * (20 + r);
  }
  r = Math.round(r);
  x = Math.round(x);
  const thick = r >= 44 ? 2 : 1;
  const image = prerender(r * 2, r, (ctx) => {
    for (let py = 0; py < r; py++) {
      for (let pxl = 0; pxl < r * 2; pxl++) {
        const stripe = Math.floor((r - Math.hypot(pxl + 0.5 - r, py + 0.5 - r)) / thick);
        if (stripe >= 0 && stripe < BOW.length) {
          // Its feet melt into the mist of the hills.
          px(ctx, pxl, py, BOW[stripe], 0.35 + 0.65 * clamp01((r - py) / (r * 0.45)));
        }
      }
    }
  });
  let from = Math.PI;
  let to = 0;
  for (let a = 0; a <= Math.PI; a += Math.PI / 90) {
    const ax = x - dir * Math.cos(a) * r;
    const ay = horizon - Math.sin(a) * r;
    if (ax > -2 && ax < w + 2 && ay > -2) {
      from = Math.min(from, a);
      to = Math.max(to, a);
    }
  }
  bowKey = key;
  bow = { image, x, y: horizon, r, from, to };
  return bow;
}

/** How much of the rainbow has drawn itself, from 0 to 1. */
export function bowShown(view: VistaView, plan: Plan): number {
  if (view.moment === undefined) {
    return 0;
  }
  const { r, from, to } = bowOf(view, plan);
  const lasts = Math.min(14, Math.max(7, ((to - from) * r) / BOW_PACE));
  return clamp01((view.moment - BOW_STARTS) / lasts);
}

/** The rainbow draws itself from its foot near the fox, up and over toward the side it looks to. */
export function paintRainbow(view: VistaView, plan: Plan): void {
  const shown = bowShown(view, plan);
  if (shown <= 0) {
    return;
  }
  const { ctx, dir } = view;
  const { image, x, y, r, from, to } = bowOf(view, plan);
  const eased = shown * shown * (3 - 2 * shown);
  // Three sweeps a little apart: its tip comes on softly.
  for (let pass = 0; pass < 3; pass++) {
    const upTo = from + (to - from + 0.2) * eased - pass * 0.07;
    if (upTo <= from) {
      continue;
    }
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let a = from - 0.05; a < upTo; a += 0.08) {
      ctx.lineTo(x - dir * Math.cos(a) * r * 1.6, y - Math.sin(a) * r * 1.6);
    }
    ctx.lineTo(x - dir * Math.cos(upTo) * r * 1.6, y - Math.sin(upTo) * r * 1.6);
    ctx.closePath();
    ctx.clip();
    ctx.globalAlpha = 1 - Math.cbrt(1 - BOW_STRENGTH * (0.75 + 0.25 * plan.fresh));
    ctx.drawImage(image, x - r, y - r);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

/** The colours of the rainbow, for what mirrors it. */
export const BOW_COLORS: readonly string[] = BOW;
