import { paintLookout, paintLookoutFront, type LookoutTones } from './lookout';
import { gradient, mix, px, ramp, seeded, type VistaPainter, type VistaView } from './paint';
import { winterLand, type WinterLand } from './snow-land';

// A winter night in the far north. Snow falls softly on a white valley, a frozen lake, and a red cabin with lit
// windows. At the great moment the snow thins, the sky clears, and the northern lights unfold over the mountains, from the fox's shoulder
// toward the side it looks to; they go on dancing to the end, the lake giving them back.
//   0 s   the night, the snow already falling, thicker until 10 s; smoke from the cabin
//  18 s   a faint green glow behind the mountains
//  moment the first curtain of light unfurls (5 s), the snow thins, the stars come out (2 to 9 s), a second curtain (4 s on)

/** The sky from the top down: under the snow clouds, and once it has cleared. */
const SKY_SNOWY = ['#141a33', '#1f2b4d', '#2e3f66'] as const;
const SKY_CLEAR = ['#060a1e', '#0f1f48', '#1e3a64'] as const;
const STAR = '#eef4ff';
const FLAKE = '#f6f9ff';
const WINDOW = ['#ffcf70', '#ffb84a'] as const;
const SMOKE = '#aeb9d2';
/** The lights from their bright lower edge up: colour, how much of the curtain's height, how strong. */
const CURTAIN = [
  ['#d4ffe0', 0.06, 0.95],
  ['#5ef2a4', 0.26, 0.62],
  ['#39d3b8', 0.3, 0.34],
  ['#8b6ef0', 0.38, 0.2],
] as const;
const GLOW = '#5ef2a4';
/** Two curtains: how high above the mountains each hangs and how tall it is (shares of the sky), its pace, and when it comes. */
const CURTAINS = [
  { lift: 0.08, tall: 0.62, pace: 1, after: 0 },
  { lift: 0.5, tall: 0.4, pace: 0.7, after: 4 },
] as const;
/** The lights are painted in strips this wide: they are made of rays. */
const RAY = 2;
const UNFURLS_S = 5;

const SNOWY: LookoutTones = { body: '#cfdcf0', rim: '#f4f8ff', deep: '#9fb2d4', blades: ['#8d93a6', '#a79c86'], front: ['#7e8598', '#b9c7e2'] };
const LIT: LookoutTones = { body: '#c9e6e6', rim: '#f0fff6', deep: '#93b8c4', blades: ['#86978f', '#a4a488'], front: ['#788c8c', '#b4d8d4'] };

const hash = (a: number, b: number): number => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** How much of the snow is falling at `time`: it thickens at first and thins to a few flakes once the sky clears. */
function snowAt(time: number, clearAt: number | undefined): number {
  const falling = 0.45 + 0.55 * ramp(time, 0, 10);
  return clearAt === undefined || time < clearAt ? falling : falling * (1 - 0.82 * ramp(time - clearAt, 0, 7));
}

/** How bright the lights are overall: nothing before the moment, then they breathe. */
const lightsOn = ({ t, moment }: VistaView): number => (moment === undefined ? 0 : ramp(moment, 0, 3) * (0.8 + 0.2 * Math.sin(t * 0.45)));

function lookoutTones(view: VistaView): LookoutTones {
  const lit = 0.6 * lightsOn(view);
  const pair = (a: readonly [string, string], b: readonly [string, string]): [string, string] => [mix(a[0], b[0], lit), mix(a[1], b[1], lit)];
  return { body: mix(SNOWY.body, LIT.body, lit), rim: mix(SNOWY.rim, LIT.rim, lit), deep: mix(SNOWY.deep, LIT.deep, lit), blades: pair(SNOWY.blades, LIT.blades), front: pair(SNOWY.front, LIT.front) };
}

let sprinkled: { key: string; stars: Float32Array } | undefined;

