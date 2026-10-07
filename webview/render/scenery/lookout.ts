import { px, seeded, type VistaView } from './paint';

// The lookout: the low grassy rise the fox sits on, close to us, the same under every sky. Each sky only says
// what colours it takes in its light. It does not move; its grass sways a little in the wind.

/** The colours of the lookout under one sky, as CSS colours. */
export interface LookoutTones {
  /** The ground, its lit top edge and its darker foot. */
  readonly body: string;
  readonly rim: string;
  readonly deep: string;
  /** Blades of grass on the crest, and the ones that stand in front of the fox's paws. */
  readonly blades: readonly [string, string];
  readonly front: readonly [string, string];
  /** A few tiny flowers among the grass, where the sky is one for flowers. */
  readonly flowers?: readonly string[];
}

/** How high it stands under the fox, and at the far ends of the view. */
const HIGH = 6;
const HIGH_LOW_VIEW = 4;
const LOW = 2;
/** Under this height the fox fills the view and the rise must stay out of its way. */
const LOW_VIEW = 44;
/** How far from the fox it has fallen halfway. */
const REACH = 36;
/** Tufts stand closer together around the fox than out toward the edges. */
const NEAR = 34;
const BLADES_IN_FRONT = [[-13, 2], [-9, 3], [-4, 2], [6, 2], [11, 3], [15, 2]] as const;

interface Blade {
  readonly x: number;
  readonly tall: number;
  readonly tone: 0 | 1;
  /** Index of its flower's colour, or -1. */
  readonly flower: number;
}

interface Layout {
  readonly key: string;
  /** For each column, the row its ground starts at. */
  readonly top: Int16Array;
  /** The same as stretches of columns of one height, [from, to, row]: far fewer rectangles to fill every frame. */
  readonly runs: readonly (readonly [number, number, number])[];
  readonly blades: readonly Blade[];
}

let laid: Layout | undefined;

function layout(w: number, h: number, foxX: number): Layout {
  const key = `${w}:${h}:${foxX}`;
  if (laid?.key === key) {
    return laid;
  }
  const high = h < LOW_VIEW ? HIGH_LOW_VIEW : HIGH;
  const top = new Int16Array(w);
  for (let x = 0; x < w; x++) {
    const away = (x - foxX) / REACH;
    // A soft swell under the fox, on ground that is never quite level.
    const rise = LOW + (high - LOW) / (1 + away * away) ** 1.2 + 0.7 * Math.sin(x * 0.11 + 1.3) + 0.4 * Math.sin(x * 0.047);
    top[x] = h - Math.max(1, Math.round(rise));
  }
  // Grass grows in tufts of two or three blades of different heights, never in a row.
  const random = seeded(0x10c0);
  const blades: Blade[] = [];
  for (let x = 2 + Math.floor(random() * 4); x < w - 2; ) {
    const tallest = 2 + Math.floor(random() * 2.6);
    const flower = random() < 0.16 ? Math.floor(random() * 8) : -1;
    blades.push({ x, tall: tallest, tone: random() < 0.5 ? 0 : 1, flower });
    blades.push({ x: x + (random() < 0.5 ? 1 : -1), tall: Math.max(1, tallest - 1 - Math.floor(random() * 2)), tone: random() < 0.5 ? 0 : 1, flower: -1 });
    if (random() < 0.45) {
      blades.push({ x: x + 2, tall: 1 + Math.floor(random() * 2), tone: 1, flower: -1 });
    }
    const near = Math.abs(x - foxX) < NEAR;
    x += (near ? 4 : 7) + Math.floor(random() * (near ? 5 : 11));
  }
  const runs: [number, number, number][] = [];
  for (let x = 0; x < w; x++) {
    const last = runs[runs.length - 1];
    if (last && last[2] === top[x]) {
      last[1] = x + 1;
    } else {
      runs.push([x, x + 1, top[x]]);
    }
  }
  laid = { key, top, runs, blades: blades.filter((b) => b.x >= 0 && b.x < w) };
  return laid;
}

/** Which way a blade at `x` leans right now: gusts run over the grass toward the side the fox looks to. */
function lean({ t, dir }: VistaView, x: number): number {
  const gust = Math.sin(t * 1.25 - dir * x * 0.085) + 0.5 * Math.sin(t * 0.37 + x * 0.021);
  return gust > 0.9 ? dir : gust < -1.1 ? -dir : 0;
}

/** The row the ground of the lookout starts at in column `x`: what lies behind it is hidden from there down. */
export function lookoutTop({ w, h, foxX }: VistaView, x: number): number {
  return layout(w, h, foxX).top[Math.min(w - 1, Math.max(0, Math.round(x)))];
}

/** The rise and the grass on its crest; goes last in the back layer, in front of everything far. */
export function paintLookout(view: VistaView, tones: LookoutTones): void {
  const { ctx, w, h, foxX } = view;
  const { top, runs, blades } = layout(w, h, foxX);
  ctx.fillStyle = tones.body;
  runs.forEach(([from, to, y]) => ctx.fillRect(from, y, to - from, h - y));
  ctx.fillStyle = tones.rim;
  runs.forEach(([from, to, y]) => ctx.fillRect(from, y, to - from, 1));
  ctx.fillStyle = tones.deep;
  ctx.fillRect(0, h - 1, w, 1);
  for (const blade of blades) {
    const y = top[blade.x];
    const color = tones.blades[blade.tone];
    px(ctx, blade.x, y - blade.tall + 1, color, 1, 1, blade.tall);
    if (blade.tall >= 2) {
      // Only its tip bends: a blade leans, it does not slide.
      const tip = blade.x + lean(view, blade.x);
      px(ctx, tip, y - blade.tall, color);
      if (blade.flower >= 0 && tones.flowers && blade.flower < tones.flowers.length) {
        px(ctx, tip, y - blade.tall - 1, tones.flowers[blade.flower]);
      }
    }
  }
}

/** A few blades over the fox's paws, for the front layer: it sits in the grass, not on the edge of the picture. */
export function paintLookoutFront(view: VistaView, tones: LookoutTones): void {
  const { ctx, h, foxX } = view;
  BLADES_IN_FRONT.forEach(([aside, tall], i) => {
    const x = Math.round(foxX) + aside;
    const color = tones.front[i % 2];
    px(ctx, x, h - tall + 1, color, 1, 1, tall - 1);
    px(ctx, x + lean(view, x), h - tall, color);
  });
}
