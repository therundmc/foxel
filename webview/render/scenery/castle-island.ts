import { prerender, seeded } from './paint';
import { blend, rgb, wander, type Rgb } from './clouds-pixels';

// The island in the sky, painted once for a size: a great clod of rock tapering to a point underneath, roots
// and vines hanging from it, a green top with round trees, and on it an old stone castle the ivy is taking
// back: a tall keep with a green-bronze spire, a lesser tower, a hall, a ruined tower open to the sky. It is
// lit from the side the sun is on, `sun`; its waterfalls are painted every frame, from the places given here.

const ROCK = [rgb('#dcc09e'), rgb('#ad968e'), rgb('#7f7894'), rgb('#5f5b7e')] as const;
const SOIL = [rgb('#9a7454'), rgb('#6e5446')] as const;
const ROOT = [rgb('#7c6452'), rgb('#56464c')] as const;
const LEAVES = [rgb('#94cc72'), rgb('#5fa064'), rgb('#3d7660')] as const;
const VINE = [rgb('#74b260'), rgb('#4a8458')] as const;
const STONE = [rgb('#efe5d2'), rgb('#cbc0b6'), rgb('#9c97b6')] as const;
const SPIRE = [rgb('#86c0a8'), rgb('#4f8490')] as const;
const SLATE = [rgb('#8e98c0'), rgb('#626a98')] as const;
const TILE = [rgb('#c08a72'), rgb('#8a5e62')] as const;
const DARK = rgb('#4a4866');
/** What the sun turns its lit faces to, once it falls on the island. */
const WARM = rgb('#ffcf8a');
/** Before it comes out, it is a pale shape in the cloud's mist. */
const MIST = rgb('#c9d9ef');
const SHADOW = rgb('#7c7cb8');

/** The three looks of the island: veiled in mist, clear, and in the warm sun; and where its waterfalls start. */
export interface Island {
  readonly veiled: HTMLCanvasElement;
  readonly clear: HTMLCanvasElement;
  readonly warm: HTMLCanvasElement;
  /** Its shape alone, in the lilac of a cloud's shade: what shows of it through the cloud. */
  readonly shadow: HTMLCanvasElement;
  /** Its middle and the row of its top on its canvas; its width, and how far its tip hangs under its top. */
  readonly ox: number;
  readonly oy: number;
  readonly size: number;
  readonly deep: number;
  /** How far its spire stands over its top. */
  readonly tall: number;
  /** Where each waterfall spills, from its middle top, and the row under it where the rock no longer is. */
  readonly falls: readonly (readonly [number, number, number])[];
}

class Canvas {
  readonly color: (Rgb | undefined)[];
  readonly lit: Uint8Array;
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.color = new Array(w * h);
    this.lit = new Uint8Array(w * h);
  }
  set(x: number, y: number, c: Rgb, lit = false): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) {
      this.color[y * this.w + x] = c;
      this.lit[y * this.w + x] = lit ? 1 : 0;
    }
  }
  has(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.color[y * this.w + x] !== undefined;
  }
  /** A look of the whole: each colour turned by `tint`. */
  render(tint: (c: Rgb, lit: boolean) => Rgb): HTMLCanvasElement {
    return prerender(this.w, this.h, (ctx) => {
      for (let i = 0; i < this.color.length; i++) {
        const c = this.color[i];
        if (c) {
          const t = tint(c, this.lit[i] === 1);
          ctx.fillStyle = `rgb(${Math.round(t[0])},${Math.round(t[1])},${Math.round(t[2])})`;
          ctx.fillRect(i % this.w, Math.floor(i / this.w), 1, 1);
        }
      }
    });
  }
}

/** A round crown of leaves, lit on the sun's side and from above. */
function crown(out: Canvas, x: number, y: number, r: number, sun: number): void {
  for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
    for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
      const d = Math.hypot(dx, dy);
      if (d <= r + 0.15) {
        const facing = (dx * sun * 0.6 - dy * 0.8) / Math.max(1, r);
        const tone = facing > 0.3 && d < r - 0.3 ? 0 : facing > -0.35 ? 1 : 2;
        out.set(x + dx, y + dy, LEAVES[tone], tone === 0);
      }
    }
  }
}