function paintStars({ ctx, w, t, moment }: VistaView, skyline: number): void {
  const out = moment === undefined ? 0 : ramp(moment, 2, 9);
  if (out <= 0) {
    return;
  }
  const key = `${w}:${skyline}`;
  if (sprinkled?.key !== key) {
    const random = seeded(0x57a9);
    const stars = new Float32Array(Math.round((w * Math.max(4, skyline)) / 260) * 4);
    for (let i = 0; i < stars.length; i += 4) {
      stars.set([Math.floor(random() * w), Math.floor(random() ** 1.3 * Math.max(4, skyline)), 0.35 + 0.65 * random(), random() * 6.3], i);
    }
    sprinkled = { key, stars };
  }
  const { stars } = sprinkled;
  ctx.fillStyle = STAR;
  for (let i = 0; i < stars.length; i += 4) {
    ctx.globalAlpha = out * stars[i + 2] * (0.7 + 0.3 * Math.sin(t * (0.6 + stars[i + 2]) + stars[i + 3]));
    ctx.fillRect(stars[i], stars[i + 1], 1, 1);
  }
  ctx.globalAlpha = 1;
}

/** Scratch for one curtain: for each ray, its foot, its height and its strength. Worked out once, then painted colour by colour. */
let rays = new Float32Array(0);

// The lights: for each ray, a bright foot on a slowly folding line, and colours fading upward.
function paintLights(view: VistaView, land: WinterLand): void {
  const { ctx, w, t, moment, foxX, dir } = view;
  const on = lightsOn(view);
  if (moment === undefined || on <= 0) {
    // Before them, only a hint: a faint green glow low behind the mountains.
    gradient(view, land.skyline - 6, land.lakeTop, [[0, 'rgba(94,242,164,0)'], [1, GLOW]], 0.1 * ramp(view.t, 18, 24));
    return;
  }
  const sky = Math.max(10, land.skyline);
  const from = foxX - dir * 24;
  const count = Math.ceil(w / RAY);
  if (rays.length < count * 3) {
    rays = new Float32Array(count * 3);
  }
  CURTAINS.forEach((curtain, c) => {
    const since = moment - curtain.after;
    if (since <= 0) {
      return;
    }
    for (let i = 0; i < count; i++) {
      const x = i * RAY;
      // It unfurls from behind the fox toward the side it looks to, and more slowly the other way.
      const ahead = (x - from) * dir;
      const reached = ahead >= 0 ? ramp(since * (w / UNFURLS_S) - ahead, 0, 40) : ramp(since - 2.5 + ahead / 80, 0, 3);
      const shimmer = 0.5 + 0.5 * Math.sin(x * 0.33 + t * 1.6 * curtain.pace + 3 * Math.sin(x * 0.043 + t * 0.21 + c));
      const fold = 0.5 + 0.5 * Math.sin(x * 0.021 * (1 + c * 0.6) + t * 0.17 * curtain.pace + c * 2.1);
      // Every ray has its own length and brightness, which is what makes a curtain of them and not a band.
      const ray = hash(i, c + 7);
      const reach = 0.5 + 0.5 * Math.sin(i * 1.9 + t * 0.7 * curtain.pace + c * 4);
      rays[i * 3] = land.skyline - sky * curtain.lift - sky * 0.16 * Math.sin(x * 0.027 + t * 0.23 * curtain.pace + c * 1.3) - 3 * Math.sin(x * 0.11 + t * 0.5);
      rays[i * 3 + 1] = sky * curtain.tall * (0.3 + 0.7 * fold) * (0.35 + 0.75 * ray * (0.5 + 0.5 * reach) + 0.3 * reach);
      rays[i * 3 + 2] = on * reached * (0.35 + 0.65 * shimmer) * (0.55 + 0.45 * fold) * (0.55 + 0.45 * ray);
    }
    let below = 0;
    for (const [color, share, alpha] of CURTAIN) {
      ctx.fillStyle = color;
      for (let i = 0; i < count; i++) {
        const strength = rays[i * 3 + 2];
        if (strength >= 0.03) {
          const tall = rays[i * 3 + 1];
          const part = Math.max(1, Math.round(tall * share));
          ctx.globalAlpha = Math.min(1, strength * alpha);
          ctx.fillRect(i * RAY, Math.round(rays[i * 3] - tall * below) - part, RAY, part);
        }
      }
      below += share;
    }
  });
  ctx.globalAlpha = 1;
}

function paintCabin({ ctx, t }: VistaView, { cabin }: WinterLand): void {
  if (!cabin) {
    return;
  }
  // The fire inside flickers, and its smoke goes up, a puff after the other, leaning as it rises.
  const glow = WINDOW[Math.floor(t * 3 + Math.sin(t * 7)) % 2 === 0 ? 0 : 1];
  cabin.lights.forEach(([x, y, wide, tall]) => px(ctx, x, y, glow, 1, wide, tall));
  for (let puff = 0; puff < 5; puff++) {
    const age = (t * 0.35 + puff / 5) % 1;
    px(ctx, cabin.chimneyX + age * 5 + Math.sin(age * 5 + puff), cabin.chimneyY - age * 12, SMOKE, 0.5 * (1 - age), age > 0.5 ? 2 : 1, 1);
  }
}

