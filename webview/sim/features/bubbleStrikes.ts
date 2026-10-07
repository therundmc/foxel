import { MOUTH_HEIGHT, MOUTH_X, NOSE_HEIGHT, NOSE_X } from '../../sprites/fox/anchors';
import type { AnimName } from '../../sprites/fox/animations';
import { SPRITE_SIZE } from '../../sprites/frames';

// The ways it knows of bursting a soap bubble: where it has to stand, whether it jumps, and which part of it
// bursts what it touches, when. What it does with them is in bubbles.ts.

/** A part of it that bursts bubbles for a while during a strike: when (ms), where on its sprite, and how far around. */
interface Hit {
  readonly from: number;
  readonly to: number;
  readonly col: number;
  readonly height: number;
  readonly r: number;
}

/** One way of bursting a bubble. */
export interface Strike {
  readonly anim: AnimName;
  /** The bubble heights it is good for (their centre, above the ground). */
  readonly heights: readonly [number, number];
  /** The column of its sprite that goes under the bubble. */
  readonly under: number;
  /** A jump: when it leaves the ground and for how long, how high the part that strikes is when it stands, how far forward it carries. */
  readonly jump?: { readonly at: number; readonly air: number; readonly part: number; readonly forward: number };
  readonly hits: readonly Hit[];
  /** It turns round and round in the air, this often. */
  readonly spinMs?: number;
  /** It gathers itself first. */
  readonly wiggles?: true;
  /** Only worth it for several bubbles close together. */
  readonly cluster?: true;
  /** What bursting one this way sometimes does to it. */
  readonly after?: { readonly does: 'sneeze' | 'bleh'; readonly chance: number };
  readonly odds: number;
}

export const STRIKES = {
  // A jump straight up, nose first.
  nose: {
    anim: 'popLeap',
    heights: [NOSE_HEIGHT - 1, Infinity],
    under: NOSE_X,
    jump: { at: 0, air: 480, part: NOSE_HEIGHT, forward: 0 },
    hits: [{ from: 0, to: 480, col: NOSE_X, height: NOSE_HEIGHT, r: 2.5 }],
    wiggles: true,
    after: { does: 'sneeze', chance: 0.3 },
    odds: 1.6,
  },
  // Standing, it snaps at one in front of its muzzle: soap does not taste good.
  chomp: {
    anim: 'chomp',
    heights: [MOUTH_HEIGHT - 4, MOUTH_HEIGHT + 6],
    under: MOUTH_X + 2,
    hits: [{ from: 150, to: 340, col: MOUTH_X + 1, height: MOUTH_HEIGHT + 1, r: 3.2 }],
    after: { does: 'bleh', chance: 1 },
    odds: 8,
  },
  // Sitting, it bats at one with a front paw, up and then down.
  swat: {
    anim: 'swat',
    heights: [7, 17],
    under: 26.5,
    hits: [
      { from: 300, to: 480, col: 26, height: 13.5, r: 3.6 },
      { from: 480, to: 640, col: 25.5, height: 9.5, r: 3.6 },
    ],
    odds: 5,
  },
  // A pounce forward onto a low one, front paws first.
  pounce: {
    anim: 'leap',
    heights: [4, 14],
    under: NOSE_X - 1,
    jump: { at: 0, air: 600, part: 9, forward: 12 },
    hits: [{ from: 0, to: 600, col: 28, height: 10, r: 4 }],
    wiggles: true,
    odds: 1.6,
  },
  // Its back to one, it whips its tail up through it.
  tail: {
    anim: 'tailWhip',
    heights: [19, 31],
    under: 5.5,
    hits: [{ from: 260, to: 720, col: 5.5, height: 25, r: 5.5 }],
    odds: 3.5,
  },
  // A jump curled into a ball, spinning: everything around it bursts.
  spin: {
    anim: 'spinBall',
    heights: [14, Infinity],
    under: SPRITE_SIZE / 2,
    jump: { at: 140, air: 620, part: 14, forward: 0 },
    hits: [{ from: 140, to: 760, col: SPRITE_SIZE / 2, height: 14, r: 11 }],
    spinMs: 90,
    wiggles: true,
    cluster: true,
    odds: 5,
  },
} satisfies Record<string, Strike>;
export type StrikeName = keyof typeof STRIKES;
