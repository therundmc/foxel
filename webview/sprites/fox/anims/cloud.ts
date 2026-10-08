import { FRAME_PAD, type Animation, type Glyph, type Overlay } from '../../frames';
import { outlined } from '../../grid';
import { TRANSPARENT } from '../../palette';
import { anim, frame, type Pose } from '../pose';

type Step = readonly [Pose, number];

const SIT = { body: 'sit' } as const;
/** Under its cloud: ears flat, eyeing it. `cloudIn` ends on it, `cloudy`, `cloudHeavy` and `cloudClears` start from it. */
const WORRY = { ...SIT, ears: 'back', eye: 'up', mouth: 'flat', tail: 'sitA' } as const;
/** Huddled: head pulled in, the body sunk a little. */
const HUNCH = { ...WORRY, eye: 'down', head: [0, 2], bob: 1 } as const;

// A little cumulus, lit from the top left: W on its crests, m for its body, e under its belly. Three bumps,
// the middle one the tallest; between the two the bumps swap a pixel, which is how it breathes.
const CLOUD_A = outlined([
  '.....WWW......',
  '....WWWmm.WW..',
  '.WW.WWmmmmWmm.',
  'WWmmWmmmmmmmmm',
  'Wmmmmmmmmmmmme',
  'mmmmmmmmmeeeee',
  '.eeeeeeeeeeee.',
]);
const CLOUD_B = outlined([
  '......WWW.....',
  '.WW..WWWmm.W..',
  'WWmW.WWmmmWWm.',
  'Wmmmmmmmmmmmmm',
  'Wmmmmmmmmmmmme',
  'mmmmmmmmmeeeee',
  '.eeeeeeeeeeee.',
]);
// The heavy one: wider, a row taller, a tone darker all over.
const HEAVY_A = outlined([
  '......mmmm........',
  '.....mmmeee..mmm..',
  '.mmm.mmeeeee.mmee.',
  'mmeeemeeeeeeemeeee',
  'meeeeeeeeeeeeeeeeD',
  'meeeeeeeeeeeeeDDDD',
  'eeeeeeeeDDDDDDDDDD',
  '.DDDDDDDDDDDDDDDD.',
]);
const HEAVY_B = outlined([
  '.......mmmm.......',
  '.mmm..mmmeee..mm..',
  'mmeeemmeeeeee.mmee',
  'meeeeeeeeeeeemeeee',
  'meeeeeeeeeeeeeeeeD',
  'meeeeeeeeeeeeeDDDD',
  'eeeeeeeeDDDDDDDDDD',
  '.DDDDDDDDDDDDDDDD.',
]);
// Lit from inside for an instant.
const HEAVY_FLASH = outlined([
  '......WWWW........',
  '.....WWWmmm..WWW..',
  '.WWW.WWmmWWm.WWmm.',
  'WWmmmWmmWHHWmWmmmm',
  'WmmmmmmmWHHWmmmmme',
  'WmmmmmmmmWWmmmeeee',
  'mmmmmmmmeeeeeeeeee',
  '.eeeeeeeeeeeeeeee.',
]);
// How it looks from far away, coming or going: a wisp, a puff, a small cloud.
const FAR = [
  outlined(['Wm']),
  outlined(['.WW..', 'Wmmme', '.mee.']),
  outlined(['....WW....', '..WWWmm.W.', '.WmmmmmmWm', 'Wmmmmmmmme', '.meeeeeee.']),
] as const;
// Clearing: it thins from its edges, then parts in two.
const THIN = outlined(['.....WW.....', '...WWWmm.W..', '.WWmmmmmmWm.', 'Wmmmmmmmmmme', '.mmeeeeeeee.']);
const PARTING = outlined(['...WW.......', '..Wmmm...W..', '.Wmmmm.WWmm.', 'Wmmmme.Wmmme', '.meee...mee.']);
const LEFT_BITS = [
  outlined(['..WW.', '.Wmmm', 'Wmmme', '.mee.']),
  outlined(['.WW.', 'Wmme', '.me.']),
  outlined(['.W.', 'Wme']),
  outlined(['Wm']),
  outlined(['m']),
  ['m'],
] as const;
const RIGHT_BITS = [
  outlined(['..W.', 'WWmm', 'Wmme', '.me.']),
  outlined(['.W.', 'Wme', '.e.']),
  outlined(['Wm', '.e']),
  outlined(['m']),
  ['m'],
] as const;

