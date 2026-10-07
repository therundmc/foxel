import { clamp01, gradient, mix, parallax, prerender, px, ramp, seeded, type VistaView } from './paint';
import { FLASH_RGB, glow, type Flash } from './rain-light';
import { hash, type Plan } from './rain-plan';

// The storm sky: a few great towering clouds with flat dark bases, the break they leave on the side the fox
// looks to, and the grey curtains of rain hanging under them.

type Tones = readonly [rim: string, light: string, body: string, shade: string, base: string];
const STORM: Tones = ['#a3a9c6', '#7f87a9', '#626a8f', '#4c5279', '#3b3f63'];
const WASHED: Tones = ['#fffaf0', '#efe6e6', '#cfcadf', '#aeb0d0', '#9095bd'];
const LIT: Tones = ['#ffffff', '#f3eeff', '#e2dbfb', '#cbc6f2', '#b3b0e6'];
/** Sky colours from top to hills: before the storm, under it, and washed. */
const SKY_EARLY = ['#66728f', '#8d98b0', '#b9bfcc'] as const;
const SKY_STORM = ['#2d3352', '#4a5275', '#8a90aa'] as const;
const SKY_WASHED = ['#5b93cc', '#a4cde8', '#f4e6cc'] as const;
const VEIL = '#bcc3d6';

interface Shape {
  /** Where it is on the sheet, its width, and how high it towers: not all of them reach the top. */
  readonly x: number;
  readonly w: number;
  readonly tall: number;
}
interface Sheet {
  readonly size: number;
  readonly shapes: readonly Shape[];
  /** The same clouds under the storm, in the washed light, and lit from inside by a flash. */
  readonly storm: HTMLCanvasElement;
  readonly washed: HTMLCanvasElement;
  readonly lit: HTMLCanvasElement;
}
const SHAPES = 4;
const sheets = new Map<number, Sheet>();

// One cumulonimbus `size` tall, its base on row `bottom`: a row of small billows for the flat base, then bigger
// ones piled up into a tower. It is lit from above and darkens toward its base; each billow of the tower only
// adds a paler crown and a crease under it.
function drawCloud(inks: readonly CanvasRenderingContext2D[], left: number, bottom: number, w: number, size: number, random: () => number): void {
  const lumps: { x: number; y: number; r: number }[] = [];
  const along = Math.round(w / (size * 0.3));
  for (let i = 0; i <= along; i++) {
    const r = size * (0.13 + 0.07 * random());
    lumps.push({ x: r + ((w - 2 * r) * i) / along, y: size - r * 0.7, r });
  }
  const tower = lumps.length;
  const core = w * (0.4 + 0.2 * random());
  for (let level = 1; level <= 3; level++) {
    for (let i = level; i <= 3; i++) {
      const r = size * (0.2 + 0.03 * level + 0.08 * random());
      const aside = level === 3 ? 0 : ((i - level) / (3 - level)) * 2 - 1;
      const x = core + aside * w * (0.36 - 0.12 * level) + (random() - 0.5) * size * 0.12;
      lumps.push({ x, y: Math.max(r, size * (0.84 - 0.2 * level + 0.06 * random())), r });
    }
  }
  for (let x = 0; x < w; x++) {
    let top = -1;
    for (let y = 0; y < size; y++) {
      let inside = false;
      let crown = 0.5;
      lumps.forEach((lump, i) => {
        const dx = x + 0.5 - lump.x;
        const dy = y + 0.5 - lump.y;
        if (dx * dx + dy * dy < lump.r * lump.r) {
          inside = true;
          crown = i < tower ? crown : Math.min(crown === 0.5 ? 1 : crown, (dy + lump.r) / (2 * lump.r));
        }
      });
      if (!inside) {
        continue;
      }
      top = top < 0 ? y : top;
      const dark = Math.max(((y - top) / size) * 1.7, (y / size - 0.45) * 1.6, y >= size - 2 ? 1 : 0);
      let tone = dark < 0.14 ? 0 : dark < 0.38 ? 1 : dark < 0.6 ? 2 : dark < 0.82 ? 3 : 4;
      tone += tone > 1 && crown < 0.2 ? -1 : tone > 0 && tone < 3 && crown > 0.85 ? 1 : 0;
      const row = bottom - size + y;
      px(inks[0], left + x, row, STORM[tone]);
      px(inks[1], left + x, row, WASHED[tone]);
      // A flash glows from the heart of the cloud and leaves its edges dark.
      px(inks[2], left + x, row, LIT[tone], 1 - Math.hypot(x - core, (y - size * 0.62) * 1.2) / (w * 0.55));
    }
  }
}

