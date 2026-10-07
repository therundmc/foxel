import { gradient, px, ramp, seeded, type VistaPainter, type VistaView } from './paint';
import { between, CLOUD_TONES, CloudSheet, hazed, HEART_HALF, heartLobes, puffball, sunk, swell, tower, type Puff, type Tones } from './clouds-cumulus';
import { paintLand, type Land } from './clouds-land';
import { drawBirds, drawDrift, drawMeadow, drawMist, drawShadows, plantMeadow, type Flyway, type Tuft } from './clouds-life';
import { rgb } from './clouds-pixels';

// A summer afternoon the way an animated film paints it: a deep clear blue paling toward the horizon, great
// cumulus towers building up behind ranges of blue mountains, green hills, and a meadow in the wind.
//
// What comes when (seconds):
//   0      the land, a sky with a few small clouds, the towers still low behind the mountains
//   0-35   the towers build up lobe by lobe and never quite stop; small clouds drift across; shadows slide in
//   9-19   the wind picks up in the grass; from 13 dandelion seeds lift off the meadow
//   moment a flight of birds rises from the hills and crosses toward the great cloud; where they passed, a
//          small cloud rolls itself into a heart, which lingers and slowly loosens; two birds stay and wheel,
//          petals drift by, and the light is a little warmer than before.

const SKY = [[0, '#2a67cc'], [0.42, '#4a94e5'], [0.78, '#8dc8f3'], [1, '#d6eef7']] as const;
const HORIZON = '#d6eef7';
/** A short view shows only the paler foot of the sky: it is painted as if it were at least this high. */
const SKY_SPAN_MIN = 58;
const AIR = rgb('#cfe6f6');
const HEART_TONES: Tones = { warm: rgb('#fff6ec'), lit: rgb('#fff1f4'), soft: rgb('#fbd6e0'), shade: rgb('#f0b8cb'), deep: rgb('#e0a2be') };
/** Clouds are shaded again this many times a second: they move like something drawn by hand. */
const STEPS_PER_S = 8;
/** The towers hardly move; they come up from behind the mountains at first. */
const TOWER_DRIFT = 0.1;
const TOWER_RISE = 0.2;
const TOWER_RISEN_S = 20;
const TOWER_SLENDER = 2.5;
/** With this much room beside the fox, the tower leaves the heart its own patch of sky. */
const ROOMY = 110;
/** The heart cloud: when the fox's great moment comes, it is about this far from it, on the side it looks to. */
const HEART_DRIFT = 0.3;
const MOMENT_AROUND_S = 25;
const HEART_SHAPED_S = [1.6, 4.8] as const;
const HEART_LOOSENS_S = [15, 27] as const;
const HEART_LOOSE = 0.5;
/** How pink it turns while it is a heart. */
const HEART_BLUSH = 0.8;

interface Tower {
  readonly puffs: readonly Puff[];
  readonly sheet: CloudSheet;
  readonly tones: Tones;
  /** Its middle and the row of its base on the view, and the same point on its sheet. */
  readonly x: number;
  readonly baseY: number;
  readonly ox: number;
  readonly oy: number;
  readonly height: number;
}

interface Floater {
  readonly canvas: HTMLCanvasElement;
  readonly x: number;
  readonly y: number;
  readonly speed: number;
}

interface Scene {
  readonly key: string;
  readonly land: Land;
  readonly towers: readonly Tower[];
  readonly floaters: readonly Floater[];
  readonly heart: { readonly sheet: CloudSheet; readonly x: number; readonly y: number };
  readonly tufts: readonly Tuft[];
  readonly way: Flyway;
}

function buildTower(seed: number, x: number, baseY: number, width: number, height: number, dir: number, haze: number): Tower {
  const puffs = tower(seed, width, height, dir);
  const left = Math.min(...puffs.map((p) => p.x - p.r));
  const right = Math.max(...puffs.map((p) => p.x + p.r));
  const top = Math.max(...puffs.map((p) => p.y + p.r));
  const sheet = new CloudSheet(Math.ceil(right - left) + 4, Math.ceil(top) + 4);
  return { puffs, sheet, tones: hazed(CLOUD_TONES, AIR, haze), x, baseY, ox: 2 - left, oy: sheet.h - 1, height };
}

