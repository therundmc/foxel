import type { Animation } from '../../frames';
import { outlined } from '../../grid';
import { anim, type Pose } from '../pose';

const SIT = { body: 'sit' } as const;

// Wooden caps, pale glass, amber sand: 7 wide, 11 tall. `top` rows of sand sit in the upper bulb,
// the rest of the four have run to the lower one; `stream` is the thread through the neck.
function glass(top: number, stream: boolean): string[] {
  const edge = [
    'ttttttt',
    'wZZZZZw',
    'wZZZZZw',
    '.wZZZw.',
    '..wZw..',
    '...w...',
    '..wZw..',
    '.wZZZw.',
    'wZZZZZw',
    'wZZZZZw',
  ];
  const rows = edge.map((r) => r.split(''));
  // Fill the sand from the bottom of each bulb upwards.
  const topRows = [4, 3, 2, 1];
  const botRows = [9, 8, 7, 6];
  const fill = (r: number): void => {
    rows[r] = rows[r].map((c) => (c === 'Z' ? 'x' : c));
  };
  topRows.slice(0, top).forEach(fill);
  botRows.slice(0, 4 - top).forEach(fill);
  if (stream) {
    rows[5][3] = 'x';
    rows[4][3] = 'x';
  }
  return [...rows.map((r) => r.join('')), 'ttttttt'];
}

const G = {
  s40: outlined(glass(4, true)),
  s30: outlined(glass(3, true)),
  s20: outlined(glass(2, true)),
  s10: outlined(glass(1, true)),
  e0: outlined(glass(0, false)),
  full: outlined(glass(4, false)),
};

// Mid-flip: lying on its side.
const SIDE = outlined([
  't.......t',
  'twwwwwwwt',
  'tZxxxZxxt',
  'twwwwwwwt',
  't.......t',
]);

const X = 32;
const GROUND_Y = 18;
const hg = (glyph: readonly string[], y = GROUND_Y, x = X): Pose['props'] => [{ x, y, glyph, mirrors: true }];

export const hourglassAnims = {
  hourglassIn: anim([
    [{ eye: 'up', head: [0, -1], props: hg(G.full, -4) }, 200],
    [{ eye: 'up', head: [0, -1], props: hg(G.full, 9) }, 120],
    [{ eye: 'wide', props: hg(G.full, 18) }, 100],
    [{ eye: 'wide', props: hg(G.full, 15) }, 100],
    [{ props: hg(G.full, 18) }, 120],
    [{ ...SIT, bob: 1, head: [0, 1], props: hg(G.full) }, 160],
    [{ ...SIT, tail: 'sitA', eye: 'happy', props: hg(G.full) }, 500],
  ]),
  hourglassWait: anim([
    [{ ...SIT, tail: 'sitA', eye: 'down', props: hg(G.s40) }, 500],
    [{ ...SIT, tail: 'sitB', head: [0, 1], props: hg(G.s40) }, 400],
    [{ ...SIT, tail: 'sitA', paw: 'tapNear', eye: 'down', props: hg(G.s30) }, 250],
    [{ ...SIT, tail: 'sitA', eye: 'down', props: hg(G.s30) }, 250],
    [{ ...SIT, tail: 'sitB', eye: 'up', head: [0, -1], props: hg(G.s30) }, 400],
    [{ ...SIT, tail: 'sitA', head: [0, 1], eye: 'down', props: hg(G.s20) }, 450],
    [{ ...SIT, tail: 'sitB', head: [-1, 1], eye: 'down', props: hg(G.s20) }, 450],
    [{ ...SIT, tail: 'sitA', paw: 'tapNear', eye: 'down', props: hg(G.s10) }, 220],
    [{ ...SIT, tail: 'sitA', eye: 'down', props: hg(G.s10) }, 220],
    [{ ...SIT, tail: 'sitB', eye: 'down', head: [0, 1], props: hg(G.s10) }, 460],
    [{ ...SIT, tail: 'sitA', eye: 'wide', props: hg(G.e0) }, 550],
    [{ ...SIT, tail: 'sitB', paw: 'wave1', props: hg(G.e0) }, 200],
    [{ ...SIT, tail: 'sitA', paw: 'wave2', eye: 'closed', head: [1, 1], props: hg(SIDE, 20, 30) }, 150],
    [{ ...SIT, tail: 'sitB', paw: 'wave1', eye: 'happy', props: hg(G.full, 15) }, 150],
    [{ ...SIT, tail: 'sitA', eye: 'happy', props: hg(G.full) }, 150],
  ]),
  hourglassOut: anim([
    [{ ...SIT, tail: 'sitA', head: [0, 1], props: hg(G.full) }, 140],
    [{ ...SIT, tail: 'sitB', head: [2, 2], eye: 'closed', props: hg(G.full, GROUND_Y, X + 1) }, 120],
    [{ ...SIT, tail: 'sitB', head: [3, 2], eye: 'closed', props: hg(G.full, GROUND_Y, X + 4) }, 100],
    [{ ...SIT, tail: 'sitA', head: [1, 1], eye: 'happy', props: hg(G.full, GROUND_Y, X + 9) }, 120],
    [{ ...SIT, tail: 'sitB', eye: 'happy', props: hg(G.full, GROUND_Y, X + 15) }, 120],
    [{ ...SIT, tail: 'sitA', eye: 'happy', props: hg(G.full, GROUND_Y, X + 22) }, 120],
    [{ ...SIT, tail: 'sitB', eye: 'happy' }, 280],
  ]),
  startAwake: anim([
    [{ ...SIT, tail: 'sitA', eye: 'closed', head: [0, 2] }, 350],
    [{ ...SIT, tail: 'sitB', eye: 'closed', head: [0, 3] }, 250],
    [{ ...SIT, tail: 'sitA', eye: 'wide', ears: 'up', head: [0, -1], bob: -1 }, 160],
    [{ ...SIT, tail: 'sitB', eye: 'wide', ears: 'up', head: [-2, 0] }, 150],
    [{ ...SIT, tail: 'sitA', eye: 'wide', ears: 'up', head: [1, 0] }, 150],
    [{ ...SIT, tail: 'sitB', eye: 'closed', head: [-1, 0] }, 90],
    [{ ...SIT, tail: 'sitA', eye: 'closed', head: [1, 0] }, 90],
    [{ ...SIT, tail: 'sitB', eye: 'open' }, 260],
  ]),
} satisfies Record<string, Animation>;
