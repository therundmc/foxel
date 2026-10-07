import { prerender, px, ramp, seeded, type VistaView } from './paint';
import { hash, lightOn } from './rain-plan';
import { drawMass, drawTree, type Brush, type Kind, type Tones, type Tree } from './rain-trees';

// The grove: a Japanese forest in autumn, a little way beyond the lookout. Three rows of trees: a far one that is
// only soft masses in the mist, a paler middle one with a little torii among its trunks, and a near one of tall
// maples, ginkgos and cedars on both sides of the fox. Nothing here moves: each row is painted once for a view,
// under the rain and in the warm light, and the two are blended as the light comes.

/** Maples in vermilion, scarlet, orange and gold; the clear yellow of a ginkgo; the dark of a cedar. */
const MAPLES: readonly Tones[] = [
  ['#a02c20', '#d0442a', '#ee6c3c'],
  ['#84202e', '#b62c34', '#d84c44'],
  ['#b2581e', '#de7c28', '#f4a446'],
  ['#b48622', '#dfa930', '#f4cc5a'],
];
const VERMILION = 0;
const ORANGE = 2;
const GOLD = 3;
const GINKGO: Tones = ['#bd9828', '#e8c83c', '#f8e682'];
const CEDAR: Tones = ['#22352f', '#2f4a3c', '#48674d'];
const BARK: Tones = ['#2e2226', '#3b2b2e', '#5e4a48'];
/** The ground under the trees, a carpet of fallen leaves; and the torii. */
const FLOOR = '#8a5c3e';
const TORII = '#c8412c';
/** What the wet air and the warm light do to a colour, and how much of it each row has lost to the air. */
const DULL = '#6e6a70';
const RAIN_AIR = '#c6c7c4';
const SUN = '#ffc860';
const GOLD_AIR = '#f2e0b8';
const GLINT = '#fff2b8';
const HAZE = [0.72, 0.42, 0.06] as const;
const [FAR, MIDDLE, NEAR] = [0, 1, 2];

/** The colour `amount` of the way from one `#rrggbb` to another, as `#rrggbb` again so it can be blended further. */
function tint(from: string, to: string, amount: number): string {
  const part = (i: number): string => {
    const a = parseInt(from.slice(i, i + 2), 16);
    const b = parseInt(to.slice(i, i + 2), 16);
    return Math.round(a + (b - a) * amount).toString(16).padStart(2, '0');
  };
  return `#${part(1)}${part(3)}${part(5)}`;
}

/** A colour as a row of trees shows it: under the rain, and in the warm light. */
const lights = (color: string, haze: number): [string, string] => [
  tint(tint(color, DULL, 0.1), RAIN_AIR, haze),
  tint(tint(color, SUN, 0.16), GOLD_AIR, haze * 0.6),
];

/** Three tones in both lights; in the warm one, what is lit glows. */
function tonesIn(tones: Tones, haze: number): Tones[] {
  const [shade, body, light] = tones.map((color) => lights(color, haze));
  return [
    [shade[0], body[0], light[0]],
    [shade[1], body[1], tint(light[1], GLINT, 0.3 * (1 - haze))],
  ];
}

interface Layout {
  /** How tall a near tree is, half the width of a maple's crown, and the row each row of trees stands on. */
  readonly tall: number;
  readonly spread: number;
  readonly feet: readonly [number, number, number];
}

// Tall trees: in a low view their crowns run off the top. In a narrow one they are slender, so trunks still show.
function layoutOf({ w, h }: VistaView): Layout {
  const tall = Math.round(Math.min(130, Math.max(46, h * 0.9)));
  const depth = Math.min(10, Math.max(3, Math.round(h * 0.1)));
  return {
    tall,
    spread: Math.round(Math.min(tall * 0.42, Math.max(12, w * 0.22))),
    feet: [h - 3 - depth, h - 3 - Math.round(depth / 2), h - 3],
  };
}

interface Planted extends Tree {
  readonly leaves: Tones;
}

// A row of trees on both sides of the fox, leaving `gap` pixels of clear air between it and the nearest crowns.
// The two nearest are maples of the given colours; the others come as they will, `loose` setting how far apart.
function plant(view: VistaView, random: () => number, tall: number, wide: number, foot: number, gap: number, loose: number, nearest: readonly [Tones, Tones]): Planted[] {
  const { w, foxX, dir } = view;
  const trees: Planted[] = [];
  [dir, -dir].forEach((side, s) => {
    let x = foxX + side * (wide + gap);
    let before = wide;
    for (let n = 0; ; n++) {
      const roll = random();
      const kind: Kind = n === 0 || roll < 0.55 ? 'maple' : roll < 0.8 ? 'ginkgo' : 'cedar';
      const spread = n === 0 ? wide : Math.max(3, Math.round(wide * (kind === 'maple' ? 0.8 + 0.3 * random() : kind === 'ginkgo' ? 0.5 : 0.36)));
      x += n === 0 ? 0 : side * (before + spread) * (0.78 + loose * random());
      if (x + spread < 0 || x - spread > w) {
        break;
      }
      trees.push({
        kind,
        x: Math.round(x),
        foot,
        tall: Math.round(tall * (kind === 'maple' ? 0.84 + 0.18 * random() : 1 + 0.14 * random())),
        spread,
        lean: n === 0 ? (side as 1 | -1) : random() < 0.5 ? 1 : -1,
        seed: Math.floor(random() * 1000),
        leaves: kind === 'cedar' ? CEDAR : kind === 'ginkgo' ? GINKGO : n === 0 ? nearest[s] : MAPLES[Math.floor(random() * MAPLES.length)],
      });
      before = spread;
    }
  });
  return trees;
}

