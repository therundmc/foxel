import { seeded, type VistaView } from './paint';

// The town across the water, laid out once for a view: a tall wooden house of many stacked roofs, red-lacquered,
// with balconies and rows of paper windows, a lower wing and a tall chimney beside it; on the fox's side a little
// arched bridge, then a stone path with small stone lanterns and a row of shops with warm doorways. It is laid out as
// rectangles of tones only, so that dusk and night can paint it each in their own colours.

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));

/** The tones the town is laid out in; each light paints them in its own colours. */
export const T = {
  WALL: 0,
  SHADE: 1,
  RAIL: 2,
  ROOF: 3,
  EAVE: 4,
  RIDGE: 5,
  STONE: 6,
  STONE_DARK: 7,
  WINDOW: 8,
  WOOD: 9,
  BRIDGE: 10,
  CHIMNEY: 11,
  DOOR: 12,
  INLET: 13,
} as const;

/** A paper window, a doorway: lit at `wakes` seconds of the sky, or only at the great moment if `late`. */
export interface Window {
  readonly x: number;
  readonly y: number;
  readonly tall: number;
  readonly tone: number;
  readonly wakes: number;
  readonly late: boolean;
  readonly phase: number;
}

/** A round paper lantern hung from an eave or a railing, or a stone lantern on the path; lit one after the other. */
export interface Hung {
  readonly x: number;
  readonly y: number;
  /** Two pixels tall, its red paper over its glowing middle; or a single warm point. */
  readonly big: boolean;
  readonly stone: boolean;
  wakes: number;
}

export interface Town {
  /** Its rectangles, five numbers each: x, y, width, height, tone. */
  readonly rects: Int16Array;
  readonly windows: readonly Window[];
  readonly hung: readonly Hung[];
  /** The rows of the water: the far shore and our own; the town's ground, a little above the far shore. */
  readonly shore: number;
  readonly foot: number;
  readonly ground: number;
  /** The middle of the town and half its width; the great house's middle, its width and its top row. */
  readonly cx: number;
  readonly half: number;
  readonly houseX: number;
  readonly houseWide: number;
  readonly houseTop: number;
  /** Where the steam leaves the chimney. */
  readonly chimneyX: number;
  readonly chimneyY: number;
}

/** Stacked storeys, from the ground up, as shares of the great house's width. */
const NARROWING = { 3: [1, 0.76, 0.48], 4: [1, 0.84, 0.66, 0.42] } as const;
/** Paper windows lit from within, from gold to a deeper orange. */
export const WINDOWS = ['#ffd98a', '#ffc066', '#ffa452'] as const;
/** When the town wakes: its windows and lanterns come on between these seconds of the sky. */
const WAKES_S = [0.8, 12] as const;

