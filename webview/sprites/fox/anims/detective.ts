import { outlined } from '../../grid';
import type { Animation } from '../../frames';
import { anim, STEP_A, STEP_B, type Pose } from '../pose';

// The lens alone, 7 across: a brass rim lit from the top left, pale glass with a glint and a shade.
const LENS = ['..XXX..', '.XWwwX.', 'XWwwwwX', 'XwwwwwX', 'XwwwwCx', '.XwwCx.', '..Xxx..'];

// Its own eye seen through the glass: a pupil far bigger than the real one, `at` columns into the glass.
const eyeIn = (at: number): string[] => {
  const row = (y: number, pupil: string): string => {
    const glass = LENS[y].slice(1, 6);
    return LENS[y][0] + glass.slice(0, at) + pupil + glass.slice(at + 3) + LENS[y][6];
  };
  return [LENS[0], LENS[1], row(2, 'EEW'), row(3, 'EEE'), row(4, 'WEE'), LENS[5], LENS[6]];
};

const pad = (lens: readonly string[], left: number, right: number): string[] =>
  lens.map((r) => '.'.repeat(left) + r + '.'.repeat(right));
// One glass, drawn at each angle it takes as it turns in the mouth: the mouth always closes on the end of the handle.
// `dx`, `dy` place the outlined glyph from the centre of the head.
const peer = (lens: readonly string[]) => ({
  glyph: outlined([...pad(lens, 0, 2).map((r, y) => (y === 6 ? r.slice(0, 5) + 'tk..' : r)), '......tk.', '.......tk']),
  dx: -3,
  dy: -5,
});
const GRIP = {
  /** Pushed along the ground, lens ahead of the nose. */
  flat: { glyph: outlined(pad(LENS, 5, 0).map((r, y) => (y === 3 ? 'ttttt' + r.slice(5) : r))), dx: 6, dy: 0 },
  /** Held up and forward, the way a glass is shown off. */
  fwd: {
    glyph: outlined([...pad(LENS, 4, 0).map((r, y) => (y === 6 ? '....tk' + r.slice(6) : r)), '...tk......', '..tk.......', '.tk........', 'tk.........']),
    dx: 5,
    dy: -7,
  },
  /** Between the two above and straight up. */
  steep: {
    glyph: outlined([...pad(LENS, 1, 0).map((r, y) => (y === 6 ? '..t' + r.slice(3) : r)), '..t.....', '.t......', '.t......', 't.......', 't.......']),
    dx: 4,
    dy: -8,
  },
  /** Straight up, halfway to the eye. */
  up: { glyph: outlined([...LENS, ...Array<string>(5).fill('...t...')]), dx: 2, dy: -9 },
  /** Over its own eye, the handle coming down across the muzzle; then with the eye in it, looking ahead, back and forward. */
  eye: peer(LENS),
  mid: peer(eyeIn(1)),
  left: peer(eyeIn(0)),
  right: peer(eyeIn(2)),
} as const;

interface Hold {
  behind?: true;
  /** Moved off the mouth: sliding away behind its head. */
  slide?: readonly [number, number];
}

/** The same pose with the glass in its mouth. */
function holding(pose: Pose, grip: keyof typeof GRIP, { behind, slide }: Hold = {}): Pose {
  const { dx, dy, glyph } = GRIP[grip];
  const x = 22 + (pose.head?.[0] ?? 0) + dx + (slide?.[0] ?? 0);
  const y = 13 + (pose.bob ?? 0) + (pose.pitch ?? 0) + (pose.head?.[1] ?? 0) + dy + (slide?.[1] ?? 0);
  return { ...pose, props: [{ x, y, glyph, mirrors: true, behind }] };
}

// Nose to the ground, the lens resting on it; and a sniff, nose forward and up.
const LOW_A: Pose = { head: [2, 7], pitch: 2, eye: 'down', mouth: 'flat' };
const LOW_B: Pose = { head: [3, 6], pitch: 2, eye: 'down', mouth: 'flat' };
/** Halfway between standing and nose down. */
const HALF: Pose = { head: [1, 3], pitch: 1, mouth: 'flat' };

