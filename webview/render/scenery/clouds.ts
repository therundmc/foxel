import { gradient, px, ramp, seeded, type VistaPainter, type VistaView } from './paint';
import { paintLookout, paintLookoutFront, type LookoutTones } from './lookout';
import { between, CLOUD_TONES, CloudSheet, hazed, HEART_HALF, heartLobes, puffball, sunk, swell, thunderhead, type Puff, type Tones } from './clouds-cumulus';
import { paintLand, type Land } from './clouds-land';
import { drawBirds, drawMist, type Flyway } from './clouds-life';
import { rgb } from './clouds-pixels';

// A summer afternoon the way an animated film paints it: a deep clear blue paling toward the horizon and, far
// beyond the rise the fox looks out from, the great peak with a thunderhead towering behind its shoulder.
//
// What comes when (seconds):
//   0      the lookout, the far land, the great cloud already there but low behind the mountains
//   0-26   it rises and builds up lobe by lobe, and never quite stops
//   moment a few birds rise from the hills and cross toward the great cloud; where they passed, a small
//          cloud rolls itself into a heart, which lingers and slowly loosens.

const SKY = [[0, '#2a67cc'], [0.42, '#4a94e5'], [0.78, '#8dc8f3'], [1, '#d6eef7']] as const;
const HORIZON = '#d6eef7';
/** A short view shows only the paler foot of the sky: it is painted as if it were at least this high. */
const SKY_SPAN_MIN = 58;
const AIR = rgb('#cfe6f6');
/** How much the small far clouds melt into the sky. */
const FLOATER_HAZE = 0.3;
const HEART_TONES: Tones = { lit: rgb('#fff1f4'), soft: rgb('#fbd6e0'), shade: rgb('#f0b8cb'), deep: rgb('#e0a2be') };
/**
 * Clouds are shaded again this many times a second: they move like something drawn by hand. The great ones
 * change so slowly, and cost so much more, that twice is plenty; the heart rolls itself up faster.
 */
const STEPS_PER_S = 2;
const HEART_STEPS_PER_S = 6;
/** The wind hardly carries the great clouds. */
const DRIFT = 0.08;
/** The great cloud is this much of its height lower at first, and takes this long to come up. */
const RISE = 0.3;
const RISE_S = [-10, 26] as const;
/**
 * The great cloud stands past the peak: about this many times wider than the room left there, its middle this
 * much of its width beyond the summit, so that its tower rises behind the far shoulder and leaves the summit
 * its blue sky. It is about this many times taller than wide at most.
 */
const GREAT_WIDE = 1.2;
const GREAT_ASIDE = 0.4;
const GREAT_TALL = 1.3;
/**
 * With less room than this past the peak, it stands on the fox's side of it instead: further from the summit,
 * since its sunny flank now turns toward it, and slimmer, a tower in the tall sky of a narrow view.
 */
const GREAT_ROOM = 34;
const GREAT_BEFORE = 0.62;
const GREAT_TALL_BEFORE = 1.5;
/** The lookout in the full light of the afternoon, with a few flowers in its grass. */
const LOOKOUT: LookoutTones = {
  body: '#4ba648',
  rim: '#8fd557',
  deep: '#3a8c4b',
  blades: ['#3f9447', '#62b84e'],
  front: ['#8fd557', '#6cc050'],
  flowers: ['#ffffff', '#ffe36b', '#ff9fc6', '#ffffff'],
};
/** The heart cloud: when the fox's great moment comes, it is about this far from it, on the side it looks to. */
const HEART_DRIFT = 0.3;
const HEART_CLEAR = 14;
const MOMENT_AROUND_S = 25;
const HEART_SHAPED_S = [1.6, 4.8] as const;
const HEART_LOOSENS_S = [15, 27] as const;
const HEART_LOOSE = 0.5;
/** How pink it turns while it is a heart: a blush, no more. */
const HEART_BLUSH = 0.6;

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
  readonly way: Flyway;
}

function buildTower(seed: number, x: number, baseY: number, width: number, height: number, dir: number, haze: number): Tower {
  const puffs = thunderhead(seed, width, height, dir);
  const left = Math.min(...puffs.map((p) => p.x - p.r));
  const right = Math.max(...puffs.map((p) => p.x + p.r));
  const top = Math.max(...puffs.map((p) => p.y + p.r));
  const sheet = new CloudSheet(Math.ceil(right - left) + 4, Math.ceil(top) + 4);
  return { puffs, sheet, tones: hazed(CLOUD_TONES, AIR, haze), x, baseY, ox: 2 - left, oy: sheet.h - 1, height };
}