function sheetOf(size: number): Sheet {
  let sheet = sheets.get(size);
  if (!sheet) {
    if (sheets.size > 6) {
      sheets.clear();
    }
    const random = seeded(0xc10d + size);
    let x = 0;
    const shapes = Array.from({ length: SHAPES }, (_, i) => {
      const shape = { x, w: Math.round(size * (1.4 + random())), tall: Math.round(size * (i ? 0.66 + 0.34 * random() : 1)) };
      x += shape.w;
      return shape;
    });
    const canvases = [0, 1, 2].map(() => prerender(x, size, () => undefined));
    const inks = canvases.map((canvas) => canvas.getContext('2d') as CanvasRenderingContext2D);
    shapes.forEach((shape) => drawCloud(inks, shape.x, size, shape.w, shape.tall, random));
    sheet = { size, shapes, storm: canvases[0], washed: canvases[1], lit: canvases[2] };
    sheets.set(size, sheet);
  }
  return sheet;
}

export interface Cloud {
  readonly sheet: Sheet;
  readonly shape: Shape;
  readonly left: number;
  readonly top: number;
  readonly alpha: number;
  /** 0 for the lowest row, the farthest; and its place along the row, 0 being the break. */
  readonly row: number;
  readonly slot: number;
}

/** Clouds stand this many times their height apart; rows above are nearer: bigger, and quicker in the wind. */
const SPACING = 2.2;
const ROW_GROWS = 1.3;
const BIGGEST = 72;
const WIND = 0.2;
/** They come to their place slowly, and appear one after the other. */
const ARRIVE_S = 14;
const ARRIVE_FROM = 24;
const APPEAR_S = 6;
/** When the storm leaves, the clouds around the break melt away, the nearest to it first. */
const MELT_S = 3.5;
const MELT_SPREADS = 4.5;

/** How far a row of clouds has slid by now: the far drift of the landscape, the wind, and its coming in. */
function slide(view: VistaView, row: number): number {
  const { t, dir } = view;
  return parallax(view, 0.85) + dir * Math.round(ARRIVE_FROM * (1 - ramp(t, 0, ARRIVE_S)) - WIND * (1 + 0.35 * row) * t);
}

/**
 * Where a row of clouds leaves its break: on the side the fox looks to, never so near that no cloud is left over it.
 */
const breakOf = (view: VistaView, plan: Plan, row: number, size: number): number =>
  view.foxX + view.dir * Math.max(plan.room * 0.62 + 8, size * SPACING * 0.75) + slide(view, row);

/** The clouds of this frame, the ones behind first. */
export function cloudsOf(view: VistaView, plan: Plan): Cloud[] {
  const { w, t, moment, dir } = view;
  const clouds: Cloud[] = [];
  let size = plan.cloudSize;
  let bottom = plan.cloudBase;
  for (let row = 0; ; row++) {
    const sheet = sheetOf(size);
    const pitch = size * SPACING;
    const origin = breakOf(view, plan, row, size);
    const reach = Math.max(pitch * 1.3, plan.room * 0.5);
    const far = Math.ceil((w + Math.abs(origin)) / pitch) + 2;
    for (let slot = -far; slot <= far; slot++) {
      const shape = sheet.shapes[Math.floor(hash(slot, row + 1) * SHAPES)];
      const centre = origin + dir * (slot + (hash(slot, row + 11) - 0.5) * 0.4) * pitch;
      const left = Math.round(centre - shape.w / 2);
      if (slot === 0 || left >= w || left + shape.w <= 0) {
        continue;
      }
      const appears = 0.5 + 6 * hash(slot + 0.5, row);
      let alpha = ramp(t, appears, appears + APPEAR_S);
      const away = Math.abs(centre - origin) / reach;
      if (moment !== undefined && away < 1) {
        alpha *= 1 - ramp(moment, 1 + away * MELT_SPREADS, 1 + away * MELT_SPREADS + MELT_S);
      }
      if (alpha > 0.02) {
        clouds.push({ sheet, shape, left, top: bottom - size, alpha, row, slot });
      }
    }
    const top = bottom - size;
    if (top <= size * 0.35) {
      break;
    }
    size = Math.min(BIGGEST, Math.round(size * ROW_GROWS));
    bottom = top + Math.round(size * 0.3);
  }
  return clouds.reverse();
}

