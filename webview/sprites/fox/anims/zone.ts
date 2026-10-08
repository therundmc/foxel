import type { Animation, Overlay } from '../../frames';
import { outlined } from '../../grid';
import { anim } from '../pose';

const SIT = { body: 'sit' } as const;

// Headband: a red band across the top of the head, and two long tails fluttering behind it.
const BAND = outlined(['AAAAAAAA', 'aaaaaaaa']);
const TAILS_DOWN = outlined(['AAAAAA', '..AAAa', '....aa', '.....a']);
const TAILS_FLY = outlined(['AAAAAA', '..AAAa', '.....aa']);
const TAILS_FLY2 = outlined(['.AAAAA', 'AAAAAa', '..aaaa', '...a']);
const BAND_SLIP = outlined(['AAAA', 'aaaa']);

const band = (x: number, y: number, glyph = BAND): Overlay => ({ x, y, glyph, mirrors: true });
const tails = (x: number, y: number, glyph = TAILS_DOWN): Overlay => ({ x, y, glyph, mirrors: true, behind: true });

// Lantern, 7x10 with its outline: ring handle, dark cap, two panes with a bar between, dark base.
const pane = (top: string, mid: string, low: string): Overlay['glyph'] =>
  outlined([
    '.ddd.',
    '.d.d.',
    'ddddd',
    `d${top}d`,
    `d${mid}d`,
    'ddddd',
    `d${low}d`,
    'ddddd',
  ]);
const LANTERN_DIM = pane('xxx', 'xkx', 'xxx');
const LANTERN_ON = pane('XXX', 'XJX', 'XXX');
const FLAME_A = pane('XJX', 'JJJ', 'XJX');
const FLAME_B = pane('JXX', 'JJX', 'XXX');
const FLAME_C = pane('XXJ', 'XJJ', 'XXX');
const LANTERN_X = 26;
const LANTERN_Y = 21;
const lantern = (glyph: Overlay['glyph'], x = LANTERN_X, y = LANTERN_Y): Overlay => ({ x, y, glyph, mirrors: true });

const KEEN = { ...SIT, eye: 'wide', mouth: 'flat' } as const;
const FOCUS = { ...SIT, eye: 'down', mouth: 'flat' } as const;
const COSY = { ...SIT, eye: 'sleepy', mouth: 'smile' } as const;

export const zoneAnims = {
  zoneIn: anim([
    [{ ...SIT, tail: 'sitA' }, 120],
    [{ ...SIT, paw: 'wave1', head: [0, 1], props: [band(17, -6)] }, 160],
    [{ ...SIT, paw: 'wave2', eye: 'closed', props: [band(17, 1), tails(10, 4, TAILS_FLY)] }, 160],
    [{ ...SIT, eye: 'closed', mouth: 'flat', props: [band(17, 4), tails(10, 4)] }, 200],
    [{ ...KEEN, bob: 1, props: [band(17, 4), tails(10, 5)] }, 200],
    [{ ...KEEN, tail: 'sitB', props: [band(17, 4), tails(10, 5, TAILS_FLY)] }, 140],
    [{ ...FOCUS, paw: 'tapNear', props: [band(17, 4), tails(10, 4)] }, 120],
  ]),
  inTheZone: anim([
    [{ ...FOCUS, paw: 'tapNear', props: [band(17, 4), tails(10, 4, TAILS_FLY)] }, 100],
    [{ ...FOCUS, paw: 'tapFar', props: [band(17, 4), tails(10, 4, TAILS_FLY2)] }, 100],
    [{ ...FOCUS, paw: 'tapNear', tail: 'sitB', props: [band(17, 4), tails(10, 4, TAILS_FLY)] }, 100],
    [{ ...FOCUS, paw: 'tapFar', props: [band(17, 4), tails(10, 4, TAILS_FLY2)] }, 100],
    [{ ...FOCUS, paw: 'tapNear', props: [band(17, 4), tails(10, 4)] }, 100],
    [{ ...FOCUS, paw: 'tapFar', tail: 'sitB', props: [band(17, 4), tails(10, 4, TAILS_FLY)] }, 100],
    [{ ...FOCUS, paw: 'tapNear', props: [band(17, 4), tails(10, 4, TAILS_FLY2)] }, 100],
    [{ ...FOCUS, paw: 'tapFar', props: [band(17, 4), tails(10, 4)] }, 100],
    [{ ...FOCUS, paw: 'tapNear', tail: 'sitB', props: [band(17, 4), tails(10, 4, TAILS_FLY)] }, 100],
    [{ ...FOCUS, paw: 'tapFar', props: [band(17, 4), tails(10, 4, TAILS_FLY2)] }, 100],
    [{ ...FOCUS, paw: 'tapNear', props: [band(17, 4), tails(10, 4)] }, 100],
    [{ ...FOCUS, paw: 'tapFar', props: [band(17, 4), tails(10, 4, TAILS_FLY)] }, 100],
  ]),
  zoneOut: anim([
    [{ ...FOCUS, paw: 'tapNear', props: [band(17, 4), tails(10, 4, TAILS_FLY)] }, 100],
    [{ ...KEEN, props: [band(17, 4), tails(10, 4)] }, 120],
    [{ ...SIT, eye: 'closed', mouth: 'flat', props: [band(16, 3), tails(10, 5, TAILS_FLY)] }, 140],
    [{ ...SIT, eye: 'closed', mouth: 'flat', props: [band(13, 3, BAND_SLIP), tails(8, 6)] }, 130],
    [{ ...SIT, eye: 'closed', mouth: 'flat', props: [band(8, 6, BAND_SLIP)] }, 130],
    [{ ...SIT, eye: 'closed', mouth: 'open', bob: 1, tail: 'sitB' }, 220],
    [{ ...SIT, eye: 'happy', tail: 'sitA' }, 160],
    [{ ...SIT, tail: 'sitA' }, 100],
  ]),
  lanternIn: anim([
    [{ ...SIT, tail: 'sitA', props: [lantern(LANTERN_DIM, LANTERN_X, 2)] }, 160],
    [{ ...SIT, tail: 'sitB', eye: 'down', props: [lantern(LANTERN_DIM, LANTERN_X, 12)] }, 140],
    [{ ...SIT, eye: 'down', props: [lantern(LANTERN_DIM)] }, 160],
    [{ ...SIT, eye: 'down', props: [lantern(LANTERN_DIM, LANTERN_X, 20)] }, 120],
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
