import { outlined } from '../../grid';
import type { Animation, Glyph, Overlay } from '../../frames';
import { anim, type Pose } from '../pose';

const SIT = { body: 'sit' } as const;
const STICK = 11;

// Pennant of 8 columns; each column's vertical offset gives the wave. Top row bright, middle row the fold.
const WAVES = {
  straight: [1, 1, 1, 1, 1, 1, 1, 1],
  up: [1, 1, 0, 0, 0, 1, 2, 2],
  down: [1, 1, 2, 2, 2, 1, 0, 0],
} as const;

function flagRows(wave: keyof typeof WAVES): string[] {
  const rows = Array.from({ length: STICK }, () => Array<string>(9).fill('.'));
  for (const row of rows) {
    row[0] = 'k';
  }
  WAVES[wave].forEach((off, i) => {
    const col = i + 1;
    const len = i > 5 ? 2 : 3; // the tip narrows
    for (let r = 0; r < len; r++) {
      rows[off + r][col] = r === 1 ? 'a' : 'A';
    }
  });
  return rows.map((r) => r.join(''));
}

const rowsOf = { straight: flagRows('straight'), up: flagRows('up'), down: flagRows('down') };
const FULL = {
  straight: outlined(rowsOf.straight),
  up: outlined(rowsOf.up),
  down: outlined(rowsOf.down),
};
/** The flag with only its top `n` rows showing: the ground hides the rest. */
const upTo = (wave: keyof typeof WAVES, n: number): Glyph => outlined(rowsOf[wave].slice(0, n));

// Stick across the muzzle, pennant hanging from its far end.
const CARRIED = outlined([
  'kkkkkkkkkkk',
  '...AAAAAAA.',
  '...aaaaaa..',
  '...AAAA....',
]);

const GROUND = 30; // nothing is drawn below this row
const PLANT_X = 27;
/** A flag standing in the ground showing `n` rows. */
const inGround = (wave: keyof typeof WAVES, n = STICK): Overlay => {
  const glyph = n === STICK ? FULL[wave] : upTo(wave, n);
  return { x: PLANT_X, y: GROUND - glyph.length + 1, glyph, mirrors: true };
};
const stuck = (wave: keyof typeof WAVES, n?: number): readonly Overlay[] => [inGround(wave, n)];
const carried = (x: number, y: number): readonly Overlay[] => [{ x, y, glyph: CARRIED, mirrors: true }];
const lifted = (lift: number): readonly Overlay[] => [
  { x: PLANT_X, y: GROUND - FULL.straight.length + 1 - lift, glyph: FULL.straight, mirrors: true },
];
// Pulled up from behind its back, low on the left; clipped at the ground.
const rising = (y: number): readonly Overlay[] => {
  const glyph = upTo('straight', Math.min(STICK, GROUND - y - 1));
  return [{ x: 3, y, glyph, behind: true, mirrors: true }];
};

const proud = (n: number, wave: keyof typeof WAVES): Pose => ({
  ...SIT,
  eye: 'happy',
  head: [0, -1],
  tail: n % 2 ? 'sitB' : 'sitA',
  extras: n % 3 === 1 ? ['sparkleA'] : n % 3 === 2 ? ['sparkleB'] : [],
  props: stuck(wave),
});

export const flagAnims = {
  plantFlag: anim([
    // It turns its head back and pulls the flag up from behind.
    [{ ...SIT, head: [-2, 1], eye: 'wide', tail: 'sitA', props: rising(13) }, 120],
    [{ ...SIT, head: [-3, 1], eye: 'wide', tail: 'sitB', props: rising(4) }, 140],
    [{ ...SIT, head: [-3, 2], mouth: 'flat', tail: 'sitA', props: carried(14, 15) }, 120],
    // It carries it forward in its mouth.
    [{ ...SIT, head: [-1, 1], mouth: 'flat', tail: 'sitB', props: carried(20, 16) }, 130],
    [{ ...SIT, head: [0, 1], mouth: 'flat', tail: 'sitA', props: carried(25, 16) }, 130],
    // It leans forward and down and pushes the stick in over two frames.
    [{ ...SIT, bob: 1, head: [2, 4], eye: 'down', mouth: 'flat', props: lifted(2) }, 160],
    [{ ...SIT, bob: 1, head: [3, 4], eye: 'down', mouth: 'flat', props: stuck('straight', 10) }, 110],
    [{ ...SIT, bob: 1, head: [3, 4], eye: 'down', props: stuck('straight') }, 110],
    // A firm tap with the paw.
    [{ ...SIT, head: [2, 3], eye: 'down', paw: 'tapNear', props: stuck('straight') }, 120],
    [{ ...SIT, head: [1, 2], eye: 'down', paw: 'tapNear', props: stuck('up') }, 100],
    // Proud: chest out, the pennant waves.
    [proud(0, 'up'), 160],
    [proud(1, 'down'), 160],
    [proud(2, 'straight'), 160],
    [proud(3, 'up'), 150],
    [proud(4, 'down'), 150],
        // A little bow, then the flag sinks straight down and is gone.
    [{ ...SIT, body: 'bow', eye: 'happy', tail: 'sitA', props: stuck('straight') }, 160],
    [{ ...SIT, body: 'bow', eye: 'happy', tail: 'sitB', props: stuck('straight', 7) }, 100],
    [{ ...SIT, eye: 'happy', head: [0, 1], tail: 'sitA', props: stuck('straight', 4) }, 100],
    [{ ...SIT, eye: 'happy', head: [0, 1], tail: 'sitB', props: stuck('straight', 2) }, 100],
    [{ ...SIT, eye: 'happy', tail: 'sitA', extras: ['sparkleA'] }, 120],
    [{ ...SIT, tail: 'sitB' }, 120],
  ]),
} satisfies Record<string, Animation>;
