import { prerender } from './paint';

// The balloons themselves, as little pictures painted once: a round envelope tapering to its mouth, ropes and a
// basket under it. Each has its own cloth (stripes, patches, polka dots, a heart, a fox's face with its ears),
// lit from the side the fox looks to, softened by the haze of its distance, and a second picture of it glowing
// from inside, laid over it while its burner roars.

export type Rgb = readonly [number, number, number];

export const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as unknown as Rgb;
export const blend = (a: Rgb, b: Rgb, k: number): Rgb => {
  const t = Math.min(1, Math.max(0, k));
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
};
export const css = (c: Rgb): string => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;

export type Pattern = 'gores' | 'rainbow' | 'band' | 'patch' | 'dots' | 'heart' | 'fox';

/** One balloon's cloth: how it is cut and its colours, from the main one. */
export interface Craft {
  readonly pattern: Pattern;
  readonly colors: readonly string[];
}

/** A balloon painted at one size, anchored at the middle of the foot of its basket. */
export interface Sprite {
  readonly image: HTMLCanvasElement;
  /** The same, warmed from inside by the burner. */
  readonly lit: HTMLCanvasElement;
  /** Where the picture goes, from the anchor. */
  readonly left: number;
  readonly top: number;
  /** The row of the flame, from the anchor, and how tall it gets. */
  readonly flame: number;
  readonly flameTall: number;
  /** Rows from the top of the envelope to the foot of the basket. */
  readonly tall: number;
}

/** Where the envelope ends, in radii below its widest row, and how narrow its mouth is. */
const MOUTH = 1.3;
const MOUTH_WIDE = 0.24;
const SHADOW = rgb('#7d6a9e');
const SHINE = rgb('#ffffff');
const GLOW = rgb('#ffc96e');
const ROPE = rgb('#8a6a5a');
const WICKER = rgb('#a8673f');
const WICKER_LIT = rgb('#d99a52');
/** The fox balloon's face: its eyes, its cheeks, the inside of its ears. */
const FOX_DARK = rgb('#3a2418');
const FOX_BLUSH = rgb('#f6a6b2');
const FOX_EAR = rgb('#5a3420');
const FOX_EAR_INSIDE = rgb('#ffd9b0');
const HEART = ['.x.x.', 'xxxxx', 'xxxxx', '.xxx.', '..x..'];
const HEART_SMALL = ['x.x', 'xxx', '.x.'];

const hash = (a: number, b: number): number => {
  const s = Math.sin(a * 91.7 + b * 47.3) * 43758.5453;
  return s - Math.floor(s);
};

/** Half the width of the envelope on row `y` (0 its widest), for a balloon of radius `r` puffed up to `puff`. */
function halfAt(y: number, r: number, puff: number): number {
  const v = y / (r * puff);
  if (v <= 0) {
    return r * Math.sqrt(Math.max(0, 1 - v * v));
  }
  const mouth = Math.max(0.4, r * MOUTH_WIDE);
  return mouth + (r - mouth) * Math.max(0, 1 - (v / MOUTH) ** 1.8) ** 0.75;
}

/** The colour of the cloth at column `x` of row `y`, before light and haze. */
function cloth({ pattern, colors }: Craft, x: number, y: number, half: number, r: number, puff: number): Rgb {
  const c = (i: number): Rgb => rgb(colors[i % colors.length]);
  const v = y / (r * puff);
  const lon = Math.asin(Math.max(-1, Math.min(1, x / (half + 0.5)))) / Math.PI + 0.5;
  const gore = Math.floor(lon * (r >= 5 ? 8 : r >= 3 ? 6 : 4));
  switch (pattern) {
    case 'gores':
      return c(gore % 2);
    case 'rainbow':
      return c(gore);
    case 'band': {
      if (v < -0.62) {
        return c(2);
      }
      const band = Math.abs(v - 0.2) < Math.max(0.16, 0.6 / r);
      return band ? c(1) : v > 0.85 ? c(2) : c(0);
    }
    case 'patch':
      return c(Math.floor(hash(gore, Math.floor((v + 1) * 1.7)) * 3));
    case 'dots': {
      const row = y + r;
      return r >= 4 && row % 3 === 1 && (x + (row % 6 === 1 ? 0 : 2)) % 4 === 0 ? c(1) : v > 0.9 ? c(2) : c(0);
    }
    case 'heart': {
      const glyph = r >= 6 ? HEART : HEART_SMALL;
      const gy = y + Math.floor(glyph.length / 2) + Math.round(0.1 * r);
      const gx = x + Math.floor(glyph[0].length / 2);
      if (r >= 4 && gy >= 0 && gy < glyph.length && glyph[gy][gx] === 'x') {
        return c(1);
      }
      return v < -0.7 || v > 0.95 ? c(2) : c(0);
    }
    case 'fox': {
      // Orange, a cream muzzle narrowing to the mouth like a fox's chin, a dark nose at its tip, round eyes.
      const eyeY = Math.round(-0.1 * r);
      const eyeX = Math.round(0.42 * r);
      if (r >= 5 && Math.abs(x) === eyeX && (y === eyeY || (r >= 8 && y === eyeY + 1))) {
        return FOX_DARK;
      }
      if (r >= 5 && Math.abs(x) === eyeX + 1 && y === eyeY + Math.round(0.3 * r)) {
        return FOX_BLUSH;
      }
      const muzzle = v > 0.12 && Math.abs(x) <= half * (0.55 + 0.6 * (v - 0.12));
      return muzzle ? c(1) : c(0);
    }
  }
}

