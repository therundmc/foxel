import { px, seeded } from './paint';
import { blend, css, type Mood, type Rgb } from './sun-palette';

// What lies under the sky of the sunrise and the sunset. Close to us, the grassy hilltop the fox looks out from.
// Far beyond it, misty hills and mountains in the morning; the sea, a cape, an island and a far shore in the
// evening. Laid out once per size.

const TAU = Math.PI * 2;
const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
const bell = (u: number): number => Math.exp(-u * u);

/** The far planes slide behind the lookout: each is laid out this much wider than the view, on both sides. */
export const MARGIN = 24;

/** One layer of land, as a skyline and the rows of pixels under it. */
export interface Ridge {
  /** For each column, the row of its top pixel (`foot` where there is no land). */
  readonly tops: Int16Array;
  /** Its body as runs of pixels: y, x, length. */
  readonly spans: Int16Array;
  /** Its skyline as runs of equal height: x, y, length. */
  readonly edge: Int16Array;
  readonly crest: number;
  readonly foot: number;
}

export interface Land {
  /** The row of the horizon: the sea line, or the foot of the mountains. */
  readonly horizon: number;
  readonly radius: number;
  readonly sunX: number;
  /** The row the sun rises from or sinks behind. */
  readonly sunLine: number;
  /** The far planes, each `MARGIN` wider than the view on both sides. */
  readonly far: Ridge;
  readonly mid: Ridge | undefined;
  readonly near: Ridge;
  /** The hilltop the fox sits on: as wide as the view, it never moves. */
  readonly lookout: Ridge;
}

/** A slow, repeatable roll of the land between -1 and 1. */
function wave(random: () => number, length: number): (x: number) => number {
  const [a, b, c] = [random() * TAU, random() * TAU, random() * TAU];
  return (x) => (Math.sin(x / length + a) + 0.5 * Math.sin(x / (length * 0.43) + b) + 0.25 * Math.sin(x / (length * 0.19) + c)) / 1.75;
}

function skyline(w: number, foot: number, top: (x: number) => number): Int16Array {
  const tops = new Int16Array(w);
  for (let x = 0; x < w; x++) {
    tops[x] = clamp(Math.round(top(x)), 0, foot);
  }
  return tops;
}

/** The skyline of a far plane: `top` is given the column as the view sees it before anything has slid. */
const wide = (w: number, foot: number, top: (x: number) => number): Int16Array => skyline(w + 2 * MARGIN, foot, (i) => top(i - MARGIN));

function ridge(tops: Int16Array, foot: number): Ridge {
  const w = tops.length;
  const crest = tops.reduce((min, y) => Math.min(min, y), foot);
  const spans: number[] = [];
  for (let y = crest; y < foot; y++) {
    let start = -1;
    for (let x = 0; x <= w; x++) {
      const inside = x < w && tops[x] <= y;
      if (inside && start < 0) {
        start = x;
      } else if (!inside && start >= 0) {
        spans.push(y, start, x - start);
        start = -1;
      }
    }
  }
  const edge: number[] = [];
  for (let x = 0; x < w; ) {
    let end = x + 1;
    while (end < w && tops[end] === tops[x]) {
      end++;
    }
    if (tops[x] < foot) {
      edge.push(x, tops[x], end - x);
    }
    x = end;
  }
  return { tops, spans: Int16Array.from(spans), edge: Int16Array.from(edge), crest, foot };
}

const lowest = (r: Ridge): number => r.tops.reduce((max, y) => Math.max(max, y), 0);