const POINT: Pose = { pitch: 1, head: [3, 3], tail: 'streamB', legs: [[-2, 0], [-1, 0], [0, 0], [3, 4]], mouth: 'flat', eye: 'wide' };
export const detectiveAnims = {
  // A case! It nods, whips the glass out from behind its ear and shows it off, then gets down to it.
  detectiveIn: anim([
    [{}, 120],
    [{ head: [0, -1], eye: 'up' }, 100],
    [{ head: [0, 1], eye: 'closed', tail: 'wagL' }, 110],
    [holding({ head: [0, 0], eye: 'closed', tail: 'wagL' }, 'up', { behind: true }), 70],
    [holding({ head: [0, -1], eye: 'up', tail: 'wagR' }, 'steep', { behind: true }), 70],
    [holding({ head: [1, -2], eye: 'happy', tail: 'wagR' }, 'fwd'), 110],
    [holding({ head: [0, -1], tail: 'wagL' }, 'fwd'), 210],
    [holding({ ...HALF, eye: 'down' }, 'flat'), 90],
    [holding({ ...LOW_A, legs: STEP_A, tail: 'wagL' }, 'flat'), 110],
  ]),
  // Sniffs along the trail with the glass on the ground, finds something, peers at it with a huge eye, looks at us puzzled, sniffs on.
  detective: anim([
    [holding({ ...LOW_A, legs: STEP_A, tail: 'wagL', extras: ['sniffA'] }, 'flat'), 190],
    [holding({ ...LOW_B, extras: ['sniffB'] }, 'flat'), 190],
    [holding({ ...LOW_A, legs: STEP_B, tail: 'wagR', extras: ['sniffA'] }, 'flat'), 190],
    [holding({ ...LOW_B, extras: ['sniffB'] }, 'flat'), 240],
    [holding({ ...HALF, head: [2, 4], eye: 'wide', tail: 'poof' }, 'flat'), 280],
    [holding({ head: [1, 2], eye: 'wide', mouth: 'flat' }, 'up'), 80],
    [holding({ head: [1, 1], mouth: 'flat' }, 'mid'), 260],
    [holding({ head: [1, 1], mouth: 'flat', tail: 'wagL' }, 'left'), 280],
    [holding({ head: [1, 1], mouth: 'flat', tail: 'wagR' }, 'right'), 280],
    [holding({ head: [1, 1], mouth: 'flat' }, 'mid'), 160],
    [holding({ head: [0, 0], mouth: 'flat' }, 'up'), 80],
    [holding({ head: [-1, 0], mouth: 'flat', tail: 'wagL' }, 'fwd'), 380],
    [holding({ head: [-1, 0], mouth: 'flat', ears: 'back', tail: 'wagR' }, 'fwd'), 200],
    [holding({ ...HALF, eye: 'down' }, 'flat'), 100],
  ]),
  // Case closed: it stands up, tucks the glass back behind its ear and straightens, pleased.
  detectiveOut: anim([
    [holding({ ...LOW_A, legs: STEP_A, tail: 'wagL' }, 'flat'), 120],
    [holding(HALF, 'flat'), 90],
    [holding({ head: [0, -1] }, 'fwd'), 140],
    [holding({ head: [0, 0], eye: 'up' }, 'steep', { behind: true }), 70],
    [holding({ head: [0, 1], eye: 'closed' }, 'up', { behind: true }), 70],
    [{ head: [0, 1], eye: 'closed', tail: 'wagR' }, 110],
    [{ head: [0, -1], eye: 'happy', tail: 'wagL' }, 130],
    [{ eye: 'happy', tail: 'wagR' }, 160],
  ]),
  // A breakpoint: it freezes like a pointer dog, low and stretched, one paw up, tail out straight.
  pointing: anim([
    [POINT, 800],
    [{ ...POINT, tail: 'flat' }, 120],
    [POINT, 700],
    [{ ...POINT, ears: 'back' }, 380],
  ]),
} satisfies Record<string, Animation>;