// A drop falls head first, its head the lighter. Under the cloud it swells out of the belly, hangs, lets go.
const DROP = outlined(['C', 'w']);
const SWELL = ['ee', 'KK'];
const HANG = ['KeK', 'KCK', 'KwK', '.K.'];
const SPLASH = ['C...C'];
const SPARK = ['.H.', 'HXH', '.H.'];
const GLINT = ['H'];

/** Where the cloud stops: its outlined glyph's top left corner. Over the head, far enough forward to drip on the nose. */
const HOME_X = 16;
const HOME_Y = -11;
/** The row of its underside's outline, which a drop comes through. */
const BELLY = HOME_Y + CLOUD_A.length - 1;
const GROUND = 30;
/** The columns its drops fall in: on the tip of the nose, on the top of the head between the flattened ears. */
const NOSE_X = 29;
const CROWN_X = 23;

const prop = (glyph: Glyph, x: number, y: number): Overlay => ({ x, y, glyph, mirrors: true });
const cloud = (glyph: Glyph = CLOUD_A, dx = 0, dy = 0): Overlay => prop(glyph, HOME_X + dx, HOME_Y + dy);
const heavy = (glyph: Glyph): Overlay => prop(glyph, HOME_X - 2, HOME_Y - 1);
/** A glyph by its middle, for what changes size on its way. */
const centred = (glyph: Glyph, cx: number, cy: number): Overlay => prop(glyph, Math.round(cx - glyph[0].length / 2), Math.round(cy - glyph.length / 2));
/** A falling drop whose head is at (x, y). */
const drop = (x: number, y: number): Overlay => prop(DROP, x - 1, y - 2);
/** The belly bulging over columns x - 1 and x, then the drop hanging from it at x. */
const swell = (x: number): Overlay => prop(SWELL, x - 1, BELLY);
const hang = (x: number): Overlay => prop(HANG, x - 1, BELLY);
const speck = (x: number, y: number): Overlay => prop(['C'], x, y);

/** The row of the fox's topmost pixel in a column, outline included: what a drop falling there lands on. */
function topAt(pose: Pose, x: number): number {
  const row = frame(pose).pixels.findIndex((line) => line[x + FRAME_PAD] !== TRANSPARENT);
  return row < 0 ? GROUND : row - FRAME_PAD;
}
/** A drop bursts on the fox in this pose, or on the ground in front of it: two specks fly up and apart. */
const splash = (pose: Pose, x: number, rise = 2): Overlay => prop(SPLASH, x - 2, topAt(pose, x) - rise);
/** The pose, with what is around it this frame. */
const withProps = (pose: Pose, ms: number, ...props: Overlay[]): Step => [{ ...pose, props }, ms];
/** The same, a drop bursting on it at this column. */
const hit = (pose: Pose, ms: number, x: number, rise: number, ...props: Overlay[]): Step => withProps(pose, ms, ...props, splash(pose, x, rise));

// It comes down from high up and to the side, growing as it nears, slowing to a stop over the head. Played
// backwards it leaves the same way: so nothing here may only make sense forwards.
const WAY: readonly (readonly [number, number])[] = [[56, -32], [52, -27], [47, -22], [41, -17], [35, -13], [30, -10], [26, -8], [24, -6.5]];
const coming = (i: number): Overlay => centred(i < FAR.length ? FAR[i] : CLOUD_A, WAY[i][0], WAY[i][1]);
const WATCHES = { ...SIT, eye: 'up', snoutUp: 1, mouth: 'flat' } as const;

