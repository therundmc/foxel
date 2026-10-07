import { dunesLand, type DunesLand } from './dunes-land';
import { paintLookout, paintLookoutFront, type LookoutTones } from './lookout';
import { paintDrift, paintVeil, paintWave } from './dunes-wind';
import { paintWorm } from './dunes-worm';
import { gradient, mix, ramp, type VistaPainter, type VistaView } from './paint';

// Early morning over a sea of sand, in a haze of warm dust. Soft dunes lie one behind the other, each a single
// long swell, paler with the distance; a great white sun hangs in the haze on the side the fox looks to. The dawn
// slowly turns golden, a few grains of sand drift by, and once a whole wave of it sweeps through (see
// dunes-wind.ts). Something travels under the sand, far away. At the great moment it comes out: an enormous
// worm leaps from behind a dune, arches across the sun and dives back in.
//   0 s   dawn: a rosy haze
//   6 s   the light starts to warm, and is golden by 40 s
//   8 s   the sign: a swell of sand moving along a far crest
//  11 s   the wave of sand comes through, and has passed by 17 s
//  moment the worm (6 s, see dunes-worm.ts), the sand it throws, the dust it leaves; then its sign moves away

/** The haze from the top of the sky down to the horizon, at dawn and in the golden morning. */
const SKY_DAWN = ['#e3a39d', '#eebbab', '#f6d6c3'] as const;
const SKY_MORNING = ['#eeae78', '#f5c896', '#fae3bd'] as const;
const SKY_AT = [0, 0.55, 1] as const;
/** When the dawn starts to warm, and when the morning is golden. */
const WARMS = [6, 40] as const;
/** The sun: a great plain white ball in the haze, with two soft rings of glare round it. */
const SUN = '#fffaf0';
const GLARE = [[1.9, 0.14], [1.4, 0.2]] as const;
/** How big it is (a share of the sky's height, within these bounds), and where: along the room ahead of the fox, and down the sky. */
const SUN_SIZE = 0.24;
const SUN_SIZES = [4, 11] as const;
const SUN_AHEAD = 0.6;
const SUN_DOWN = 0.36;

/** Sand blown off a crest, as puffs of single grains: how many puffs at a time and grains in each, how far they fly, for how long. */
const STREAKS = 3;
const GRAINS = 6;
/** How much of the wave of sand passes behind the fox; the rest passes in front of it. */
const WAVE_BEHIND = 0.6;
const FLIES = 16;
const STREAK_S = 3.2;
const SAND = ['#fbd3b3', '#fde6b6'] as const;

const DAWN: LookoutTones = { body: '#a87d72', rim: '#d9a98c', deep: '#7d5a63', blades: ['#8b7355', '#c2a070'], front: ['#d0ab78', '#99805e'] };
const MORNING: LookoutTones = { body: '#c79a5c', rim: '#edc884', deep: '#9a7347', blades: ['#a08c4c', '#d6bb6c'], front: ['#e2c57a', '#b09a56'] };

const hash = (a: number, b: number): number => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** How far the dawn has turned into the golden morning. */
const lightAt = ({ t }: VistaView): number => ramp(t, WARMS[0], WARMS[1]);

function lookoutTones(light: number): LookoutTones {
  const pair = (a: readonly [string, string], b: readonly [string, string]): [string, string] => [mix(a[0], b[0], light), mix(a[1], b[1], light)];
  return {
    body: mix(DAWN.body, MORNING.body, light),
    rim: mix(DAWN.rim, MORNING.rim, light),
    deep: mix(DAWN.deep, MORNING.deep, light),
    blades: pair(DAWN.blades, MORNING.blades),
    front: pair(DAWN.front, MORNING.front),
  };
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  for (let dy = -Math.floor(r); dy <= r; dy++) {
    const half = Math.floor(Math.sqrt((r + 0.4) * (r + 0.4) - dy * dy));
    ctx.fillRect(x - half, y + dy, half * 2 + 1, 1);
  }
}

function paintSun({ ctx, w, foxX, dir }: VistaView, land: DunesLand): void {
  const room = dir > 0 ? w - foxX : foxX;
  const r = Math.min(SUN_SIZES[1], Math.max(SUN_SIZES[0], Math.round(land.skyFoot * SUN_SIZE)));
  const x = Math.round(foxX + dir * room * SUN_AHEAD);
  const y = Math.round(land.skyFoot * SUN_DOWN);
  ctx.fillStyle = SUN;
  for (const [wide, alpha] of GLARE) {
    ctx.globalAlpha = alpha;
    disc(ctx, x, y, r * wide);
  }
  ctx.globalAlpha = 1;
  disc(ctx, x, y, r);
}

// The wind takes a little sand off each crest, in puffs: a few fine grains that fly on, spread and thin out.
function paintSand({ ctx, t, dir }: VistaView, land: DunesLand, light: number): void {
  ctx.fillStyle = mix(SAND[0], SAND[1], light);
  land.crests.forEach((crest, c) => {
    // The wind comes and goes, at each crest in its own time.
    const blows = 0.5 + 0.5 * Math.sin(t * 0.45 + c * 1.9) * Math.sin(t * 0.17 + c);
    const far = 0.5 + 0.5 * crest.near;
    for (let i = 0; i < STREAKS; i++) {
      const at = t / STREAK_S + hash(c, i);
      const age = at - Math.floor(at);
      const strength = blows * Math.sin(Math.PI * age) * far;
      if (strength < 0.1) {
        continue;
      }
      ctx.globalAlpha = 0.75 * strength;
      for (let g = 0; g < GRAINS; g++) {
        // Each grain has its own pace and its own lift: the puff opens out as it goes.
        const flown = Math.round(age * FLIES * far * (0.5 + hash(g, i + c)));
        const lifted = Math.round(age * 4 * (hash(g + 9, i + c) - 0.3));
        ctx.fillRect(crest.x + dir * (1 + flown), crest.y - 1 - lifted, 1, 1);
      }
    }
  });
  ctx.globalAlpha = 1;
}

/** A picture at dawn, with the golden morning laid over it as the light comes. */
function paintLand({ ctx }: VistaView, [dawn, morning]: readonly [HTMLCanvasElement, HTMLCanvasElement], light: number): void {
  ctx.drawImage(dawn, 0, 0);
  if (light > 0) {
    ctx.globalAlpha = light;
    ctx.drawImage(morning, 0, 0);
    ctx.globalAlpha = 1;
  }
}

export const dunes: VistaPainter = {
  back(view) {
    const land = dunesLand(view);
    const light = lightAt(view);
    gradient(view, 0, land.skyFoot, SKY_DAWN.map((tone, i) => [SKY_AT[i], mix(tone, SKY_MORNING[i], light)] as const));
    paintSun(view, land);
    paintLand(view, land.far, light);
    paintVeil(view, land.skyFoot - 4, light);
    paintWorm(view, land, light);
    paintLand(view, land.near, light);
    paintSand(view, land, light);
    paintWave(view, light, WAVE_BEHIND, 3);
    paintLookout(view, lookoutTones(light));
  },
  front(view) {
    const light = lightAt(view);
    paintLookoutFront(view, lookoutTones(light));
    paintDrift(view, light);
    paintWave(view, light, 1 - WAVE_BEHIND, 7);
  },
};
