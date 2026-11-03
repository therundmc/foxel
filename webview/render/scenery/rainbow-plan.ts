import { lookoutTop } from './lookout';
import { clamp01, ramp, type VistaView } from './paint';

// Where everything of the sunshower lies in a view, and when each thing happens. Laid out once per size and place,
// then only read; the timeline is a handful of pure functions of the view's clock.

export type Rgb = readonly [number, number, number];

export const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as unknown as Rgb;

export const blend = (a: Rgb, b: Rgb, amount: number): Rgb => {
  const k = clamp01(amount);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
};

export const css = (c: Rgb): string => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;

/** A tone at three lights: the grey of the shower, the warm light of the moment, the clear sky it ends on. */
export const toneAt = (tones: readonly [Rgb, Rgb, Rgb], light: number): Rgb =>
  light <= 1 ? blend(tones[0], tones[1], light) : blend(tones[1], tones[2], light - 1);

/** A cheap repeatable hash of two numbers, from 0 to 1. */
export function hash(a: number, b: number): number {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));

/** How much wider the second bow is than the first, as in the sky. */
const SECOND_RATIO = 1.24;

/** The fox, which a near drop may not cross: half its width from its middle. */
export const FOX_HALF = 11;

// --- The timeline -------------------------------------------------------------------------------------------------

/** The light warms slowly while it rains, as the shower passes. */
const WARM_FROM_S = 2;
const WARM_TO_S = 20;
/** The light reaches its warmest this long into the moment, then clears into its last colours. */
const WARMEST_S = 4;
const CLEAR_FROM_S = 5;
const CLEAR_TO_S = 18;
/** The rainbow draws itself across the sky in this window, then the second one above it. */
export const BLOOM_FROM_S = 0.4;
export const BLOOM_TO_S = 5.6;
const SECOND_FROM_S = 5;
const SECOND_TO_S = 10;
/** The last drops fall in this window; after it the rain is over. */
const LAST_DROPS_FROM_S = 1;
const LAST_DROPS_TO_S = 10;

/** 0: the grey of the shower. 1: the warm light of the moment. 2: the clear sky it ends on. */
export function lightAt(t: number, moment: number | undefined): number {
  const before = 0.6 * ramp(t, WARM_FROM_S, WARM_TO_S);
  if (moment === undefined) {
    return before;
  }
  const from = 0.6 * ramp(t - moment, WARM_FROM_S, WARM_TO_S);
  return from + (1 - from) * ramp(moment, 0, WARMEST_S) + ramp(moment, CLEAR_FROM_S, CLEAR_TO_S);
}

/** How much of the rain is still falling: a light shower, thinner as the light warms, gone soon after the moment. */
export function rainAt(t: number, moment: number | undefined): number {
  const before = 1 - 0.45 * ramp(moment === undefined ? t : t - moment, 8, WARM_TO_S);
  return moment === undefined ? before : before * (1 - ramp(moment, LAST_DROPS_FROM_S, LAST_DROPS_TO_S));
}

/** How far along its arc the rainbow has drawn itself, from 0 to 1. */
export const bloomAt = (moment: number | undefined): number => (moment === undefined ? 0 : ramp(moment, BLOOM_FROM_S, BLOOM_TO_S));

export const secondAt = (moment: number | undefined): number => (moment === undefined ? 0 : ramp(moment, SECOND_FROM_S, SECOND_TO_S));

/** How much the last drops sparkle with the rainbow's colours. */
export const sparkleAt = (moment: number | undefined): number =>
  moment === undefined ? 0 : ramp(moment, LAST_DROPS_FROM_S, LAST_DROPS_FROM_S + 2) * (1 - ramp(moment, LAST_DROPS_TO_S - 2, LAST_DROPS_TO_S));

// --- The layout ---------------------------------------------------------------------------------------------------

export interface Pond {
  /** Its middle, its first row, how many rows it has. */
  readonly x: number;
  readonly y: number;
  readonly tall: number;
  /** For each of its rows, its first column and how many there are. */
  readonly rows: readonly (readonly [number, number])[];
}