const cloudIn = anim([
  [{ ...SIT, tail: 'sitA' }, 110],
  withProps({ ...SIT, tail: 'sitA' }, 80, coming(0)),
  withProps({ ...SIT, tail: 'sitB' }, 80, coming(1)),
  withProps({ ...SIT, tail: 'sitB', eye: 'up' }, 90, coming(2)),
  withProps({ ...WATCHES, tail: 'sitB' }, 90, coming(3)),
  withProps({ ...WATCHES, tail: 'sitA' }, 90, coming(4)),
  withProps({ ...WATCHES, tail: 'sitA' }, 100, coming(5)),
  withProps({ ...SIT, eye: 'up', mouth: 'flat', tail: 'sitA' }, 110, coming(6)),
  withProps({ ...WORRY, head: [0, 1] }, 130, cloud(CLOUD_B, -1)),
  withProps(WORRY, 150, cloud(CLOUD_B)),
  withProps(WORRY, 200, cloud()),
]);

const DRIPPED = { ...WORRY, eye: 'down', head: [0, 1] } as const;
const BLINKS = { ...WORRY, eye: 'closed', head: [0, 1] } as const;
const HOPES = { ...SIT, eye: 'wide' } as const;

const cloudy = anim([
  withProps(WORRY, 360, cloud()),
  withProps({ ...WORRY, tail: 'sitB' }, 300, cloud(CLOUD_B)),
  // A drop gathers over its nose, falls faster and faster, and bursts on it: it squints at its nose.
  withProps({ ...WORRY, tail: 'sitB' }, 220, cloud(), swell(NOSE_X)),
  withProps(WORRY, 140, cloud(), hang(NOSE_X)),
  withProps(WORRY, 70, cloud(), drop(NOSE_X, 0)),
  withProps(WORRY, 70, cloud(CLOUD_B), drop(NOSE_X, 2)),
  withProps(WORRY, 60, cloud(CLOUD_B), drop(NOSE_X, 5)),
  withProps(WORRY, 60, cloud(CLOUD_B), drop(NOSE_X, 9)),
  hit(BLINKS, 90, NOSE_X, 3, cloud(CLOUD_B)),
  withProps(DRIPPED, 240, cloud(CLOUD_B)),
  // A sigh, ears flat.
  withProps({ ...HUNCH, eye: 'closed' }, 300, cloud(), prop(['QQ'], 30, 19)),
  withProps({ ...HUNCH, eye: 'closed', tail: 'sitB' }, 260, cloud(), prop(['Q'], 33, 18), prop(['Q'], 32, 21)),
  // Another, on its head this time: it flicks its ears to be rid of it.
  withProps(DRIPPED, 200, cloud(CLOUD_B), swell(CROWN_X)),
  withProps(DRIPPED, 120, cloud(CLOUD_B), hang(CROWN_X)),
  withProps(DRIPPED, 70, cloud(), drop(CROWN_X, 0)),
  withProps(DRIPPED, 60, cloud(), drop(CROWN_X, 2)),
  withProps(DRIPPED, 60, cloud(), drop(CROWN_X, 5)),
  hit({ ...BLINKS, head: [0, 2] }, 70, CROWN_X, 2, cloud()),
  withProps({ ...BLINKS, ears: 'up' }, 70, cloud(), speck(27, 2)),
  withProps({ ...BLINKS, head: [0, 0] }, 70, cloud(CLOUD_B), speck(30, 1)),
  withProps({ ...WORRY, eye: 'open', ears: 'up' }, 90, cloud(CLOUD_B), speck(32, 4)),
  // And a hopeful look at us: is it going soon?
  withProps({ ...HOPES, tail: 'sitB' }, 340, cloud(CLOUD_B)),
  withProps({ ...HOPES, tail: 'sitA' }, 170, cloud()),
  withProps({ ...HOPES, tail: 'sitB' }, 170, cloud()),
  withProps({ ...WORRY, eye: 'open' }, 180, cloud()),
]);

/** Its rain: [column, ticks from one drop to the next, ticks of head start]. A tick is `TICK_MS`. The last column is past the nose. */
const RAIN: readonly (readonly [number, number, number])[] = [[16, 5, 3], [19, 5, 0], [22, 6, 1], [25, 5, 4], [31, 10, 3], [31, 10, 8]];
/** How far a drop has fallen after so many ticks: it speeds up, then keeps its pace. */
const FALLEN = [0, 2, 5, 9, 13, 17, 21, 25, 29, 33];
const TICK_MS = 100;

