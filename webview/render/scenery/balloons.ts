import { blend, css, rgb, sprite } from './balloons-craft';
import { flightsOf, placeOf, type Depth } from './balloons-flight';
import { valleyOf, type Plane, type Valley } from './balloons-land';
import { paintLookout, paintLookoutFront, type LookoutTones } from './lookout';
import { clamp01, gradient, ramp, seeded, type VistaPainter, type VistaView } from './paint';

// Early morning over a misty valley, and a festival of hot-air balloons. The fox sits on a grassy lookout high
// above the valley; the sky is a pastel dawn, mist lies in the hollows and the river glints. One balloon, small
// and far, is puffed up on the valley floor and lifts; at the great moment the whole festival rises out of the
// mist, one after another, near and far, and a big one with a fox's face passes close by. They all drift up and
// away with the breeze toward the side the fox looks to, burners glowing now and then, as the light turns golden.
//   0 s    the dawn valley, mist in the hollows, the light growing
//   2.5 s  the first balloon is puffed up on the floor by the river, its burner roaring in bursts
//   12 s   it lets go and rises slowly
//  moment the festival: a balloon out of the mist every second or so, until +13 s, far and near
//   +4 s   the light turns golden and the mist thins (until +30 s)
//   +5 s   the fox balloon comes up from below the lookout, passes close and is gone over the top by +35 s
//   end    the others keep drifting up and away until the sky fades out

/** The sky from the top down at the first light, at the moment, and once golden. */
const SKY_AT = [0, 0.45, 0.8, 1] as const;
const EARLY = ['#9a92cc', '#c3a6d6', '#f0b6c2', '#ffd0b4'] as const;
const DAWN = ['#a4a8de', '#d2b6de', '#ffc6be', '#ffe2b6'] as const;
const GOLDEN = ['#a2bce8', '#e8cad8', '#ffd4a6', '#fff0bc'] as const;
/** What the distance fades the farthest balloons into. */
const HAZE = rgb('#f4d4d2');
/** The low sun in the gap of the far hills: its disc, the glow around it, what it lays on the land once golden. */
const SUN = '#fff2c4';
const SUN_CORE = '#fffcec';
const SUN_GLOW = '#ffe2a6';
const WARM = '#ffc860';
const WARM_ALPHA = 0.13;
const MIST = '#fff2ee';
const GLINT = '#fffbea';
const FLAME = '#ffd23f';
const FLAME_CORE = '#fff6c4';
const CLOUD = ['#fff4ee', '#ffd8dc', '#e4bcd6'] as const;

const MORNING: LookoutTones = { body: '#7aa86c', rim: '#a8cf8c', deep: '#62905a', blades: ['#649a5c', '#97c582'], front: ['#a8cf8c', '#6fa062'], flowers: ['#fff6f2', '#ffb3c7', '#fff0a8', '#d9c8ff'] };
const GOLD: LookoutTones = { body: '#88ac62', rim: '#c2d684', deep: '#6e9452', blades: ['#729e56', '#b0cc78'], front: ['#c2d684', '#7ca45a'], flowers: ['#fff6e6', '#ffb0b8', '#fff0a0', '#e4ccf4'] };

/** How golden the light has turned, from 0 to 1. */
const goldenAt = ({ moment }: VistaView): number => (moment === undefined ? 0 : ramp(moment, 4, 30));

function skyStops(view: VistaView): (readonly [number, string])[] {
  const dawn = ramp(view.t, 0, 20);
  const golden = goldenAt(view);
  return SKY_AT.map((at, i) => [at, css(blend(blend(rgb(EARLY[i]), rgb(DAWN[i]), dawn), rgb(GOLDEN[i]), golden))] as const);
}

/** A soft round glow, the one thing here that is not hard pixels. */
function glow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number): void {
  const fill = ctx.createRadialGradient(x, y, 0, x, y, radius);
  fill.addColorStop(0, color);
  fill.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalAlpha = clamp01(alpha);
  ctx.fillStyle = fill;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.globalAlpha = 1;
}