/** A block of the castle from `left` to `right`, `bottom` up to `top`, rounded like a tower if `round`. */
function block(out: Canvas, left: number, right: number, bottom: number, top: number, sun: number, tones: readonly Rgb[], round: boolean): void {
  const mid = (left + right) / 2;
  const half = Math.max(0.5, (right - left) / 2);
  for (let x = Math.round(left); x <= Math.round(right); x++) {
    const u = ((x - mid) / half) * sun;
    const tone = round ? (u > 0.2 ? 0 : u > -0.45 ? 1 : 2) : u > -0.6 ? 0 : 1;
    for (let y = Math.round(top); y <= Math.round(bottom); y++) {
      out.set(x, y, tones[Math.min(tones.length - 1, tone)], tone === 0);
    }
  }
}

/** A pointed roof standing on `base`, `half` wide each side, its tip `tall` above. */
function roof(out: Canvas, mid: number, base: number, half: number, tall: number, sun: number, tones: readonly Rgb[]): void {
  for (let y = 0; y <= tall; y++) {
    const reach = half * (1 - y / (tall + 0.5));
    for (let x = Math.round(mid - reach); x <= Math.round(mid + reach); x++) {
      const lit = (x - mid) * sun >= -0.2;
      out.set(x, base - y, tones[lit ? 0 : 1], lit);
    }
  }
}

function paintCastle(out: Canvas, random: () => number, cx: number, ground: (x: number) => number, s: number, sun: number): number {
  const at = (u: number): number => cx + u * s * -sun;
  const foot = (u: number): number => ground(at(u)) + 1;
  const span = (a: number, b: number): [number, number] => [Math.min(at(a), at(b)), Math.max(at(a), at(b))];
  const keepTop = foot(0) - s * 0.33;
  const spire = Math.max(3, s * 0.13);
  // From the back: the lesser tower, the hall, the wall, the keep, the ruin in front.
  const [t2l, t2r] = span(0.11, 0.18);
  const t2top = foot(0.145) - s * 0.2;
  block(out, t2l, t2r, foot(0.145), t2top, sun, STONE, true);
  roof(out, (t2l + t2r) / 2, t2top, (t2r - t2l) / 2 + 1, Math.max(2, s * 0.08), sun, SLATE);
  const [hl, hr] = span(-0.15, -0.04);
  const htop = foot(-0.1) - s * 0.12;
  block(out, hl, hr, foot(-0.1), htop, sun, STONE, false);
  roof(out, (hl + hr) / 2, htop, (hr - hl) / 2 + 1, Math.max(2, s * 0.05), sun, TILE);
  const [wl, wr] = span(-0.25, 0.23);
  for (let x = Math.round(wl); x <= Math.round(wr); x++) {
    const top = foot(0) - s * 0.06;
    // Crenels on the wall, where it is big enough to have them.
    const crenel = s >= 40 && (x - Math.round(wl)) % 3 === 2 ? 1 : 0;
    for (let y = Math.round(top + crenel); y <= ground(x); y++) {
      out.set(x, y, STONE[y < top + 1.5 ? 0 : 1], y < top + 1.5);
    }
    // Arches along its foot: the gallery of a cloister nobody walks any more.
    if (s >= 48 && (x - Math.round(wl)) % 4 < 2 && x > wl + 1 && x < wr - 1) {
      for (let y = ground(x) - Math.round(s * 0.035); y <= ground(x) - 1; y++) {
        out.set(x, y, DARK);
      }
    }
  }
  const [kl, kr] = span(-0.05, 0.05);
  block(out, kl, kr, foot(0), keepTop, sun, STONE, true);
  roof(out, (kl + kr) / 2, keepTop, (kr - kl) / 2 + 1.2, spire, sun, SPIRE);
  const [rl, rr] = span(-0.22, -0.15);
  const rtop = foot(-0.185) - s * 0.15;
  block(out, rl, rr, foot(-0.185), rtop, sun, STONE, true);
  // Its top broken off, jagged.
  for (let x = Math.round(rl); x <= Math.round(rr); x++) {
    const bite = Math.floor(random() * Math.max(2, s * 0.04));
    for (let y = Math.round(rtop); y < rtop + bite; y++) {
      out.color[y * out.w + x] = undefined;
    }
  }
  // Windows: slits in the towers, two in the hall.
  const slit = Math.max(1, Math.round(s * 0.025));
  for (const [u, v] of [[0, 0.22], [0, 0.14], [0.145, 0.13], [-0.075, 0.07], [-0.12, 0.07], [-0.185, 0.09]] as const) {
    if (s < 36 && v < 0.12) {
      continue;
    }
    for (let k = 0; k < slit; k++) {
      out.set(at(u), foot(u) - s * v + k, DARK);
    }
  }
  // Ivy climbing the walls, thickest low down and over the ruin.
  for (let n = Math.round(s * 0.5); n > 0; n--) {
    const u = -0.25 + random() * 0.48;
    const x = Math.round(at(u));
    const high = u < -0.14 ? 0.15 : u > -0.06 && u < 0.06 ? 0.2 : 0.07;
    const y = Math.round(foot(u) - random() ** 1.6 * s * high);
    if (out.has(x, y)) {
      out.set(x, y, VINE[random() < 0.5 ? 0 : 1]);
    }
  }
  return keepTop - spire;
}

