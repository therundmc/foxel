import type { Animation, Overlay } from '../../frames';
import { outlined } from '../../grid';
import { anim } from '../pose';

const SIT = { body: 'sit' } as const;
const WORRY = { ...SIT, ears: 'back', eye: 'up', mouth: 'flat' } as const;

// Q light grey over m mauve grey for a little cloud, e over D when there are many errors.
const CLOUD = outlined([
  '....QQQ......',
  '..QQQQQQQQ...',
  '.QQQQQQQQQQQ.',
  'QQQQQQQQQQQQQ',
  'mQQQmmmmmQQQm',
  '.mmmmmmmmmm..',
]);
const CLOUD_HEAVY = outlined([
  '...eeee.....',
  '.eeeeeeeee..',
  'eeeeeeeeeeee',
  'eeeeeeeeeeee',
  'DeeeDDDDDeeD',
  'DDDDDDDDDDDD',
  '.DDDDDDDDDD.',
]);
// Thin wisps for the clearing: the cloud pulls apart into two.
const WISP_A = outlined(['.QQQ.', 'QQQQQ', '.mmm.']);
const WISP_B = outlined(['.QQ.', 'QQQQ', '.mm.']);
const WISP_THIN = outlined(['...QQ....QQ..', '.QQQQQQ.QQQQQ', '.mmmmm...mmm.']);
const DROP = outlined(['w', 'C']);
const DROP_BIG = outlined(['w', 'C', 'C']);

// Over the head, a little to the front so that the fox looks up at it.
const HOME_X = 14;
const HOME_Y = -4;

const cloud = (dy = 0, x = HOME_X, glyph = CLOUD): Overlay => ({ x, y: HOME_Y + dy, glyph });
const heavy = (dy = 0): Overlay => ({ x: HOME_X - 1, y: HOME_Y - 1 + dy, glyph: CLOUD_HEAVY });
const drop = (x: number, y: number, glyph = DROP): Overlay => ({ x, y, glyph });

const cloudIn = anim([
  [{ ...SIT, eye: 'open', props: [cloud(0, 48)] }, 120],
  [{ ...SIT, eye: 'open', props: [cloud(0, 40)] }, 110],
  [{ ...SIT, eye: 'up', props: [cloud(0, 32)] }, 110],
  [{ ...SIT, eye: 'up', ears: 'up', props: [cloud(0, 25)] }, 120],
  [{ ...SIT, eye: 'up', ears: 'up', props: [cloud(0, 19)] }, 130],
  [{ ...SIT, eye: 'up', ears: 'back', props: [cloud(1, 15)] }, 160],
  [{ ...SIT, eye: 'up', ears: 'back', props: [cloud(0, HOME_X)] }, 180],
  [{ ...WORRY, tail: 'sitA', props: [cloud(0)] }, 190],
  [{ ...WORRY, tail: 'sitB', props: [cloud(1)] }, 190],
]);

const cloudy = anim([
  [{ ...WORRY, tail: 'sitA', props: [cloud(0)] }, 500],
  [{ ...WORRY, tail: 'sitB', props: [cloud(1)] }, 500],
  [{ ...WORRY, tail: 'sitA', props: [cloud(0)] }, 300],
  // A single drop falls and lands on its nose.
  [{ ...WORRY, tail: 'sitA', props: [cloud(0), drop(27, 3)] }, 110],
  [{ ...WORRY, tail: 'sitA', props: [cloud(0), drop(28, 7)] }, 100],
  [{ ...SIT, eye: 'down', ears: 'back', mouth: 'flat', props: [cloud(1), drop(28, 12)] }, 100],
  [{ ...SIT, eye: 'closed', ears: 'back', mouth: 'flat', head: [0, 1], tail: 'sitB', props: [cloud(1)] }, 330],
  [{ ...SIT, eye: 'closed', ears: 'back', mouth: 'flat', head: [0, 2], tail: 'sitB', extras: ['sniffB'], props: [cloud(0)] }, 380],
  [{ ...SIT, eye: 'down', ears: 'back', mouth: 'flat', head: [0, 1], tail: 'sitA', props: [cloud(0)] }, 320],
  [{ ...WORRY, tail: 'sitA', props: [cloud(1)] }, 400],
  [{ ...WORRY, tail: 'sitB', props: [cloud(0)] }, 500],
]);

