import { ramp, seeded, type VistaView } from './paint';
import { breeze, gustHolds, sinceGust } from './wheat-wind';

// The wheat right beside us: a few ears on their stalks in the two bottom corners, so near that they are big,
// and two or three poppies among them. They sway with the breeze and lean right over under the great gust.

const STALK = '#a8923e';
const STALK_DIM = '#8d7a34';
const BEARD = '#b98a30';
/** The grains of an ear: down its middle, on its sunlit side and on its shaded one. */
const GRAIN = '#d79a2e';
const GRAIN_LIT = '#f6cf62';
const GRAIN_DIM = '#a66f22';
const STEM = '#7f9a4c';
const PETAL = '#e8472f';
const PETAL_LIT = '#ff7d58';
const PETAL_DIM = '#b52c2a';
const HEART = '#3b2230';
/** Every tone, in the order they are painted: what comes later lies over what came before. */
const TONES = [STALK, STALK_DIM, BEARD, GRAIN, GRAIN_LIT, GRAIN_DIM, STEM, PETAL, PETAL_LIT, PETAL_DIM, HEART];
/** A poppy seen from the side, its cup open to the sky: rows of tones, '' for nothing. */
const POPPY = [
  [PETAL, PETAL_LIT, '', PETAL, PETAL],
  [PETAL, PETAL, PETAL_LIT, PETAL, PETAL],
  [PETAL_DIM, PETAL, HEART, PETAL, PETAL_DIM],
  ['', PETAL_DIM, PETAL_DIM, PETAL_DIM, ''],
];

/** How wide a corner they may fill, and how much of the view's height the tallest takes. */
const CORNER = 26;
const TALLEST = 0.52;
/** A stalk at least this tall bears a big ear, five pixels across; a shorter one a small ear, three across. */
const BIG_FROM = 16;
/** The fox, and the spot a bird may come and sit on beside it, are left clear by this much. */
const CLEAR_OF_FOX = 20;
const CLEAR_OF_BIRD = 32;
/** How far it leans at rest, sways in the breeze and bows under the gust, in radians. */
const REST = 0.16;
const SWAY = 0.2;
const BOWED = 0.95;

interface Stem {
  readonly x: number;
  readonly tall: number;
  readonly poppy: boolean;
  readonly dim: boolean;
  readonly phase: number;
}

let kept: { key: string; stems: readonly Stem[] } | undefined;

function stemsOf({ w, h, foxX, dir }: VistaView): readonly Stem[] {
  const key = `${w}:${h}:${foxX}:${dir}`;
  if (kept?.key === key) {
    return kept.stems;
  }
  const random = seeded(0xea25);
  const tallest = Math.min(34, Math.max(11, Math.round(h * TALLEST)));
  const stems: Stem[] = [];
  for (const side of [-1, 1]) {
    // The side the fox looks to is where the wheat leans away and where the bird may sit; the other leans toward the fox.
    const free = (side < 0 ? foxX : w - foxX) - (side === dir ? CLEAR_OF_BIRD : CLEAR_OF_FOX);
    for (let from = 1 + random() * 2; from < Math.min(CORNER, free); from += 4 + random() * 3) {
      const poppy = stems.length % 4 === 2;
      // Tallest in the very corner, shorter toward the middle: they frame the picture, they do not fence it.
      let tall = tallest * (1 - 0.5 * (from / CORNER)) * (0.8 + 0.2 * random()) * (poppy ? 0.6 : 1);
      if (side !== dir) {
        // Even bowed right over, it must not reach the fox.
        tall = Math.min(tall, (free - from) / 0.8);
      }
      if (tall >= 7) {
        stems.push({ x: Math.round(side < 0 ? from : w - 1 - from), tall: Math.round(tall), poppy, dim: random() < 0.4, phase: random() * 6.3 });
      }
    }
  }
  kept = { key, stems };
  return stems;
}

/** How far the gust has a stem bowed, `since` seconds after reaching it: over at once, held trembling, then springing back. */
function bowed(since: number, holds: number): number {
  if (since <= 0) {
    return 0;
  }
  if (since < holds) {
    return ramp(since, 0, 0.45) * (1 + 0.06 * Math.sin(since * 12) * Math.sin((Math.PI * since) / holds));
  }
  return Math.exp(-(since - holds) * 1.1) * Math.cos((since - holds) * 3.3);
}

/** Scratch: the pixels of this frame, tone by tone, so that each colour is set once. */
const dots: Record<string, number[]> = Object.fromEntries(TONES.map((tone) => [tone, []]));

export function paintEars(view: VistaView): void {
  const { ctx, w, h, t, dir } = view;
  const blowing = breeze(view);
  const holds = gustHolds(w) + 0.3;
  const dot = (tone: string, x: number, y: number): void => {
    dots[tone].push(Math.round(x), Math.round(y));
  };
  for (const stem of stemsOf(view)) {
    const sway = Math.sin(t * 1.25 - dir * stem.x * 0.085 + stem.phase * 0.3) + 0.5 * Math.sin(t * 0.47 + stem.phase);
    const gust = BOWED * bowed(sinceGust(view, stem.x), holds);
    // A poppy is lighter than an ear and gives less.
    const lean = (REST * (0.4 + 0.6 * blowing) + SWAY * blowing * sway + gust) * (stem.poppy ? 0.7 : 1);
    const ear = stem.poppy ? 0 : Math.min(13, Math.max(6, Math.round(stem.tall * 0.42)));
    const plump = stem.tall >= BIG_FROM ? 2 : 1;
    let x = stem.x;
    let y = h + 1;
    let angle = 0;
    for (let step = 0; step < stem.tall; step++) {
      // The foot holds and the top gives way; the ear, being heavy, hangs further still.
      const inEar = step - (stem.tall - ear);
      angle = dir * lean * (0.2 + 0.8 * (step / stem.tall) ** 1.4 + (inEar > 0 ? (0.5 * inEar) / ear : 0));
      x += Math.sin(angle);
      y -= Math.cos(angle);
      if (inEar < 0) {
        dot(stem.poppy ? STEM : stem.dim ? STALK_DIM : STALK, x, y);
        continue;
      }
      // Rows of grains on either side of the stem, sunlit on one side: a spindle with a notched outline.
      const flat = Math.abs(Math.sin(angle)) > 0.7;
      const half = Math.min(inEar, ear - 1 - inEar, inEar % 2 === 0 ? 1 : plump);
      for (let aside = -half; aside <= half; aside++) {
        const tone = aside === 0 ? (inEar % 2 === 0 ? GRAIN : GRAIN_LIT) : aside * dir > 0 ? GRAIN_DIM : aside * dir < -1 ? GRAIN : GRAIN_LIT;
        dot(tone, x + (flat ? 0 : aside), y + (flat ? aside * dir : 0));
      }
    }
    if (stem.poppy) {
      POPPY.forEach((row, j) => row.forEach((tone, i) => tone && dot(tone, Math.round(x) + i - 2, Math.round(y) + j - 3)));
      continue;
    }
    // Its beard: three fine hairs spreading from the tip.
    for (const spread of [-0.4, 0, 0.4]) {
      for (let out = 1; out <= (spread === 0 ? 4 : 3) + plump; out++) {
        dot(BEARD, x + Math.sin(angle + spread) * out, y - Math.cos(angle + spread) * out);
      }
    }
  }
  for (const tone of TONES) {
    const list = dots[tone];
    ctx.fillStyle = tone;
    for (let i = 0; i < list.length; i += 2) {
      ctx.fillRect(list[i], list[i + 1], 1, 1);
    }
    list.length = 0;
  }
}