/** A little torii, `tall` pixels high, its posts standing on row `foot`. */
function drawTorii(inks: readonly CanvasRenderingContext2D[], x: number, foot: number, tall: number): void {
  const half = Math.round(tall * 0.45);
  const tie = Math.max(2, Math.round(tall * 0.3));
  const top = foot - tall;
  const red = lights(TORII, HAZE[MIDDLE] * 0.6);
  const cap = lights(BARK[1], HAZE[MIDDLE] * 0.6);
  inks.forEach((ink, k) => {
    // The dark lintel with its upturned ends, the red beam under it, the tie beam, the strut between, the posts.
    px(ink, x - half - 2, top, cap[k], 1, 2 * half + 5, 1);
    px(ink, x - half - 3, top - 1, cap[k]);
    px(ink, x + half + 3, top - 1, cap[k]);
    px(ink, x - half - 2, top + 1, red[k], 1, 2 * half + 5, 1);
    px(ink, x - half - 1, top + 1 + tie, red[k], 1, 2 * half + 3, 1);
    px(ink, x, top + 2, red[k], 1, 1, tie - 1);
    [-half, half].forEach((post) => px(ink, x + post, top + 2, red[k], 1, tall >= 14 ? 2 : 1, tall - 2));
  });
}

// The ground a row stands on, from its foot down: a carpet of fallen leaves, a few of them still bright.
function drawFloor({ w, h }: VistaView, inks: readonly CanvasRenderingContext2D[], foot: number, haze: number, random: () => number): void {
  const floor = lights(FLOOR, haze);
  inks.forEach((ink, k) => px(ink, 0, foot, floor[k], 1, w, h - foot));
  for (let n = Math.round(w * (h - foot) * 0.08); n > 0; n--) {
    const leaf = lights(MAPLES[Math.floor(random() * MAPLES.length)][1], haze);
    const x = Math.floor(random() * w);
    const y = foot + Math.floor(random() * (h - foot));
    inks.forEach((ink, k) => px(ink, x, y, leaf[k]));
  }
}

interface Shiver {
  readonly x: number;
  readonly y: number;
  /** The tone the leaf flicks to, under the rain and in the warm light. */
  readonly colors: readonly [string, string];
}
const MOST_SHIVERS = 160;

interface Row {
  readonly rainy: HTMLCanvasElement;
  readonly golden: HTMLCanvasElement;
}

export interface Grove {
  readonly key: string;
  /** How tall its near trees are, and the row each row of trees stands on, the farthest first. */
  readonly tall: number;
  readonly feet: readonly [number, number, number];
  readonly rows: readonly Row[];
  readonly shivers: readonly Shiver[];
}

