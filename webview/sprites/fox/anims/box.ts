import type { Animation, Glyph } from '../../frames';
import { outlined } from '../../grid';
import { anim, type Pose } from '../pose';

const BOX_W = 28;
const BOX_H = 16;

// A cardboard box, open side down. `lift` raises its right side (hinged on the left) by that many pixels.
function boxGlyph(lift: number): Glyph {
  const rows = BOX_H + lift;
  const grid = Array.from({ length: rows }, () => Array<string>(BOX_W).fill('.'));
  for (let x = 0; x < BOX_W; x++) {
    const shift = lift - Math.round((lift * x) / (BOX_W - 1));
    for (let y = 0; y < BOX_H; y++) {
      let c = 'T';
      if (y === 4) c = 't'; // the seam of the flaps
      if (y === BOX_H - 1 || x === BOX_W - 1) c = 't';
      if (x >= 12 && x <= 15 && y <= 8) c = 'h'; // a strip of tape
      grid[shift + y][x] = c;
    }
  }
  return outlined(grid.map((r) => r.join('')));
}

const BOX = [0, 3, 6, 9].map(boxGlyph);

// On the ground the glyph's left-hand bottom outline sits on row 31, just under the ground.
const box = (lift: 0 | 1 | 2 | 3, x = 0, y?: number) => ({
  x,
  y: y ?? 14 - lift * 3,
  glyph: BOX[lift],
});

const HIDDEN: Pose = { body: 'lie', head: [-3, 8], ears: 'back', eye: 'closed', mouth: 'flat' };
const peek = (dx: number, extra: Pose = {}): Pose => ({
  body: 'lie',
  head: [dx, 8],
  ears: 'back',
  ...extra,
});

export const boxAnims = {
  // Looks up at a shadow, ducks, and the box lands on it with a little bounce.
  boxHide: anim([
    [{ eye: 'up', head: [1, -1] }, 200],
    [{ eye: 'wide', ears: 'back', props: [box(0, 0, -15)] }, 140],
    [{ body: 'lie', eye: 'wide', ears: 'back', props: [box(0, 0, -3)] }, 120],
    [{ body: 'lie', head: [-1, 3], eye: 'wide', ears: 'back', props: [box(0, 0, 7)] }, 110],
    [{ ...HIDDEN, props: [box(0)] }, 90],
    [{ ...HIDDEN, props: [box(0, 0, 13)] }, 60],
    [{ ...HIDDEN, props: [box(0)] }, 60],
    [{ ...HIDDEN, props: [box(0)] }, 340],
    [{ ...HIDDEN, props: [box(0, 1)] }, 120],
    [{ ...HIDDEN, props: [box(0)] }, 120],
    [{ ...HIDDEN, props: [box(0)] }, 240],
  ]),

  // Lifts a corner, looks about from under the rim, drops it back and shuffles.
  boxPeek: anim([
    [{ ...HIDDEN, props: [box(0)] }, 500],
    [{ ...peek(0, { eye: 'closed' }), props: [box(1)] }, 100],
    [{ ...peek(2), props: [box(2)] }, 100],
    [{ ...peek(4), props: [box(3)] }, 450],
    [{ ...peek(4, { eye: 'up' }), props: [box(3)] }, 250],
    [{ ...peek(1), props: [box(3)] }, 450],
    [{ ...peek(1, { eye: 'down' }), props: [box(3)] }, 250],
    [{ ...peek(4, { eye: 'closed' }), props: [box(3)] }, 130],
    [{ ...peek(4), props: [box(3)] }, 200],
    [{ ...peek(0, { eye: 'closed' }), props: [box(2)] }, 90],
    [{ ...HIDDEN, props: [box(1)] }, 80],
    [{ ...HIDDEN, props: [box(0)] }, 250],
    [{ ...HIDDEN, props: [box(0, 1)] }, 110],
    [{ ...HIDDEN, props: [box(0)] }, 110],
    [{ ...HIDDEN, props: [box(0)] }, 280],
  ]),

  // Stands up with the box on its head, tips it off behind, shakes and is bashful.
  boxLeave: anim([
    [{ ...HIDDEN, props: [box(0)] }, 150],
    [{ ...peek(0, { eye: 'closed' }), props: [box(1)] }, 120],
    [{ bob: 3, tail: 'flat', head: [0, 1], ears: 'back', props: [box(0, 0, 6)] }, 150],
    [{ bob: 1, ears: 'back', props: [box(0, 1, 0)] }, 200],
    [{ ears: 'back', props: [box(0, -1, -1)] }, 150],
    [{ ears: 'back', props: [{ ...box(0, -8, 4), behind: true }] }, 130],
    [{ ears: 'back', props: [{ ...box(0, -18, 12), behind: true }] }, 130],
    [{ props: [{ ...box(0, -24, 13), behind: true }] }, 130],
    [{ head: [-1, 0], eye: 'closed' }, 90],
    [{ head: [2, 0], eye: 'closed' }, 90],
    [{ head: [-1, 0], eye: 'closed' }, 90],
    [{ head: [0, 1], eye: 'down', ears: 'back' }, 450],
  ]),
} satisfies Record<string, Animation>;
