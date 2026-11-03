import { ANIMATIONS, CIRCLE_FLIPS_MS, PRONK_HOPS, type AnimName } from '../../sprites/fox/animations';
import { totalDuration } from '../../sprites/frames';
import { fond } from '../affection';
import type { Buddy } from '../buddy';
import type { Feature } from '../state';

// Little things it does on its own, now and then, just because it is a fox: they come up through the `next` of
// what it was doing (`ambient.ts`), at the hours they suit and on the days it feels like it. Each plays once.

const once = (name: AnimName) => (): number => totalDuration(ANIMATIONS[name]);
const between = (min: number, max: number) => (b: Buddy): number => b.between(min, max);

/** Turning round on the spot: it faces the other way once for each half turn behind it. */
function circle(b: Buddy, dt: number): void {
  const turns = CIRCLE_FLIPS_MS.filter((at) => b.elapsed >= at).length;
  b.dir = turns % 2 === 0 ? b.startDir : b.flipped();
  b.fall(dt);
}

/** Boing, boing, boing: up in the air at each of its bounces, on the spot. */
function bounce(b: Buddy): void {
  const hop = PRONK_HOPS.find(({ at, air }) => b.elapsed >= at && b.elapsed < at + air);
  const p = hop ? (b.elapsed - hop.at) / hop.air : 0;
  b.y = hop ? 4 * Math.min(hop.height, b.maxY) * p * (1 - p) : 0;
}

export const anticsFeature = {
  states: {
    // Turns round twice where it stands, nose to the ground, and flumps down with a sigh.
    circleDown: {
      duration: once('circleDown'),
      update: circle,
      next: [['lie', 60], ['loaf', 25], ['knead', 15]],
    },
    // Tucked up like a loaf of bread, blinking slowly.
    loaf: {
      calm: true,
      restful: true,
      facesTarget: true,
      duration: between(9000, 18_000),
      next: [['lie', 35], ['sit', 25], ['stretch', 20], ['yawn', 10], ['idle', 10]],
    },
    // Making biscuits before it settles.
    knead: {
      restful: true,
      duration: once('knead'),
      next: [['loaf', 60], ['lie', 40]],
    },
    // Rolls onto its back and wiggles its paws in the air: only once it trusts you, and in a good mood.
    bellyUp: {
      duration: once('bellyUp'),
      available: (b) => fond(b.world),
      next: [['lie', 50], ['stretch', 25], ['sit', 25]],
    },
    // Bounces for joy on all fours.
    pronk: {
      nightDamped: true,
      duration: once('pronk'),
      available: (b) => b.world.mood >= 0,
      update: bounce,
      next: [['idle', 40], ['walk', 30], ['sit', 20], ['run', 10]],
    },
    earScratch: {
      duration: once('earScratch'),
      next: [['sit', 50], ['idle', 30], ['lie', 20]],
    },
    petalSneeze: {
      nightDamped: true,
      duration: once('petalSneeze'),
      next: [['sit', 40], ['idle', 40], ['walk', 20]],
    },
    hiccups: {
      duration: once('hiccups'),
      next: [['sit', 50], ['idle', 30], ['groom', 20]],
    },
  },
} satisfies Feature;
