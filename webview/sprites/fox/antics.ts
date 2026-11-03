import type { Animation, Glyph, Overlay, Point } from '../frames';
import { STEP_A, STEP_B, anim, type Pose } from './pose';

// Little things it does on its own, just because it is a fox: turning round on the spot before lying down, tucking
// itself into a loaf, kneading, rolling onto its back, bouncing for joy, scratching an ear, hiccups, a petal on its
// nose, and being shy.

type Step = [Pose, number];

const SIT = { body: 'sit' } as const;
const LIE = { body: 'lie' } as const;
const LOAF = { body: 'loaf' } as const;
const BELLY = { body: 'belly', tilt: 0.5, blush: true } as const;

/** Where the middle of its head is when it sits, before the pose moves it. */
const SIT_HEAD: Point = [21, 12];

/** A prop placed from the middle of a sitting head moved by `head`. */
const fromHead = (glyph: Glyph, [dx, dy]: Point, head: Point = [0, 0]): Overlay => ({ x: SIT_HEAD[0] + head[0] + dx, y: SIT_HEAD[1] + head[1] + dy, glyph });

// --- Turning round two full times on the spot, nose to the ground, then flumping down with a sigh. -----------

/** When, from the start of `circleDown`, it ends up facing the other way: half way through each turn. */
const circleFlips: number[] = [];
export const CIRCLE_FLIPS_MS: readonly number[] = circleFlips;

function circleDown(): Animation {
  const steps: Step[] = [[{ head: [1, 2], eye: 'down', tail: 'up' }, 320]];
  let t = 320;
  const push = (step: Step): void => {
    steps.push(step);
    t += step[1];
  };
  // Half a turn: two little steps, nose down, and a glance our way (or its back to us) as it comes round.
  for (let i = 0; i < 4; i++) {
    push([{ legs: STEP_A, head: [1, 3], eye: 'down', tail: 'wagL' }, 150]);
    push([{ legs: STEP_B, bob: 1, head: [1, 3], eye: 'down', tail: 'wagR' }, 150]);
    const turn: Pose = i % 2 === 0 ? { body: 'front', bob: 1, eye: 'happy', tail: 'frontA' } : { body: 'behind', bob: 1, tail: 'behindMidL' };
    push([turn, 110]);
    circleFlips.push(t);
    push([turn, 110]);
  }
  push([{ bob: 1, head: [1, 3], eye: 'down', tail: 'up' }, 260]);
  push([{ bob: 2, head: [0, 2], eye: 'sleepy', tail: 'wagL' }, 200]);
  push([{ ...LIE, bob: 1, eye: 'closed', tail: 'sitB' }, 160]);
  push([{ ...LIE, eye: 'closed', tail: 'sitA' }, 220]);
  push([{ ...LIE, bob: 1, eye: 'closed', mouth: 'flat', tail: 'sitA', extras: ['sniffB'] }, 650]);
  push([{ ...LIE, eye: 'sleepy', tail: 'sitB' }, 700]);
  return anim(steps);
}

// --- Boing: stiff-legged bounces on all fours, the last one the highest. ------------------------------------

/** Each bounce of `pronk`: when it leaves the ground, how long it stays up, how high it goes. */
export const PRONK_HOPS: readonly { at: number; air: number; height: number }[] = [
  { at: 240, air: 300, height: 5 },
  { at: 650, air: 300, height: 5 },
  { at: 1060, air: 380, height: 8 },
];
const STIFF: Pose['legs'] = [[1, 0], [0, 0], [0, 0], [-1, 0]];
const FOLDED: Pose['legs'] = [[1, 1], [1, 1], [-1, 1], [-1, 1]];

function pronk(): Animation {
  const steps: Step[] = [
    [{ bob: 1, eye: 'happy', tail: 'up' }, 120],
    [{ bob: 2, head: [0, 1], eye: 'happy', mouth: 'open', tail: 'wagL' }, 120],
  ];
  PRONK_HOPS.forEach(({ air }, i) => {
    const last = i === PRONK_HOPS.length - 1;
    steps.push(
      [{ legs: STIFF, bob: -1, eye: 'happy', mouth: 'open', tail: 'high', extras: last ? ['sparkleA'] : undefined }, air / 2],
      [{ legs: FOLDED, eye: 'happy', mouth: 'open', tail: last ? 'highL' : 'wagR', extras: last ? ['sparkleB'] : undefined }, air / 2],
      [{ bob: 2, head: [0, 1], eye: 'happy', mouth: 'tongue', tail: 'wagL' }, last ? 140 : 110],
    );
  });
  steps.push(
    [{ bob: 1, eye: 'happy', mouth: 'tongue', tail: 'wagR', extras: ['sparkleA'] }, 180],
    [{ eye: 'happy', tail: 'wagL', extras: ['sparkleB'] }, 240],
    [{ eye: 'happy', tail: 'wagR' }, 200],
    [{ eye: 'happy', tail: 'up' }, 220],
  );
  return anim(steps);
}

