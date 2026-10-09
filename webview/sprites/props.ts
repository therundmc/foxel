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

// A small bird facing right: wings up, wings down, standing, pecking.
const BIRD_FILLS: readonly Glyph[] = [
  ['.uu....', '.uUUU..', 'UUUUES.', '.Uccc..', '.......'],
  ['.......', '..UUU..', 'UUUUES.', '.uccc..', '.uu....'],
  ['...UU..', '..UUES.', 'uUUc...', '.uccc..', '..k.k..'],
  ['.......', '..UU...', 'uUUUU..', '.uccES.', '..k.k..'],
];
export const BIRD_FRAMES: readonly Glyph[] = BIRD_FILLS.map(outlined);
export const BIRD_W = BIRD_FRAMES[0][0].length;
export const BIRD_H = BIRD_FRAMES[0].length;

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

/** The mouse from the side, scurrying on two frames then sitting up; it faces right (mirror when it goes left). */
export const MOUSE_FRAMES: readonly Glyph[] = [
  ['..pp...', '.mmmmm.', 'pmmmEmr', '.m...m.'],
  ['..pp...', '.mmmmm.', 'pmmmEmr', '..m.m..'],
  ['..pp.', '.mmm.', '.mEmr', '.mcm.', 'pmcm.', '.m.m.'],
].map(outlined);
/** Seen from the front, the way it looks at the fox from the tip of its nose. */
export const MOUSE_FACE: Glyph = outlined(['p...p', 'pmmmp', 'mEmEm', '.mrm.', '.mcm.', '.m.m.']);

// Tall grass: blades as [column, height, lean of the tip].
const BLADES: readonly (readonly [number, number, number])[] = [
  [0, 6, -1], [2, 9, 1], [4, 11, 0], [6, 8, -1], [8, 10, 1], [10, 13, 0], [12, 9, -1], [14, 11, 1],
  [16, 8, 0], [18, 10, -1], [20, 12, 1], [22, 9, 0], [24, 10, -1], [26, 7, 1],
];
export const GRASS_W = 29;
export const GRASS_H = 13;

function grass(sway: number): Glyph {
  const rows = Array.from({ length: GRASS_H }, () => Array<string>(GRASS_W).fill(TRANSPARENT));
  for (const [column, height, lean] of BLADES) {
    for (let i = 0; i < height; i++) {
      const bend = Math.round((lean + sway) * (i / height) ** 2);
      const x = column + 1 + bend;
      const y = GRASS_H - 1 - i;
      rows[y][x] = i >= height - 3 ? 'F' : 'f';
      if (i < height - 2) {
        rows[y][x + 1] = 'F';
      }
    }
  }
  return rows.map((r) => r.join(''));
}

/** The same tuft swaying one way, then the other. */
export const GRASS: readonly Glyph[] = [grass(-0.5), grass(0.5)];

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

// Its toy chest: a wicker hamper like the basket it sleeps in, lined with the same blue cloth, a strap and a toggle to shut it.
const CHEST_LID = ['...ttttttttttt...', '.tTThTThTThTThTt.', 'thTThTThTThTThTTt', 'ttttttttdtttttttt'];
const CHEST_LID_BACK = ['...ttttttttttt...', '.tkkkkkkkkkkkkkt.', 'tkkkkkkkkkkkkkkkt', 'tkkkkkkkkkkkkkkkt', 'tkkkkkkkkkkkkkkkt'];
const CHEST_CLOTH = 'CCCCCCCCCCCCCCCCC';
const CHEST_BOX = ['tTTTTTTTSTTTTTTTt', 'tThThThThThThThTt', 'tTTTTTTTTTTTTTTTt', 'thThThThThThThTht', 'tTTTTTTTTTTTTTTTt', 'tThThThThThThThTt', '.ttttttttttttttt.'];
/** Lid shut, ajar, then thrown back: the cloth it is lined with shows, and the dark of its inside. */
export const CHEST: readonly Glyph[] = [
  outlined([...CHEST_LID, CHEST_CLOTH.replace(/^(.{8})./, '$1d'), ...CHEST_BOX]),
  outlined([...CHEST_LID, 'ddddddddddddddddd', CHEST_CLOTH, ...CHEST_BOX]),
  outlined([...CHEST_LID_BACK, 'uuuuuuuuuuuuuuuuu', CHEST_CLOTH, ...CHEST_BOX]),
];
/** The top of its ball, showing in the open chest while the ball is in there, and how far in from the chest's left edge. */
export const CHEST_BALL: Glyph = ['.BB.', 'BgBB'];
export const CHEST_BALL_X = 5;
export const CHEST_W = CHEST[0][0].length;
export const CHEST_H = CHEST[0].length;
export const CHEST_OPEN_H = CHEST[2].length;
/** How high the top of its body is: what comes out of it rises from behind there. */
export const CHEST_RIM = CHEST_BOX.length + 1;