export function layOut(view: VistaView): Town {
  const { w, h, foxX, dir } = view;
  const random = seeded(0x7a3e);
  const foot = h - 3;
  const shore = foot - clamp(Math.round(h * 0.36), 13, 44);
  const room = dir > 0 ? w - foxX : foxX;
  const half = Math.round(clamp(room * 0.3, 16, 90));
  const cx = Math.round(clamp(foxX + dir * clamp(room * 0.52, 36, 270), half + 2, w - half - 2));
  const high = clamp(Math.round(shore * 0.62), 15, 42);
  const bank = high >= 24 ? 3 : 2;
  const ground = shore - bank;
  const houseWide = clamp(Math.round(high * 1.05), 14, 48);
  const houseX = cx + dir * Math.round(houseWide * 0.15);
  const rects: number[] = [];
  const windows: Window[] = [];
  const hung: Hung[] = [];
  /** A rectangle given along the way the fox looks, `u` columns from the house's middle. */
  const at = (u: number, wide = 1): number => (dir > 0 ? houseX + u : houseX - u - wide + 1);
  const rect = (u: number, y: number, wide: number, tall: number, tone: number): void => {
    if (wide > 0 && tall > 0) {
      rects.push(at(u, wide), y, wide, tall, tone);
    }
  };
  const window = (u: number, y: number, tall: number, early: number): void => {
    const late = random() < 0.14;
    const wakes = random() < early ? 0 : WAKES_S[0] + random() * (WAKES_S[1] + 4 - WAKES_S[0]);
    windows.push({ x: at(u), y, tall, tone: Math.floor(random() * WINDOWS.length), wakes, late, phase: random() * 6.3 });
  };
  const lantern = (u: number, y: number, big: boolean, stone = false): void => {
    hung.push({ x: at(u), y, big, stone, wakes: 0 });
  };

  /** A roof over the columns u0 to u1, sitting on the row `under`: sloping to its ridge, its ends flicking upward,
   *  its eaves catching the light from below. */
  const roof = (u0: number, u1: number, under: number, thick: number, out: number): void => {
    const wide = u1 - u0 + 1;
    for (let r = 0; r < thick; r++) {
      const fromEave = thick - 1 - r;
      const y = under - 1 - fromEave;
      if (fromEave === 0) {
        rect(u0 - out, y, wide + out * 2, 1, T.EAVE);
      } else if (fromEave === 1) {
        rect(u0 - out - 1, y, wide + out * 2 + 2, 1, T.ROOF);
      } else {
        const inset = (fromEave - 1) * 2 - 1;
        rect(u0 - out + inset, y, wide + (out - inset) * 2, 1, fromEave === thick - 1 ? T.RIDGE : T.ROOF);
      }
    }
    // Its tips, one row higher.
    if (thick >= 3) {
      rect(u0 - out - 1, under - 3, 1, 1, T.ROOF);
      rect(u1 + out + 1, under - 3, 1, 1, T.ROOF);
    }
  };

  /** A storey: lacquered walls between darker pillars, a row of paper windows, a balcony along its foot. */
  const storey = (u0: number, u1: number, bottom: number, tall: number, early: number, balcony: boolean): void => {
    const wide = u1 - u0 + 1;
    rect(u0, bottom - tall + 1, wide, tall, T.WALL);
    const pillars = Math.max(4, Math.round(wide / 5));
    for (let u = u0; u <= u1; u += pillars) {
      rect(u, bottom - tall + 1, 1, tall, T.SHADE);
    }
    rect(u1, bottom - tall + 1, 1, tall, T.SHADE);
    const rows = clamp(tall - (balcony ? 2 : 1), 1, 3);
    for (let u = u0 + 1; u < u1; u++) {
      if ((u - u0) % pillars !== 0) {
        if ((u - u0) % 2 === 1) {
          rect(u, bottom - tall + 2, 1, rows, T.WINDOW);
          window(u, bottom - tall + 2, rows, early);
        }
      }
    }
    if (balcony) {
      rect(u0 - 1, bottom, wide + 2, 1, T.RAIL);
      for (let u = u0 - 1; u <= u1 + 1; u += 2) {
        rect(u, bottom - 1, 1, 1, T.RAIL);
      }
    }
  };

  // The stone embankment the town stands on, the length of the town.
  const left = -Math.round(half * 1.2) - Math.round(houseWide * 0.15);
  const right = Math.round(half * 0.9);
  rect(left, ground, right - left, 1, T.STONE);
  rect(left, ground + 1, right - left, bank - 1, T.STONE_DARK);
  for (let u = left + 2; u < right; u += 4) {
    rect(u, ground + 1 + (u % 8 === 0 ? 0 : 1), 1, 1, T.STONE);
  }

  // The chimney, behind the wing: a tall thin stack with a darker band at its top.
  const wingFrom = Math.floor(houseWide / 2) - 1;
  const wingWide = Math.round(houseWide * 0.5);
  const thick = high >= 34 ? 4 : high >= 22 ? 3 : 2;
  const chimneyU = wingFrom + Math.round(wingWide * 0.62);
  const chimneyTall = Math.round(high * 0.92);
  const chimneyW = high >= 26 ? 2 : 1;
  rect(chimneyU, ground - chimneyTall, chimneyW, chimneyTall, T.CHIMNEY);
  rect(chimneyU - (chimneyW > 1 ? 1 : 0), ground - chimneyTall, chimneyW + (chimneyW > 1 ? 2 : 0), 1, T.SHADE);

  // The wing: two low storeys beside the great house, on the side the fox looks to.
  const wingTall = Math.round(high * 0.4);
  const wingFirst = Math.max(3, Math.round((wingTall - Math.max(2, thick - 1) * 2) * 0.55));
  const wingSecond = Math.max(2, wingTall - Math.max(2, thick - 1) * 2 - wingFirst);
  storey(wingFrom, wingFrom + wingWide, ground - 1, wingFirst, 0.4, true);
  roof(wingFrom, wingFrom + wingWide, ground - wingFirst, Math.max(2, thick - 1), 1);
  const wing2 = ground - wingFirst - Math.max(2, thick - 1);
  storey(wingFrom + 2, wingFrom + wingWide - 2, wing2 - 1, wingSecond, 0.3, false);
  roof(wingFrom + 2, wingFrom + wingWide - 2, wing2 - wingSecond, Math.max(2, thick - 1), 1);

  // The great house: a stone footing, then storeys narrowing upward, each under its own curved roof.
  const tiers = high >= 22 ? 4 : 3;
  const shares = NARROWING[tiers];
  rect(-Math.floor(houseWide / 2) - 1, ground - 1, houseWide + 2, 1, T.STONE_DARK);
  let bottom = ground - 2;
  const finial = high >= 28 ? 2 : 1;
  const left2 = high - 1 - tiers * thick - finial;
  const weights = shares.map((_, i) => 1.35 - i * 0.18);
  const sum = weights.reduce((a, b) => a + b, 0);
  let given = 0;
  shares.forEach((share, i) => {
    const tall = i === tiers - 1 ? left2 - given : Math.max(2, Math.round((left2 * weights[i]) / sum));
    given += tall;
    let wide = Math.round(houseWide * share);
    wide += (wide - houseWide) % 2 === 0 ? 0 : 1;
    const u0 = -Math.floor(wide / 2);
    const u1 = u0 + wide - 1;
    storey(u0, u1, bottom, tall, i === 0 ? 0.35 : 0.2, i > 0);
    if (i === 0) {
      // Its great doorway, and a lantern each side of it.
      const door = Math.min(3, tall - 1);
      rect(-1, bottom - door + 1, 3, door, T.DOOR);
      windows.push({ x: at(-1, 3), y: bottom - door + 1, tall: door, tone: 0, wakes: 0, late: false, phase: 1 });
      windows.push({ x: at(-1, 3) + 1, y: bottom - door + 1, tall: door, tone: 1, wakes: 0, late: false, phase: 2 });
      windows.push({ x: at(-1, 3) + 2, y: bottom - door + 1, tall: door, tone: 0, wakes: 0, late: false, phase: 3 });
      lantern(-3, bottom - door + 1, high >= 24);
      lantern(3, bottom - door + 1, high >= 24);
    }
    const out = (i === 0 ? 2 : 1) + (thick >= 4 ? 1 : 0);
    roof(u0, u1, bottom - tall + 1, thick, out);
    // Round lanterns hung all along the eaves of its lower roofs.
    if (i < 2) {
      for (let u = u0 - out + 1; u <= u1 + out - 1; u += high >= 24 ? 3 : 2) {
        lantern(u, bottom - tall + 1, high >= 30 && i === 0);
      }
    }
    bottom -= tall + thick;
  });
  rect(0, bottom - finial + 1, 1, finial, T.RIDGE);
  const houseTop = bottom - finial;

  // The bridge, on the fox's side of the house: an arch over a little inlet, lanterns on its posts.
  const span = clamp(Math.round(houseWide * 0.42), 7, 18);
  const bridgeTo = -Math.floor(houseWide / 2) - 4;
  const bridgeFrom = bridgeTo - span;
  const lift = span >= 12 ? 3 : 2;
  rect(bridgeFrom + 1, ground, span - 1, bank, T.INLET);
  for (let k = 0; k <= span; k++) {
    const arch = Math.round(lift * Math.sin((Math.PI * k) / span));
    const deck = ground - 1 - arch;
    rect(bridgeFrom + k, deck, 1, 1, T.BRIDGE);
    rect(bridgeFrom + k, deck - 2, 1, 1, T.RAIL);
    if (k % 3 === 0 || k === span) {
      rect(bridgeFrom + k, deck - 2, 1, 2, T.BRIDGE);
      lantern(bridgeFrom + k, deck - 3, false);
    }
  }

  // The stone path on toward the fox, with its stone lanterns, and the shops along it, shoulder to shoulder.
  const shopTall = clamp(Math.round(high * 0.24), 4, 10);
  const shopWide = clamp(Math.round(high * 0.24), 5, 11);
  const shopRoof = high >= 22 ? 3 : 2;
  for (let u = bridgeFrom - 3; ; ) {
    const wide = shopWide + Math.floor(random() * 4) - 1;
    const u0 = u - wide + 1;
    if (u0 < left + 2) {
      break;
    }
    shop(u0, u, shopTall + Math.floor(random() * 2.5) - 1, random() < 0.4);
    u -= wide + shopRoof + Math.floor(random() * 3);
  }
  // A few more beyond the wing.
  for (let u = wingFrom + wingWide + 3 + shopRoof; u + shopWide < right - 2; ) {
    const wide = shopWide + Math.floor(random() * 3) - 1;
    shop(u, u + wide - 1, shopTall - Math.floor(random() * 2), random() < 0.3);
    u += wide + shopRoof + 1 + Math.floor(random() * 3);
  }
  for (let u = bridgeFrom - 1; u > left + 1; u -= high >= 24 ? 7 : 6) {
    rect(u, ground - 1, 1, 1, T.STONE);
    lantern(u, ground - 2, false, true);
  }

  /** A shop: dark wooden walls, a warm doorway under a short curtain, and on some an upper floor with its own roof. */
  function shop(u0: number, u1: number, tall: number, upper: boolean): void {
    const wide = u1 - u0 + 1;
    rect(u0, ground - tall, wide, tall, T.WOOD);
    rect(u1, ground - tall, 1, tall, T.SHADE);
    const door = Math.min(3, tall - 2);
    const doorW = wide >= 8 ? 3 : wide >= 6 ? 2 : 1;
    const doorU = u0 + Math.floor((wide - doorW) / 2);
    rect(doorU, ground - door, doorW, door, T.DOOR);
    for (let k = 0; k < doorW; k++) {
      windows.push({ x: at(doorU + k), y: ground - door + (door > 2 ? 1 : 0), tall: door - (door > 2 ? 1 : 0), tone: 1 + (k % 2), wakes: random() * 7, late: false, phase: random() * 6.3 });
    }
    if (door > 2) {
      rect(doorU, ground - door, doorW, 1, T.RAIL);
    }
    if (tall >= 7) {
      for (let u = u0 + 1; u < u1; u += 2) {
        rect(u, ground - tall + 1, 1, 1, T.WINDOW);
        window(u, ground - tall + 1, 1, 0.3);
      }
    }
    roof(u0, u1, ground - tall, shopRoof, 1);
    for (let u = u0; u <= u1; u += 3) {
      lantern(u, ground - tall + 1, false);
    }
    if (upper && wide >= 6) {
      const up = Math.max(2, Math.round(tall * 0.45));
      const under = ground - tall - shopRoof;
      rect(u0 + 1, under - up + 1, wide - 2, up, T.WOOD);
      rect(u1 - 1, under - up + 1, 1, up, T.SHADE);
      for (let u = u0 + 2; u < u1 - 1; u += 2) {
        rect(u, under - up + 2, 1, 1, T.WINDOW);
        window(u, under - up + 2, 1, 0.25);
      }
      roof(u0 + 1, u1 - 1, under - up + 1, shopRoof, 1);
    }
  }

  // The town wakes from the far end of the path, over the bridge and up the great house.
  const start = left;
  hung.forEach((l) => {
    const along = Math.abs(l.x - at(start)) / Math.max(1, right - left);
    l.wakes = WAKES_S[0] + (WAKES_S[1] - WAKES_S[0]) * clamp(along * 0.8 + ((ground - l.y) / high) * 0.35, 0, 1) + random() * 0.4;
  });
  return { rects: Int16Array.from(rects), windows, hung, shore, foot, ground, cx, half, houseX, houseWide, houseTop, chimneyX: at(chimneyU, chimneyW) + (chimneyW > 1 ? 1 : 0), chimneyY: ground - chimneyTall - 1 };
}