function buildFloater(seed: number, width: number): HTMLCanvasElement {
  const puffs = puffball(seed, width);
  const top = Math.ceil(Math.max(...puffs.map((p) => p.y + p.r)));
  const sheet = new CloudSheet(Math.ceil(width) + 8, top + 2);
  sheet.begin();
  puffs.forEach((p) => sheet.add(sheet.w / 2 + p.x, top + 1 - p.y, p.r, p.z, 1));
  sheet.develop(hazed(CLOUD_TONES, AIR, FLOATER_HAZE), top + 1);
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

  // The great cloud rises behind a shoulder of the peak, beside its summit and never behind it; a lesser one,
  // paler with distance, keeps it company on the other side of the fox.
  const towers: Tower[] = [];
  const past = dir > 0 ? w - land.peak.x : land.peak.x;
  const beyond = past >= GREAT_ROOM;
  const mainW = Math.min(150, Math.max(56, (beyond ? past : room) * GREAT_WIDE));
  const tall = Math.min(base - 3, mainW * (beyond ? GREAT_TALL : GREAT_TALL_BEFORE));
  const mainX = land.peak.x + dir * mainW * (beyond ? GREAT_ASIDE : -GREAT_BEFORE);
  if (behind > 56) {
    towers.push(buildTower(0xb1, foxX - dir * Math.max(48, behind * 0.72), base, Math.min(90, behind * 0.8), tall * 0.45, dir, 0.3));
  }
  towers.push(buildTower(0xb3, mainX, base, mainW, tall, dir, 0.03));

  // Two or three small far clouds, to give the great one its scale. They drift past above the summit, or under
  // its snow where the view is too low for that: white behind white would blunt it.
  const floaters: Floater[] = [];
  const count = Math.min(3, Math.max(1, Math.round(w / 130)));
  for (let n = 0; n < count; n++) {
    const canvas = buildFloater(0x70 + n, Math.min(sky * 0.5, 9 + 7 * random()));
    const over = land.summitY - canvas.height - 2;
    floaters.push({
      canvas,
      x: ((n + random()) / count) * (w + 80),
      y: Math.round(over >= 1 ? over * (0.4 + 0.6 * random()) : land.summitY + land.peak.tall * 0.5),
      speed: 0.25 + 0.2 * random(),
    });
  }

  const heartX = foxX + dir * heartOff;
  // Where the great cloud leaves sky above its head, the heart forms there rather than lost against its white.
  const above = base - tall - HEART_CLEAR;
  const heartY = Math.round(above >= 9 && Math.abs(heartX - mainX) < mainW * 0.4 ? above : Math.max(9, Math.min(sky - 15, h * 0.3 - 4)));
  return {
    key,
    land,
    towers,
    floaters,
    heart: { sheet: new CloudSheet(HEART_HALF * 2 + 2, 20), x: heartX, y: heartY },
    way: {
      from: [foxX - dir * 16, land.footY + 3],
      over: [heartX - dir * 2, Math.max(3, heartY - 11)],
      to: [mainX + dir * mainW * 0.1, base - tall * 0.55],
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
  const horizon = land.footY;
  gradient(view, horizon - Math.max(horizon, SKY_SPAN_MIN), horizon, SKY);
  px(view.ctx, 0, horizon, HORIZON, 1, view.w, view.h - horizon);
}

function drawTower(view: VistaView, cloud: Tower): void {
  const { ctx, t, dir } = view;
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
  const rise = (1 - ramp(t, RISE_S[0], RISE_S[1])) * cloud.height * RISE;
  ctx.drawImage(sheet.canvas, Math.round(cloud.x + dir * DRIFT * t - cloud.ox), Math.round(cloud.baseY + rise) - cloud.oy);
}

function drawFloaters(view: VistaView, floaters: readonly Floater[]): void {
  const { ctx, w, t, dir } = view;
  const span = w + 80;
  for (const cloud of floaters) {
    const along = (((cloud.x + cloud.speed * t) % span) + span) % span;
    const x = dir > 0 ? along - 40 : w + 40 - along;
    ctx.drawImage(cloud.canvas, Math.round(x - cloud.canvas.width / 2), cloud.y);
  }
}

/** The small cloud that rolls itself into a heart where the birds have passed. */
function drawHeart(view: VistaView, heart: Scene['heart']): void {
  const { ctx, t, dir, moment } = view;
  const m = moment ?? 0;
  const shaped = ramp(m, HEART_SHAPED_S[0], HEART_SHAPED_S[1]) - HEART_LOOSE * ramp(m, HEART_LOOSENS_S[0], HEART_LOOSENS_S[1]);
  const step = Math.floor(t * HEART_STEPS_PER_S);
  const { sheet } = heart;
  const middle = 9;
  if (sheet.key !== `${step}`) {
    sheet.begin();
    for (const [x, y, r, z] of heartLobes(shaped, step / HEART_STEPS_PER_S)) {
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
    const { land, towers, floaters, heart, way } = sceneOf(view);
    drawSky(view, land);
    drawFloaters(view, floaters);
    towers.forEach((cloud) => drawTower(view, cloud));
    // The air thickens toward the horizon: the foot of the clouds melts into it, and the mountains stand out.
    gradient(view, land.skyline - 22 * land.k, land.footY + 2, [[0, 'rgba(222, 240, 248, 0)'], [0.45, 'rgba(222, 240, 248, 0.55)'], [1, 'rgba(222, 240, 248, 0.85)']]);
    ctx.drawImage(land.far, 0, 0);
    drawMist(view, land);
    drawHeart(view, heart);
    drawBirds(view, way);
    ctx.drawImage(land.near, 0, 0);
    paintLookout(view, LOOKOUT);
  },
  front(view) {
    paintLookoutFront(view, LOOKOUT);
  },
};
