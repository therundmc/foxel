import { dunesLand, type DunesLand } from './dunes-land';
import { paintLookout, paintLookoutFront, type LookoutTones } from './lookout';
import { paintWorm } from './dunes-worm';
import { gradient, mix, ramp, seeded, type VistaPainter, type VistaView } from './paint';

// Early morning over a sea of sand, on a world with two moons. Great dunes one behind the other, each with one
// face in the light and one in shade; the wind lifts a little sand off the crests, the last stars go out and the
// dawn slowly turns into a golden morning. Something travels under the sand, far away. At the great moment it
// comes out: an enormous worm leaps from behind a dune, arches across the sky and dives back in.
//   0 s   dawn: rose and mauve, two pale moons, a few stars left (gone by 18 s)
//   6 s   the light starts to warm, and is golden by 40 s
//   8 s   the sign: a swell of sand moving along a far crest
//  moment the worm (6 s, see dunes-worm.ts), the sand it throws, the dust it leaves; then its sign moves away

/** The sky from the top down to the horizon, at dawn and in the golden morning, and where each tone sits. */
const SKY_DAWN = ['#7c88c6', '#b9a5c8', '#efbfae', '#fbd9a6'] as const;
const SKY_MORNING = ['#5f9fdc', '#9cc9e8', '#dfe3cf', '#fbe7b4'] as const;
const SKY_AT = [0, 0.45, 0.82, 1] as const;
/** When the dawn starts to warm, and when the morning is golden. */
const WARMS = [6, 40] as const;
/** The glow of the sun to come, low behind the fox's shoulder, behind the great dune. */
const GLOW_RGB = '255,226,170';
const GLOW = [0.5, 0.75] as const;

const STAR = '#fff6e6';
const STARS_GONE = [3, 18] as const;
/** The two moons, still up on the side the fox looks to: plain pale discs, paler as the day comes. */
const MOON = '#fdeee0';
const MOON_ALPHA = [0.9, 0.55] as const;

/** Sand blown off a crest: how many streaks at a time, how far they fly, for how long. */
const STREAKS = 3;
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

function paintGlow({ ctx, w, foxX, dir }: VistaView, land: DunesLand, light: number): void {
  const room = dir > 0 ? foxX : w - foxX;
  const rx = Math.max(40, w * 0.4);
  const alpha = GLOW[0] + (GLOW[1] - GLOW[0]) * light;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, land.skyFoot);
  ctx.clip();
  ctx.translate(Math.round(foxX - dir * room * 0.6), land.skyFoot);
  ctx.scale(1, Math.max(14, land.skyFoot * 0.9) / rx);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  glow.addColorStop(0, `rgba(${GLOW_RGB},${alpha})`);
  glow.addColorStop(0.5, `rgba(${GLOW_RGB},${alpha * 0.35})`);
  glow.addColorStop(1, `rgba(${GLOW_RGB},0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(-rx, -rx, rx * 2, rx);
  ctx.restore();
}

// The last stars, high up: each goes out at its own time.
function paintStars({ ctx, w, t }: VistaView, land: DunesLand): void {
  if (t >= STARS_GONE[1]) {
    return;
  }
  const random = seeded(0x57a2);
  ctx.fillStyle = STAR;
  for (let i = Math.max(4, Math.round(w / 22)); i > 0; i--) {
    const x = Math.floor(random() * w);
    const y = Math.floor(random() * land.skyFoot * 0.5);
    const leaves = STARS_GONE[0] + random() * (STARS_GONE[1] - STARS_GONE[0] - 3);
    ctx.globalAlpha = 0.8 * (1 - ramp(t, leaves, leaves + 3));
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;
}

function paintMoons({ ctx, w, foxX, dir }: VistaView, land: DunesLand, light: number): void {
  const room = dir > 0 ? w - foxX : foxX;
  const r = Math.min(8, Math.max(3, Math.round(land.skyFoot * 0.17)));
  const x = Math.round(foxX + dir * room * 0.64);
  const y = Math.round(land.skyFoot * 0.36);
  ctx.fillStyle = MOON;
  ctx.globalAlpha = MOON_ALPHA[0] + (MOON_ALPHA[1] - MOON_ALPHA[0]) * light;
  for (const [cx, cy, radius] of [[x, y, r], [x + dir * Math.round(r * 2.4), y - Math.round(r * 0.9), Math.max(1.5, r * 0.45)]] as const) {
    for (let dy = -Math.floor(radius); dy <= radius; dy++) {
      const half = Math.floor(Math.sqrt((radius + 0.4) * (radius + 0.4) - dy * dy));
      ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}

// The wind takes a little sand off each crest, in puffs: thin streaks that fly on and thin out.
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
      const flown = Math.round(age * FLIES * far);
      ctx.globalAlpha = 0.7 * strength;
      ctx.fillRect(crest.x + (dir > 0 ? 1 + flown : -4 - flown), crest.y - 1 - Math.round(age * 2 * hash(i, c + 5)), 3 + Math.round(2 * far), 1);
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
    paintGlow(view, land, light);
    paintStars(view, land);
    paintMoons(view, land, light);
    paintLand(view, land.far, light);
    paintWorm(view, land, light);
    paintLand(view, land.near, light);
    paintSand(view, land, light);
    paintLookout(view, lookoutTones(light));
  },
  front(view) {
    paintLookoutFront(view, lookoutTones(lightAt(view)));
  },
};
