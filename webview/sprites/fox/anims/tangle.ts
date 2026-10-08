import type { Animation, Glyph, Overlay, Point } from '../../frames';
import { outlined } from '../../grid';
import { anim, type Pose } from '../pose';

const SIT = { body: 'sit' } as const;
const GROUND = 30;

// The ball of yarn at four moments of its turn: its strands lean one way then the other, the light stays top left.
const BIG: readonly Glyph[] = [
  ['..VVVV..', '.VZVVIV.', 'VZVVIVVV', 'VVVIVVVI', 'VVIVVVIV', 'VIVVVIVV', '.VVVIVV.', '..VIVV..'],
  ['..VIVV..', '.VZVIVV.', 'VZVVVIVV', 'VVIVVVIV', 'VVVIVVVI', 'VVVVIVVV', '.VVVVIV.', '..VVVV..'],
  ['..VVIV..', '.VZIVVV.', 'VZIVVVIV', 'VIVVVIVV', 'IVVVIVVV', 'VVVIVVVI', '.VIVVVI.', '..VVVI..'],
  ['..VVVI..', '.VZVVVI.', 'VZVIVVVI', 'IVVVIVVV', 'VIVVVIVV', 'VVIVVVIV', '.VVIVVV.', '..VVIV..'],
].map(outlined);
// What is left of it once a good length is wound round the fox.
const SMALL: readonly Glyph[] = [
  ['.VVVV.', 'VZVIVV', 'VVIVVV', 'VIVVVI', 'IVVVIV', '.VVIV.'],
  ['.VVIV.', 'VZVVIV', 'VIVVVI', 'VVIVVV', 'VVVIVV', '.VVVI.'],
  ['.VIVV.', 'VZVVVI', 'IVVVIV', 'VVVIVV', 'VVIVVV', '.IVVV.'],
  ['.IVVV.', 'VZIVVV', 'VVVIVV', 'IVVVIV', 'VIVVVI', '.VIVV.'],
].map(outlined);

/** A pixel of thread; the third says it catches the light. */
type Dot = readonly [number, number, boolean?];
type Thread = readonly Dot[];

/** Every pixel of the line through these points; `light` are the ones that shine, counted from its start. */
function along(pts: readonly Point[], light: readonly number[] = []): Thread {
  const out: Point[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let s = 1; s <= n; s++) {
      out.push([Math.round(ax + ((bx - ax) * s) / n), Math.round(ay + ((by - ay) * s) / n)]);
    }
  }
  return out.map(([x, y], i) => [x, y, light.includes(i)]);
}

/** Threads of yarn, one pixel wide. */
function yarn(...threads: Thread[]): Overlay[] {
  const all = threads.flat();
  if (all.length === 0) {
    return [];
  }
  const x0 = Math.min(...all.map(([x]) => x));
  const y0 = Math.min(...all.map(([, y]) => y));
  const rows = Array.from({ length: Math.max(...all.map(([, y]) => y)) - y0 + 1 }, () =>
    Array<string>(Math.max(...all.map(([x]) => x)) - x0 + 1).fill('.'),
  );
  for (const [x, y, light] of all) {
    rows[y - y0][x - x0] = light ? 'Z' : 'V';
  }
  return [{ x: x0, y: y0, glyph: rows.map((r) => r.join('')), mirrors: true }];
}

const shift = (thread: Thread, dx: number, dy: number): Thread => thread.map(([x, y, light]) => [x + dx, y + dy, light]);
const BIG_Y = GROUND - 9;
const SMALL_Y = GROUND - 7;
/** The ball, by its top left corner; `turn` picks the moment of its turn. */
const big = (x: number, turn: number, y = BIG_Y): Overlay => ({ x, y, glyph: BIG[turn & 3], mirrors: true });
const small = (x: number, turn: number, y = SMALL_Y): Overlay => ({ x, y, glyph: SMALL[turn & 3], mirrors: true });
const behind = (o: Overlay): Overlay => ({ ...o, behind: true });