/** Each pixel of a balloon, as [x, y, colour] from the anchor, with how much the burner warms it. */
function pixels(craft: Craft, r: number, puff: number, dir: 1 | -1): { x: number; y: number; color: Rgb; warm: number }[] {
  const out: { x: number; y: number; color: Rgb; warm: number }[] = [];
  const top = -Math.round(r * puff);
  const mouth = Math.round(MOUTH * r * puff);
  const rope = Math.max(1, Math.round(r * 0.35));
  const basketHalf = r >= 3 ? Math.max(1, Math.round(r * 0.22)) : 0;
  const basketTall = Math.max(1, Math.round(r * 0.28));
  // The anchor is the foot of the basket: everything is placed from there.
  const foot = mouth + rope + basketTall;
  const fox = craft.pattern === 'fox' && r >= 4;
  for (let y = top; y <= mouth; y++) {
    const half = halfAt(y, r, puff);
    const reach = Math.floor(half + 0.35);
    for (let x = -reach; x <= reach; x++) {
      const v = y / (r * puff);
      const side = (x / (half + 0.5)) * dir;
      let color = cloth(craft, x, y, half, r, puff);
      // The light comes from the side the fox looks to: the far side and the underside are in shade.
      if (side < -0.5 || (v > 0.95 && r >= 3)) {
        color = blend(color, SHADOW, side < -0.75 ? 0.32 : 0.2);
      } else if (r >= 3 && side > 0.25 && side < 0.75 && v > -0.8 && v < -0.25) {
        color = blend(color, SHINE, 0.28);
      }
      out.push({ x, y: y - foot, color, warm: Math.max(0, Math.min(1, (v + 0.2) / (MOUTH + 0.2))) });
    }
  }
  if (fox) {
    // Two pointed ears on top, a little apart, dark inside.
    const tall = Math.max(2, Math.round(r * 0.5));
    for (const side of [-1, 1]) {
      const ex = side * Math.round(r * 0.5);
      const shade = side * dir < 0 ? 0.25 : 0;
      // Down to where the envelope takes over: no gap between an ear and the head.
      for (let k = 0; k <= tall; k++) {
        const y = top - tall + k + 1;
        const spread = Math.floor(k * 0.5 + 0.1);
        // Pointed, and leaning out a little at the tip.
        const lean = k < tall / 2 ? side : 0;
        for (let x = ex + lean - spread; x <= ex + lean + spread; x++) {
          const tip = k === 0;
          const inner = r >= 7 && k === tall - 1 && x === ex + lean;
          const color = tip ? FOX_EAR : inner ? FOX_EAR_INSIDE : blend(rgb(craft.colors[0]), SHADOW, shade);
          out.push({ x, y: y - foot, color, warm: 0 });
        }
      }
    }
  }
  // The nose, at the tip of the muzzle.
  if (fox && r >= 5) {
    for (let x = -(r >= 8 ? 1 : 0); x <= (r >= 8 ? 1 : 0); x++) {
      out.push({ x, y: mouth - 1 - foot, color: FOX_DARK, warm: 0 });
    }
  }
  for (let k = 1; k <= rope; k++) {
    for (const x of basketHalf > 0 ? [-basketHalf, basketHalf] : [0]) {
      out.push({ x, y: mouth + k - foot, color: ROPE, warm: 0.6 });
    }
  }
  for (let k = 1; k <= basketTall; k++) {
    for (let x = -basketHalf; x <= basketHalf; x++) {
      out.push({ x, y: mouth + rope + k - foot, color: k === 1 && basketTall > 1 ? WICKER_LIT : WICKER, warm: k === 1 ? 0.5 : 0.2 });
    }
  }
  return out;
}

const kept = new Map<string, Sprite>();
let keptFor = '';

/**
 * A balloon at radius `r`, puffed up to `puff` (1 when it is full), taken `haze` of the way into `hazeTone`.
 * Painted the first time it is asked for in a view of this size.
 */
export function sprite(view: string, craft: Craft, r: number, puff: number, haze: number, hazeTone: Rgb, dir: 1 | -1): Sprite {
  if (keptFor !== view) {
    kept.clear();
    keptFor = view;
  }
  const key = `${craft.pattern}:${craft.colors.join()}:${r}:${puff}:${haze.toFixed(2)}:${dir}`;
  const found = kept.get(key);
  if (found) {
    return found;
  }
  const all = pixels(craft, r, puff, dir);
  const left = Math.min(...all.map((p) => p.x));
  const top = Math.min(...all.map((p) => p.y));
  const width = Math.max(...all.map((p) => p.x)) - left + 1;
  const height = 1 - top;
  const paint = (lit: boolean) => (ctx: CanvasRenderingContext2D): void => {
    for (const p of all) {
      const color = lit ? blend(p.color, GLOW, 0.6 * p.warm) : p.color;
      ctx.fillStyle = css(blend(color, hazeTone, haze));
      ctx.fillRect(p.x - left, p.y - top, 1, 1);
    }
  };
  const mouth = Math.round(MOUTH * r * puff);
  const rope = Math.max(1, Math.round(r * 0.35));
  const basketTall = Math.max(1, Math.round(r * 0.28));
  const made: Sprite = {
    image: prerender(width, height, paint(false)),
    lit: prerender(width, height, paint(true)),
    left,
    top,
    flame: mouth + 1 - (mouth + rope + basketTall),
    flameTall: r >= 6 ? 2 : 1,
    tall: height,
  };
  kept.set(key, made);
  return made;
}
