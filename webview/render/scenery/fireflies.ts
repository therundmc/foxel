import { paintLights, shine } from './fireflies-lights';
import { pondOf, type Pond } from './fireflies-pond';
import { paintCloseGrass, paintReeds } from './fireflies-reeds';
import { paintLookout, paintLookoutFront, type LookoutTones } from './lookout';
import { mix, seeded, type VistaPainter, type VistaView } from './paint';

// A warm summer night by a pond. A big moon sits low behind the far trees and lays its light on the still water;
// reeds stand at both sides, a frog keeps watch on a lily pad, and fireflies drift over it all.
//   0 s   the night, the moon on the water, three fireflies
//   1 s   the others come out one after the other, until 20 s
//  12 s   one by one they take the same slow breath; by 20 s the whole pond glows and dims together
//  moment a little stream of them lifts off beside the fox and away the way it looks (0 to 2.5 s); then hundreds come
//         out of the water and go up in a slow, widening spiral (2 to 15 s) and spread into a second sky that stays

const STAR = '#dfeee6';
const MOONLIGHT = '#f3efc4';
/** The night grass, and the same with the fireflies' light on it. */
const NIGHT: LookoutTones = { body: '#123a34', rim: '#2d6b55', deep: '#0b2826', blades: ['#1a4a3e', '#2c6a52'], front: ['#35775a', '#235a48'], flowers: ['#e6ecd8', '#cbd9ea', '#eadfc4'] };
const LIT: LookoutTones = { body: '#2c5a38', rim: '#6fa85a', deep: '#1a3c2c', blades: ['#3a6c40', '#5a9a52'], front: ['#6aaa58', '#487f48'], flowers: ['#f6f6d0', '#e2ecd6', '#f6eeb8'] };
const LIGHT_ON_GRASS = 0.5;
/** The frog, facing right: its back, its belly in the shade, its eye and its pale throat. */
const FROG = '#7dbb6a';
const FROG_SHADE = '#3d7a50';
const FROG_EYE = '#f1f4b4';
const FROG_THROAT = '#cfe3ae';
const FROG_WIDE = 7;
/** The moon's path starts this many rows from the far shore, under the trees' reflection. */
const PATH_FROM = 2;

function lookoutTones(view: VistaView): LookoutTones {
  const lit = LIGHT_ON_GRASS * shine(view);
  const pair = (a: readonly [string, string], b: readonly [string, string]): [string, string] => [mix(a[0], b[0], lit), mix(a[1], b[1], lit)];
  return {
    body: mix(NIGHT.body, LIT.body, lit),
    rim: mix(NIGHT.rim, LIT.rim, lit),
    deep: mix(NIGHT.deep, LIT.deep, lit),
    blades: pair(NIGHT.blades, LIT.blades),
    front: pair(NIGHT.front, LIT.front),
    flowers: NIGHT.flowers,
  };
}

let sprinkled: { key: string; stars: Float32Array } | undefined;

// Only a few stars, high up: the moon and the summer haze keep the others.
function paintStars({ ctx, w, t }: VistaView, { shore }: Pond): void {
  const key = `${w}:${shore}`;
  if (sprinkled?.key !== key) {
    const random = seeded(0x57a2);
    const stars = new Float32Array(Math.round((w * shore) / 560) * 4);
    for (let i = 0; i < stars.length; i += 4) {
      stars.set([Math.floor(random() * w), Math.floor(random() ** 1.7 * shore * 0.6), 0.3 + 0.6 * random(), random() * 6.3], i);
    }
    sprinkled = { key, stars };
  }
  const { stars } = sprinkled;
  ctx.fillStyle = STAR;
  for (let i = 0; i < stars.length; i += 4) {
    ctx.globalAlpha = stars[i + 2] * (0.7 + 0.3 * Math.sin(t * (0.5 + stars[i + 2]) + stars[i + 3]));
    ctx.fillRect(stars[i], stars[i + 1], 1, 1);
  }
  ctx.globalAlpha = 1;
}

// The moon on the water: a long column of short strokes, wider toward us, each one slowly growing and shrinking.
function paintMoonPath({ ctx, t }: VistaView, { shore, foot, moonX, moonR }: Pond): void {
  const deep = foot - shore;
  ctx.fillStyle = MOONLIGHT;
  for (let row = PATH_FROM; row <= deep + 2; row++) {
    const near = row / deep;
    const half = moonR * (0.35 + 0.8 * near);
    // A bright stroke and a fainter one beside it, each at its own pace.
    for (let faint = 0; faint < 2; faint++) {
      const beat = Math.sin(row * (1.9 + faint * 1.3) + t * (0.55 - faint * 0.2) + faint * 2);
      if (beat < -0.12) {
        continue;
      }
      const wide = Math.max(1, Math.round(half * (0.2 + 0.8 * beat * beat) * (faint ? 0.55 : 1.1)));
      const aside = Math.round(half * (faint ? 1 : 0.5) * Math.sin(row * 2.7 + faint * 4 + t * 0.21));
      ctx.globalAlpha = (faint ? 0.3 : 0.72) * (0.55 + 0.45 * near) * (0.55 + 0.45 * beat);
      ctx.fillRect(moonX + aside - (wide >> 1), shore + row, wide, 1);
    }
  }
  ctx.globalAlpha = 1;
}

// The frog sits still on its pad, looking the way the fox looks; now and then its throat swells.
function paintFrog({ ctx, t, dir }: VistaView, { frog }: Pond): void {
  if (!frog) {
    return;
  }
  const left = frog.x + 2;
  const top = frog.y - 3;
  /** A stroke of the frog drawn facing right, turned round when it looks left. */
  const part = (x: number, y: number, wide: number): void => ctx.fillRect(dir > 0 ? left + x : left + FROG_WIDE - x - wide, top + y, wide, 1);
  ctx.fillStyle = FROG;
  part(4, 0, 2);
  part(2, 1, 5);
  part(1, 2, 4);
  part(3, 3, 1);
  ctx.fillStyle = FROG_SHADE;
  part(0, 3, 3);
  part(5, 3, 1);
  ctx.fillStyle = FROG_EYE;
  part(5, 1, 1);
  ctx.fillStyle = FROG_THROAT;
  const swollen = Math.sin(t * 1.1) + Math.sin(t * 0.37) > 1.25;
  part(5, 2, swollen ? 3 : 2);
  if (swollen) {
    part(6, 3, 2);
  }
}

export const fireflies: VistaPainter = {
  back(view) {
    const pond = pondOf(view);
    view.ctx.drawImage(pond.image, 0, 0);
    paintStars(view, pond);
    paintMoonPath(view, pond);
    paintFrog(view, pond);
    paintReeds(view, pond);
    paintLights(view, pond);
    paintLookout(view, lookoutTones(view));
  },
  front(view) {
    paintCloseGrass(view);
    paintLookoutFront(view, lookoutTones(view));
  },
};