/** The sun comes up slowly in the gap of the far hills, pale and small: the balloons are the subject. */
function paintSun(view: VistaView, valley: Valley): void {
  const { ctx, h, t } = view;
  const golden = goldenAt(view);
  const r = Math.round(Math.min(6, Math.max(2, h * 0.05)));
  const line = valley.far.tops[valley.middle];
  const y = Math.round(line + r * 0.6 - (t / 60) * Math.max(6, h * 0.16));
  glow(ctx, valley.middle, line, Math.max(30, h * 0.8), SUN_GLOW, 0.3 + 0.35 * golden);
  for (const [color, size] of [[SUN, r], [SUN_CORE, r - 1]] as const) {
    ctx.fillStyle = color;
    for (let dy = -size; dy <= size; dy++) {
      const half = Math.floor(Math.sqrt((size + 0.5) ** 2 - dy * dy));
      ctx.fillRect(valley.middle - half, y + dy, half * 2 + 1, 1);
    }
  }
}

let streaks: { key: string; list: Float32Array } | undefined;

/** A few long thin streaks of cloud, pink underneath, drifting slowly with the balloons. */
function paintClouds(view: VistaView, valley: Valley): void {
  const { ctx, w, t, dir } = view;
  const key = `${w}:${valley.crest}`;
  if (streaks?.key !== key) {
    const random = seeded(0xc10d);
    const list: number[] = [];
    for (let i = Math.max(2, Math.round(w / 70)); i > 0; i--) {
      list.push(random() * (w + 60), 2 + Math.round(random() * valley.crest * 0.55), 14 + random() * 26, 0.08 + random() * 0.1);
    }
    streaks = { key, list: Float32Array.from(list) };
  }
  const lap = w + 80;
  const { list } = streaks;
  for (let i = 0; i < list.length; i += 4) {
    const len = Math.round(list[i + 2]);
    const x = Math.round((((list[i] + dir * t * list[i + 3]) % lap) + lap) % lap) - 40;
    const y = list[i + 1];
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = CLOUD[0];
    ctx.fillRect(x + Math.round(len * 0.3), y - 1, Math.round(len * 0.35), 1);
    ctx.fillStyle = CLOUD[1];
    ctx.fillRect(x, y, len, 1);
    ctx.fillStyle = CLOUD[2];
    ctx.fillRect(x + Math.round(len * 0.15), y + 1, Math.round(len * 0.6), 1);
    ctx.globalAlpha = 1;
  }
}

/** A plane of the valley, warmed by the golden light once it comes. */
function paintPlane(view: VistaView, plane: Plane, golden: number): void {
  const { ctx } = view;
  ctx.drawImage(plane.image, 0, 0);
  if (golden > 0) {
    ctx.fillStyle = WARM;
    ctx.globalAlpha = WARM_ALPHA * golden;
    for (const [from, to, row] of plane.runs) {
      if (row < plane.foot) {
        ctx.fillRect(from, row, to - from, plane.foot - row);
      }
    }
    ctx.globalAlpha = 1;
  }
}

/** Mist lying along row `y`: a soft band, and long wisps over it drifting with the breeze. */
function paintMist(view: VistaView, y: number, deep: number, amount: number, seed: number): void {
  const { ctx, w, t, dir } = view;
  if (amount <= 0.02) {
    return;
  }
  gradient(view, y - deep, y + deep, [[0, 'rgba(255,242,238,0)'], [0.55, MIST], [1, 'rgba(255,242,238,0)']], 0.35 * amount);
  const random = seeded(seed);
  ctx.fillStyle = MIST;
  for (let x0 = -40 + random() * 30; x0 < w + 40; x0 += 40 + random() * 60) {
    const len = 16 + Math.round(random() * 30);
    const row = y + Math.round((random() - 0.5) * deep);
    const lap = w + 100;
    const x = Math.round((((x0 + dir * t * (0.25 + random() * 0.3)) % lap) + lap) % lap) - 50;
    ctx.globalAlpha = clamp01(amount * (0.32 + 0.14 * Math.sin(t * 0.3 + x0)));
    ctx.fillRect(x + 3, row, len - 6, 1);
    ctx.fillRect(x + Math.round(len * 0.3), row - 1, Math.round(len * 0.35), 1);
  }
  ctx.globalAlpha = 1;
}

