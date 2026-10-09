import type { Glyph } from './frames';
import { outlined } from './grid';
import { TRANSPARENT } from './palette';

// What your life together leaves: its box of keepsakes and what goes in it, the things it finds for you, the
// neckerchief it ends up wearing, and the marks it leaves on the ground.

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