function rain(pose: Pose, tick: number): Overlay[] {
  return RAIN.flatMap(([x, every, start]) => {
    const land = topAt(pose, x);
    const age = (tick + start) % every;
    const at = (n: number): number => BELLY + 1 + (FALLEN[n] ?? 99);
    if (at(age) < land) {
      return [drop(x, at(age))];
    }
    return age > 0 && at(age - 1) < land ? [splash(pose, x)] : [];
  });
}

// What it does under the heavy one, in half ticks: it eyes it, huddles with its tail wrapped round its paws,
// starts at the flash, shivers, and peeps up again. The tail goes round by way of under the body.
const SINKS = { ...HUNCH, head: [0, 1], tail: 'curl' } as const;
const HUDDLED = { ...HUNCH, tail: 'frontB' } as const;
const TIGHT = { ...HUDDLED, eye: 'closed' } as const;
const STARTLED = { ...HUDDLED, eye: 'wide', head: [0, 1], bob: 0 } as const;
const SHIVER = { ...TIGHT, head: [1, 3], bob: 0 } as const;
const FLASH = { ...HUDDLED };
const HEAVY_SCRIPT: readonly (readonly [Pose, number])[] = [
  [WORRY, 6], [SINKS, 2], [HUDDLED, 8], [TIGHT, 6], [HUDDLED, 8], [FLASH, 2], [STARTLED, 3],
  [TIGHT, 1], [SHIVER, 1], [TIGHT, 1], [SHIVER, 1], [TIGHT, 1], [SHIVER, 1], [TIGHT, 1], [SHIVER, 1], [TIGHT, 6], [HUDDLED, 5], [{ ...SINKS, eye: 'up' }, 2], [WORRY, 4],
];

function heavyRain(): Animation {
  const halves = HEAVY_SCRIPT.flatMap(([pose, n]) => Array.from({ length: n }, () => pose));
  const steps: Step[] = [];
  for (let i = 0; i < halves.length; i++) {
    const pose = halves[i];
    const tick = Math.floor(i / 2);
    const glyph = pose === FLASH ? HEAVY_FLASH : Math.floor(tick / 5) % 2 ? HEAVY_B : HEAVY_A;
    // A whole tick when the pose lasts it, or the rain would seem to stall.
    const whole = i % 2 === 0 && halves[i + 1] === pose;
    steps.push(withProps(pose, whole ? TICK_MS : TICK_MS / 2, heavy(glyph), ...rain(pose, tick)));
    i += whole ? 1 : 0;
  }
  return anim(steps);
}
const cloudHeavy = heavyRain();

// The bits of cloud go up and apart, smaller and smaller.
const LEFT_WAY: readonly (readonly [number, number])[] = [[20, -7], [18, -9], [16, -12], [14, -16], [13, -21], [12, -27]];
const RIGHT_WAY: readonly (readonly [number, number])[] = [[28, -7], [30, -10], [32, -14], [34, -19], [35, -25]];
const bits = (i: number): Overlay[] => [
  ...(i < LEFT_BITS.length ? [centred(LEFT_BITS[i], LEFT_WAY[i][0], LEFT_WAY[i][1])] : []),
  ...(i < RIGHT_BITS.length ? [centred(RIGHT_BITS[i], RIGHT_WAY[i][0], RIGHT_WAY[i][1])] : []),
];
const LOOKS = { ...SIT, eye: 'up', tail: 'sitA' } as const;
const GLAD = { ...LOOKS, snoutUp: 1, mouth: 'open' } as const;
const SHUT = { ...SIT, eye: 'closed', ears: 'back' } as const;
// Drops flung from its coat: close, farther, then falling.
const flung = (out: number, down: number): Overlay[] =>
  ([[10 - out, 12 + down], [5 - out, 20 + down], [14 - out / 2, 5 - out + down], [28 + out / 2, 3 - out + down], [31 + out, 11 + down], [30 + out, 20 + down]] as const).map(([x, y]) => speck(Math.round(x), Math.round(y)));

