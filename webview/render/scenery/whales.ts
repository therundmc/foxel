import { paintLookout, paintLookoutFront, type LookoutTones } from './lookout';
import { seeded, type VistaPainter, type VistaView } from './paint';
import { paintBoat, paintClouds, paintGulls } from './whales-air';
import { paintPod } from './whales-pod';
import { seaOf, type Sea } from './whales-sea';

// A summer afternoon on a cliff-top meadow over a calm turquoise sea. The sun glints on the water, big soft clouds
// drift by, gulls loop in the breeze, a little boat creeps out from behind a headland with its lighthouse. Out there
// live a whale and her calf, always the same two, she long and deep blue, it small, round and pale. One little story,
// a beat at a time, all of it on the side the fox looks and never behind it:
//   0 s    the sea, the glints, the clouds, the gulls; the boat sets off
//   9 s    once, far out, a breath goes up and a ring spreads: someone is there
//  moment  a shadow rises under the water (0 to 0.8 s); the mother leaps out in a long arc away from the fox, waves
//          a flipper at the top (2 s) and falls back in a white crown of water (3.3 s); the spray hangs on with a
//          small rainbow in it (to 13 s); rings spread
//  +6.4 s  a ring further on; at 7.2 s the calf hops out, wobbling and flapping, and plops down flat (8.5 s)
//  +11.4 s both come up side by side, a clear gap between them; the mother breathes (12.8 s), then the calf (14 s)
//  +16.2 s the mother lifts her tail, waves it and dives; the calf does the same at 18.8 s; rings
//  +23 s   calm again
const GLINT = '#ffffff';
const GLINT_WARM = '#fffbe0';
const RIPPLE = '#c4f0ec';
/** One glint for so many square pixels of sea, never more than this. */
const GLINT_AREA = 140;
const GLINTS_MOST = 180;
/** One ripple for so many square pixels of sea, never more than this. */
const RIPPLE_AREA = 260;
const RIPPLES_MOST = 70;
/** The patch of sea right behind the fox's head stays quiet: half its width, and how high it reaches. */
const BEHIND_FOX = 12;
const FOX_TALL = 34;

const MEADOW: LookoutTones = {
  body: '#5f9e4c',
  rim: '#a2d46c',
  deep: '#477f3e',
  blades: ['#4f9042', '#8cc463'],
  front: ['#9fd66e', '#6aab52'],
  flowers: ['#ffffff', '#ffc4dc', '#fff1a0', '#ffffff', '#f6a8c8'],
};

const hash = (a: number, b: number): number => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

let sprinkled: { sea: Sea; glints: Float32Array } | undefined;

/** The glints of this sea, each [x, y, phase, pace, how near]: gathered under the sun, spread wider toward us. */
function glintsOf(view: VistaView, sea: Sea): Float32Array {
  if (sprinkled?.sea !== sea) {
    const { w, h, foxX } = view;
    const deep = h - sea.horizon;
    const random = seeded(0x61177);
    const count = Math.min(GLINTS_MOST, Math.round((w * deep) / GLINT_AREA));
    const glints: number[] = [];
    for (let i = 0; i < count; i++) {
      const near = random() ** 1.3;
      // Most in the sun's path, a few anywhere.
      const gathered = random() < 0.92;
      const spread = sea.glitterSpread * (0.4 + 1.2 * near);
      const x = Math.round(gathered ? sea.glitter + (random() + random() + random() - 1.5) * spread : random() * w);
      const y = sea.horizon + 2 + Math.floor(near * (deep - 4));
      if (Math.abs(x - foxX) < BEHIND_FOX && y > h - FOX_TALL) {
        continue;
      }
      glints.push(x, y, random() * 6.3, 0.8 + 1.6 * random(), near);
    }
    sprinkled = { sea, glints: Float32Array.from(glints) };
  }
  return sprinkled.glints;
}

// The sun on the water: each glint flashes now and then, the near ones as tiny stars.
function paintGlints(view: VistaView, sea: Sea): void {
  const { ctx, t } = view;
  const glints = glintsOf(view, sea);
  for (let i = 0; i < glints.length; i += 5) {
    const beat = Math.sin(t * glints[i + 3] + glints[i + 2]);
    if (beat < 0.6) {
      continue;
    }
    const x = glints[i];
    const y = glints[i + 1];
    const bright = (beat - 0.6) / 0.4;
    ctx.globalAlpha = 0.35 + 0.65 * bright;
    ctx.fillStyle = i % 2 ? GLINT : GLINT_WARM;
    ctx.fillRect(x, y, glints[i + 4] > 0.45 ? 2 : 1, 1);
    if (bright > 0.8 && glints[i + 4] > 0.6) {
      ctx.globalAlpha = 0.6 * bright;
      ctx.fillRect(x, y - 1, 1, 1);
      ctx.fillRect(x, y + 1, 1, 1);
      ctx.fillRect(x - 1, y, 1, 1);
      ctx.fillRect(x + 2, y, 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}

// The faintest ripples: short pale strokes that swell and fade, then come again somewhere else.
function paintRipples({ ctx, w, h, t }: VistaView, { horizon }: Sea): void {
  const deep = h - horizon - 3;
  const count = Math.min(RIPPLES_MOST, Math.ceil((w * deep) / RIPPLE_AREA));
  ctx.fillStyle = RIPPLE;
  for (let i = 0; i < count; i++) {
    const cycle = 5 + 5 * hash(i, 1);
    const at = t + hash(i, 2) * cycle;
    const turn = Math.floor(at / cycle);
    const near = hash(turn, i + 0.5) ** 1.5;
    const len = 2 + Math.round(near * 9 + 2 * hash(i, 3));
    ctx.globalAlpha = 0.35 * Math.sin((Math.PI * (at - turn * cycle)) / cycle) ** 2;
    ctx.fillRect(Math.round(hash(turn + 7, i) * (w + len) - len), horizon + 2 + Math.floor(near * deep), len, 1);
  }
  ctx.globalAlpha = 1;
}

export const whales: VistaPainter = {
  back(view) {
    const { ctx, t, moment, dir } = view;
    const sea = seaOf(view);
    ctx.drawImage(sea.sky, 0, 0);
    paintClouds(view, sea);
    ctx.drawImage(sea.image, 0, 0);
    paintRipples(view, sea);
    paintGlints(view, sea);
    paintBoat(view, sea);
    paintPod(ctx, sea, t, moment, dir);
    paintGulls(view, sea);
    paintLookout(view, MEADOW);
  },
  front(view) {
    paintLookoutFront(view, MEADOW);
  },
};