/** What its chest holds: the things you take in your hand, to play with it or to give it. */
export type ChestItem = 'ball' | 'duck' | 'teddy' | 'rugby';
export type PlushKind = 'teddy' | 'duck' | 'rugby';

// Its soft toys, as they are in a tile; out in the view they get a dark border.
const PLUSH_FILLS: Record<PlushKind, Glyph> = {
  teddy: ['tt...tt', 'tTTTTTt', 'TETTTET', 'TTcEcTT', '.TcccT.', 'tTTTTTt', '.tt.tt.'],
  duck: ['..SSS..', '.SSESOO', '.SSSS..', 'SSSSSS.', 'SxxxSS.', '.SSSS..'],
  // Not soft, this one, but it is thrown about the same way: a rugby ball, with its laces.
  rugby: ['.tTTTt.', 'tTcTcTt', 'TTTcTTT', 'tTTTTTt', '.ttttt.'],
};
export const PLUSH: Record<PlushKind, Glyph> = { teddy: outlined(PLUSH_FILLS.teddy), duck: outlined(PLUSH_FILLS.duck), rugby: outlined(PLUSH_FILLS.rugby) };

const CHEST_ICONS: Record<ChestItem, Glyph> = {
  ball: BALL_FRAMES[0],
  ...PLUSH_FILLS,
};

export const TILE = 11;
// A soft square like its picture bubbles, the picture in the middle.
function tile(icon: Glyph = []): Glyph {
  const rows: string[][] = Array.from({ length: TILE }, (_, y) =>
    Array.from({ length: TILE }, (_, x) => {
      const edgeX = x === 0 || x === TILE - 1;
      const edgeY = y === 0 || y === TILE - 1;
      return edgeX && edgeY ? TRANSPARENT : edgeX || edgeY ? 'Z' : 'W';
    }),
  );
  const left = Math.floor((TILE - (icon[0]?.length ?? 0)) / 2);
  const top = Math.floor((TILE - icon.length) / 2);
  icon.forEach((line, y) => [...line].forEach((c, x) => c !== TRANSPARENT && (rows[top + y][left + x] = c)));
  return rows.map((r) => r.join(''));
}
export const CHEST_TILES = Object.fromEntries(Object.entries(CHEST_ICONS).map(([name, icon]) => [name, tile(icon)])) as Record<ChestItem, Glyph>;
/** The tile of a thing that is not in the chest right now. */
export const CHEST_TILE_EMPTY: Glyph = tile();

// Its box of keepsakes: a wicker case like its chest and its basket, lined with the same blue cloth, lying open. In
// it, a row of little photographs, one for each stage of your life together (its ball, its duck, its teddy, its
// rugby ball, a heart, its neckerchief), and under them one of each kind of thing it has found for you. Where a photograph is still to
// come, a frame is stitched in the cloth; where a find is, its shape. A leather handle at the end that shows.
export const ALBUM_CELL = 7;
export const ALBUM_COLUMNS = 6;
/** How far in from its outer edge the first place is, on each side. */
export const ALBUM_IN = 3;
const CASE_INNER = ALBUM_COLUMNS * (ALBUM_CELL + 1) - 1;
const stitched = (row: number): string =>
  Array.from({ length: CASE_INNER }, (_, x) => {
    const inCellX = x % (ALBUM_CELL + 1);
    // An empty frame, stitched in thread a little darker than the cloth: a photograph goes there.
    const edge = inCellX < ALBUM_CELL && (inCellX === 0 || inCellX === ALBUM_CELL - 1 || row === 0 || row === ALBUM_CELL - 1);
    return edge && (inCellX + row) % 2 === 0 ? 'U' : 'C';
  }).join('');