/** The cloud a flash lights up: any far one in sight, or for the last flash the farthest on the side the fox looks to. */
export function struckBy(flash: Flash | undefined, clouds: readonly Cloud[], { w, dir }: VistaView): Cloud | undefined {
  if (!flash) {
    return undefined;
  }
  // Rather one that shows well; in a narrow view, whichever shows at all.
  const within = (margin: number): Cloud[] =>
    clouds.filter((cloud) => {
      const centre = cloud.left + cloud.shape.w / 2;
      return cloud.row === 0 && cloud.alpha > 0.6 && centre > margin && centre < w - margin;
    });
  const inSight = within(24).length ? within(24) : within(0);
  if (flash.last) {
    return inSight.reduce<Cloud | undefined>((best, cloud) => (best && dir * best.left > dir * cloud.left ? best : cloud), undefined);
  }
  return inSight[Math.floor(hash(flash.seed, 3) * inSight.length)];
}

/** The whole sky: its colours, the break and its light, the clouds, and the one a flash lights from inside. */
export function paintSky(view: VistaView, plan: Plan, clouds: readonly Cloud[], flash: Flash | undefined, struck: Cloud | undefined): void {
  const { ctx, moment } = view;
  const stops = SKY_STORM.map((storm, i) =>
    plan.fresh > 0 ? mix(storm, SKY_WASHED[i], plan.fresh) : mix(SKY_EARLY[i], storm, plan.gloom),
  );
  gradient(view, 0, view.h, [[0, stops[0]], [0.6 * (plan.base / view.h), stops[1]], [plan.base / view.h, stops[2]], [1, stops[2]]]);
  // Paler sky where the clouds part; once the storm leaves, the light comes through there.
  const open = moment === undefined ? 0 : ramp(moment, 0.5, 8);
  const x = breakOf(view, plan, 0, plan.cloudSize);
  const y = plan.cloudBase - plan.cloudSize * 0.55;
  const wide = Math.max(30, plan.cloudSize * 2) * (1 + 0.5 * open);
  const tall = Math.max(12, plan.cloudBase * 0.9);
  glow(ctx, x, y, wide, tall, '214,220,238', 0.3 * plan.gloom * (1 - open));
  glow(ctx, x, y, wide, tall * (1 + 0.4 * open), '255,246,214', 0.92 * open);
  if (flash && struck) {
    const { shape, sheet } = struck;
    glow(ctx, struck.left + shape.w / 2, struck.top + sheet.size - shape.tall * 0.4, shape.w * 0.9, shape.tall * 0.9, FLASH_RGB, 0.35 * flash.glow);
  }
  // Before the storm has gathered, and after it, the clouds are paler.
  const pale = Math.max(plan.fresh, 0.5 * (1 - plan.gloom));
  for (const cloud of clouds) {
    const { sheet, shape, left, top } = cloud;
    const draw = (image: HTMLCanvasElement, alpha: number): void => {
      if (alpha > 0.01) {
        ctx.globalAlpha = clamp01(alpha);
        ctx.drawImage(image, shape.x, 0, shape.w, sheet.size, left, top, shape.w, sheet.size);
      }
    };
    draw(sheet.storm, cloud.alpha);
    draw(sheet.washed, cloud.alpha * pale);
    draw(sheet.lit, cloud === struck && flash ? flash.glow : 0);
  }
  ctx.globalAlpha = 1;
}

/** Grey curtains of rain under the far clouds, leaning with the wind, down to row `to` among the hills. */
export function paintCurtains({ ctx, t, moment }: VistaView, plan: Plan, clouds: readonly Cloud[], to: number): void {
  const falling = ramp(t, 6, 15) * (moment === undefined ? 1 : 1 - ramp(moment, 1, 8));
  const from = plan.cloudBase - 1;
  const part = Math.ceil((to - from) / 3);
  ctx.fillStyle = VEIL;
  for (const cloud of clouds) {
    if (cloud.row > 0 || falling <= 0 || hash(cloud.slot, 7) > 0.7) {
      continue;
    }
    const wide = Math.round(cloud.shape.w * 0.6);
    const strength = 0.3 * falling * cloud.alpha;
    for (let k = 0; k < 3; k++) {
      // A soft grey body, fainter toward the hills, and a few strands of thicker rain in it.
      const x = Math.round(cloud.left + cloud.shape.w * 0.2 + plan.wind * 1.6 * part * k);
      ctx.globalAlpha = strength * (0.6 - 0.12 * k);
      ctx.fillRect(x, from + part * k, wide, part);
      for (let i = 1; i < wide - 1; i += 3) {
        ctx.globalAlpha = strength * hash(i, cloud.slot) * 0.6;
        ctx.fillRect(x + i, from + part * k, 1, part);
      }
    }
  }
  ctx.globalAlpha = 1;
}