/** The river catches the light in a few pixels that come and go. */
function paintGlints(view: VistaView, valley: Valley): void {
  const { ctx, t } = view;
  ctx.fillStyle = GLINT;
  valley.river.forEach(([y, x, wide], i) => {
    const k = Math.sin(t * 1.7 + i * 2.39) + Math.sin(t * 0.9 + i * 0.77);
    if (k > 1.2) {
      ctx.globalAlpha = Math.min(1, k - 1.2);
      ctx.fillRect(Math.round(x + (Math.sin(i * 3.1) * wide) / 3), y, wide > 3 ? 2 : 1, 1);
    }
  });
  ctx.globalAlpha = 1;
}

/** Every balloon rising from behind this plane. */
function paintBalloons(view: VistaView, valley: Valley, depth: Depth): void {
  const { ctx, w, h, t, dir } = view;
  const size = `${w}:${h}:${Math.round(view.foxX)}`;
  for (const f of flightsOf(view, valley)) {
    if (f.depth !== depth) {
      continue;
    }
    const at = placeOf(f, view);
    if (!at || at.alpha <= 0 || at.y < -2) {
      continue;
    }
    const look = sprite(size, f.craft, f.r, at.puff, f.haze, HAZE, dir);
    const left = at.x + look.left;
    const top = at.y + look.top;
    if (left >= w || left + look.image.width <= 0) {
      continue;
    }
    ctx.globalAlpha = at.alpha;
    ctx.drawImage(look.image, left, top);
    if (at.burn > 0.05) {
      ctx.globalAlpha = at.alpha * at.burn;
      ctx.drawImage(look.lit, left, top);
      if (at.burn > 0.3) {
        // The flame flickers, a pixel taller now and then.
        const tall = Math.min(look.flameTall, 1 + (Math.floor(t * 11 + f.phase * 7) % 2));
        ctx.fillStyle = FLAME;
        ctx.fillRect(at.x, at.y + look.flame - tall + 1, 1, tall);
        ctx.fillStyle = FLAME_CORE;
        ctx.fillRect(at.x, at.y + look.flame, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }
}

function lookoutTones(view: VistaView): LookoutTones {
  const k = goldenAt(view);
  if (k <= 0) {
    return MORNING;
  }
  const tone = (a: string, b: string): string => css(blend(rgb(a), rgb(b), k));
  const pair = (a: readonly [string, string], b: readonly [string, string]): [string, string] => [tone(a[0], b[0]), tone(a[1], b[1])];
  return {
    body: tone(MORNING.body, GOLD.body),
    rim: tone(MORNING.rim, GOLD.rim),
    deep: tone(MORNING.deep, GOLD.deep),
    blades: pair(MORNING.blades, GOLD.blades),
    front: pair(MORNING.front, GOLD.front),
    flowers: k < 0.5 ? MORNING.flowers : GOLD.flowers,
  };
}

export const balloons: VistaPainter = {
  back(view) {
    const valley = valleyOf(view);
    const golden = goldenAt(view);
    const mist = 1 - 0.5 * golden;
    gradient(view, 0, valley.horizon, skyStops(view));
    paintSun(view, valley);
    paintClouds(view, valley);
    paintBalloons(view, valley, 0);
    paintPlane(view, valley.far, golden);
    paintPlane(view, valley.floor, golden);
    paintGlints(view, valley);
    paintMist(view, valley.horizon + 1, Math.max(2, Math.round(view.h * 0.04)), mist, 0x3157);
    paintBalloons(view, valley, 1);
    paintMist(view, valley.hollow, Math.max(2, Math.round(view.h * 0.05)), mist, 0x3158);
    paintPlane(view, valley.mid, golden);
    paintBalloons(view, valley, 2);
    paintMist(view, valley.hollow + Math.round((view.h - valley.hollow) * 0.5), Math.max(2, Math.round(view.h * 0.04)), 0.7 * mist, 0x3159);
    paintPlane(view, valley.near, golden);
    paintBalloons(view, valley, 3);
    paintLookout(view, lookoutTones(view));
  },
  front(view) {
    paintLookoutFront(view, lookoutTones(view));
  },
};