// --- On its back, paws in the air. -------------------------------------------------------------------------

// Its paws pat the air in turn, a front one with the hind one across from it; tucked in while it rolls.
const PAWS_A: Pose['legs'] = [[0, 0], [0, 1], [0, 1], [0, 0]];
const PAWS_B: Pose['legs'] = [[0, 1], [0, 0], [0, 0], [0, 1]];
const PAWS_IN: Pose['legs'] = [[1, -1], [0, -1], [0, -1], [-1, -1]];

function bellyUp(): Animation {
  const wiggle = (i: number): Step => [
    { ...BELLY, legs: i % 2 ? PAWS_B : PAWS_A, bob: i % 2, eye: 'happy', tail: i % 2 ? 'groundB' : 'groundA', extras: i === 3 ? ['smallHeartA'] : i === 5 ? ['smallHeartB'] : undefined },
    150,
  ];
  return anim([
    [{ ...LIE, eye: 'happy', tail: 'sitA' }, 240],
    [{ ...LOAF, bob: 1, head: [0, 1], eye: 'closed', tail: 'wrap' }, 150],
    [{ ...BELLY, legs: PAWS_IN, bob: 1, eye: 'closed', tail: 'groundB' }, 130],
    [{ ...BELLY, legs: PAWS_IN, eye: 'happy', tail: 'groundA' }, 260],
    ...Array.from({ length: 8 }, (_, i) => wiggle(i)),
    [{ ...BELLY, eye: 'happy', tail: 'groundA' }, 700],
    [{ ...BELLY, legs: PAWS_A, eye: 'happy', tail: 'groundB' }, 140],
    [{ ...BELLY, legs: PAWS_B, bob: 1, eye: 'happy', tail: 'groundA' }, 140],
    [{ ...BELLY, eye: 'happy', tail: 'groundA' }, 600],
    [{ ...BELLY, legs: PAWS_IN, bob: 1, eye: 'closed', tail: 'groundB' }, 130],
    [{ ...LOAF, bob: 1, head: [0, 1], eye: 'closed', tail: 'wrap' }, 150],
    [{ ...LIE, eye: 'happy', tail: 'sitB' }, 300],
    [{ ...LIE, eye: 'happy', tail: 'sitA' }, 300],
  ]);
}

// --- Scratching behind its ear with a hind foot, then shaking its head. --------------------------------------

function earScratch(): Animation {
  const SCRATCH = { ...SIT, head: [-1, 1], eye: 'closed', mouth: 'tongue' } as const;
  const burst = (n: number): Step[] =>
    Array.from({ length: n }, (_, i): Step => [{ ...SCRATCH, scratch: (i % 2) as 0 | 1, bob: i % 2, tail: i % 2 ? 'sitB' : 'sitA' }, 70]);
  return anim([
    [{ ...SIT, tail: 'sitA' }, 300],
    [{ ...SIT, head: [-1, 1], eye: 'sleepy', tail: 'sitB', scratch: 1 }, 160],
    ...burst(8),
    [{ ...SCRATCH, scratch: 0, eye: 'happy', tail: 'sitA' }, 320],
    ...burst(8),
    [{ ...SIT, head: [-1, 1], eye: 'happy', tail: 'sitB', scratch: 1 }, 140],
    [{ ...SIT, eye: 'closed', tail: 'sitA' }, 160],
    [{ ...SIT, head: [-1, 0], eye: 'closed', ears: 'back', tail: 'sitB' }, 70],
    [{ ...SIT, head: [1, 0], eye: 'closed', ears: 'back', tail: 'sitA' }, 70],
    [{ ...SIT, head: [-1, 0], eye: 'closed', ears: 'back', tail: 'sitB' }, 70],
    [{ ...SIT, head: [1, 0], eye: 'closed', tail: 'sitA' }, 70],
    [{ ...SIT, eye: 'happy', tail: 'sitB', extras: ['sparkleA'] }, 360],
    [{ ...SIT, eye: 'happy', tail: 'sitA' }, 300],
  ]);
}