const cloudHeavy = anim([
  [{ ...SIT, ears: 'back', eye: 'up', mouth: 'flat', head: [0, 2], tail: 'sitA', props: [heavy(0), drop(22, 3), drop(30, 5)] }, 380],
  [{ ...SIT, ears: 'back', eye: 'down', mouth: 'flat', head: [0, 2], bob: 1, tail: 'sitB', props: [heavy(1), drop(23, 8, DROP_BIG), drop(29, 10)] }, 330],
  [{ ...SIT, ears: 'back', eye: 'closed', mouth: 'flat', head: [1, 2], bob: 1, tail: 'sitA', props: [heavy(0), drop(25, 3), drop(31, 13)] }, 330],
  [{ ...SIT, ears: 'back', eye: 'up', mouth: 'flat', head: [0, 2], tail: 'sitB', props: [heavy(1), drop(21, 6, DROP_BIG), drop(28, 4)] }, 320],
  [{ ...SIT, ears: 'back', eye: 'down', mouth: 'flat', head: [-1, 2], bob: 1, tail: 'sitA', props: [heavy(0), drop(24, 12), drop(30, 2)] }, 330],
  [{ ...SIT, ears: 'back', eye: 'closed', mouth: 'flat', head: [0, 2], tail: 'sitB', props: [heavy(1), drop(22, 4), drop(27, 8, DROP_BIG)] }, 330],
  [{ ...SIT, ears: 'back', eye: 'up', mouth: 'flat', head: [1, 2], bob: 1, tail: 'sitA', props: [heavy(0), drop(26, 11), drop(31, 5)] }, 330],
  [{ ...SIT, ears: 'back', eye: 'down', mouth: 'flat', head: [0, 2], tail: 'sitB', props: [heavy(1), drop(23, 2), drop(29, 9)] }, 330],
  [{ ...SIT, ears: 'back', eye: 'closed', mouth: 'flat', head: [0, 2], bob: 1, tail: 'sitA', props: [heavy(0), drop(25, 7), drop(30, 12)] }, 340],
]);

const cloudClears = anim([
  [{ ...WORRY, tail: 'sitA', props: [cloud(0)] }, 200],
  // The cloud thins and splits.
  [{ ...SIT, eye: 'up', ears: 'up', tail: 'sitB', props: [cloud(0, HOME_X, WISP_THIN)] }, 200],
  [{ ...SIT, eye: 'up', ears: 'up', tail: 'sitA', props: [cloud(-1, 9, WISP_A), cloud(0, 22, WISP_B)] }, 200],
  [{ ...SIT, eye: 'happy', tail: 'sitB', props: [cloud(-3, 3, WISP_A), cloud(-2, 28, WISP_B)] }, 180],
  [{ ...SIT, eye: 'happy', tail: 'sitA', props: [cloud(-5, -4, WISP_A), cloud(-5, 36, WISP_B)] }, 160],
  // It shakes itself dry, drops flying.
  [{ ...SIT, eye: 'closed', head: [-1, 0], tail: 'sitB', extras: ['sprayA'] }, 140],
  [{ ...SIT, eye: 'closed', head: [1, 0], tail: 'sitA', extras: ['sprayB'] }, 140],
  [{ ...SIT, eye: 'closed', head: [-1, 0], tail: 'sitB', extras: ['sprayA'] }, 140],
  [{ ...SIT, eye: 'closed', head: [1, 0], tail: 'sitA', extras: ['sprayB'] }, 140],
  [{ ...SIT, eye: 'happy', mouth: 'open', tail: 'wagL', extras: ['sparkleA'] }, 220],
  [{ ...SIT, eye: 'happy', mouth: 'open', bob: 1, tail: 'wagR', extras: ['sparkleB'] }, 220],
  [{ ...SIT, eye: 'happy', tail: 'wagL', extras: ['sparkleA'] }, 220],
  [{ ...SIT, eye: 'happy', tail: 'sitA' }, 200],
]);

// No cloud: a firm little nod, then another.
const encouraged = anim([
  [{ ...SIT, eye: 'open', tail: 'sitA' }, 120],
  [{ ...SIT, eye: 'open', head: [0, 2], ears: 'back', tail: 'wagL' }, 150],
  [{ ...SIT, eye: 'happy', head: [0, 0], tail: 'wagR' }, 150],
  [{ ...SIT, eye: 'open', head: [0, 2], ears: 'back', tail: 'wagL' }, 150],
  [{ ...SIT, eye: 'happy', mouth: 'open', head: [0, 0], tail: 'wagR' }, 190],
  [{ ...SIT, eye: 'happy', mouth: 'open', tail: 'wagL' }, 190],
  [{ ...SIT, eye: 'happy', mouth: 'open', bob: 1, tail: 'wagR' }, 190],
  [{ ...SIT, eye: 'open', tail: 'sitA' }, 170],
]);

export const cloudAnims = { cloudIn, cloudy, cloudHeavy, cloudClears, encouraged } satisfies Record<string, Animation>;