const weave = (from: 'T' | 'h'): string => Array.from({ length: CASE_INNER + 2 }, (_, x) => ((x % 2 === 0) === (from === 'T') ? 'T' : 'h')).join('');
const CASE_ROWS = [
  `.${'t'.repeat(CASE_INNER + 2)}.`,
  `t${weave('T')}t`,
  ...Array.from({ length: ALBUM_CELL }, (_, row) => `tT${stitched(row)}Tt`),
  `tT${'C'.repeat(CASE_INNER)}Tt`,
  ...Array.from({ length: ALBUM_CELL }, () => `tT${'C'.repeat(CASE_INNER)}Tt`),
  `t${weave('h')}t`,
  `.${'t'.repeat(CASE_INNER + 2)}.`,
];
// The handle, on the right: a loop of leather over the middle rows.
const HANDLE_ROWS = [7, 8, 9, 10, 11];
export const ALBUM: Glyph = outlined(CASE_ROWS.map((row, y) => `${row}${HANDLE_ROWS.includes(y) ? (y === HANDLE_ROWS[0] || y === HANDLE_ROWS[4] ? 'kk' : '.k') : '..'}`));
/** The case without its handle is what holds things: how wide it is, and how high. */
export const ALBUM_W = CASE_ROWS[0].length + 2;
export const ALBUM_H = ALBUM.length;
const inCell = (picture: Glyph, paper = TRANSPARENT): Glyph => {
  const left = Math.floor((ALBUM_CELL - picture[0].length) / 2);
  const top = Math.floor((ALBUM_CELL - picture.length) / 2);
  return Array.from({ length: ALBUM_CELL }, (_, y) => Array.from({ length: ALBUM_CELL }, (_, x) => picture[y - top]?.[x - left]?.replace(TRANSPARENT, paper) ?? paper).join(''));
};
// Each photograph is on cream paper.
export const PICTURES: readonly Glyph[] = [
  ['.BBB.', 'BBgBB', 'BBBBb', 'BBBbb', '.Bbb.'],
  ['..SS.', '.SSOO', 'SSSS.', 'SxxS.', '.SS..'],
  ['t...t', 'tTTTt', 'TETET', '.ThT.', 'tT.Tt'],
  ['.....', '.TTT.', 'TcTcT', '.ttt.', '.....'],
  ['.L.L.', 'LLLLL', 'LLLLL', '.LLL.', '..L..'],
  ['.....', 'UCCCU', '.CCC.', '..C..', '.....'],
].map((picture) => inCell(picture, 'c'));
// What it brings you from outside: small things, each set down in front of you.
export type FindKind = 'leaf' | 'pebble' | 'flower' | 'feather' | 'clover' | 'gem';
const FIND_FILLS: Record<FindKind, Glyph> = {
  flower: ['.p.p.', 'ppSpp', '.p.p.', '..F..', '.FF..', '..F..'],
  pebble: ['.eee.', 'eeeDD', '.DDD.'],
  feather: ['..W', '.WZ', '.WZ', 'WZ.', 'WZ.', 'Q..'],
  leaf: ['..FF.', '.FFfF', 'FFfF.', 'kF...'],
  clover: ['FF.FF', 'FFfFF', '.fff.', 'FFfFF', 'FF.FF'],
  gem: ['.VVV.', 'VWVVI', '.VVI.', '..I..'],
};
/** From the commonest to the rarest: the order they lie in, in the box of keepsakes. */
export const FIND_ORDER: readonly FindKind[] = ['leaf', 'pebble', 'flower', 'feather', 'clover', 'gem'];
export const FINDS = Object.fromEntries(FIND_ORDER.map((kind) => [kind, outlined(FIND_FILLS[kind])])) as Record<FindKind, Glyph>;
/** As they lie in the box of keepsakes; and the shape stitched in the cloth where one is still to be found. */
export const FINDS_KEPT = Object.fromEntries(FIND_ORDER.map((kind) => [kind, inCell(FIND_FILLS[kind])])) as Record<FindKind, Glyph>;
export const FINDS_TO_COME = Object.fromEntries(FIND_ORDER.map((kind): [FindKind, Glyph] => [kind, inCell(FIND_FILLS[kind]).map((row) => row.replace(/[^.]/g, 'U'))])) as Record<FindKind, Glyph>;
/** A kind it has found three times shines a little. */
export const FIND_SHINE: Glyph = ['.X.', 'XJX', '.X.'];
/**
 * The neckerchief it wears once you are inseparable: a little triangle of the blue cloth its things are lined with,
 * knotted round its neck. Worn this far from the middle of its head.
 */
