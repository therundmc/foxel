import { JUMP_AIR_MS, JUMP_CROUCH_MS, TWIRL_AIR_MS, TWIRL_CROUCH_MS } from '../../sprites/fox/animations';
import type { Buddy } from '../buddy';
import { urge, type Feature } from '../state';
import { asleep } from './rest';
import { perform, type TouchReaction } from './touch';

/** A sign you make with your pointer. */
export type Sign = 'circle' | 'wave' | 'nod';
/** What it can do in answer to one. */
export type Stunt = 'twirl' | 'jump' | 'bow' | 'beg' | 'paw';

const STUNTS: Record<Stunt, TouchReaction> = {
  twirl: { anim: 'twirl', hop: { at: TWIRL_CROUCH_MS, air: TWIRL_AIR_MS, height: 6 }, spinMs: TWIRL_AIR_MS / 4, then: 'sit' },
  jump: { anim: 'jump', hop: { at: JUMP_CROUCH_MS, air: JUMP_AIR_MS, height: 9 }, then: 'sit' },
  bow: { anim: 'stretch', then: 'sit' },
  beg: { anim: 'beg', ms: 1400, then: 'sit' },
  paw: { anim: 'wave', ms: 1300, then: 'sit' },
};
const ALL = Object.keys(STUNTS) as Stunt[];
const WONDERS: TouchReaction = { anim: 'tilt' };
const PROUD: TouchReaction = { anim: 'proud', ms: 1100, then: 'sit' };

/** Rewarded this many times for the same trick on the same sign, it knows it: no more wondering, no more guessing. */
export const KNOWN = 3;
/** Before that, the more often a trick was rewarded, the more likely it tries it again: this likely once, and this much more each time. */
const TRIES_AGAIN = 0.55;
const TRIES_AGAIN_MORE = 0.2;
/** A treat held out within this long of its trick is a reward for it. */
const REWARD_MS = 9000;

export class LessonMemory {
  /** For each sign, how many times each trick was rewarded. */
  learned: Partial<Record<Sign, Partial<Record<Stunt, number>>>> = {};
  /** The sign it is working out an answer to. */
  asked: Sign | undefined;
  /** The trick it has just done for a sign, and how long a treat still counts as a reward for it. */
  tried: { sign: Sign; stunt: Stunt } | undefined;
  rewardMs = 0;
  /** A treat was held out in time: the trick that will be rewarded once it has eaten it. And it has just been rewarded. */
  earning: { sign: Sign; stunt: Stunt } | undefined;
  proud = false;
}

/** The trick it knows best for a sign, and how many times it was rewarded. */
export function best(b: Buddy, sign: Sign): { stunt: Stunt; times: number } | undefined {
  const scores = b.lessons.learned[sign] ?? {};
  const stunt = ALL.filter((s) => (scores[s] ?? 0) > 0).sort((one, other) => (scores[other] ?? 0) - (scores[one] ?? 0))[0];
  return stunt && { stunt, times: scores[stunt] ?? 0 };
}

// Which trick to answer a sign with: the one it knows, the one that has paid before, or a guess.
function choose(b: Buddy, sign: Sign): Stunt {
  const known = best(b, sign);
  if (known && (known.times >= KNOWN || b.world.random() < TRIES_AGAIN + TRIES_AGAIN_MORE * (known.times - 1))) {
    return known.stunt;
  }
  const others = ALL.filter((stunt) => stunt !== known?.stunt);
  return others[Math.floor(b.world.random() * others.length) % others.length];
}

function answer(b: Buddy, sign: Sign): void {
  const stunt = choose(b, sign);
  b.lessons.asked = undefined;
  b.lessons.tried = { sign, stunt };
  b.lessons.rewardMs = REWARD_MS;
  perform(b, STUNTS[stunt]);
}

/** You made a sign with your pointer. Returns whether it was paying attention. */
export function signed(b: Buddy, sign: Sign): boolean {
  if (asleep(b) || b.def.offscreen || (!b.def.calm && !b.def.free)) {
    return false;
  }
  b.faceX(b.world.pointer?.x ?? b.x, 0);
  // A new question: what it did for the last one no longer earns anything.
  b.lessons.tried = undefined;
  if ((best(b, sign)?.times ?? 0) >= KNOWN) {
    answer(b, sign);
  } else {
    // It does not know that one yet: it wonders, then has a go.
    b.lessons.asked = sign;
    perform(b, WONDERS);
  }
  return true;
}

/** A treat is held out or thrown to it: if it has just done a trick, that is what it is for. */
export function treatOffered(b: Buddy): void {
  const m = b.lessons;
  if (m.tried && m.rewardMs > 0) {
    m.earning = m.tried;
    m.tried = undefined;
  }
}

/** It has eaten the treat: the trick it did for it is worth doing again. */
export function treatEaten(b: Buddy): void {
  const m = b.lessons;
  if (!m.earning) {
    return;
  }
  const { sign, stunt } = m.earning;
  const scores = (m.learned[sign] ??= {});
  scores[stunt] = (scores[stunt] ?? 0) + 1;
  m.earning = undefined;
  m.proud = true;
}

// What you teach it: a sign of your pointer, a trick in answer, a treat when it is the one you wanted.
export const lessonsFeature = {
  states: {},
  tick(b, dtMs) {
    b.lessons.rewardMs = Math.max(0, b.lessons.rewardMs - dtMs);
  },
  urges: [
    urge(
      (b) => b.lessons.asked !== undefined,
      (b) => answer(b, b.lessons.asked ?? 'circle'),
    ),
    urge(
      (b) => b.lessons.proud,
      (b) => {
        b.lessons.proud = false;
        perform(b, PROUD);
      },
    ),
  ],
} satisfies Feature;
