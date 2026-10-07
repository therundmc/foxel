import { TRANSPARENT } from '../palette';
import type { Glyph, Overlay } from '../frames';
import { MOUSE_FACE } from '../props';

/** Little pictures floating around the fox in a frame: Zzz, hearts, sparks, dreams. */
export type Extra =
  | 'zzz1'
  | 'zzz2'
  | 'zzz3'
  | 'dreamDots1'
  | 'dreamDots2'
  | 'dreamBall'
  | 'dreamBone'
  | 'dreamButterfly'
  | 'dreamSun'
  | 'dreamDusk'
  | 'dreamPeak'
  | 'dreamStars'
  | 'dreamLeaf'
  | 'dreamLights'
  | 'dreamWhale'
  | 'dreamBlossom'
  | 'dreamWheat'
  | 'dreamTrain'
  | 'dreamFirefly'
  | 'heartsA'
  | 'heartsB'
  | 'smallHeartA'
  | 'smallHeartB'
  | 'sweat'
  | 'sparkleA'
  | 'sparkleB'
  | 'starsA'
  | 'starsB'
  | 'question'
  | 'bang'
  | 'sniffA'
  | 'sniffB'
  | 'crumbsA'
  | 'crumbsB'
  | 'rumbleA'
  | 'rumbleB'
  | 'sprayA'
  | 'sprayB'
  | 'flurryA'
  | 'flurryB'
  | 'dirtA'
  | 'dirtB'
  | 'mouseA'
  | 'mouseB';

const GLYPHS = {
  z: ['ZZZZ', '..Z.', '.Z..', 'ZZZZ'],
  zSmall: ['ZZZ', '..Z', '.Z.', 'ZZZ'],
  dot: ['Z'],
  bigDot: ['ZZ', 'ZZ'],
  heart: ['LL.LL', 'LLLLL', '.LLL.', '..L..'],
  smallHeart: ['L.L', 'LLL', '.L.'],
  drop: ['.C.', 'CCC', 'CCC', '.C.'],
  spark: ['.H.', 'HHH', '.H.'],
  star: ['.S.', 'SSS', '.S.'],
  question: ['.QQ.', 'Q..Q', '..Q.', '....', '..Q.'],
  bang: ['H', 'H', 'H', '.', 'H'],
  puff: ['Q'],
  crumb: ['t'],
} as const satisfies Record<string, Glyph>;

// Drops flung from its coat on both sides, `out` pixels farther from it the second time.
function spray(color: string, out: number): readonly Overlay[] {
  return [[9 - out, 13], [4 - out, 19], [12 - out, 8 - out], [27 + out, 6 - out], [30 + out, 13], [20, 4 - out], [29 + out, 20]].map(([x, y]) => ({
    x: Math.max(0, Math.min(31, x)),
    y: Math.max(0, y),
    glyph: [color],
  }));
}

// A thought bubble above the sleeping head, with a little picture of what it dreams about.
function dream(icon: Glyph): readonly Overlay[] {
  const w = 11;
  const h = 8;
  const bubble: string[][] = Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => {
      const corner = (x < 2 || x > w - 3) && (y === 0 || y === h - 1) ? true : (x === 0 || x === w - 1) && (y === 1 || y === h - 2);
      if (corner) {
        return TRANSPARENT;
      }
      const edge = y === 0 || y === h - 1 || x === 0 || x === w - 1 || ((x === 1 || x === w - 2) && (y === 1 || y === h - 2));
      return edge ? 'Z' : 'W';
    }),
  );
  const ox = Math.floor((w - icon[0].length) / 2);
  const oy = Math.floor((h - icon.length) / 2);
  icon.forEach((line, y) => [...line].forEach((c, x) => c !== TRANSPARENT && (bubble[oy + y][ox + x] = c)));
  return [
    { x: 25, y: 13, glyph: GLYPHS.dot },
    { x: 23, y: 10, glyph: GLYPHS.bigDot },
    { x: 17, y: 1, glyph: bubble.map((r) => r.join('')) },
  ];
}