export interface Plan {
  readonly key: string;
  /** Where the far hills stand on the plain: the water gives back the sky as if mirrored on this row. */
  readonly horizon: number;
  /** The rainbow's centre, under the hills, and the outer edge of its red. */
  readonly bowX: number;
  readonly bowY: number;
  readonly radius: number;
  /** The outer edge of the second rainbow, which stands above it. */
  readonly outer: number;
  /** How many pixels thick each colour of the rainbow is. */
  readonly thick: number;
  /** For each column, the row the far hills start at, and the near hills. */
  readonly far: Int16Array;
  readonly near: Int16Array;
  readonly pond: Pond;
  /** The little house on the hill under the rainbow's far foot: the middle of its walls, and the row they stand on. */
  readonly cottage: { readonly x: number; readonly y: number };
  /** The side the rainbow starts from: the one by the fox. */
  readonly from: 1 | -1;
}

function lay(view: VistaView): Plan {
  const { w, h, foxX, dir } = view;
  const horizon = Math.round(h * 0.6);
  const room = dir > 0 ? w - foxX : foxX;
  const thick = h >= 80 ? 2 : 1;
  const top = Math.max(5, Math.round(h * 0.2));
  // The rainbow stands in the room ahead of the fox: its near foot clear of it, its far one inside the view. A wide
  // view gets a wider one, its centre deeper under the hills, as long as the second bow still shows above it.
  const least = horizon + Math.round(h * 0.12) - top;
  const widest = Math.max(least, Math.floor((top - 2 - thick) / (SECOND_RATIO - 1)));
  const radius = Math.max(12, Math.min(clamp(Math.round(room * 0.36), least, widest), Math.floor((room - FOX_HALF - 6) / 2)));
  const bowY = Math.max(horizon + Math.round(h * 0.12), top + radius);
  const ahead = clamp(room * 0.5, radius + FOX_HALF + 2, room - radius - 3);
  const bowX = Math.round(foxX + dir * ahead);
  const outer = Math.round(radius * SECOND_RATIO) + thick;
  // Far hills roll gently along the plain; near ones swell a little more, closer to us.
  const far = new Int16Array(w);
  const near = new Int16Array(w);
  for (let x = 0; x < w; x++) {
    const swell = 0.6 * Math.sin(x * 0.029 + 1.7) + 0.4 * Math.sin(x * 0.083 + 0.4);
    far[x] = horizon - Math.round(h * (0.075 + 0.05 * swell));
    const roll = Math.sin(x * 0.041 + 2.1) + 0.55 * Math.sin(x * 0.107 + 0.9);
    near[x] = horizon + 1 + Math.round(h * 0.035 * roll);
  }
  // The cottage sits under the far foot, on a crest levelled for it.
  const cottageX = Math.round(clamp(bowX + dir * radius * 0.72, 6, w - 7));
  let ground = near[cottageX];
  for (let dx = -6; dx <= 6; dx++) {
    ground = Math.min(ground, near[clamp(cottageX + dx, 0, w - 1)]);
  }
  for (let dx = -7; dx <= 7; dx++) {
    const x = cottageX + dx;
    if (x >= 0 && x < w) {
      near[x] = Math.min(near[x], ground + (Math.abs(dx) === 7 ? 1 : 0));
    }
  }
  // A pond in the meadow under the near half of the rainbow, catching its near foot in the water.
  const tall = clamp(Math.round(h * 0.09), 3, 9);
  const pondX = Math.round(bowX - dir * radius * 0.45);
  const half = clamp(Math.round(radius * 0.5), 7, 34);
  let pondY = horizon + Math.max(4, Math.round(h * 0.15));
  for (let x = pondX - half; x <= pondX + half; x++) {
    pondY = Math.min(pondY, lookoutTop(view, x) - tall - 2);
  }
  const rows: [number, number][] = [];
  for (let row = 0; row < tall; row++) {
    // An oval, flattened by the distance, a little fuller on its near side.
    const at = (row + 0.5) / tall;
    const wide = Math.round(half * Math.sqrt(1 - (2 * at - 1.15) ** 2 / 1.33));
    rows.push([pondX - wide, wide * 2 + 1]);
  }
  return {
    key: '',
    horizon,
    bowX,
    bowY,
    radius,
    outer,
    thick,
    far,
    near,
    pond: { x: pondX, y: pondY, tall, rows },
    cottage: { x: cottageX, y: ground },
    from: (-dir) as 1 | -1,
  };
}

let kept: Plan | undefined;

/** The plan of this view, laid out the first time it is asked for. */
export function planOf(view: VistaView): Plan {
  const key = `${view.w}:${view.h}:${Math.round(view.foxX)}:${view.dir}`;
  if (kept?.key !== key) {
    kept = { ...lay(view), key };
  }
  return kept;
}