// Round the sitting body, in the order they are wound: from the near front leg up to the back, from under the jaw
// down to the haunch, and low round the leg and the belly.
const S1 = along([[22, 25], [9, 17]], [2, 9]);
const S2 = along([[21, 18], [7, 23]], [6, 12]);
const S3 = along([[22, 27], [20, 26], [8, 20]], [1, 8]);
// The loop caught over the near ear when the ears are back, for a head that has not moved.
const EAR = [
  ...along([[20, 2], [19, 1], [19, 0], [20, -1], [22, -1], [23, 0], [23, 1], [22, 2], [21, 2]], [3]),
  ...along([[18, 2], [18, 3]]),
];
/** Lying on the ground from `from` to `to`. */
const ground = (from: number, to: number): Thread =>
  Array.from({ length: Math.max(0, to - from + 1) }, (_, i): Dot => [from + i, GROUND, (from + i) % 7 === 0]);
/** The same, ending on the right in the curl of a loose end. */
const loose = (from: number, end: number): Thread => [...ground(from, end - 2), [end - 1, GROUND - 1], [end, GROUND - 2]];
/** From the leg down to the ground and on to the ball. */
const trail = (to: number): Thread => [[22, 28], [23, 29], ...ground(24, to)];
// From where the first strand crosses the leg down to the ground.
const DROP = along([[22, 25], [23, 27], [24, 30]]);

const CAUGHT: Pose = { ...SIT, ears: 'back' };
/** The loop on its ear follows its head. */
const ear = (head: Point = [0, 0]): Thread => shift(EAR, head[0], head[1]);

/** The ball rolling in from the right, its loose end left lying behind it. */
const rolling = (x: number, turn: number): Overlay[] => [...yarn(loose(x + 7, 67)), big(x, turn)];

