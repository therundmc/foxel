import { drawLantern, drawMirrored, paintLanterns, warmth } from './lanterns-flight';
import { brighter, paintTownLights } from './lanterns-lights';
import { foxLantern, lightOnGrass } from './lanterns-near';
import { nightfall, paintClouds, paintLand, paintSky, sceneOf, type Scene } from './lanterns-scene';
import { paintWisps } from './lanterns-wisps';
import { lookoutTop, paintLookout, paintLookoutFront, type LookoutTones } from './lookout';
import { mix, px, seeded, type VistaPainter, type VistaView } from './paint';

// A town of spirits waking at dusk, across still water. A tall red-lacquered house of many roofs stands there, with
// a lower wing, a chimney breathing a thin plume of steam, a little arched bridge, and a stone path lined with shops.
// Everything is given back by the water.
//   0 s   dusk: the sky amber and rose under big soft clouds lit from below, a few windows already lit
//   1 s   the town wakes: its round lanterns light up one after the other, along the path, over the bridge, under the
//         eaves of the great house, until 12 s; its windows come on as well, until 16 s
//   2 s   a first lantern leaves the town and climbs, slowly, swaying; another at 8.5 s, a third at 13.5 s
//   3 s   the dusk slides into a deep night, the clouds losing their light, the stars coming out, until 32 s (it is
//         always night by 4 s into the moment); the chimney breathes its thin plume of steam all along
//   5 s   a few pale spirit wisps begin to wander over the water
//  moment a lantern glows into being by the fox's paws, as if it had just let it go (0 to 1 s); it lingers a breath,
//         then climbs and floats away over the water the way the fox looks, smaller and smaller (1.4 to 20 s)
//         2.5 s the town lets its own go: hundreds of them, lit on its balconies one after the other until 13 s,
//               a slow warm river of light climbing and wandering the way the fox looks, mirrored in the water, with
//               wisps drawn up among them; every window of the town glows brighter and the sky over it warms
//        +10 s  they keep rising and thin into the stars, smaller and paler, the last of them going out high up by
//               +27 s, and the town's glow softens as the sky fades

const STAR = '#e4e8ff';
/** The grass at dusk and by night. */
const DUSK: LookoutTones = {
  body: '#2a1e4a',
  rim: '#6a4a78',
  deep: '#1a1236',
  blades: ['#3a2a5c', '#2c2050'],
  front: ['#33264f', '#22183e'],
  flowers: ['#f4d8e4', '#e4d0f0'],
};
const NIGHT: LookoutTones = {
  body: '#0b0f30',
  rim: '#1c2458',
  deep: '#060920',
  blades: ['#1a2152', '#121840'],
  front: ['#161c4a', '#0b0f2c'],
  flowers: ['#d8dcf4', '#c4cdf0'],
};
/** The fox's lantern on the crest of the grass around it, and how far that light reaches. */
const GRASS_LIT = '#ff9c5a';
const GRASS_REACH = 8;
/** How much the warmth over the town shows when every lantern is out, and when its windows glow their brightest. */
const WARMTH = 0.3;
const WARMTH_WINDOWS = 0.12;

function lookoutTones(view: VistaView): LookoutTones {
  const k = nightfall(view);
  const pair = (a: readonly [string, string], b: readonly [string, string]): [string, string] => [mix(a[0], b[0], k), mix(a[1], b[1], k)];
  return {
    body: mix(DUSK.body, NIGHT.body, k),
    rim: mix(DUSK.rim, NIGHT.rim, k),
    deep: mix(DUSK.deep, NIGHT.deep, k),
    blades: pair(DUSK.blades, NIGHT.blades),
    front: pair(DUSK.front, NIGHT.front),
    flowers: k < 0.5 ? DUSK.flowers : NIGHT.flowers,
  };
}

let sprinkled: { key: string; stars: Float32Array } | undefined;

// The stars come out as the night falls, the highest first, few near the mountains where the air is thicker.
function paintStars(view: VistaView, { shore }: Scene): void {
  const { ctx, w, t } = view;
  const night = nightfall(view);
  if (night < 0.35) {
    return;
  }
  const key = `${w}:${shore}`;
  if (sprinkled?.key !== key) {
    const random = seeded(0x5a7e);
    const stars = new Float32Array(Math.round((w * shore) / 170) * 4);
    for (let i = 0; i < stars.length; i += 4) {
      stars.set([Math.floor(random() * w), Math.floor(random() ** 1.6 * (shore - 6)), 0.25 + 0.65 * random(), random() * 6.3], i);
    }
    sprinkled = { key, stars };
  }
  const { stars } = sprinkled;
  ctx.fillStyle = STAR;
  for (let i = 0; i < stars.length; i += 4) {
    const out = (night - 0.35 - (stars[i + 1] / shore) * 0.4) * 4;
    if (out <= 0) {
      continue;
    }
    ctx.globalAlpha = Math.min(1, out) * stars[i + 2] * (0.65 + 0.35 * Math.sin(t * (0.4 + stars[i + 2]) + stars[i + 3]));
    ctx.fillRect(stars[i], stars[i + 1], 1, 1);
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

export const lanterns: VistaPainter = {
  back(view) {
    const scene = sceneOf(view);
    const { ctx } = view;
    paintSky(view, scene);
    paintStars(view, scene);
    paintClouds(view, scene);
    paintLand(view, scene);
    const warm = (WARMTH * warmth(view) + WARMTH_WINDOWS * brighter(view)) * (0.92 + 0.08 * Math.sin(view.t * 0.7));
    if (warm > 0) {
      ctx.globalAlpha = warm;
      ctx.drawImage(scene.warmth, 0, 0);
      ctx.globalAlpha = 1;
    }
    paintTownLights(view, scene, nightfall(view));
    paintLanterns(view, scene);
    paintWisps(view, scene);
    const near = foxLantern(view, scene);
    if (near) {
      drawMirrored(view, scene, near);
    }
    const tones = lookoutTones(view);
    paintLookout(view, tones);
    if (near) {
      paintGrassLight(view, near.x);
    }
  },
  front(view) {
    paintLookoutFront(view, lookoutTones(view));
    const near = foxLantern(view, sceneOf(view));
    if (near && near.strength > 0) {
      drawLantern(view.ctx, near);
    }
  },
};