const cloudClears = anim([
  withProps(WORRY, 140, cloud()),
  withProps({ ...WORRY, tail: 'sitB' }, 120, centred(THIN, 24, -6)),
  withProps({ ...LOOKS, mouth: 'flat' }, 120, centred(PARTING, 24, -6)),
  withProps(LOOKS, 100, ...bits(0)),
  // Warm light where it was.
  withProps({ ...GLAD, tail: 'sitB' }, 120, ...bits(1), prop(SPARK, 19, -9), prop(SPARK, 26, -6), prop(GLINT, 30, -10)),
  withProps({ ...GLAD, tail: 'sitB' }, 90, ...bits(2), prop(GLINT, 20, -8), prop(GLINT, 27, -5)),
  withProps({ ...LOOKS, eye: 'happy' }, 90, ...bits(3)),
  withProps({ ...LOOKS, eye: 'happy' }, 90, ...bits(4)),
  // It shakes itself dry, drops flying.
  withProps({ ...SHUT, head: [0, 1], bob: 1, tail: 'sitA' }, 110, ...bits(5)),
  withProps({ ...SHUT, head: [-2, 0], tail: 'sitB' }, 70, ...flung(0, 0)),
  withProps({ ...SHUT, ears: 'up', head: [2, 0], bob: 1, tail: 'sitA' }, 70, ...flung(2, 0)),
  withProps({ ...SHUT, head: [-2, 0], tail: 'sitB' }, 70, ...flung(4, 1), ...flung(0, 0)),
  withProps({ ...SHUT, ears: 'up', head: [2, 0], bob: 1, tail: 'sitA' }, 70, ...flung(6, 3), ...flung(2, 0)),
  withProps({ ...SHUT, head: [-1, 0], tail: 'sitB' }, 70, ...flung(4, 1)),
  withProps({ ...SHUT, ears: 'up', head: [1, 0], tail: 'sitA' }, 70, ...flung(6, 3)),
  [{ ...SIT, eye: 'closed', head: [0, 1], tail: 'sitB' }, 90],
  // And beams.
  [{ ...SIT, eye: 'happy', head: [0, -1], tail: 'flat' }, 100],
  [{ ...SIT, eye: 'happy', mouth: 'open', tail: 'wagL', extras: ['sparkleA'] }, 180],
  [{ ...SIT, eye: 'happy', mouth: 'open', bob: 1, tail: 'wagR', extras: ['sparkleB'] }, 180],
  [{ ...SIT, eye: 'happy', mouth: 'open', tail: 'wagL', extras: ['sparkleA'] }, 180],
  [{ ...SIT, eye: 'happy', tail: 'flat' }, 100],
  [{ ...SIT, tail: 'sitA' }, 150],
]);

// No cloud: two firm little nods, a set jaw that turns into a smile, the tail going all the while.
const encouraged = anim([
  [{ ...SIT, tail: 'sitA' }, 90],
  [{ ...SIT, mouth: 'flat', head: [0, -1], tail: 'sitB' }, 80],
  [{ ...SIT, mouth: 'flat', eye: 'down', head: [0, 2], bob: 1, tail: 'sitA' }, 120],
  [{ ...SIT, mouth: 'flat', head: [0, -1], tail: 'sitB' }, 70],
  [{ ...SIT, mouth: 'flat', tail: 'sitA' }, 70],
  [{ ...SIT, eye: 'closed', head: [0, 2], bob: 1, tail: 'sitB' }, 120],
  [{ ...SIT, eye: 'happy', head: [0, -1], tail: 'flat' }, 80],
  [{ ...SIT, eye: 'happy', mouth: 'open', tail: 'wagL' }, 160],
  [{ ...SIT, eye: 'happy', mouth: 'open', bob: 1, tail: 'wagR' }, 160],
  [{ ...SIT, eye: 'happy', tail: 'wagL' }, 160],
  [{ ...SIT, eye: 'happy', tail: 'flat' }, 90],
  [{ ...SIT, tail: 'sitA' }, 120],
]);

export const cloudAnims = { cloudIn, cloudy, cloudHeavy, cloudClears, encouraged } satisfies Record<string, Animation>;