function buildFloater(seed: number, width: number, haze: number): HTMLCanvasElement {
  const puffs = puffball(seed, width);
  const top = Math.ceil(Math.max(...puffs.map((p) => p.y + p.r)));
  const sheet = new CloudSheet(Math.ceil(width) + 8, top + 2);
  sheet.begin();
  puffs.forEach((p) => sheet.add(sheet.w / 2 + p.x, top + 1 - p.y, p.r, p.z, 1));
  sheet.develop(hazed(CLOUD_TONES, AIR, haze), top + 1);
  return sheet.canvas;
}

function build(key: string, w: number, h: number, foxX: number, dir: 1 | -1): Scene {
  const land = paintLand(w, h, foxX, dir);
  const random = seeded(0xc0ffee + w + h * 7);
  const room = dir > 0 ? w - foxX : foxX;
  const behind = w - room;
  const sky = land.skyline;
  const base = land.footY + 2;
  const heartOff = Math.min(44, Math.max(28, room * 0.3));

  // The great tower stands on the side the fox looks to, past the place of the heart if there is room;
  // lesser heaps keep it company. It reaches for the top of the view, but stays a tower: taller than wide.
  const towers: Tower[] = [];
  const mainW = Math.min(110, room * 0.72, Math.max(30, (base - 3) * 1.3));
  const tall = Math.min(base - 3, mainW * TOWER_SLENDER);
  const mainX = foxX + dir * Math.min(room - mainW * 0.4, Math.max(room > ROOMY ? heartOff + 13 + mainW / 2 : 0, room * 0.6));
  if (behind > 56) {
    towers.push(buildTower(0xb1, foxX - dir * Math.max(48, behind * 0.72), base, Math.min(76, behind * 0.7), tall * 0.45, dir, 0.3));
  }
  if (room > 250) {
    towers.push(buildTower(0xb2, foxX + dir * (room - 10), base, Math.min(90, tall * 1.3), tall * 0.6, dir, 0.22));
  }
  towers.push(buildTower(0xb3, mainX, base, mainW, tall, dir, 0.03));

  // Small fair-weather clouds: the higher in the view, the nearer, so the bigger and the faster.
  const floaters: Floater[] = [];
  const count = Math.min(9, Math.max(1, Math.round((w * sky) / 3200)));
  for (let n = 0; n < count; n++) {
    const high = random();
    const width = Math.min(sky * 0.9, 9 + 17 * high + 4 * random());
    floaters.push({
      canvas: buildFloater(0x70 + n, width, 0.28 * (1 - high)),
      x: ((n + random()) / count) * (w + 80),
      y: Math.round(2 + (1 - high) * sky * 0.55),
      speed: 0.35 + 0.9 * high,
    });
  }

  const heartX = foxX + dir * heartOff;
  const heartY = Math.round(Math.max(9, Math.min(sky - 15, h * 0.3 - 4)));
  const column = Math.min(w - 1, Math.max(0, Math.round(foxX - dir * 16)));
  const main = towers[towers.length - 1];
  return {
    key,
    land,
    towers,
    floaters,
    heart: { sheet: new CloudSheet(HEART_HALF * 2 + 2, 20), x: heartX, y: heartY },
    tufts: plantMeadow(land, w, h, foxX),
    way: {
      from: [column, land.ridge[column] + 3],
      over: [heartX - dir * 2, Math.max(3, heartY - 11)],
      to: [mainX + dir * mainW * 0.1, main.baseY - tall * 0.55],
      wheel: [(heartX + mainX) / 2, Math.max(4, Math.min(heartY - 10, sky * 0.35))],
    },
  };
}

// The last scene painted is kept: it only depends on the size of the view and on where the fox sits.
let scene: Scene | undefined;

function sceneOf({ w, h, foxX, dir }: VistaView): Scene {
  const key = `${w}x${h}:${Math.round(foxX)}:${dir}`;
  if (scene?.key !== key) {
    scene = build(key, w, h, Math.round(foxX), dir);
  }
  return scene;
}

