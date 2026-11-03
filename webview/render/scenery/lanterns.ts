import { drawLantern, drawMirrored, paintLanterns, warmth } from './lanterns-flight';
import { foxLantern, lightOnGrass } from './lanterns-near';
import { shoreOf, WINDOWS, type Shore } from './lanterns-shore';
import { lookoutTop, paintLookout, paintLookoutFront, type LookoutTones } from './lookout';
import { px, seeded, type VistaPainter, type VistaView } from './paint';

// A night of sky lanterns over a still lake. Across the water a little village keeps its windows lit under a thin
// crescent moon; everything is given back by the lake.
//   0 s   the night, the moon and the windows on the water, the stars twinkling
//   2 s   a first lantern leaves the far shore and climbs, slowly, swaying; another at 8.5 s, a third at 13.5 s
//  moment a lantern glows into being by the fox's paws, as if it had just let it go (0 to 1 s); it lingers a breath,
//         then climbs and floats away over the lake the way the fox looks, smaller and smaller (1.4 to 20 s)
//         2.5 s the village lets its own go: hundreds of them, lit among the houses one after the other until 13 s,
//               a slow warm river of light climbing, leaning and wandering the way the fox looks, mirrored in the
//               lake; the sky over the village and the water under it warm up
//        +10 s  the river reaches the moon; they keep rising and thin into the stars, smaller and paler, the last
//               of them going out high up by +27 s, as the sky fades

const STAR = '#e4e8ff';
const MOONLIGHT = '#eef0d8';
/** The grass by night: a deep indigo, barely paler than the water. */
const NIGHT: LookoutTones = {
  body: '#0b0f30',
  rim: '#1c2458',
  deep: '#060920',
  blades: ['#1a2152', '#121840'],
  front: ['#161c4a', '#0b0f2c'],
  flowers: ['#d8dcf4', '#c4cdf0'],
};
/** The fox's lantern on the crest of the grass around it, and how far that light reaches. */
const GRASS_LIT = '#ffb264';
const GRASS_REACH = 8;
/** How much the warmth over the village shows when every lantern is out. */
const WARMTH = 0.3;

let sprinkled: { key: string; stars: Float32Array } | undefined;

// Many small stars, thinning toward the far shore where the air is thicker.
function paintStars({ ctx, w, t }: VistaView, { shore }: Shore): void {
  const key = `${w}:${shore}`;
  if (sprinkled?.key !== key) {
    const random = seeded(0x5a7e);
    const stars = new Float32Array(Math.round((w * shore) / 150) * 4);
    for (let i = 0; i < stars.length; i += 4) {
      stars.set([Math.floor(random() * w), Math.floor(random() ** 1.6 * (shore - 4)), 0.25 + 0.65 * random(), random() * 6.3], i);
    }
    sprinkled = { key, stars };
  }
  const { stars } = sprinkled;
  ctx.fillStyle = STAR;
  for (let i = 0; i < stars.length; i += 4) {
    ctx.globalAlpha = stars[i + 2] * (0.65 + 0.35 * Math.sin(t * (0.4 + stars[i + 2]) + stars[i + 3]));
    ctx.fillRect(stars[i], stars[i + 1], 1, 1);
  }
  ctx.globalAlpha = 1;
}

// The thin moon on the water: a few short strokes under it, slowly coming and going.
function paintMoonPath({ ctx, t }: VistaView, { shore, foot, moonX, moonR }: Shore): void {
  ctx.fillStyle = MOONLIGHT;
  for (let row = 3; row < foot - shore; row++) {
    const beat = Math.sin(row * 2.9 + t * 0.5) * Math.sin(row * 1.3 - t * 0.31);
    if (beat < 0.15) {
      continue;
    }
    const wide = Math.max(1, Math.round(moonR * (0.3 + 0.9 * beat)));
    ctx.globalAlpha = 0.3 * beat * (0.5 + (0.5 * row) / (foot - shore));
    ctx.fillRect(moonX - (wide >> 1) + Math.round(Math.sin(row * 2.3 + t * 0.2)), shore + row, wide, 1);
  }
  ctx.globalAlpha = 1;
}

// While it is close, the fox's lantern lights the crest of the grass on either side of it.
function paintGrassLight(view: VistaView, x: number): void {
  const light = lightOnGrass(view);
  if (light <= 0) {
    return;
  }
  for (let dx = -GRASS_REACH; dx <= GRASS_REACH; dx++) {
    const at = Math.round(x) + dx;
    const near = (1 - Math.abs(dx) / (GRASS_REACH + 1)) ** 1.6 * light;
    const top = lookoutTop(view, at);
    px(view.ctx, at, top, GRASS_LIT, 0.6 * near);
    px(view.ctx, at, top + 1, GRASS_LIT, 0.25 * near);
  }
}

// Each lit window lays a little wavering stroke of gold on the water below it.
function paintWindowsOnWater({ ctx, t }: VistaView, { shore, windows }: Shore): void {
  for (let i = 0; i < windows.length; i += 3) {
    const x = windows[i];
    const row = shore + (shore - windows[i + 1]);
    const beat = Math.sin(t * 0.8 + x * 0.7 + row);
    ctx.fillStyle = WINDOWS[windows[i + 2]];
    ctx.globalAlpha = 0.28 + 0.14 * beat;
    ctx.fillRect(x + (beat > 0.6 ? 1 : beat < -0.6 ? -1 : 0), row, 1, 2);
  }
  ctx.globalAlpha = 1;
}

export const lanterns: VistaPainter = {
  back(view) {
    const shore = shoreOf(view);
    const { ctx } = view;
    ctx.drawImage(shore.image, 0, 0);
    paintStars(view, shore);
    const warm = WARMTH * warmth(view) * (0.92 + 0.08 * Math.sin(view.t * 0.7));
    if (warm > 0) {
      ctx.globalAlpha = warm;
      ctx.drawImage(shore.warmth, 0, 0);
      ctx.globalAlpha = 1;
    }
    paintMoonPath(view, shore);
    paintWindowsOnWater(view, shore);
    paintLanterns(view, shore);
    const near = foxLantern(view, shore);
    if (near) {
      drawMirrored(view, shore, near);
    }
    paintLookout(view, NIGHT);
    if (near) {
      paintGrassLight(view, near.x);
    }
  },
  front(view) {
    paintLookoutFront(view, NIGHT);
    const near = foxLantern(view, shoreOf(view));
    if (near && near.strength > 0) {
      drawLantern(view.ctx, near);
    }
  },
};