// --- A petal flutters down and lands on its nose: it goes cross-eyed, and sneezes it off. -------------------

const PETAL_A: Glyph = ['rp', '.p'];
const PETAL_B: Glyph = ['p.', 'pr'];

function petalSneeze(): Animation {
  const UP = { ...SIT, eye: 'up', snoutUp: 1 } as const;
  const on = (head: Point = [0, 0]): Overlay => fromHead(PETAL_A, [5, -2], head);
  return anim([
    [{ ...SIT, eye: 'up', tail: 'sitA', props: [fromHead(PETAL_A, [7, -17])] }, 380],
    [{ ...SIT, eye: 'up', ears: 'back', tail: 'sitA', props: [fromHead(PETAL_B, [9, -14])] }, 140],
    [{ ...UP, tail: 'sitB', props: [fromHead(PETAL_B, [9, -12])] }, 260],
    [{ ...UP, head: [0, -1], tail: 'sitB', props: [fromHead(PETAL_A, [7, -9])] }, 380],
    [{ ...UP, head: [0, -1], tail: 'sitA', props: [fromHead(PETAL_B, [9, -6])] }, 380],
    [{ ...UP, mouth: 'open', tail: 'sitA', props: [fromHead(PETAL_A, [7, -4])] }, 300],
    [{ ...SIT, eye: 'down', snoutUp: 1, tail: 'sitB', props: [on()] }, 650],
    [{ ...SIT, eye: 'down', snoutUp: 1, ears: 'back', tail: 'sitB', props: [on()] }, 120],
    [{ ...SIT, eye: 'down', snoutUp: 1, tail: 'sitB', props: [on()] }, 420],
    // Ah... ah...
    [{ ...SIT, head: [-1, -1], eye: 'closed', snoutUp: 1, mouth: 'open', ears: 'back', tail: 'sitA', props: [on([-1, -1])] }, 340],
    [{ ...SIT, head: [-1, -1], eye: 'closed', snoutUp: 2, mouth: 'open', ears: 'back', tail: 'sitA', props: [on([-1, -2])] }, 260],
    // ...choo!
    [{ ...SIT, head: [1, 2], bob: 1, eye: 'closed', mouth: 'open', ears: 'back', tail: 'sitB', extras: ['sniffB'], props: [fromHead(PETAL_B, [9, -6])] }, 150],
    [{ ...SIT, head: [0, 1], eye: 'closed', tail: 'sitA', props: [fromHead(PETAL_A, [10, -11])] }, 200],
    [{ ...SIT, eye: 'wide', tail: 'sitB' }, 260],
    [{ ...SIT, eye: 'happy', tail: 'sitA', extras: ['sparkleA'] }, 320],
    [{ ...SIT, eye: 'happy', mouth: 'tongue', tail: 'sitB', extras: ['sparkleB'] }, 360],
  ]);
}

// --- Hiccups: little jolts that take it by surprise, until it holds its breath. ----------------------------

const HIC: Glyph = ['.Q.', 'Q.Q', '.Q.'];
const HIC_SMALL: Glyph = ['Q'];