export const tangleAnims = {
  // The ball rolls up to its paws; one pat, and it whirls three times round the fox, which ends up wound.
  tangleIn: anim([
    [{ ...SIT, tail: 'sitA', props: rolling(58, 0) }, 60],
    [{ ...SIT, eye: 'wide', tail: 'sitA', props: rolling(50, 1) }, 60],
    [{ ...SIT, eye: 'wide', head: [1, 0], tail: 'sitB', props: rolling(42, 2) }, 60],
    [{ ...SIT, head: [1, 0], tail: 'sitB', props: rolling(34, 3) }, 60],
    [{ ...SIT, eye: 'down', head: [1, 1], tail: 'sitB', props: rolling(28, 0) }, 70],
    [{ ...SIT, eye: 'down', head: [1, 1], tail: 'sitA', props: rolling(24, 1) }, 80],
    [{ ...SIT, eye: 'down', head: [1, 2], tail: 'sitA', props: rolling(22, 2) }, 90],
    [{ ...SIT, eye: 'happy', head: [1, 2], tail: 'sitB', props: rolling(23, 1) }, 130],
    [{ ...SIT, eye: 'down', head: [0, 1], paw: 'beg', tail: 'sitA', props: rolling(23, 1) }, 90],
    [{ ...SIT, eye: 'closed', head: [1, 2], paw: 'tapNear', tail: 'sitA', props: rolling(23, 1) }, 70],
    // First turn: up across the chest to the back, and behind its head, where the loop catches an ear.
    [{ ...SIT, eye: 'wide', paw: 'tapNear', tail: 'sitB', props: [...yarn(along([[28, 26], [30, 30]]), loose(31, 67)), big(22, 2, 16)] }, 50],
    [{ ...SIT, eye: 'down', head: [0, 1], tail: 'sitB', props: [...yarn(DROP, loose(25, 62)), big(14, 0, 16)] }, 50],
    [{ ...SIT, eye: 'down', head: [-1, 1], tail: 'sitB', props: [...yarn(S1.slice(0, 8), DROP, loose(25, 56)), big(6, 2, 14)] }, 50],
    [{ ...SIT, head: [-2, 0], tail: 'sitA', props: [...yarn(S1, DROP, loose(25, 50)), big(-2, 0, 12)] }, 50],
    [{ ...SIT, eye: 'up', head: [-2, -1], tail: 'sitA', props: [...yarn(S1, DROP, loose(25, 44)), behind(big(4, 2, 5))] }, 50],
    [{ ...CAUGHT, eye: 'wide', head: [-1, 0], tail: 'sitA', props: yarn(S1, ear([-1, 0]), DROP, loose(25, 38)) }, 50],
    // Second turn: out from under its jaw, down across the chest to the haunch.
    [{ ...CAUGHT, eye: 'down', head: [0, -1], tail: 'sitB', props: [...yarn(S1, ear([0, -1]), DROP, loose(25, 33)), behind(big(21, 0, 15))] }, 50],
    [{ ...CAUGHT, eye: 'down', tail: 'sitB', props: [...yarn(S1, ear(), DROP, loose(25, 29)), big(12, 2, 15)] }, 50],
    [{ ...CAUGHT, eye: 'down', head: [-1, 1], tail: 'sitB', props: [...yarn(S1, S2.slice(0, 7), ear([-1, 1]), DROP), big(5, 0, 17)] }, 50],
    [{ ...CAUGHT, eye: 'down', head: [-2, 1], tail: 'sitA', props: [...yarn(S1, S2, ear([-2, 1]), DROP.slice(0, 3)), big(-3, 2, 19)] }, 50],
    [{ ...CAUGHT, eye: 'closed', head: [-1, 0], tail: 'sitA', props: yarn(S1, S2, ear([-1, 0])) }, 50],
    // Third turn, lower and smaller: round the leg and the belly.
    [{ ...CAUGHT, eye: 'wide', head: [1, 1], tail: 'sitA', props: [...yarn(S1, S2, ear([1, 1])), behind(small(19, 0, 22))] }, 50],
    [{ ...CAUGHT, eye: 'down', head: [0, 1], tail: 'sitB', props: [...yarn(S1, S2, S3.slice(0, 2), ear([0, 1])), small(13, 2, 20)] }, 50],
    [{ ...CAUGHT, eye: 'down', head: [-1, 1], tail: 'sitB', props: [...yarn(S1, S2, S3.slice(0, 10), ear([-1, 1])), small(5, 0, 18)] }, 50],
    [{ ...CAUGHT, eye: 'closed', head: [-1, 0], tail: 'sitB', props: [...yarn(S1, S2, S3, ear([-1, 0])), small(-2, 2, 16)] }, 50],
    [{ ...CAUGHT, eye: 'closed', tail: 'sitA', props: yarn(S1, S2, S3, ear()) }, 50],
    // What is left of the ball drops out on the right and rolls to a stop.
    [{ ...CAUGHT, eye: 'wide', head: [1, 0], tail: 'sitA', props: [...yarn(S1, S2, S3, ear([1, 0])), behind(small(20, 0))] }, 55],
    [{ ...CAUGHT, eye: 'wide', tail: 'sitA', props: [...yarn(S1, S2, S3, ear(), trail(24)), small(25, 1)] }, 60],
    [{ ...CAUGHT, eye: 'wide', tail: 'sitB', props: [...yarn(S1, S2, S3, ear(), trail(28)), small(29, 2)] }, 70],
    [{ ...CAUGHT, eye: 'wide', mouth: 'open', tail: 'sitB', props: [...yarn(S1, S2, S3, ear(), trail(30)), small(31, 3)] }, 300],
  ]),
  tangled: anim([
    [{ ...CAUGHT, eye: 'down', tail: 'sitA', props: [...yarn(S1, S2, S3, ear(), trail(30)), small(31, 3)] }, 400],
  ]),
  untangle: anim([
    [{ ...SIT, eye: 'happy', tail: 'sitA' }, 200],
  ]),
} satisfies Record<string, Animation>;