function drawSky(view: VistaView, land: Land): void {
  const { ctx, w, h, t, dir, moment } = view;
  const horizon = land.footY;
  gradient(view, horizon - Math.max(horizon, SKY_SPAN_MIN), horizon, SKY);
  px(ctx, 0, horizon, HORIZON, 1, w, h - horizon);
  // The sun is out of the picture, high on the side the fox looks to: its glow comes down from that corner.
  const warmth = moment === undefined ? 0 : ramp(moment, 2, 12);
  const reach = Math.min(150, Math.max(50, horizon * 0.8 + 30)) * (0.85 + 0.15 * ramp(t, 0, 12) + 0.12 * warmth);
  const cx = dir > 0 ? w + 4 : -4;
  const glow = ctx.createRadialGradient(cx, -6, 0, cx, -6, reach);
  glow.addColorStop(0, `rgba(244, 250, 255, ${0.5 + 0.1 * warmth})`);
  glow.addColorStop(0.4, `rgba(236, 247, 255, ${0.2 + 0.08 * warmth})`);
  glow.addColorStop(1, 'rgba(236, 247, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

function drawTower({ ctx, t, dir }: VistaView, cloud: Tower): void {
  const step = Math.floor(t * STEPS_PER_S);
  const { sheet } = cloud;
  if (sheet.key !== `${step}`) {
    const at = step / STEPS_PER_S;
    sheet.begin();
    for (const p of cloud.puffs) {
      const size = swell(p, at);
      if (size > 0) {
        const [dx, dy] = sunk(p, at);
        sheet.add(cloud.ox + p.x + dx, cloud.oy - p.y - dy, p.r * size, p.z, dir, p.level);
      }
    }
    sheet.develop(cloud.tones);
    sheet.key = `${step}`;
  }
  const rise = (1 - ramp(t, -8, TOWER_RISEN_S)) * cloud.height * TOWER_RISE;
  ctx.drawImage(sheet.canvas, Math.round(cloud.x + dir * TOWER_DRIFT * t - cloud.ox), Math.round(cloud.baseY + rise) - cloud.oy);
}

function drawFloaters({ ctx, w, t, dir }: VistaView, floaters: readonly Floater[]): void {
  const span = w + 80;
  for (const cloud of floaters) {
    const along = (((cloud.x + cloud.speed * t) % span) + span) % span;
    const x = dir > 0 ? along - 40 : w + 40 - along;
    ctx.drawImage(cloud.canvas, Math.round(x - cloud.canvas.width / 2), cloud.y);
  }
}

/** The small cloud that rolls itself into a heart where the birds have passed. */
function drawHeart({ ctx, t, dir, moment }: VistaView, heart: Scene['heart']): void {
  const m = moment ?? 0;
  const shaped = ramp(m, HEART_SHAPED_S[0], HEART_SHAPED_S[1]) - HEART_LOOSE * ramp(m, HEART_LOOSENS_S[0], HEART_LOOSENS_S[1]);
  const step = Math.floor(t * STEPS_PER_S);
  const { sheet } = heart;
  const middle = 9;
  if (sheet.key !== `${step}`) {
    sheet.begin();
    for (const [x, y, r, z] of heartLobes(shaped, step / STEPS_PER_S)) {
      sheet.add(sheet.w / 2 + x, middle - y, r, z, dir);
    }
    // The flat base of the plain cloud gives way as the heart grows its point.
    sheet.develop(between(CLOUD_TONES, HEART_TONES, shaped * HEART_BLUSH), Math.round(middle + 6 + shaped * 6));
    sheet.key = `${step}`;
  }
  ctx.drawImage(sheet.canvas, Math.round(heart.x + dir * HEART_DRIFT * (t - MOMENT_AROUND_S) - sheet.w / 2), heart.y - middle);
}

export const clouds: VistaPainter = {
  back(view) {
    const { ctx } = view;
    const { land, towers, floaters, heart, tufts, way } = sceneOf(view);
    drawSky(view, land);
    drawBirds(view, way, true);
    towers.forEach((cloud) => drawTower(view, cloud));
    // The air thickens toward the horizon: the foot of the clouds melts into it.
    gradient(view, land.skyline - 16 * land.k, land.footY + 2, [[0, 'rgba(222, 240, 248, 0)'], [1, 'rgba(222, 240, 248, 0.7)']]);
    ctx.drawImage(land.far, 0, 0);
    drawMist(view, land);
    drawFloaters(view, floaters);
    drawHeart(view, heart);
    drawBirds(view, way, false);
    ctx.drawImage(land.near, 0, 0);
    drawShadows(view, land);
    drawMeadow(view, tufts);
  },
  front(view) {
    drawDrift(view, sceneOf(view).land);
  },
};
