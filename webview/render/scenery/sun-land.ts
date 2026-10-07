import { px, seeded } from './paint';
import { blend, css, type Mood, type Rgb } from './sun-palette';

// What lies under the sky of the sunrise and the sunset: the hilltop the fox sits on, the knoll behind it,
// then misty mountains in the morning, or the sea and its islands in the evening. Laid out once per size.

const TAU = Math.PI * 2;
const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
const bell = (u: number): number => Math.exp(-u * u);

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
  /** The row of the horizon: the sea line, or the foot of the far mountains. */
  readonly horizon: number;
  readonly radius: number;
  readonly sunX: number;
  /** The row the sun rises from or sinks behind. */
  readonly sunLine: number;
  readonly far: Ridge;
  readonly mid: Ridge | undefined;
  readonly near: Ridge;
  readonly ground: Ridge;
  /** Where the birds wait, hidden in the pines of the knoll. */
  readonly perch: { readonly x: number; readonly y: number };
  /** The lamp of the lighthouse, when there is an island in sight to stand it on. */
  readonly beacon: { readonly x: number; readonly y: number } | undefined;
  /** The snow on the far mountains, as runs of pixels: y, x, length. */
  readonly snow: Int16Array;
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

/** A little fir on a skyline: a stepped spike, two rows a column. */
function plant(tops: Int16Array, at: number, size: number): void {
  const x = Math.round(at);
  if (x < 0 || x >= tops.length) {
    return;
  }
  const base = tops[x];
  for (let d = -Math.floor(size / 2); d <= Math.floor(size / 2); d++) {
    const tall = size - 2 * Math.abs(d);
    if (tall > 0 && x + d >= 0 && x + d < tops.length) {
      tops[x + d] = Math.max(0, Math.min(tops[x + d], base - tall));
    }
  }
}

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
  const morning = mood === 'sunrise';
  const groundH = h < 40 ? 3 : h < 72 ? 4 : 5;
  const horizonH = Math.round(morning ? clamp(h * 0.24, 9, 34) : clamp(h * 0.28, 10, 40));
  const horizon = h - horizonH;
  const radius = Math.round(clamp(h * 0.11, 4, 9));
  // Far enough from the fox never to hide behind it, close enough to be what it is looking at.
  const reach = clamp(Math.round(w * 0.2), 16 + radius + 5, 70);
  const sunX = clamp(Math.round(foxX + dir * reach), radius + 2, w - radius - 3);
  const gap = (x: number, spread: number): number => bell((x - sunX) / spread);
  const fir = clamp(Math.round(h * 0.11), 4, 8);

  // The hilltop the fox sits on: highest under it, with a few blades of grass.
  const groundTops = skyline(w, h, (x) => h - groundH + (groundH - 2) * Math.min(1, ((x - foxX) / (w * 0.6)) ** 2));
  // A ragged edge of grass rather than a ruled line: short runs a pixel higher, and a longer blade now and then.
  for (let x = 0; x < w; x += 1 + Math.floor(random() * 3)) {
    const blade = random();
    if (blade < 0.34) {
      groundTops[x] -= blade < 0.07 ? 2 : 1;
    }
  }
  const ground = ridge(groundTops, h);

  // The knoll behind the fox: something dark and calm for its coat to stand out on.
  const knollH = clamp(Math.round(h * 0.34), 13, 26);
  const knollX = foxX - dir * 6;
  const knollW = 24 + h * 0.12;
  const roll = wave(random, 17 + h * 0.1);
  const swell = morning ? clamp(h * 0.07, 2, 8) : 0;
  const nearTops = skyline(w, h, (x) => {
    const base = morning ? groundH + 1 + swell * (0.5 + 0.5 * roll(x)) : groundH - 3;
    const tall = base + (knollH - base) * bell((x - knollX) / knollW);
    return h - (groundH + (tall - groundH) * (1 - 0.8 * gap(x, 2.5 * radius + 8)));
  });
  [22, 29, 39].forEach((away, i) => plant(nearTops, foxX - dir * (away + random() * 3), fir - (i % 2) * 2));
  if (morning) {
    for (let x = random() * 40; x < w; x += 26 + random() * 50) {
      if (Math.abs(x - foxX) > 46 && Math.abs(x - sunX) > radius + 6) {
        plant(nearTops, x, fir - 1);
        plant(nearTops, x + 5 + random() * 3, fir - 3);
      }
    }
  }
  const near = ridge(nearTops, lowest(ground) + 1);
  const perchX = clamp(Math.round(foxX - dir * 24), 0, w - 1);
  const perch = { x: perchX, y: nearTops[perchX] + 3 };

  if (morning) {
    // Rolling hills with firs, then mountains with a saddle for the sun to rise in.
    const swellMid = clamp(h * 0.07, 2, 7);
    const rollMid = wave(random, 24 + h * 0.15);
    const midTops = skyline(w, h, (x) => h - (horizonH - 1 + swellMid * rollMid(x) - swellMid * 0.8 * gap(x, 3 * radius + 6)));
    for (let x = random() * 30; x < w; x += 9 + random() * 34) {
      plant(midTops, x, 2 + Math.floor(random() * Math.max(2, fir - 3)));
    }
    const mid = ridge(midTops, lowest(near) + 1);
    // Mountains: the sun rises in the notch between two of them, the others are scattered either side.
    const peak = clamp(h * 0.3, 8, 36);
    const summits: (readonly [number, number, number])[] = [
      [sunX - dir * (2 * radius + 7 + random() * 5), 0.8 + random() * 0.2, 0.5 + random() * 0.15],
      [sunX + dir * (2.3 * radius + 10 + random() * 7), 0.5 + random() * 0.25, 0.45 + random() * 0.15],
    ];
    for (const side of [-1, 1]) {
      for (let x = summits[side * dir < 0 ? 0 : 1][0] + side * peak * (1.3 + random()); x > -peak * 2 && x < w + peak * 2; x += side * peak * (1.1 + random() * 1.6)) {
        summits.push([x, 0.35 + random() * 0.65, 0.4 + random() * 0.3]);
      }
    }
    const rough = wave(random, 5);
    const farTops = skyline(w, h, (x) => {
      let tall = 0;
      for (const [at, high, slope] of summits) {
        tall = Math.max(tall, high * peak - slope * Math.abs(x - at));
      }
      return h - (horizonH + 2 + Math.max(0, tall + rough(x)) * (1 - gap(x, radius * 1.3)));
    });
    const far = ridge(farTops, lowest(mid) + 1);
    // Snow on what stands above the snow line, a few rows deep and ragged underneath.
    const snowLine = horizon - 2 - peak * 0.55;
    const snow: number[] = [];
    for (let y = far.crest; y < snowLine; y++) {
      for (let x = 0; x < w; x++) {
        const deep = Math.min(2 + (x % 3 === 0 ? 1 : 0), Math.ceil((snowLine - farTops[x]) * 0.5));
        if (farTops[x] <= y && y < farTops[x] + deep) {
          let end = x + 1;
          while (end < w && farTops[end] <= y && y < farTops[end] + Math.min(2 + (end % 3 === 0 ? 1 : 0), Math.ceil((snowLine - farTops[end]) * 0.5))) {
            end++;
          }
          snow.push(y, x, end - x);
          x = end;
        }
      }
    }
    return { horizon, radius, sunX, sunLine: farTops[sunX], far, mid, near, ground, perch, beacon: undefined, snow: Int16Array.from(snow) };
  }

  // Evening: the sea, with a headland on the fox's side and an island past the sun for the lighthouse.
  const shape = wave(random, 9);
  const isles: (readonly [number, number, number])[] = [
    [sunX + dir * (2.2 * radius + 24 + 0.06 * w), 18 + 0.05 * w, clamp(h * 0.09, 3, 9)],
    [foxX - dir * (40 + 0.16 * w), 30 + 0.08 * w, clamp(h * 0.14, 4, 13)],
  ];
  if (w > 260) {
    isles.push([sunX + dir * 0.38 * w, 14, 3]);
  }
  const farTops = skyline(w, horizon, (x) => {
    let tall = 0;
    for (const [at, half, high] of isles) {
      const u = (x - at) / half;
      tall = Math.max(tall, Math.abs(u) < 1 ? high * (1 - u * u) ** 0.7 * (0.8 + 0.2 * shape(x)) : 0);
    }
    return horizon - tall;
  });
  const lampX = Math.round(isles[0][0] - dir * isles[0][1] * 0.3);
  let beacon: Land['beacon'];
  if (lampX > 2 && lampX < w - 3 && farTops[lampX] < horizon) {
    const towerH = clamp(Math.round(h * 0.06), 3, 5);
    farTops[lampX] -= towerH;
    farTops[lampX - 1] -= 1;
    farTops[lampX + 1] -= 1;
    beacon = { x: lampX, y: farTops[lampX] };
  }
  const far = ridge(farTops, horizon);
  return { horizon, radius, sunX, sunLine: horizon, far, mid: undefined, near, ground, perch, beacon, snow: new Int16Array(0) };
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

