import { paintLookout, paintLookoutFront, type LookoutTones } from './lookout';
import { gradient, mix, ramp, type VistaPainter, type VistaView } from './paint';
import { paintClouds, paintShadows } from './wheat-clouds';
import { paintEars } from './wheat-ears';
import { MILL_FIELD, wheatLand, type WheatLand } from './wheat-land';
import { hash, paintBreeze, paintGust } from './wheat-wind';

// A summer afternoon over rolling fields of ripe wheat, and the wind made visible. Bands of paler gold cross the
// fields, clouds drift and lay their shadows on the hills, a little windmill turns far away, and close to us a few
// ears sway in the corners. At the great moment a long gust rolls through every field, a flight of swallows
// skimming along with it; then the wind drops, the fields stand still and the light turns golden.
//   0 s   the fields under a light breeze, which freshens until 13 s
//  moment the gust: the far hills first, the nearest field 0.8 s later, the swallows from 0.2 to 3 s
//  +1 s   the wind drops (3 s), the mill slows, the light warms (until +10 s)
//  +15 s  a light breeze comes back

/** The sky from the top down to its creamy horizon, and where each tone sits. */
const SKY = ['#2f7fd8', '#5aa4e8', '#a5d1f1', '#f2ecc8'] as const;
const SKY_GOLDEN = ['#3582d4', '#69a9e2', '#bcd6e0', '#fbe6a8'] as const;
const SKY_AT = [0, 0.42, 0.8, 1] as const;
/** What the late light lays over the fields, and how much of it. */
const GOLDEN = '#ffb640';
const GOLDEN_ALPHA = 0.14;

const SAIL = '#5f4c40';
const CLOTH = '#f4e8cc';
/** Radians a second in a steady breeze, the turn the gust adds, and what is left of its pace once the wind is down. */
const MILL_PACE = 0.75;
const MILL_GUST = 1.6;
const MILL_CALM = 0.18;

const SWALLOW = '#232c4c';
/** How many come, at most, and how long each takes to cross. */
const SWALLOWS = 6;
const CROSSING_S = 2;
/** A swallow heading right, from its head back to its forked tail; then its wing raised, held flat, and lowered. */
const BODY = [[1, 0], [0, 0], [-1, 0], [-2, 0], [-3, -1], [-3, 1]] as const;
const WINGS = [[[0, -1], [-1, -2]], [[-1, -1]], [[0, 1], [-1, 2]]] as const;

const SUMMER: LookoutTones = { body: '#9aa64e', rim: '#cdc96c', deep: '#74863f', blades: ['#869a44', '#c2ba62'], front: ['#d6cf78', '#a3ad52'], flowers: ['#fff7e4', '#e2503c', '#6f8fe0', '#fff7e4'] };
const LATE: LookoutTones = { body: '#a7a348', rim: '#dccb62', deep: '#7c823a', blades: ['#939740', '#d0b858'], front: ['#e3cf6e', '#b0aa4c'], flowers: ['#fff3d4', '#e8553a', '#7a8fd6', '#fff3d4'] };

/** How golden the light has turned: nothing before the gust has passed. */
const goldenAt = ({ moment }: VistaView): number => (moment === undefined ? 0 : ramp(moment, 2.5, 10));

function lookoutTones(view: VistaView): LookoutTones {
  const late = goldenAt(view);
  if (late <= 0) {
    return SUMMER;
  }
  const pair = (a: readonly [string, string], b: readonly [string, string]): [string, string] => [mix(a[0], b[0], late), mix(a[1], b[1], late)];
  return {
    body: mix(SUMMER.body, LATE.body, late),
    rim: mix(SUMMER.rim, LATE.rim, late),
    deep: mix(SUMMER.deep, LATE.deep, late),
    blades: pair(SUMMER.blades, LATE.blades),
    front: pair(SUMMER.front, LATE.front),
    flowers: late < 0.5 ? SUMMER.flowers : LATE.flowers,
  };
}

