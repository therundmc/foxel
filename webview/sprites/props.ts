import { outlined } from './grid';
import type { Glyph } from './frames';
import { TRANSPARENT } from './palette';

export const BALL_SIZE = 7;
export const BUG_W = 5;
export const BUG_H = 4;
export const TREAT_W = 11;
export const TREAT_H = 6;

// Bone fill only; outlined() adds the border. After each bite the fox pulls what is left back under its mouth.
const TREAT_BITES: readonly Glyph[] = [
  ['hT.....hT', 'TThhhhhTT', 'ttttttttt', 'tt.....tt'],
  ['.....hT..', '.hhhhTT..', 'ttttttt..', '.....tt..'],
  ['..hT.....', 'hhTT.....', '.ttt.....', '..tt.....'],
  ['hT.......', 'TT.......', 'tt.......', '.t.......'],
];

/** The treat as it is being eaten, near end on the left (mirror when facing left). */
export const TREAT_STAGES: readonly Glyph[] = TREAT_BITES.map(outlined);

export const BUG_FRAMES: readonly Glyph[] = [
  ['VV.VV', 'VVKVV', '.VKV.', '..K..'],
  ['.....', '.VKV.', 'VVKVV', '..K..'],
];

export const TREAT_GLYPH: Glyph = TREAT_STAGES[0];

// Seam rotated 45° clockwise per frame, so rolling right spins the right way.
export const BALL_FRAMES: readonly Glyph[] = [
  ['..KKK..', '.KBYYK.', 'KBgYBBK', 'KBBYBbK', 'KBBYbbK', '.KByyK.', '..KKK..'],
  ['..KKK..', '.KBBBK.', 'KBgBYYK', 'KBBYBbK', 'KBYBbbK', '.KYbbK.', '..KKK..'],
  ['..KKK..', '.KBBBK.', 'KBgBBBK', 'KYYYYyK', 'KYBBbyK', '.KBbbK.', '..KKK..'],
  ['..KKK..', '.KBBBK.', 'KYYBBBK', 'KBBYBbK', 'KBBBybK', '.KBbyK.', '..KKK..'],
  ['..KKK..', '.KYYBK.', 'KBgYBBK', 'KBBYBbK', 'KBBYbbK', '.KYybK.', '..KKK..'],
  ['..KKK..', '.KBBYK.', 'KBgBYBK', 'KBBYBbK', 'KYYBbbK', '.KBbbK.', '..KKK..'],
  ['..KKK..', '.KBBBK.', 'KYgBBYK', 'KYYYYyK', 'KBBBbbK', '.KBbbK.', '..KKK..'],
  ['..KKK..', '.KYBBK.', 'KBYBBBK', 'KBBYBbK', 'KBBByyK', '.KBbbK.', '..KKK..'],
];

const BOWL_SHAPE = ['AAAAAAAAAA', '.aaaaaaaa.', '..AAAAAA..'];
// Kibble or water level, drawn as the top row of the bowl.
function bowlGlyph(fill: string, amount: number, capacity: number): Glyph {
  const slots = [1, 3, 5, 7, 2, 6, 4, 8].slice(0, Math.round((amount / capacity) * 8));
  const top = Array.from({ length: 10 }, (_, x) => (slots.includes(x) ? fill : TRANSPARENT)).join('');
  return outlined([top, ...BOWL_SHAPE.map((r) => (fill === 'w' ? r.replace(/A/g, 'U').replace(/a/g, 'u') : r))]);
}

export const BOWL_W = 12;
export const BOWL_H = 6;
export const BOWL_CAPACITY = 5;
/** Food bowl glyphs by kibble count left (0..BOWL_CAPACITY), then the water bowl by sips left. */
export const FOOD_BOWL: readonly Glyph[] = Array.from({ length: BOWL_CAPACITY + 1 }, (_, n) => bowlGlyph('k', n, BOWL_CAPACITY));
export const WATER_BOWL: readonly Glyph[] = Array.from({ length: 4 }, (_, n) => bowlGlyph('w', n, 3));

export const BASKET_W = 26;
export const BASKET_BACK: Glyph = [
  '..tttttttttttttttttttttt..',
  '.tTTTTTTTTTTTTTTTTTTTTTTt.',
  'tTCCCCCCCCCCCCCCCCCCCCCCTt',
  'tTCCCCCCCCCCCCCCCCCCCCCCTt',
];
export const BASKET_FRONT: Glyph = [
  'tTTTTTTTTTTTTTTTTTTTTTTTTt',
  'tThThThThThThThThThThThTTt',
  '.tTTTTTTTTTTTTTTTTTTTTTTt.',
  '..tttttttttttttttttttttt..',
];

export const CAKE: readonly Glyph[] = [
  outlined(['...H...', '...S...', '.LLLLL.', 'WWWWWWW', 'LLLLLLL', 'ccccccc']),
  outlined(['...S...', '...S...', '.LLLLL.', 'WWWWWWW', 'LLLLLLL', 'ccccccc']),
];

export type Emote = 'sun' | 'moon' | 'cup' | 'drop' | 'bowl';

const EMOTE_ICONS: Record<Emote, Glyph> = {
  sun: ['..x..', '.XXX.', 'xXXXx', '.XXX.', '..x..'],
  moon: ['.GG..', 'GGq..', 'GG...', 'GGq..', '.GG..'],
  cup: ['Q.Q..', '.Q.Q.', 'AAAA.', 'AAAaA', 'AAAA.', '.aa..'],
  drop: ['..U..', '.UUU.', 'UUwUU', 'UUUUU', '.UUU.'],
  bowl: ['.kkk.', 'AAAAA', '.aaa.'],
};

// A rounded speech bubble with a little tail at the bottom left, pointing down to the head.
function emoteBubble(icon: Glyph): Glyph {
  const w = icon[0].length + 4;
  const h = icon.length + 4;
  const rows: string[][] = Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => {
      const cornerX = x === 0 || x === w - 1;
      const cornerY = y === 0 || y === h - 1;
      if (cornerX && cornerY) {
        return TRANSPARENT;
      }
      return cornerX || cornerY ? 'Z' : 'W';
    }),
  );
  icon.forEach((line, y) => [...line].forEach((c, x) => c !== TRANSPARENT && (rows[y + 2][x + 2] = c)));
  const tail = Array.from({ length: w }, (_, x) => (x === 2 ? 'Z' : TRANSPARENT));
  return [...rows.map((r) => r.join('')), tail.join('')];
}

export const EMOTES: Record<Emote, Glyph> = {
  sun: emoteBubble(EMOTE_ICONS.sun),
  moon: emoteBubble(EMOTE_ICONS.moon),
  cup: emoteBubble(EMOTE_ICONS.cup),
  drop: emoteBubble(EMOTE_ICONS.drop),
  bowl: emoteBubble(EMOTE_ICONS.bowl),
};

export type Hat = 'party' | 'nightcap';

/** Hats are drawn over the head; `x`/`y` place the glyph's top-left relative to the head centre. */
export const HATS: Record<Hat, { glyph: Glyph; x: number; y: number }> = {
  party: { glyph: outlined(['..W..', '..L..', '.LSL.', '.SLS.', 'LSLSL']), x: -4, y: -12 },
  nightcap: {
    glyph: outlined(['WW......', 'WIi.....', '.IiIi...', '..IiIiII', '..IIIIII']),
    x: -8,
    y: -9,
  },
};