export function paintIsland(size: number, sun: 1 | -1): Island {
  const s = size;
  const a = s / 2;
  const random = seeded(0x1a7d + s);
  const roll = wander(0x51a);
  const pad = Math.ceil(s * 0.08) + 3;
  const up = Math.ceil(s * 0.5) + 2;
  const deep = Math.round(s * 0.56);
  const w = s + pad * 2;
  const h = up + deep + Math.ceil(s * 0.16) + 2;
  const ox = Math.round(w / 2);
  const oy = up;
  const out = new Canvas(w, h);
  // Its top: a low green dome, its rim curling down at the ends.
  const ground = (x: number): number => {
    const u = Math.min(1, Math.abs(x - ox) / a);
    return Math.round(oy - s * 0.035 * (1 - u * u) + s * 0.05 * u ** 8 + roll((x - ox) / 9) * s * 0.008);
  };
  // Its underside, tapering to a point a little off the middle, ragged with spurs of rock.
  const tip = ox - sun * s * 0.08;
  const bottom = new Int16Array(w);
  for (let x = 0; x < w; x++) {
    const q = Math.min(1, Math.abs(x - tip) / (x < tip ? tip - (ox - a) : ox + a - tip));
    // Full under the rim, then drawn down to its point like a root vegetable.
    const taper = Math.max(0, 1 - q ** 1.25) ** 1.15;
    const spur = random() < 0.12 ? random() * s * 0.06 : 0;
    bottom[x] = Math.abs(x - ox) > a ? -1 : Math.round(oy + Math.max(s * 0.05, deep * taper + (roll((x - ox) / 5 + 30) * 0.035 + roll((x - ox) / 14 + 70) * 0.06) * s * Math.sqrt(taper) + spur * taper));
  }
  const strata = wander(0x5a7a);
  for (let y = oy - 3; y < h; y++) {
    let left = w;
    let right = -1;
    for (let x = 0; x < w; x++) {
      if (bottom[x] >= y && ground(x) < y) {
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    }
    for (let x = left; x <= right; x++) {
      if (bottom[x] < y || ground(x) >= y) {
        continue;
      }
      const across = ((x - (left + right) / 2) / Math.max(1, (right - left) / 2)) * sun;
      const down = (y - oy) / deep;
      const band = 0.11 * Math.sin((y + strata(x / 7) * 2.2) * 1.05);
      const light = 0.55 + 0.42 * across - 0.75 * down + band;
      const tone = light > 0.68 ? 0 : light > 0.4 ? 1 : light > 0.12 ? 2 : 3;
      const soil = y - ground(x) <= Math.max(1, Math.round(s * 0.025));
      out.set(x, y, soil ? SOIL[across > -0.3 ? 0 : 1] : ROCK[tone], soil ? across > -0.3 : tone === 0);
    }
  }
  // Roots creeping a little way down the rock face from the soil, and a few hanging from its underside.
  const root = (x0: number, y0: number, length: number, tone: Rgb, free: boolean): void => {
    let x = x0;
    let lean = random() < 0.5 ? -1 : 1;
    for (let k = 0, y = y0; k < length; k++, y++) {
      if (!free && y >= bottom[Math.round(x)]) {
        return;
      }
      out.set(x, y, tone);
      if (random() < 0.35) {
        x += lean;
        lean = random() < 0.3 ? -lean : lean;
      }
    }
  };
  for (let n = Math.round(s / 10); n > 0; n--) {
    const x = Math.round(ox + (random() * 2 - 1) * a * 0.8);
    root(x, ground(x) + 2, Math.round(s * (0.03 + random() * 0.07)), ROOT[((x - ox) * sun > 0 ? 0 : 1)], false);
  }
  for (let n = Math.max(2, Math.round(s / 12)); n > 0; n--) {
    const x = Math.round(tip + (random() * 2 - 1) * a * 0.5);
    const long = n <= 2;
    root(x, bottom[x] + 1, Math.round(s * (long ? 0.08 + random() * 0.06 : 0.02 + random() * 0.03)), ROOT[1], true);
  }
  // Vines over its rim, the outer ones hanging free in the air.
  for (let n = Math.round(s / 6); n > 0; n--) {
    const u = (random() < 0.5 ? -1 : 1) * (0.35 + random() * 0.68);
    const x = Math.round(ox + u * a);
    const top = ground(Math.max(0, Math.min(w - 1, Math.round(ox + Math.sign(u) * Math.min(Math.abs(u), 1) * a))));
    const lit = u * sun > 0;
    for (let k = 0; k < Math.round(s * (0.04 + random() * 0.18)); k++) {
      out.set(x, top + 1 + k, VINE[lit && k % 3 === 0 ? 0 : 1], lit);
      if (k % 2 === 1 && s >= 40) {
        out.set(x + (k % 4 === 1 ? 1 : -1), top + 1 + k, VINE[0], true);
      }
    }
  }
  // The grass on its top.
  for (let x = Math.round(ox - a); x <= Math.round(ox + a); x++) {
    const across = ((x - ox) / a) * sun;
    out.set(x, ground(x), LEAVES[across > -0.4 ? 0 : 1], across > -0.4);
    out.set(x, ground(x) + 1, LEAVES[1]);
  }
  // Trees behind the castle, the castle, and a few in front of its foot.
  const cx = ox - sun * s * 0.06;
  const trees = (count: number, from: number, to: number, scale: number): void => {
    for (let n = 0; n < count; n++) {
      const x = Math.round(ox + (from + (to - from) * ((n + random() * 0.8) / count)) * a);
      const r = Math.max(1.3, s * (0.025 + random() * 0.03) * scale);
      crown(out, x, ground(x) - r * 0.75, r, sun);
    }
  };
  trees(Math.max(3, Math.round(s / 9)), -0.95, 0.95, 1.1);
  const tall = oy - paintCastle(out, random, cx, ground, s, sun);
  trees(Math.max(2, Math.round(s / 14)), -0.8, 0.8, 0.8);
  // The falls spill from notches in the rim: one at each end, one down the face under the castle.
  const falls = [-0.66, 0.12, 0.74].map((u) => {
    const x = Math.round(ox + u * a * -sun);
    return [x - ox, ground(x) - oy + 1, Math.max(0, bottom[x]) - oy] as const;
  });
  return {
    veiled: out.render((c) => blend(c, MIST, 0.72)),
    clear: out.render((c) => blend(c, MIST, 0.06)),
    warm: out.render((c, lit) => blend(c, WARM, lit ? 0.42 : 0.14)),
    shadow: out.render(() => SHADOW),
    ox,
    oy,
    size: s,
    deep,
    tall,
    falls,
  };
}

let painted: { key: string; island: Island } | undefined;

export function islandOf(size: number, sun: 1 | -1): Island {
  const key = `${size}:${sun}`;
  if (painted?.key !== key) {
    painted = { key, island: paintIsland(size, sun) };
  }
  return painted.island;
}
