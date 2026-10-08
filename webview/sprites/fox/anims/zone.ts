import type { Animation, Overlay } from '../../frames';
import { outlined } from '../../grid';
import { anim } from '../pose';

const SIT = { body: 'sit' } as const;

// Headband: a red band across the forehead, and two short tails hanging behind the head.
const BAND = outlined(['AAAAAAAAA', 'aaaaaaaaa']);
const TAILS_DOWN = outlined(['AAA', 'AAa', '.Aa', '..a']);
const TAILS_FLY = outlined(['AAAA', '.AAA', '..aa']);
const TAILS_FLY2 = outlined(['AAA', 'AAAA', '.aaa']);
const BAND_SLIP = outlined(['AAAA', 'aaaa']);

const band = (x: number, y: number, glyph = BAND): Overlay => ({ x, y, glyph, mirrors: true });
const tails = (x: number, y: number, glyph = TAILS_DOWN): Overlay => ({ x, y, glyph, mirrors: true, behind: true });

// Lantern: dark frame, a handle on top, a glass that is dim amber or bright yellow.
const LANTERN_DIM = outlined([
  '..dd..',
  '.d..d.',
  'dddddd',
  'dkxxkd',
  'dxkkxd',
  'dxkkxd',
  'dkxxkd',
  'dddddd',
  'dddddd',
]);
const lit = (flame: readonly string[]): Overlay['glyph'] =>
  outlined([
    '..dd..',
    '.d..d.',
    'dddddd',
    `dX${flame[0]}Xd`,
    `dX${flame[1]}Xd`,
    `dX${flame[2]}Xd`,
    'dxXXxd',
    'dddddd',
    'dddddd',
  ]);
const LANTERN_ON = lit(['JJ', 'JJ', 'XX']);
const FLAME_A = lit(['.S', 'SJ', 'JJ']);
const FLAME_B = lit(['SJ', 'JJ', 'JJ']);
const FLAME_C = lit(['S.', 'JS', 'JJ']);
const LANTERN_X = 26;
const LANTERN_Y = 20;
const lantern = (glyph: Overlay['glyph'], x = LANTERN_X, y = LANTERN_Y): Overlay => ({ x, y, glyph, mirrors: true });

const KEEN = { ...SIT, eye: 'wide', mouth: 'flat' } as const;
const FOCUS = { ...SIT, eye: 'down', mouth: 'flat' } as const;
const COSY = { ...SIT, eye: 'sleepy', mouth: 'smile' } as const;