/** Runs of pixels (y, x, length) in one colour. */
export function drawRuns(ctx: CanvasRenderingContext2D, runs: Int16Array, color: string, alpha = 1): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let i = 0; i < runs.length; i += 3) {
    ctx.fillRect(runs[i + 1], runs[i], runs[i + 2], 1);
  }
  ctx.globalAlpha = 1;
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

/** Long flat wisps of mist: x, y, length, phase, speed. */
export function layMist(w: number, rows: readonly number[], random: () => number): Float32Array {
  const wisps: number[] = [];
  for (const y of rows) {
    for (let x = -40 + random() * 30; x < w; x += 34 + random() * 44) {
      wisps.push(x, y + Math.round(random() * 2 - 1), 30 + random() * 50, random() * TAU, 0.35 + random() * 0.4);
    }
  }
  return Float32Array.from(wisps);
}

export function drawMist(ctx: CanvasRenderingContext2D, wisps: Float32Array, w: number, t: number, dir: 1 | -1, color: string, amount: number): void {
  for (let i = 0; i < wisps.length; i += 5) {
    const len = Math.round(wisps[i + 2]);
    const lap = w + 160;
    // It drifts off one side and comes back by the other, unseen.
    const x = Math.round((((wisps[i] + 80 + dir * wisps[i + 4] * t) % lap) + lap) % lap) - 80;
    const y = wisps[i + 1];
    const alpha = amount * (0.6 + 0.25 * Math.sin(t * 0.21 + wisps[i + 3]));
    // A lens of mist: thick in the middle, thinning in steps toward its ends.
    px(ctx, x + 9, y - 1, color, alpha * 0.7, Math.max(1, len - 20), 1);
    px(ctx, x + 3, y, color, alpha, Math.max(1, len - 6), 1);
    px(ctx, x, y + 1, color, alpha, len, 1);
    px(ctx, x + 7, y + 2, color, alpha * 0.6, Math.max(1, len - 12), 1);
  }
}