export const NECKERCHIEF = { glyph: ['UCCCCCU', '.CCCCC.', '..CUC..', '...C...'] as Glyph, x: -6, y: 5 };
// A heart scratched in the earth, stroke by stroke; and the little mound left where it dug, as it rises.
export const DOODLE: readonly Glyph[] = [
  ['.TT....', 'T......', 'T......', '.T.....', '..T....', '...T...'],
  ['.TT.TT.', 'T..T..T', 'T......', '.T.....', '..T....', '...T...'],
  ['.TT.TT.', 'T..T..T', 'T.....T', '.T...T.', '..T.T..', '...T...'],
];
/** The heart once it has lifted off the ground: the same, turned pink. */
export const DOODLE_FLYING: Glyph = DOODLE[DOODLE.length - 1].map((row) => row.replace(/T/g, 'L'));
export const MOUND: readonly Glyph[] = [outlined(['kk']), outlined(['.kk.', 'kkkk']), outlined(['..kk..', '.kTkk.', 'kkkkkk'])];

// The little shelf on the wall, top right: a plank with a lit edge on two brackets, and on it what is not a toy.
export type ShelfItem = 'meal' | 'treat' | 'bubbles';
const PLANK = 32;
export const SHELF: Glyph = outlined([
  `.${'h'.repeat(PLANK - 1)}`,
  'T'.repeat(PLANK),
  `.${'t'.repeat(PLANK - 1)}`,
  ...['kkk', '.kk', '..k'].map((bracket) => `${'.'.repeat(7)}${bracket}${'.'.repeat(13)}${bracket}${'.'.repeat(6)}`),
]);
/** A paper bag of kibble with its top rolled down, a bone biscuit, and a bottle of soap with its wand in it: each stands on the plank, this far from its left end. */
export const SHELF_ITEMS: Record<ShelfItem, { glyph: Glyph; x: number }> = {
  meal: { glyph: outlined(['.aaaaa.', 'AAAAAAA', 'ArAAAAA', 'AcccccA', 'AcckccA', 'AckkkcA', 'AcccccA', 'AAAAAAA', 'aaaaaaa']), x: 2 },
  treat: { glyph: TREAT_GLYPH, x: 12 },
  bubbles: { glyph: outlined(['.CCC.', '.CwC.', '.CCC.', '..Q..', '.WWW.', 'CCCCC', 'CwUUU', 'CwUUU', 'CUUUU', 'uuuuu']), x: 25 },
};
export const SHELF_W = SHELF[0].length;
/** How high the board and its bracket are, and how high the tallest thing on it stands above the board. */
export const SHELF_H = SHELF.length;
export const SHELF_ABOVE = Math.max(...Object.values(SHELF_ITEMS).map((item) => item.glyph.length));

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

/** A bubble as it first appears: small and empty, before its picture comes. */
export const EMOTE_BUD: Glyph = ['.ZZZ.', 'ZWWWZ', '.ZZZ.', '..Z..'];

export const EMOTES: Record<Emote, Glyph> = {
  sun: emoteBubble(EMOTE_ICONS.sun),
  moon: emoteBubble(EMOTE_ICONS.moon),
  cup: emoteBubble(EMOTE_ICONS.cup),
  drop: emoteBubble(EMOTE_ICONS.drop),
  bowl: emoteBubble(EMOTE_ICONS.bowl),
};

export type Hat = 'party' | 'nightcap' | 'leaf' | 'leafAside' | 'scarf' | 'scarfDust' | 'scarfSnow' | 'snowcap' | 'cloak' | 'cloakWind';