export function layLand(mood: Mood, w: number, h: number, foxX: number, dir: 1 | -1): Land {
  const random = seeded(mood === 'sunrise' ? 0x5a11 : 0x7e57);
  // A big ball: it only shrinks when the view is too low or too narrow to hold it.
  const radius = Math.round(clamp(Math.min(h * 0.16, w * 0.12), 5, 12));
  // Far enough from the fox never to hide behind it, close enough to be what it is looking at.
  const reach = clamp(Math.round(w * 0.22), 16 + radius + 4, 80);
  const sunX = clamp(Math.round(foxX + dir * reach), radius + 4, w - radius - 5);
  const gap = (x: number, spread: number): number => bell((x - sunX) / spread);

  // The lookout: highest under the fox, falling away gently to both edges of the view.
  const low = h < 44;
  const crestH = low ? 5 : clamp(Math.round(h * 0.13), 6, 10);
  const edgeH = low ? 2 : 3;
  const spread = Math.max(36, w * 0.22);
  const lookoutTops = skyline(w, h, (x) => h - (edgeH + (crestH - edgeH) * bell((x - foxX) / spread)));
  // Grass along its edge, the only thing drawn at the fox's own scale: lone blades, and a shorter one beside some.
  for (let x = Math.floor(random() * 5); x < w; x += 3 + Math.floor(random() * 7)) {
    const tall = (low ? 1 : 2) + Math.floor(random() ** 2.5 * 3);
    lookoutTops[x] -= tall;
    if (x + 1 < w && random() < 0.35) {
      lookoutTops[x + 1] -= tall - 1;
    }
  }
  const lookout = ridge(lookoutTops, h);

  if (mood === 'sunrise') {
    const horizonH = clamp(Math.round(h * 0.24), crestH + 5, 34);
    const swell = clamp(h * 0.07, 2, 8);
    // Two bands of rolling hills, the nearer one just over the lookout.
    const roll = wave(random, 20 + h * 0.12);
    const near = ridge(wide(w, h, (x) => h - (crestH + 1 + swell * (0.5 + 0.5 * roll(x)))), h - edgeH + 1);
    const rollMid = wave(random, 26 + h * 0.15);
    const mid = low ? undefined : ridge(wide(w, h, (x) => h - (horizonH - 1 + swell * rollMid(x) - swell * 0.8 * gap(x, 3 * radius + 6))), lowest(near) + 1);
    // Mountains: the sun rises in the notch between two of them, the others are scattered either side.
    const peak = clamp(h * 0.26, 7, 30);
    const summits: (readonly [number, number, number])[] = [
      [sunX - dir * (1.6 * radius + 8 + random() * 5), 0.8 + random() * 0.2, 0.5 + random() * 0.15],
      [sunX + dir * (1.9 * radius + 10 + random() * 7), 0.5 + random() * 0.25, 0.45 + random() * 0.15],
    ];
    for (const side of [-1, 1]) {
      const from = summits[side * dir < 0 ? 0 : 1][0] + side * peak * (1.3 + random());
      for (let x = from; x > -MARGIN - peak * 2 && x < w + MARGIN + peak * 2; x += side * peak * (1.1 + random() * 1.6)) {
        summits.push([x, 0.35 + random() * 0.65, 0.4 + random() * 0.3]);
      }
    }
    const rough = wave(random, 5);
    const farTops = wide(w, h, (x) => {
      let tall = 0;
      for (const [at, high, slope] of summits) {
        tall = Math.max(tall, high * peak - slope * Math.abs(x - at));
      }
      return h - (horizonH + 2 + Math.max(0, tall + rough(x)) * (1 - gap(x, radius * 1.2)));
    });
    const far = ridge(farTops, lowest(mid ?? near) + 1);
    return { horizon: h - horizonH, radius, sunX, sunLine: farTops[sunX + MARGIN], far, mid, near, lookout };
  }

  // Evening: the sea. A cape runs out behind the fox, an island lies past the sun, and a far shore comes and goes.
  const horizonH = Math.round(clamp(h * 0.28, 10, 40));
  const horizon = h - horizonH;
  const shape = wave(random, 9);
  // The cape is nearer than the horizon: its foot is lower in the picture.
  const waterline = horizon + Math.round(horizonH * 0.25);
  const capeH = waterline - horizon + clamp(h * 0.13, 4, 14);
  const tip = foxX + dir * 26;
  const near = ridge(
    wide(w, waterline, (x) => {
      const inland = dir * (tip - x);
      return waterline - (inland > 0 ? capeH * (1 - Math.exp(-inland / (20 + 0.08 * w))) * (0.85 + 0.15 * shape(x)) : 0);
    }),
    waterline,
  );
  const isleX = sunX + dir * (2.2 * radius + 22 + 0.06 * w);
  const isleHalf = 18 + 0.05 * w;
  const isleH = clamp(h * 0.08, 3, 8);
  const mid = ridge(
    wide(w, horizon, (x) => {
      const u = (x - isleX) / isleHalf;
      return horizon - (Math.abs(u) < 1 ? isleH * (1 - u * u) ** 0.7 * (0.8 + 0.2 * shape(x)) : 0);
    }),
    horizon,
  );
  const shore = wave(random, 34 + 0.1 * w);
  const shoreH = clamp(h * 0.06, 2.5, 6);
  const far = ridge(wide(w, horizon, (x) => horizon - shoreH * Math.max(0, shore(x) + 0.15) * (1 - gap(x, 2.5 * radius + 10))), horizon);
  return { horizon, radius, sunX, sunLine: horizon, far, mid, near, lookout };
}

