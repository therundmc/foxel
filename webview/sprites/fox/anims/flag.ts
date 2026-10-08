import { outlined } from '../../grid';
import type { Animation, Glyph, Overlay } from '../../frames';
import { anim, type Pose } from '../pose';

const SIT = { body: 'sit' } as const;
const GROUND = 30; // what stands on the ground has the bottom row of its outline here; nothing is drawn below

// A little flag: a wooden pole with a golden knob and a red pennant that flies the way the fox looks.
const POLE = 13; // its last two rows go into the ground when it is planted
const PLANTED = GROUND - (POLE - 2); // the row of the knob once it stands
const PLANT_X = 28; // the column of the pole: its outline is the outline of the paw held out to it

/**
 * The pennant, one column after the other from the pole outwards: the row of its top edge, counted from the knob
 * (negative when it flies above it). `tall` gives the height of each column when it is not the usual taper.
 */
interface Cloth {
  readonly tops: readonly number[];
  readonly tall?: readonly number[];
}

const CLOTHS = {
  // Hanging along the pole, as it comes out.
  limp: { tops: [1, 2], tall: [6, 4] },
  // Swinging out as it is lifted.
  half: { tops: [1, 1, 2, 3, 4], tall: [4, 4, 4, 4, 3] },
  // Four shapes of one wave running along it, from the pole to the tip.
  droop: { tops: [1, 1, 1, 1, 2, 2, 3, 3] },
  crest: { tops: [1, 1, 0, 0, 1, 2, 3, 3] },
  roll: { tops: [1, 2, 2, 1, 0, 0, 1, 2] },
  flick: { tops: [1, 1, 2, 2, 2, 1, 1, 0] },
  // Left behind by a pole that goes down: a little, then streaming straight up.
  whip: { tops: [1, 0, 0, -1, -1, -2, -3, -3] },
  trail: { tops: [0, -1, -2, -3, -4, -5], tall: [4, 4, 4, 4, 3, 3] },
  streamer: { tops: [-1, -3, -5, -7], tall: [5, 5, 4, 3] },
} as const satisfies Record<string, Cloth>;
type Shape = keyof typeof CLOTHS;

/** The whole flag without its outline, and how many of its rows are above the knob. */
function drawn(shape: Shape): { rows: readonly string[]; rise: number } {
  const { tops, tall }: Cloth = CLOTHS[shape];
  const height = (i: number): number => tall?.[i] ?? (i < tops.length - 2 ? 4 : 3);
  const rise = Math.max(0, ...tops.map((t) => -t));
  const rows = Array.from({ length: rise + POLE }, (_, r) => {
    const row = Array<string>(tops.length + 1).fill('.');
    if (r >= rise) {
      row[0] = r === rise ? 'S' : 't';
    }
    return row;
  });
  tops.forEach((top, i) => {
    const h = height(i);
    for (let r = 0; r < h; r++) {
      // Lit along its top edge, in shadow along the bottom one.
      rows[rise + top + r][i + 1] = r === 0 ? 'r' : r === h - 1 ? 'a' : 'A';
    }
  });
  return { rows: rows.map((r) => r.join('')), rise };
}

const DRAWN = Object.fromEntries((Object.keys(CLOTHS) as Shape[]).map((s) => [s, drawn(s)])) as Record<Shape, ReturnType<typeof drawn>>;
const glyphs = new Map<string, Glyph>();

/** The flag with its knob at (x, top); what would be under the ground is not drawn. */
function flag(shape: Shape, x: number, top: number, behind = false): readonly Overlay[] {
  const { rows, rise } = DRAWN[shape];
  const shown = Math.min(rows.length, GROUND - (top - rise));
  if (shown <= 0) {
    return [];
  }
  const key = `${shape}:${shown}`;
  const glyph = glyphs.get(key) ?? outlined(rows.slice(0, shown));
  glyphs.set(key, glyph);
  return [{ x: x - 1, y: top - rise - 1, glyph, mirrors: true, ...(behind ? { behind: true as const } : {}) }];
}
const planted = (shape: Shape, sunk = 0): readonly Overlay[] => flag(shape, PLANT_X, PLANTED + sunk);

