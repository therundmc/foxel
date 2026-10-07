import { paintLookout, paintLookoutFront, type LookoutTones } from './lookout';
import { mix, px, ramp, seeded, type VistaPainter, type VistaView } from './paint';
import { paintTrain } from './train-cars';
import { DRIFT, floodedPlain, type Plain } from './train-land';
import { paintReeds } from './train-reeds';

// A vast plain under a hand's depth of still water, at dusk, and one railway line across it. The water mirrors the
// sky; far out stand a tiny stop and an island with a house. At the great moment a little train with lit windows
// comes in behind the fox's shoulder and crosses the whole view, and the plain is still again.
//   0 s   the dusk, mauve over rose over a band of gold; it deepens slowly to the end; long clouds drift
//  10 s   the first stars, a few more every while
//  13 s   the lamp of the stop flickers and comes on, and glows on the water
//  19 s   a window lights up in the house on the island
//  moment the train crosses (about 12 s), its wake spreading behind it; afterwards more stars, a darker plain

/** The clouds have drifted their whole way by then: longer than any contemplation lasts. */
const DRIFT_S = 75;
const STAR = '#fff6e4';
const GLEAM = '#fff3d0';
const RIPPLE = '#ffeeda';
const WARM = ['#fff0c0', '#ffc46a'] as const;
/** When the lamp of the stop first tries to come on, and when the window of the house is lit. */
const LAMP_AT = 13;
const WINDOW_AT = 19;
/** One star for so many square pixels of sky, and never more than this. */
const STAR_AREA = 300;
const STARS_MOST = 70;
/** One ripple for so many square pixels of water, never more than this, and how faint they are. */
const RIPPLE_AREA = 300;
const RIPPLES_MOST = 60;
const RIPPLE_ALPHA = 0.2;

const DUSK: LookoutTones = { body: '#434c38', rim: '#7d7c4c', deep: '#2e352c', blades: ['#55603a', '#6f7442'], front: ['#868549', '#5c6840'] };
const NIGHTFALL: LookoutTones = { body: '#2c3148', rim: '#515a80', deep: '#20233a', blades: ['#3a4260', '#4b557a'], front: ['#5d6792', '#414a6c'] };

const hash = (a: number, b: number): number => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** How far the dusk has deepened, from 0 to 1: half of it by itself, the rest once the train has gone by. */
const deepening = ({ t, moment }: VistaView): number => 0.5 * ramp(t, 3, 42) + (moment === undefined ? 0 : 0.5 * ramp(moment, 5, 17));

function lookoutTones(deep: number): LookoutTones {
  const pair = (a: readonly [string, string], b: readonly [string, string]): [string, string] => [mix(a[0], b[0], deep), mix(a[1], b[1], deep)];
  return {
    body: mix(DUSK.body, NIGHTFALL.body, deep),
    rim: mix(DUSK.rim, NIGHTFALL.rim, deep),
    deep: mix(DUSK.deep, NIGHTFALL.deep, deep),
    blades: pair(DUSK.blades, NIGHTFALL.blades),
    front: pair(DUSK.front, NIGHTFALL.front),
  };
}

let sprinkled: { plain: Plain; stars: Float32Array } | undefined;

/** The stars of this plain, each [x, y, brightness, phase, when it comes out from 0 to 1]: high in the sky, clear of the clouds. */
function starsOf(plain: Plain, w: number): Float32Array {
  if (sprinkled?.plain !== plain) {
    const random = seeded(0x57a2);
    const high = Math.max(5, Math.round(plain.horizon * 0.62));
    const count = Math.min(STARS_MOST, Math.round((w * high) / STAR_AREA));
    const stars: number[] = [];
    for (let i = 0; i < count; i++) {
      const x = Math.floor(random() * w);
      const y = Math.floor(random() ** 1.5 * high);
      const star = [x, y, 0.45 + 0.55 * random(), random() * 6.3, (i + 0.5) / count];
      if (!plain.clouds.some(([left, top, right, bottom]) => x >= left && x <= right && y >= top && y <= bottom)) {
        stars.push(...star);
      }
    }
    sprinkled = { plain, stars: Float32Array.from(stars) };
  }
  return sprinkled.stars;
}

// They come out one at a time, the first few by themselves and the rest in the dark the train leaves behind; the
// water gives each one back, fainter, where it is not hidden.
function paintStars({ ctx, w, h, t, moment }: VistaView, plain: Plain): void {
  const out = 0.45 * ramp(t, 10, 44) + (moment === undefined ? 0 : 0.55 * ramp(moment, 6, 18));
  const stars = starsOf(plain, w);
  ctx.fillStyle = STAR;
  for (let i = 0; i < stars.length; i += 5) {
    const shown = ramp(out, stars[i + 4] * 0.94, stars[i + 4] * 0.94 + 0.06);
    if (shown > 0) {
      const twinkle = 0.75 + 0.25 * Math.sin(t * (0.5 + stars[i + 2]) + stars[i + 3]);
      ctx.globalAlpha = shown * stars[i + 2] * twinkle;
      ctx.fillRect(stars[i], stars[i + 1], 1, 1);
      const under = 2 * plain.horizon - 1 - stars[i + 1];
      if (under < h) {
        ctx.globalAlpha = 0.3 * shown * stars[i + 2] * (0.6 + 0.4 * Math.sin(t * 1.9 + stars[i + 3]));
        ctx.fillRect(stars[i], under, 1, 1);
      }
    }
  }
  ctx.globalAlpha = 1;
}