// A red scarf round its neck, seen from behind, one end hanging down its back; and the snow that piles up on its head.
const SCARF: Glyph = outlined(['AAAAAAAAAAAA', 'aAaAaAaAaAaA', '.........AA.', '.........Aa.', '.........aA.']);
const SNOW_PILE: Glyph = outlined(['.WWW.', 'WWWWW']);
/** The first of it to settle: the pile grows from this. */
const SNOW_DUST: Glyph = outlined(['WWW']);
/** Rows between the top of the pile on its head and the top of the scarf, and how far in from the scarf's edge the pile sits. */
const PILE_ABOVE_SCARF = 14;
const PILE_INSET = 3;

// What the people of the deep desert wear, seen from behind: a dusty cloak down its back and a cloth wound round its
// neck, the loose end of it streaming in the wind. The second picture is the same a moment later.
const CLOAK_STILL: Glyph = outlined([
  '..DDDDDDDDDDDD........',
  '..DeDDeDDeDDeDDD......',
  '.NNNNNNNNNNNNNN.DDDD..',
  '.NNNNnNNNNNNNNN...eDD.',
  'NNNNNnNNNNNnNNNN....D.',
  'NNNNnNNNNNNNnNNN......',
  'NNNNnNNNNNNNnNNN......',
  '.NNnNN.NNNN.NnN.......',
]);
const CLOAK_WIND: Glyph = outlined([
  '..DDDDDDDDDDDD....DDD.',
  '..DeDDeDDeDDeDDDeDD...',
  '.NNNNNNNNNNNNNN.......',
  '.NNNNnNNNNNNNNN.......',
  'NNNNNnNNNNNnNNNN......',
  'NNNNnNNNNNNNnNNNN.....',
  'NNNNnNNNNNNNnNNNN.....',
  '.NNnNNN.NNNN.NNnN.....',
]);

// A big leaf held over its head in the rain, seen from behind: the stalk comes down between the ears.
const LEAF: Glyph = outlined([
      '.....FFFFFFFFF.....',
      '...FFFFFFfFFFFFF...',
      '.FFFFFFFFfFFFFFFFF.',
      'FFFFffFFFfFFFffFFFF',
      '.FFFFFffFfFffFFFFF.',
      '...FFFFFfffFFFFF...',
      '.........f.........',
      '.........f.........',
      '.........f.........',
    ]);

/** Hats are drawn over the head; `x`/`y` place the glyph's top-left relative to the head centre. */
export const HATS: Record<Hat, { glyph: Glyph; x: number; y: number }> = {
  party: { glyph: outlined(['..W..', '..L..', '.LSL.', '.SLS.', 'LSLSL']), x: -4, y: -12 },
  nightcap: {
    glyph: outlined(['WW......', 'WIi.....', '.IiIi...', '..IiIiII', '..IIIIII']),
    x: -8,
    y: -9,
  },
  leaf: { glyph: LEAF, x: -10, y: -19 },
  // The same leaf as it puts it away: swung down to its side.
  leafAside: { glyph: LEAF, x: -1, y: -13 },
  scarf: { glyph: SCARF, x: -7, y: 4 },
  scarfDust: {
    glyph: [
      ...SNOW_DUST.map((line) => line.padStart(line.length + PILE_INSET + 1, TRANSPARENT).padEnd(SCARF[0].length, TRANSPARENT)),
      ...Array.from({ length: PILE_ABOVE_SCARF - 1 - SNOW_DUST.length }, () => TRANSPARENT.repeat(SCARF[0].length)),
      ...SCARF,
    ],
    x: -7,
    y: 4 - PILE_ABOVE_SCARF + 1,
  },
  // The scarf, and the snow that has settled between its ears by now: one picture, with clear air between the two.
  scarfSnow: {
    glyph: [
      ...SNOW_PILE.map((line) => line.padStart(line.length + PILE_INSET, TRANSPARENT).padEnd(SCARF[0].length, TRANSPARENT)),
      ...Array.from({ length: PILE_ABOVE_SCARF - SNOW_PILE.length }, () => TRANSPARENT.repeat(SCARF[0].length)),
      ...SCARF,
    ],
    x: -7,
    y: 4 - PILE_ABOVE_SCARF,
  },
  cloak: { glyph: CLOAK_STILL, x: -9, y: 4 },
  cloakWind: { glyph: CLOAK_WIND, x: -9, y: 4 },
  snowcap: { glyph: SNOW_PILE, x: -7 + PILE_INSET, y: 4 - PILE_ABOVE_SCARF },
};