const PROUD: readonly Shape[] = ['droop', 'crest', 'roll', 'flick'];
const proud = (n: number): Pose => ({
  ...SIT,
  eye: 'happy',
  head: n % 2 ? [-1, -2] : [0, -1],
  tail: n % 2 ? 'sitB' : 'sitA',
  extras: n % 3 === 1 ? ['sparkleA'] : n % 3 === 2 ? ['sparkleB'] : [],
  props: planted(PROUD[n % PROUD.length]),
});

export const flagAnims = {
  plantFlag: anim([
    // It looks down at its side: something red peeps out from behind its chest, and a paw hooks it out.
    [{ ...SIT, head: [0, 1], eye: 'down', props: flag('limp', 20, PLANTED - 2, true) }, 90],
    [{ ...SIT, head: [0, 1], eye: 'down', paw: 'tapNear', tail: 'sitB', props: flag('limp', 22, PLANTED - 2, true) }, 110],
    [{ ...SIT, head: [-1, -1], paw: 'wave1', tail: 'sitB', props: flag('limp', PLANT_X, PLANTED - 2) }, 90],
    // Up it goes, and the pennant opens: it leans back to see it.
    [{ ...SIT, head: [-3, -2], eye: 'wide', paw: 'wave2', props: flag('half', PLANT_X + 1, PLANTED - 6) }, 100],
    [{ ...SIT, head: [-3, -2], eye: 'happy', paw: 'wave2', tail: 'sitB', props: flag('flick', PLANT_X + 1, PLANTED - 6) }, 170],
    // Down into the ground in one go, and the pennant settles.
    [{ ...SIT, bob: 1, head: [1, 1], eye: 'closed', ears: 'back', paw: 'wave1', props: planted('whip') }, 80],
    [{ ...SIT, head: [0, 1], eye: 'down', paw: 'wave1', props: planted('droop') }, 110],
    // A pat to make sure.
    [{ ...SIT, eye: 'down', paw: 'tapNear', props: planted('crest') }, 80],
    [{ ...SIT, bob: 1, head: [0, 1], eye: 'closed', paw: 'wave1', props: planted('roll') }, 110],
    // Proud: chest out, the pennant flutters.
    [proud(0), 130],
    [proud(1), 130],
    [proud(2), 130],
    [proud(3), 130],
    [proud(4), 130],
    [proud(5), 130],
    // A little nod to it, down to its knob.
    [{ ...SIT, head: [-1, -2], tail: 'sitA', props: planted('roll') }, 70],
    [{ ...SIT, head: [1, 2], eye: 'closed', tail: 'sitA', props: planted('flick') }, 170],
    [{ ...SIT, eye: 'down', tail: 'sitB', props: planted('droop') }, 90],
    // The flag goes back into the ground, faster and faster, its pennant last; it watches it go.
    [{ ...SIT, head: [0, 1], eye: 'down', tail: 'sitB', props: planted('flick', 1) }, 80],
    [{ ...SIT, head: [1, 1], eye: 'down', tail: 'sitA', props: planted('whip', 3) }, 80],
    [{ ...SIT, head: [1, 2], eye: 'down', tail: 'sitA', props: planted('trail', 7) }, 80],
    [{ ...SIT, head: [2, 3], eye: 'down', tail: 'sitA', props: planted('streamer', 12) }, 80],
    [{ ...SIT, head: [2, 4], eye: 'down', tail: 'sitA', props: planted('streamer', 16) }, 80],
    [{ ...SIT, head: [2, 4], eye: 'wide', tail: 'sitA' }, 110],
    [{ ...SIT, eye: 'happy', tail: 'sitB' }, 120],
    [{ ...SIT, tail: 'sitA' }, 100],
  ]),
} satisfies Record<string, Animation>;