// One or two thin lines of light lie on the water near the horizon, broken, creeping very slowly.
function paintGleams({ ctx, w, t }: VistaView, { horizon, rail }: Plain, deep: number): void {
  ctx.fillStyle = GLEAM;
  [[horizon + 1, 0.55, 0.3], [rail + Math.max(3, rail - horizon), 0.4, 1.9]].forEach(([y, strength, seed]) => {
    for (let x = 0; x < w; x += 2) {
      const wave = Math.sin(x * 0.045 + seed * 5 + t * 0.09) + 0.6 * Math.sin(x * 0.19 - t * 0.13 + seed);
      const alpha = Math.min(1, Math.max(0, wave - 0.35)) * strength * (1 - 0.35 * deep);
      if (alpha > 0.02) {
        ctx.globalAlpha = alpha;
        ctx.fillRect(x, y, 2, 1);
      }
    }
  });
  ctx.globalAlpha = 1;
}

// The faintest ripples: each is a slow clock, a short stroke of light that swells and fades, then comes again elsewhere.
function paintRipples({ ctx, w, h, t }: VistaView, { horizon }: Plain): void {
  const deep = h - horizon - 4;
  const count = Math.min(RIPPLES_MOST, Math.ceil((w * deep) / RIPPLE_AREA));
  ctx.fillStyle = RIPPLE;
  for (let i = 0; i < count; i++) {
    const cycle = 7 + 6 * hash(i, 1);
    const at = t + hash(i, 2) * cycle;
    const turn = Math.floor(at / cycle);
    // Far ripples are short and close together, near ones long and few.
    const near = hash(turn, i + 0.5) ** 1.7;
    const len = 2 + Math.round(near * 8 + 2 * hash(i, 3));
    ctx.globalAlpha = RIPPLE_ALPHA * Math.sin((Math.PI * (at - turn * cycle)) / cycle) ** 2;
    ctx.fillRect(Math.round(hash(turn + 7, i) * (w + len) - len), horizon + 2 + Math.floor(near * deep), len, 1);
  }
  ctx.globalAlpha = 1;
}

/** How bright the lamp is: it flickers twice, as old lamps do, then warms up and stays on. */
function lampOn(t: number): number {
  const since = t - LAMP_AT;
  if (since < 0 || (since > 0.12 && since < 0.7) || (since > 0.85 && since < 1.05)) {
    return 0;
  }
  return since < 1.05 ? 0.6 : 0.55 + 0.45 * ramp(since, 1.05, 3.5);
}

// The lamp of the stop: a warm point with a small halo, and a long trembling stroke of it on the water.
function paintLamp({ ctx, h, t }: VistaView, { rail, lamp }: Plain): void {
  const on = lampOn(t);
  if (on <= 0) {
    return;
  }
  ctx.fillStyle = WARM[1];
  ([[1, 0.4], [2, 0.16], [3, 0.06]] as const).forEach(([reach, alpha]) => {
    ctx.globalAlpha = alpha * on;
    for (let dy = -reach; dy <= reach; dy++) {
      const half = reach - Math.abs(dy);
      ctx.fillRect(lamp.x - half, lamp.y + dy, half * 2 + 1, 1);
    }
  });
  // It lights the platform under it, then the water: wider just under the stop, a thread further out.
  ctx.globalAlpha = 0.5 * on;
  ctx.fillRect(lamp.x - 2, rail - 1, 5, 1);
  const reach = Math.min(16, Math.max(5, Math.round((h - rail) * 0.4)));
  for (let k = 0; k < reach; k++) {
    const far = k / reach;
    if (Math.sin(t * 1.3 + k * 2.7) > 0.7 - 0.9 * (1 - far)) {
      ctx.globalAlpha = 0.75 * on * (1 - far) ** 1.3;
      ctx.fillRect(lamp.x - (k < 2 ? 1 : 0) + Math.round(0.8 * far * Math.sin(t * 2.1 + k * 1.9)), rail + 2 + k, k < 2 ? 3 : 1, 1);
    }
  }
  ctx.globalAlpha = 1;
  px(ctx, lamp.x, lamp.y, WARM[0], on);
}

// Someone is home on the island: one window, and a thread of it on the water.
function paintWindow({ ctx, t }: VistaView, { horizon, lit }: Plain): void {
  const on = ramp(t, WINDOW_AT, WINDOW_AT + 1.5);
  if (!lit || on <= 0) {
    return;
  }
  px(ctx, lit.x, lit.y, WARM[1], on, 2);
  px(ctx, lit.x + (Math.sin(t * 1.7) > 0 ? 1 : 0), horizon + 3, WARM[1], 0.4 * on);
}

export const train: VistaPainter = {
  back(view) {
    const { ctx, t, dir } = view;
    const plain = floodedPlain(view);
    const deep = deepening(view);
    // The clouds and their mirror slide as one picture, so slowly it is only seen by who looks away and back.
    const drift = Math.round(DRIFT * Math.min(1, t / DRIFT_S));
    const left = dir > 0 ? drift - DRIFT : -drift;
    ctx.drawImage(plain.early, 0, 0);
    ctx.drawImage(plain.cloudsEarly, left, 0);
    ctx.globalAlpha = deep;
    ctx.drawImage(plain.late, 0, 0);
    ctx.drawImage(plain.cloudsLate, left, 0);
    ctx.globalAlpha = 1;
    paintStars(view, plain);
    paintGleams(view, plain, deep);
    paintRipples(view, plain);
    ctx.drawImage(plain.land, 0, 0);
    paintWindow(view, plain);
    paintLamp(view, plain);
    paintTrain(view, plain);
    paintReeds(view, deep);
    paintLookout(view, lookoutTones(deep));
  },
  front(view) {
    paintLookoutFront(view, lookoutTones(deepening(view)));
  },
};