function hiccups(): Animation {
  const hic = (calm: Pose): Step[] => [
    [{ ...SIT, bob: -1, head: [0, -1], eye: 'wide', mouth: 'flat', ears: 'back', tail: 'sitB', props: [fromHead(HIC, [5, 2], [0, -2])] }, 90],
    [{ ...SIT, eye: 'wide', mouth: 'flat', tail: 'sitA', props: [fromHead(HIC, [6, -2])] }, 260],
    [{ ...SIT, mouth: 'flat', tail: 'sitA', ...calm, props: [fromHead(HIC_SMALL, [8, -6])] }, 260],
    [{ ...SIT, mouth: 'flat', tail: 'sitB', ...calm }, 520],
  ];
  return anim([
    [{ ...SIT, tail: 'sitA' }, 420],
    ...hic({}),
    ...hic({ head: [0, 1] }),
    [{ ...SIT, head: [0, 1], mouth: 'flat', tail: 'sitA', extras: ['question'] }, 650],
    ...hic({ eye: 'down' }),
    // Holds its breath, eyes shut, nose up... and lets it out.
    [{ ...SIT, eye: 'closed', mouth: 'flat', snoutUp: 1, head: [0, -1], tail: 'sitA' }, 500],
    [{ ...SIT, eye: 'closed', mouth: 'flat', snoutUp: 1, head: [0, -1], bob: -1, tail: 'sitA' }, 700],
    [{ ...SIT, eye: 'closed', mouth: 'open', head: [0, 1], tail: 'sitB', extras: ['sniffB'] }, 300],
    [{ ...SIT, eye: 'happy', tail: 'sitA', extras: ['sparkleA'] }, 340],
    [{ ...SIT, eye: 'happy', mouth: 'tongue', tail: 'sitB', extras: ['sparkleB'] }, 380],
  ]);
}

// --- Tucked into a loaf: slow blinks, a breath, an ear and the tip of its tail twitching now and then. ------

function loaf(): Animation {
  return anim([
    [LOAF, 1800],
    [{ ...LOAF, eye: 'sleepy' }, 450],
    [{ ...LOAF, eye: 'closed' }, 650],
    [{ ...LOAF, eye: 'sleepy' }, 300],
    [{ ...LOAF, bob: 1 }, 1500],
    [LOAF, 1300],
    [{ ...LOAF, tail: 'wrapFlick' }, 200],
    [LOAF, 1100],
    [{ ...LOAF, ears: 'back' }, 130],
    [LOAF, 900],
    [{ ...LOAF, bob: 1, eye: 'sleepy' }, 600],
    [{ ...LOAF, bob: 1, eye: 'closed' }, 1300],
    [{ ...LOAF, eye: 'sleepy' }, 400],
    [{ ...LOAF, eye: 'happy' }, 700],
  ]);
}

// --- Making biscuits: its front paws knead the ground in turn, eyes shut with bliss, before it settles. -----

function knead(): Animation {
  const press = (i: number): Step => [
    { ...LOAF, knead: i % 2 ? [0, 2] : [2, 0], bob: i % 2, eye: 'closed', mouth: i > 4 ? 'tongue' : undefined, tail: i === 3 ? 'wrapFlick' : 'wrap' },
    240,
  ];
  return anim([
    [{ ...LOAF, knead: [0, 0], eye: 'down' }, 320],
    ...Array.from({ length: 8 }, (_, i) => press(i)),
    [{ ...LOAF, knead: [0, 0], eye: 'happy', mouth: 'tongue', extras: ['smallHeartA'] }, 420],
    [{ ...LOAF, knead: [0, 0], eye: 'happy', extras: ['smallHeartB'] }, 380],
    [{ ...LOAF, bob: 1, eye: 'sleepy' }, 500],
  ]);
}

// --- Shy: it hides behind a paw, blushing, wriggles, peeks at you, and lights up. ----------------------------

function shy(): Animation {
  const HIDE = { ...SIT, head: [-1, 2], eye: 'happy', blush: true, paw: 'lick' } as const;
  return anim([
    [{ ...SIT, eye: 'wide', blush: true, tail: 'sitA' }, 260],
    [{ ...HIDE, tail: 'sitB' }, 420],
    [{ ...HIDE, bob: 1, tail: 'sitA' }, 170],
    [{ ...HIDE, tail: 'sitB' }, 170],
    [{ ...HIDE, bob: 1, tail: 'sitA' }, 170],
    [{ ...HIDE, eye: 'open', head: [0, 1], tail: 'sitB' }, 520],
    [{ ...HIDE, tail: 'sitA', extras: ['smallHeartA'] }, 320],
    [{ ...SIT, eye: 'happy', blush: true, mouth: 'tongue', tail: 'sitB', extras: ['smallHeartB'] }, 520],
    [{ ...SIT, eye: 'happy', tail: 'sitA' }, 300],
  ]);
}

export const ANTICS = {
  circleDown: circleDown(),
  pronk: pronk(),
  bellyUp: bellyUp(),
  earScratch: earScratch(),
  petalSneeze: petalSneeze(),
  hiccups: hiccups(),
  loaf: loaf(),
  knead: knead(),
  shy: shy(),
} satisfies Record<string, Animation>;