function drawGrove(view: VistaView, key: string): Grove {
  const { w, h, foxX, dir } = view;
  const { tall, spread, feet } = layoutOf(view);
  const random = seeded(0x6a70);
  const shivers: Shiver[] = [];
  const rows = HAZE.map(() => [0, 1].map(() => prerender(w, h, () => undefined)));
  const inks = rows.map((row) => row.map((image) => image.getContext('2d') as CanvasRenderingContext2D));
  const brush = (row: number, leaves: Tones, thick: number): Brush => {
    const tones = tonesIn(leaves, HAZE[row]);
    return {
      inks: inks[row],
      leaves: tones,
      bark: tonesIn(BARK, HAZE[row]),
      light: dir,
      thick,
      shiver: row === NEAR ? (x, y, tone) => shivers.length < MOST_SHIVERS && shivers.push({ x, y, colors: [tones[0][tone], tones[1][tone]] }) : undefined,
    };
  };

  // Far: soft masses of foliage, a dark spire here and there, their feet lost in the mist.
  const band = Math.round(tall * 0.22);
  const russet = tonesIn(MAPLES[ORANGE], HAZE[FAR]);
  inks[FAR].forEach((ink, k) => px(ink, 0, feet[FAR] - band, russet[k][1], 1, w, band));
  for (let x = -spread * 0.3; x < w + spread * 0.3; x += spread * (0.3 + 0.25 * random())) {
    const roll = random();
    const seed = Math.floor(random() * 1000);
    if (roll < 0.14) {
      drawTree(brush(FAR, CEDAR, 1), { kind: 'cedar', x: Math.round(x), foot: feet[FAR], tall: Math.round(tall * (0.5 + 0.14 * random())), spread: spread * 0.2, lean: 1, seed });
    } else {
      const rx = spread * (0.38 + 0.28 * random());
      const mass = brush(FAR, roll < 0.36 ? GINKGO : MAPLES[Math.floor(random() * MAPLES.length)], 1);
      drawMass(mass, x, feet[FAR] - tall * (0.24 + 0.16 * random()), rx, rx * 0.7, seed);
      drawMass(mass, x + rx * 0.4, feet[FAR] - band * 0.7, rx * 1.1, band * 0.6, seed + 1);
    }
  }
  const air = lights(RAIN_AIR, 0);
  inks[FAR].forEach((ink, k) => {
    px(ink, 0, feet[FAR] - band, air[k], 0.3, w, h);
    px(ink, 0, feet[FAR] - Math.round(band * 0.45), air[k], 0.35, w, h);
  });
  drawFloor(view, inks[FAR], feet[FAR], HAZE[FAR], random);

  // Near: the tall trees, a vermilion maple on the side the fox looks to and a gold one on the other.
  const near = plant(view, random, tall, spread, feet[NEAR], Math.min(18, Math.round(w * 0.2)), 0.35, [MAPLES[VERMILION], MAPLES[GOLD]]);
  // The torii stands in the middle distance between the first two trunks on the side the fox looks to, if both are in view.
  const ahead = near.filter((tree) => (tree.x - foxX) * dir > 0);
  const toriiTall = Math.min(18, Math.max(9, Math.round(tall * 0.2)));
  const toriiX = ahead.length > 1 ? Math.round((ahead[0].x + ahead[1].x) / 2) : undefined;
  const torii = toriiX !== undefined && Math.abs(ahead[1].x - ahead[0].x) > toriiTall * 1.6 && Math.min(ahead[1].x, w - ahead[1].x) > 4 ? toriiX : undefined;

  // Middle: the same trees, smaller, paler and thinner, in gold and orange behind the fox so its coat stands out.
  drawFloor(view, inks[MIDDLE], feet[MIDDLE], HAZE[MIDDLE], random);
  plant(view, random, Math.round(tall * 0.7), Math.round(spread * 0.68), feet[MIDDLE], 12, 0.7, [MAPLES[GOLD], MAPLES[ORANGE]])
    .filter((tree) => torii === undefined || Math.abs(tree.x - torii) > toriiTall * 0.45 + 4)
    .forEach((tree) => drawTree(brush(MIDDLE, tree.leaves, 1), tree));
  if (torii !== undefined) {
    drawTorii(inks[MIDDLE], torii, feet[MIDDLE], toriiTall);
  }

  drawFloor(view, inks[NEAR], feet[NEAR], HAZE[NEAR], random);
  near.forEach((tree) => drawTree(brush(NEAR, tree.leaves, tall >= 60 ? 3 : 2), tree));
  return { key, tall, feet, rows: rows.map(([rainy, golden]) => ({ rainy, golden })), shivers };
}

let painted: Grove | undefined;

/** The grove of this view, painted the first time it is asked for. */
export function groveOf(view: VistaView): Grove {
  const key = `${view.w}:${view.h}:${view.foxX}:${view.dir}`;
  if (painted?.key !== key) {
    painted = drawGrove(view, key);
  }
  return painted;
}

/** One row of trees, 0 the farthest: the warm light reaches it a little after the one behind. */
export function paintRow({ ctx, moment }: VistaView, grove: Grove, index: number): void {
  const row = grove.rows[index];
  const warm = lightOn(moment, index);
  if (warm < 1) {
    ctx.drawImage(row.rainy, 0, 0);
  }
  if (warm > 0) {
    ctx.globalAlpha = warm;
    ctx.drawImage(row.golden, 0, 0);
    ctx.globalAlpha = 1;
  }
}

/** How often a leaf may change, in a second; how many are flicked at a time, and how many more in the breath of wind. */
const SHIVERS = 2.2;
const FLICKED = 0.3;
const GUST = 0.35;

/** The near foliage shivers under the rain: a few leaves flick to a darker tone and back. */
export function paintShiver({ ctx, t, moment }: VistaView, grove: Grove): void {
  const warm = lightOn(moment, NEAR);
  const gust = moment === undefined ? 0 : ramp(moment, 0, 0.6) * (1 - ramp(moment, 2, 4));
  grove.shivers.forEach((leaf, i) => {
    if (hash(i, Math.floor(t * SHIVERS * (1 + gust) + i * 0.37)) < FLICKED + GUST * gust) {
      px(ctx, leaf.x, leaf.y, leaf.colors[0]);
      px(ctx, leaf.x, leaf.y, leaf.colors[1], warm);
    }
  });
}