/** How far the mill's sails have turned: steadily, faster as the gust takes them, then running down. */
function millTurn({ t, moment }: VistaView): number {
  if (moment === undefined) {
    return MILL_PACE * t;
  }
  const slowing = 4 * (1 - Math.exp(-moment / 4));
  return MILL_PACE * (t - moment + MILL_CALM * moment + (1 - MILL_CALM) * slowing) + MILL_GUST * (1 - Math.exp(-moment / 1.5));
}

function paintMill(view: VistaView, { mill }: WheatLand): void {
  const { ctx } = view;
  ctx.drawImage(mill.image, mill.x, mill.y);
  const turn = millTurn(view);
  // Four sails: a spar from the hub, and its cloth along the outer half, on the side that follows.
  for (const [color, from, aside] of [[CLOTH, 3, 1], [SAIL, 0, 0]] as const) {
    ctx.fillStyle = color;
    for (let arm = 0; arm < 4; arm++) {
      const across = Math.cos(turn + (arm * Math.PI) / 2);
      const down = Math.sin(turn + (arm * Math.PI) / 2);
      for (let out = from; out <= mill.sail; out++) {
        ctx.fillRect(Math.round(mill.hubX + out * across - aside * down), Math.round(mill.hubY + out * down + aside * across), 1, 1);
      }
    }
  }
}

// The swallows come in with the gust, low over the nearest wheat, each on a swooping line of its own.
function paintSwallows(view: VistaView, land: WheatLand): void {
  const { ctx, w, h, moment, dir } = view;
  if (moment === undefined || moment > CROSSING_S + 1.5) {
    return;
  }
  ctx.fillStyle = SWALLOW;
  const count = Math.max(3, Math.min(SWALLOWS, Math.round(w / 50)));
  for (let i = 0; i < count; i++) {
    const gone = (moment - 0.15 - 0.17 * i - 0.1 * hash(i, 3)) / CROSSING_S;
    if (gone <= 0 || gone >= 1) {
      continue;
    }
    const x = Math.round(dir > 0 ? -6 + gone * (w + 12) : w + 6 - gone * (w + 12));
    const skim = land.near[Math.min(w - 1, Math.max(0, x))];
    const room = Math.max(4, Math.min(h * 0.2, skim - land.horizon + 4));
    const swoop = 0.5 + 0.5 * Math.sin(gone * (5 + 3 * hash(i, 5)) + 6.3 * hash(i, 7));
    const y = Math.round(skim - 2 - room * (0.15 + 0.6 * hash(i, 9)) * (0.35 + 0.65 * swoop));
    // A few quick beats, then a glide.
    const beat = Math.sin(moment * 26 + i * 2.1);
    const wing = Math.sin(moment * 3.1 + i) > 0.2 ? 1 : beat > 0.3 ? 0 : beat < -0.3 ? 2 : 1;
    for (const [ax, ay] of BODY) {
      ctx.fillRect(x + dir * ax, y + ay, 1, 1);
    }
    for (const [ax, ay] of WINGS[wing]) {
      ctx.fillRect(x + dir * ax, y + ay, 1, 1);
    }
  }
}

export const wheat: VistaPainter = {
  back(view) {
    const { ctx, h } = view;
    const land = wheatLand(view);
    const golden = goldenAt(view);
    gradient(view, 0, land.skyFoot, SKY.map((tone, i) => [SKY_AT[i], mix(tone, SKY_GOLDEN[i], golden)] as const));
    paintClouds(view, land);
    land.fields.forEach((field, depth) => {
      ctx.drawImage(field.image, 0, 0);
      paintShadows(view, land, depth);
      paintBreeze(view, field, depth);
      paintGust(view, field, depth);
      if (depth === MILL_FIELD) {
        paintMill(view, land);
      }
    });
    paintSwallows(view, land);
    if (golden > 0) {
      // The late light warms the land, not the sky: laid from the far crest down.
      ctx.fillStyle = GOLDEN;
      ctx.globalAlpha = GOLDEN_ALPHA * golden;
      land.fields[0].runs.forEach(([from, to, row]) => ctx.fillRect(from, row, to - from, h - row));
      ctx.globalAlpha = 1;
    }
    paintLookout(view, lookoutTones(view));
  },
  front(view) {
    paintEars(view);
    paintLookoutFront(view, lookoutTones(view));
  },
};