export const EXTRAS: Record<Extra, readonly Overlay[]> = {
  zzz1: [{ x: 27, y: 13, glyph: GLYPHS.dot }],
  zzz2: [{ x: 27, y: 10, glyph: GLYPHS.zSmall }],
  zzz3: [{ x: 28, y: 4, glyph: GLYPHS.z }, { x: 26, y: 11, glyph: GLYPHS.dot }],
  dreamDots1: [{ x: 25, y: 13, glyph: GLYPHS.dot }],
  dreamDots2: [{ x: 25, y: 13, glyph: GLYPHS.dot }, { x: 23, y: 10, glyph: GLYPHS.bigDot }],
  dreamBall: dream(['.BB.', 'BBYB', 'BYBB', '.BB.']),
  dreamBone: dream(['T...T', 'TTTTT', 't...t']),
  dreamButterfly: dream(['VV.VV', 'VVKVV', '.VKV.']),
  // The skies it sat and watched: the sun coming up, going down into the sea, the great peak, the stars, an autumn leaf, the northern lights.
  dreamSun: dream(['..X..', '.XXX.', 'XXXXX', 'wwwww']),
  dreamDusk: dream(['.xxx.', 'xxxxx', 'IIIII', 'IxIxI']),
  dreamPeak: dream(['...w...', '..wwI..', '.IIIII.', 'IIIIIII']),
  dreamStars: dream(['S...S', '..S..', '.SSS.', '..S..']),
  dreamLeaf: dream(['A.A.A', '.AAA.', 'AAAAA', '..k..']),
  dreamLights: dream(['.F..F..', 'FFwFFwF', '.wV.wV.']),
  // And: a whale made of cloud, a cherry blossom, an ear of wheat, a little train with lit windows, a firefly.
  dreamWhale: dream(['.ZZZZ.Z', 'ZZEZZZZ', '.ZZZZ..']),
  dreamBlossom: dream(['.p.p.', 'ppSpp', '.p.p.']),
  dreamWheat: dream(['.X.', 'XxX', 'XxX', '.k.', '.k.']),
  dreamTrain: dream(['.AAAAAA', '.AXAXAA', 'KK.KK.K']),
  dreamFirefly: dream(['..g..', '.gBg.', '..g..']),
  heartsA: [{ x: 26, y: 4, glyph: GLYPHS.heart }],
  heartsB: [{ x: 27, y: 1, glyph: GLYPHS.heart }, { x: 29, y: 7, glyph: GLYPHS.smallHeart }],
  smallHeartA: [{ x: 27, y: 3, glyph: GLYPHS.smallHeart }],
  smallHeartB: [{ x: 28, y: 0, glyph: GLYPHS.smallHeart }],
  sweat: [{ x: 12, y: 4, glyph: GLYPHS.drop }],
  sparkleA: [{ x: 1, y: 2, glyph: GLYPHS.spark }, { x: 28, y: 6, glyph: GLYPHS.spark }],
  sparkleB: [{ x: 4, y: 6, glyph: GLYPHS.spark }, { x: 27, y: 0, glyph: GLYPHS.spark }],
  starsA: [
    { x: 13, y: 1, glyph: GLYPHS.star },
    { x: 20, y: 0, glyph: GLYPHS.star },
    { x: 27, y: 2, glyph: GLYPHS.star },
  ],
  starsB: [
    { x: 16, y: 0, glyph: GLYPHS.star },
    { x: 24, y: 1, glyph: GLYPHS.star },
    { x: 11, y: 4, glyph: GLYPHS.star },
  ],
  question: [{ x: 27, y: 0, glyph: GLYPHS.question }],
  bang: [{ x: 28, y: 0, glyph: GLYPHS.bang }],
  sniffA: [{ x: 30, y: 21, glyph: GLYPHS.puff }],
  sniffB: [{ x: 30, y: 19, glyph: GLYPHS.puff }, { x: 31, y: 22, glyph: GLYPHS.puff }],
  crumbsA: [{ x: 30, y: 22, glyph: GLYPHS.crumb }, { x: 24, y: 24, glyph: GLYPHS.crumb }],
  crumbsB: [{ x: 31, y: 24, glyph: GLYPHS.crumb }, { x: 23, y: 25, glyph: GLYPHS.crumb }],
  rumbleA: [{ x: 21, y: 23, glyph: ['Q.Q', '.Q.'] }],
  rumbleB: [{ x: 22, y: 22, glyph: ['.Q.', 'Q.Q'] }],
  dirtA: [{ x: 3, y: 26, glyph: ['tk', 'kt'] }, { x: 0, y: 23, glyph: ['t'] }, { x: 5, y: 29, glyph: ['kt'] }],
  dirtB: [{ x: 1, y: 24, glyph: ['kt', 'tk'] }, { x: 4, y: 22, glyph: ['t'] }, { x: 0, y: 28, glyph: ['tk'] }],
  // What flies off when it shakes itself: drops of water after the rain, bits of snow after the snow.
  sprayA: spray('C', 0),
  sprayB: spray('C', 2),
  flurryA: spray('W', 0),
  flurryB: spray('W', 2),
  // A mouse sitting on its head, between the ears.
  mouseA: [{ x: 18, y: 1, glyph: MOUSE_FACE }],
  mouseB: [{ x: 18, y: 0, glyph: MOUSE_FACE }],
};