/** One depth of snow: [seed, square pixels for each flake, pixels a second, how far it sways, how much it shows, its size]. */
type Flakes = readonly [seed: number, area: number, speed: number, sway: number, alpha: number, size: number];
const FAR_SNOW: Flakes = [1, 150, 6, 2, 0.5, 1];
const NEAR_SNOW: Flakes = [2, 520, 12, 4, 0.9, 1];
const BIG_SNOW: Flakes = [3, 2400, 15, 6, 0.95, 2];

// Each flake is a little clock: it comes down swaying, then starts again elsewhere. Whether it falls at all is settled
// when it starts, so the snow thickens and thins flake by flake.
function paintSnow({ ctx, w, h, t, moment, dir }: VistaView, [seed, area, speed, sway, alpha, size]: Flakes): void {
  const clearAt = moment === undefined ? undefined : t - moment;
  const count = Math.min(900, Math.ceil((w * h) / area));
  ctx.fillStyle = FLAKE;
  for (let i = 0; i < count; i++) {
    const pace = speed * (0.75 + 0.5 * hash(i, seed));
    const cycle = (h + 4) / pace;
    const at = t + hash(i, seed + 10) * cycle;
    const fall = Math.floor(at / cycle);
    const since = at - fall * cycle;
    if (hash(i + seed * 0.37, fall) >= snowAt(t - since, clearAt)) {
      continue;
    }
    const x = hash(fall, i + seed * 3.1) * (w + 20) - 10 + sway * Math.sin(since * 1.3 + i) + dir * since * 1.5;
    ctx.globalAlpha = alpha * (0.6 + 0.4 * hash(i, seed + 5));
    ctx.fillRect(Math.round(x), Math.round(since * pace - 2), size, size);
  }
  ctx.globalAlpha = 1;
}

export const snow: VistaPainter = {
  back(view) {
    const { ctx, h, moment } = view;
    const land = winterLand(view);
    const clear = moment === undefined ? 0 : ramp(moment, 1, 8);
    gradient(view, 0, h, SKY_SNOWY.map((snowy, i) => [i / 2, mix(snowy, SKY_CLEAR[i], clear)] as const));
    paintStars(view, land.skyline);
    paintLights(view, land);
    ctx.drawImage(land.image, 0, 0);
    paintReflection(view, land);
    paintCabin(view, land);
    paintSnow(view, FAR_SNOW);
    paintLookout(view, lookoutTones(view));
  },
  front(view) {
    paintSnow(view, NEAR_SNOW);
    paintSnow(view, BIG_SNOW);
    paintLookoutFront(view, lookoutTones(view));
  },
};

/** The lake gives the lights back: a soft green sheen that shivers, under where they are brightest. */
function paintReflection(view: VistaView, land: WinterLand): void {
  const { ctx, w, t, moment, foxX, dir } = view;
  const on = lightsOn(view);
  if (moment === undefined || on <= 0) {
    return;
  }
  const deep = land.lakeFoot - land.lakeTop - 1;
  const from = foxX - dir * 24;
  // The whole depth of the water in green, then its far edge in the pale colour of the lights' foot.
  ([[CURTAIN[1][0], 0.34, deep], [CURTAIN[0][0], 0.3, Math.max(1, Math.round(deep * 0.35))]] as const).forEach(([color, alpha, tall]) => {
    ctx.fillStyle = color;
    for (let x = 0; x < w; x += RAY) {
      const ahead = (x - from) * dir;
      const reached = ahead >= 0 ? ramp(moment * (w / UNFURLS_S) - ahead, 0, 40) : ramp(moment - 2.5 + ahead / 80, 0, 3);
      const shimmer = 0.5 + 0.5 * Math.sin(x * 0.33 + t * 1.6 + 3 * Math.sin(x * 0.043 + t * 0.21));
      ctx.globalAlpha = on * reached * (0.3 + 0.7 * shimmer) * alpha;
      ctx.fillRect(x, land.lakeTop + 1, RAY, tall);
    }
  });
  ctx.globalAlpha = 1;
}