/** Paints a layer of land, one colour per row: it melts into the haze toward its foot, where the mist lies. */
export function drawRidge(ctx: CanvasRenderingContext2D, r: Ridge, color: Rgb, haze: Rgb, hazeTop: number, hazeFoot: number): void {
  const { spans, crest, foot } = r;
  const depth = Math.max(1, foot - crest - 1);
  let row = -1;
  for (let i = 0; i < spans.length; i += 3) {
    if (spans[i] !== row) {
      row = spans[i];
      ctx.fillStyle = css(blend(color, haze, hazeTop + ((hazeFoot - hazeTop) * (row - crest)) / depth));
    }
    ctx.fillRect(spans[i + 1], row, spans[i + 2], 1);
  }
}

/** A line of light along a skyline, strongest near `sunX` and gone `reach` pixels away. */
export function drawRim(ctx: CanvasRenderingContext2D, r: Ridge, color: string, strength: number, sunX: number, reach: number): void {
  if (strength <= 0.02) {
    return;
  }
  const { edge } = r;
  for (let i = 0; i < edge.length; i += 3) {
    const far = Math.abs(edge[i] + edge[i + 2] / 2 - sunX) / reach;
    if (far < 1) {
      // A few steps of light rather than a smooth fade: it has to read as pixels.
      px(ctx, edge[i], edge[i + 1], color, strength * Math.ceil((1 - far) ** 1.5 * 5) / 5, edge[i + 2], 1);
    }
  }
}

/** A few long flat wisps of mist lying along row `y`: x, y, length, phase, speed. */
export function layMist(w: number, y: number, random: () => number): Float32Array {
  const wisps: number[] = [];
  for (let x = -60 + random() * 40; x < w + 40; x += 64 + random() * 70) {
    wisps.push(x, y + Math.round(random() * 2 - 1), 44 + random() * 50, random() * TAU, 0.25 + random() * 0.3);
  }
  return Float32Array.from(wisps);
}

/** `drift` is how far a wisp of speed 1 has gone: each slips off one side and comes back by the other, unseen. */
export function drawMist(ctx: CanvasRenderingContext2D, wisps: Float32Array, w: number, drift: number, t: number, color: string, amount: number): void {
  const lap = w + 200;
  for (let i = 0; i < wisps.length; i += 5) {
    const len = Math.round(wisps[i + 2]);
    const x = Math.round((((wisps[i] + 100 + drift * wisps[i + 4]) % lap) + lap) % lap) - 100;
    const y = wisps[i + 1];
    const alpha = amount * (0.6 + 0.25 * Math.sin(t * 0.21 + wisps[i + 3]));
    // A lens of mist: thick in the middle, thinning in steps toward its ends.
    px(ctx, x + 9, y - 1, color, alpha * 0.7, Math.max(1, len - 20), 1);
    px(ctx, x + 3, y, color, alpha, Math.max(1, len - 6), 1);
    px(ctx, x, y + 1, color, alpha, len, 1);
    px(ctx, x + 7, y + 2, color, alpha * 0.6, Math.max(1, len - 12), 1);
  }
}
