import { prerender, px, ramp, seeded, type VistaView } from './paint';
import { hash, lightOn } from './rain-plan';
import { drawMass, drawTree, type Brush, type Kind, type Tones, type Tree } from './rain-trees';

// The Japanese countryside in autumn, seen from the lookout. Three planes: a wooded hill in the distance, its
// forest a patchwork of maples, ginkgos and cedars half lost in the mist; a few small trees in the valley at its
// foot; and close to us, on the left and on the right, tall trees whose trunks and crowns run out of the frame.
// Nothing here moves: each plane is painted once for a view, under the rain and in the warm light, and the two
// are blended as the light comes.

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
/** The ground under the trees, a carpet of fallen leaves. */
const FLOOR = '#7a5238';
/** What the wet air and the warm light do to a colour, and how much of it each row has lost to the air. */
const DULL = '#5c5a64';
const RAIN_AIR = '#a4a7a8';
const SUN = '#ffc860';
const GOLD_AIR = '#f2e0b8';
const GLINT = '#fff2b8';
const HAZE = [0.56, 0.4, 0.04] as const;
/** A farther hill behind the wooded one is hardly more than a shape in the rain. */
const HAZE_BEYOND = 0.74;
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
  tint(tint(color, DULL, 0.24), RAIN_AIR, haze),
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
  /** The measure of the picture (the height of a full-grown tree), half the width of a maple's crown, and the row each plane stands on. */
  readonly tall: number;
  readonly spread: number;
  readonly feet: readonly [number, number, number];
  /** The wooded hill: where its top is, how high it stands over the valley and how far it reaches on each side. */
  readonly hill: { readonly x: number; readonly high: number; readonly reach: number };
  /** The trees that frame the view: taller than the view, so that their crowns leave it by the top. */
  readonly frame: number;
}

function layoutOf({ w, h, dir }: VistaView): Layout {
  const tall = Math.round(Math.min(130, Math.max(46, h * 0.9)));
  const depth = Math.min(10, Math.max(3, Math.round(h * 0.1)));
  return {
    tall,
    spread: Math.round(Math.min(tall * 0.42, Math.max(12, w * 0.2))),
    feet: [h - 3 - depth, h - 3 - Math.round(depth / 2), h - 3],
    // A little toward the side the fox looks to, and wide: it fills the opening between the trees.
    hill: { x: Math.round(w * (0.5 + 0.07 * dir)), high: Math.round(Math.min(74, Math.max(12, h * 0.46))), reach: Math.max(70, w * 0.5) },
    frame: Math.round(Math.max(60, h * 1.32)),
  };
}