export const zoneAnims = {
  zoneIn: anim([
    [{ ...SIT, tail: 'sitA' }, 120],
    [{ ...SIT, paw: 'wave1', head: [0, 1], props: [band(17, -3)] }, 160],
    [{ ...SIT, paw: 'wave2', eye: 'closed', props: [band(16, 5), tails(11, 7, TAILS_FLY)] }, 160],
    [{ ...SIT, eye: 'closed', mouth: 'flat', props: [band(16, 7), tails(11, 7)] }, 200],
    [{ ...KEEN, bob: 1, props: [band(16, 7), tails(11, 8)] }, 200],
    [{ ...KEEN, tail: 'sitB', props: [band(16, 7), tails(11, 8, TAILS_FLY)] }, 140],
    [{ ...FOCUS, paw: 'tapNear', props: [band(16, 7), tails(11, 7)] }, 120],
  ]),
  inTheZone: anim([
    [{ ...FOCUS, paw: 'tapNear', props: [band(16, 7), tails(11, 7, TAILS_FLY)] }, 100],
    [{ ...FOCUS, paw: 'tapFar', props: [band(16, 7), tails(11, 7, TAILS_FLY2)] }, 100],
    [{ ...FOCUS, paw: 'tapNear', tail: 'sitB', props: [band(16, 7), tails(11, 7, TAILS_FLY)] }, 100],
    [{ ...FOCUS, paw: 'tapFar', props: [band(16, 7), tails(11, 7, TAILS_FLY2)] }, 100],
    [{ ...FOCUS, paw: 'tapNear', props: [band(16, 7), tails(11, 7)] }, 100],
    [{ ...FOCUS, paw: 'tapFar', tail: 'sitB', props: [band(16, 7), tails(11, 7, TAILS_FLY)] }, 100],
    [{ ...FOCUS, paw: 'tapNear', props: [band(16, 7), tails(11, 7, TAILS_FLY2)] }, 100],
    [{ ...FOCUS, paw: 'tapFar', props: [band(16, 7), tails(11, 7)] }, 100],
    [{ ...FOCUS, paw: 'tapNear', tail: 'sitB', props: [band(16, 7), tails(11, 7, TAILS_FLY)] }, 100],
    [{ ...FOCUS, paw: 'tapFar', props: [band(16, 7), tails(11, 7, TAILS_FLY2)] }, 100],
    [{ ...FOCUS, paw: 'tapNear', props: [band(16, 7), tails(11, 7)] }, 100],
    [{ ...FOCUS, paw: 'tapFar', props: [band(16, 7), tails(11, 7, TAILS_FLY)] }, 100],
  ]),
  zoneOut: anim([
    [{ ...FOCUS, paw: 'tapNear', props: [band(16, 7), tails(11, 7, TAILS_FLY)] }, 100],
    [{ ...KEEN, props: [band(16, 7), tails(11, 7)] }, 120],
    [{ ...SIT, eye: 'closed', mouth: 'flat', props: [band(15, 6), tails(11, 8, TAILS_FLY)] }, 140],
    [{ ...SIT, eye: 'closed', mouth: 'flat', props: [band(12, 5, BAND_SLIP), tails(9, 9)] }, 130],
    [{ ...SIT, eye: 'closed', mouth: 'flat', props: [band(7, 8, BAND_SLIP)] }, 130],
    [{ ...SIT, eye: 'closed', mouth: 'open', bob: 1, tail: 'sitB' }, 220],
    [{ ...SIT, eye: 'happy', tail: 'sitA' }, 160],
    [{ ...SIT, tail: 'sitA' }, 100],
  ]),
  lanternIn: anim([
    [{ ...SIT, tail: 'sitA', props: [lantern(LANTERN_DIM, LANTERN_X, 2)] }, 160],
    [{ ...SIT, tail: 'sitB', eye: 'down', props: [lantern(LANTERN_DIM, LANTERN_X, 12)] }, 140],
    [{ ...SIT, eye: 'down', props: [lantern(LANTERN_DIM)] }, 160],
    [{ ...SIT, eye: 'down', props: [lantern(LANTERN_DIM, LANTERN_X, 19)] }, 120],
    [{ ...SIT, eye: 'down', props: [lantern(LANTERN_DIM)] }, 240],
    [{ ...SIT, eye: 'wide', props: [lantern(LANTERN_ON)] }, 240],
    [{ ...SIT, eye: 'wide', mouth: 'open', tail: 'sitB', props: [lantern(FLAME_A)] }, 240],
    [{ ...COSY, props: [lantern(FLAME_B)] }, 200],
  ]),
  lantern: anim([
    [{ ...COSY, props: [lantern(FLAME_B)] }, 300],
    [{ ...COSY, props: [lantern(FLAME_A)] }, 260],
    [{ ...COSY, tail: 'sitB', props: [lantern(FLAME_C)] }, 260],
    [{ ...COSY, eye: 'down', props: [lantern(FLAME_B)] }, 300],
    [{ ...COSY, eye: 'down', props: [lantern(FLAME_A)] }, 360],
    [{ ...SIT, eye: 'open', props: [lantern(FLAME_C)] }, 260],
    [{ ...COSY, props: [lantern(FLAME_B)] }, 260],
    [{ ...COSY, bob: 1, tail: 'sitB', props: [lantern(FLAME_A)] }, 340],
    [{ ...COSY, bob: 1, props: [lantern(FLAME_C)] }, 300],
    [{ ...COSY, props: [lantern(FLAME_B)] }, 280],
  ]),
  lanternOut: anim([
    [{ ...COSY, props: [lantern(FLAME_B)] }, 120],
    [{ ...SIT, eye: 'open', mouth: 'open', head: [0, 1], props: [lantern(FLAME_A)] }, 180],
    [{ ...SIT, eye: 'closed', mouth: 'open', head: [1, 1], props: [lantern(FLAME_C)] }, 160],
    [{ ...SIT, eye: 'closed', mouth: 'flat', props: [lantern(LANTERN_DIM)] }, 220],
    [{ ...SIT, eye: 'open', props: [lantern(LANTERN_DIM, LANTERN_X + 6)] }, 140],
    [{ ...SIT, props: [lantern(LANTERN_DIM, LANTERN_X + 11)] }, 130],
    [{ ...SIT, eye: 'happy', tail: 'sitB', props: [lantern(LANTERN_DIM, LANTERN_X + 20)] }, 140],
    [{ ...SIT, tail: 'sitA' }, 80],
  ]),
} satisfies Record<string, Animation>;
