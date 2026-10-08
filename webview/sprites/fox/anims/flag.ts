import { outlined } from '../../grid';
import type { Animation, Glyph, Overlay } from '../../frames';
import { anim, type Pose } from '../pose';

const SIT = { body: 'sit' } as const;

// A pennant on a stick; its three flutter shapes are told apart by how the cloth hangs.
const CLOTH: Record<'a' | 'b' | 'c', readonly string[]> = {
  a: ['kAAAAAA', 'kAAAAA.', 'kAAAA..'],
  b: ['kAAAAA.', 'kAAAAAA', 'kaAAA..'],
  c: ['kAAAA..', 'kAAAAA.', 'kAAAAAA'],
};
const STICK_ROWS = 10;

/** The flag with only its top `rows` rows showing, as when it sinks into the ground. */
function flagGlyph(shape: keyof typeof CLOTH, rows = STICK_ROWS): Glyph {
  const all = [...CLOTH[shape], ...Array<string>(STICK_ROWS - 3).fill('k......')];
  return outlined(all.slice(0, rows));
}

const FLUTTER = ['a', 'b', 'a', 'c'] as const;
const FULL = { a: flagGlyph('a'), b: flagGlyph('b'), c: flagGlyph('c') };
const SINKING = [flagGlyph('a', 7), flagGlyph('a', 4), flagGlyph('a', 2)];

// Glyph is rows + 2 tall; `bottom` is where its lowest row (the outline) sits.
function flagAt(x: number, bottom: number, glyph: Glyph): Overlay {
  return { x, y: bottom - glyph.length + 1, glyph, mirrors: true };
}
const held = (x: number, bottom: number, shape: 'a' | 'b' | 'c' = 'a'): readonly Overlay[] => [
  flagAt(x, bottom, FULL[shape]),
];
// Planted in front of the paws, the stick's foot hidden in the ground.
const GROUND = 31;
const PLANTED_X = 26;
const planted = (shape: 'a' | 'b' | 'c'): readonly Overlay[] => held(PLANTED_X, GROUND, shape);

const proud = (n: number): Pose => ({
  ...SIT,
  eye: 'happy',
  tail: n % 2 ? 'sitB' : 'sitA',
  extras: [n % 2 ? 'sparkleB' : 'sparkleA'],
  props: planted(FLUTTER[n % 4]),
});

export const flagAnims = {
  plantFlag: anim([
    // It brings the flag out from beside it, held up, and looks at it.
    [{ ...SIT, eye: 'wide', props: held(44, 23) }, 140],
    [{ ...SIT, eye: 'wide', head: [0, 1], tail: 'sitA', props: held(37, 23) }, 140],
    [{ ...SIT, head: [1, 1], tail: 'sitB', props: held(31, 24) }, 160],
    // It lowers it to the ground in front of its paws and taps it in.
    [{ ...SIT, eye: 'down', head: [1, 3], mouth: 'flat', props: held(28, 28) }, 140],
    [{ ...SIT, eye: 'down', head: [1, 2], paw: 'tapNear', props: planted('a') }, 120],
    [{ ...SIT, eye: 'happy', head: [0, 1], tail: 'sitA', props: planted('b') }, 100],
    // Proud beside it while the pennant flutters.
    [proud(0), 200],
    [proud(1), 200],
    [proud(2), 200],
    [proud(3), 200],
    // A pat, and the flag sinks into the ground.
    [{ ...SIT, eye: 'happy', paw: 'tapNear', tail: 'sitB', props: planted('b') }, 150],
    [{ ...SIT, eye: 'happy', head: [0, 1], tail: 'sitA', props: [flagAt(PLANTED_X, GROUND + 3, SINKING[0])] }, 110],
    [{ ...SIT, eye: 'happy', head: [0, 1], tail: 'sitB', props: [flagAt(PLANTED_X, GROUND + 4, SINKING[1])] }, 110],
    [{ ...SIT, eye: 'happy', head: [0, 1], tail: 'sitA', props: [flagAt(PLANTED_X, GROUND + 5, SINKING[2])] }, 110],
    [{ ...SIT, eye: 'happy', tail: 'sitB', extras: ['sparkleA'] }, 110],
    [{ ...SIT, eye: 'happy', tail: 'sitA' }, 200],
    [{ ...SIT, tail: 'sitB' }, 200],
  ]),
} satisfies Record<string, Animation>;