/** How high the hill stands at `x`, as a share of its height: a broad rounded back, never quite regular. */
function hillAt(x: number, hill: Layout['hill']): number {
  const away = (x - hill.x) / hill.reach;
  return Math.max(0, 1 - away * away) ** 1.3 * (0.94 + 0.06 * Math.sin(x * 0.09 + 1.7));
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
  const { w, h, dir } = view;
  const { tall, spread, feet, hill, frame } = layoutOf(view);
  const random = seeded(0x6a70);
  const shivers: Shiver[] = [];
  const rows = HAZE.map(() => [0, 1].map(() => prerender(w, h, () => undefined)));
  const inks = rows.map((row) => row.map((image) => image.getContext('2d') as CanvasRenderingContext2D));
  const brush = (row: number, leaves: Tones, thick: number, haze = HAZE[row]): Brush => {
    const tones = tonesIn(leaves, haze);
    return {
      inks: inks[row],
      leaves: tones,
      bark: tonesIn(BARK, haze),
      light: dir,
      thick,
      shiver: row === NEAR ? (x, y, tone) => shivers.length < MOST_SHIVERS && shivers.push({ x, y, colors: [tones[0][tone], tones[1][tone]] }) : undefined,
    };
  };
  const anyLeaves = (): Tones => (random() < 0.24 ? GINKGO : MAPLES[Math.floor(random() * MAPLES.length)]);

  // Far: a paler hill beyond, then the wooded hill, its forest a patchwork of crowns with a dark spire here and there.
  const beyond = { x: hill.x - dir * hill.reach * 0.75, high: hill.high * 0.72, reach: hill.reach * 0.9 };
  const ghost = tonesIn(BARK, HAZE_BEYOND);
  const earth = tonesIn(MAPLES[ORANGE], HAZE[FAR]);
  for (let x = 0; x < w; x++) {
    const far = Math.round(beyond.high * hillAt(x, beyond));
    const near = Math.round(hill.high * hillAt(x, hill));
    inks[FAR].forEach((ink, k) => {
      px(ink, x, feet[FAR] - far, ghost[k][1], 1, 1, far);
      px(ink, x, feet[FAR] - near, earth[k][0], 1, 1, near);
    });
  }
  const crown = Math.min(7, Math.max(3, Math.round(hill.high * 0.15)));
  for (let x = -crown; x < w + crown; x += crown * (0.9 + 0.5 * random())) {
    const high = hill.high * hillAt(x, hill);
    for (let up = high; up > crown * 0.4; up -= crown * (0.7 + 0.3 * random())) {
      const seed = Math.floor(random() * 1000);
      const at = x + (random() - 0.5) * crown;
      if (up === high && random() < 0.16) {
        drawTree(brush(FAR, CEDAR, 1), { kind: 'cedar', x: Math.round(at), foot: Math.round(feet[FAR] - up + crown), tall: Math.round(crown * 3.4), spread: crown * 0.7, lean: 1, seed });
      } else {
        drawMass(brush(FAR, anyLeaves(), 1), at, feet[FAR] - up + crown * 0.2, crown * (0.9 + 0.4 * random()), crown * 0.7, seed);
      }
    }
  }
  drawFloor(view, inks[FAR], feet[FAR], HAZE[FAR], random);

  // Middle: a few small trees in the valley, at the foot of the hill, kept away from behind the fox.
  drawFloor(view, inks[MIDDLE], feet[MIDDLE], HAZE[MIDDLE], random);
  plant(view, random, Math.round(tall * 0.36), Math.round(spread * 0.42), feet[MIDDLE], 14, 1.6, [MAPLES[GOLD], MAPLES[ORANGE]]).forEach((tree) =>
    drawTree(brush(MIDDLE, tree.leaves, 1), tree),
  );

  // Near: the trees that frame the view. One stands at each edge, its trunk half out of the picture and its crown
  // leaning in over our heads; a wide view has a slimmer one beside it, and the middle stays open on the hill.
  drawFloor(view, inks[NEAR], feet[NEAR], HAZE[NEAR], random);
  const thick = Math.min(6, Math.max(3, Math.round(h / 16)));
  const wide = Math.round(Math.min(frame * 0.4, Math.max(16, w * 0.2)));
  const framing: Planted[] = [-1, 1].flatMap((side) => {
    const edge = side < 0 ? 0 : w;
    const lean = -side as 1 | -1;
    const first: Planted = { kind: 'maple', x: Math.round(edge - side * wide * 0.3), foot: feet[NEAR], tall: frame, spread: wide, lean, seed: 11 + side, leaves: MAPLES[side * dir > 0 ? VERMILION : GOLD] };
    if (w < wide * 7) {
      return [first];
    }
    const kind: Kind = side * dir > 0 ? 'cedar' : 'ginkgo';
    const second: Planted = { kind, x: Math.round(edge - side * wide * 1.75), foot: feet[NEAR], tall: Math.round(frame * (kind === 'cedar' ? 0.84 : 0.92)), spread: Math.round(wide * (kind === 'cedar' ? 0.36 : 0.5)), lean, seed: 31 + side, leaves: kind === 'cedar' ? CEDAR : GINKGO };
    return [second, first];
  });
  framing.forEach((tree) => drawTree(brush(NEAR, tree.leaves, tree.kind === 'maple' ? thick : thick - 1), tree));
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
