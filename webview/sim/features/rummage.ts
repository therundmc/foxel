import { ANIMATIONS } from '../../sprites/fox/animations';
import { totalDuration } from '../../sprites/frames';
import type { PlushKind } from '../../sprites/props';
import type { Buddy } from '../buddy';
import { clamp } from '../math';
import { LID_BACK } from '../props/chest';
import type { Plush } from '../props/plush';
import { urge, type AnimRef, type BuddyState, type Feature } from '../state';
import { ASK_BREAK_MS, FETCH_FAR, FETCH_RUN_SPEED } from '../tuning';
import { carrying, dropBall } from './fetch';
import { startPlay } from './play';
import { asleep } from './rest';
import { carryInMouth, noseTo } from './mouth';
import { startTossing } from './plush';

/** How far past the chest's near edge its nose goes. */
const NOSE_IN = 5;
/** When, in the hauling and in the shoving, the chest moves: half the way, then the rest. */
const HAULS_AT = [260, 760] as const;
const SHOVES_AT = [200, 800] as const;
const HAUL_MS = totalDuration(ANIMATIONS.haul);
const SHOVE_MS = totalDuration(ANIMATIONS.shove);
/** How long its head stays in the chest, and when in there the ball is taken or left. */
const DIP_MS = 1280;
const TAKE_AT = 800;
/** It trots to its chest and back with its ball, and runs there when it is far and has nothing in its mouth. */
const TROT_SPEED = 16;
/** How far from its chest it takes its ball to play, at least and at most. */
const PLAY_NEAR = 24;
const PLAY_FAR = 70;
/** A soft toy left lying this long may be tidied when it thinks of its chest; left this long, it goes and tidies it. */
const TIDY_MAYBE_MS = 60_000;
const TIDY_MS = 5 * 60_000;
/** In a playful mood, a toy you put away it goes and gets out again: how often, and how long after you shut the chest. */
const PLAYFUL = 0.45;
const PLAYFUL_MOOD = 0.4;
const BACK_AFTER_MS = 1600;
/** A view narrower than this has no room for it beside its chest. */
const ROOM = 80;

type Step = 'pick' | 'reach' | 'haul' | 'open' | 'dip' | 'shut' | 'push' | 'back';

export class RummageMemory {
  /** Why it went to its chest: to take its ball out, to put it away, to put away a soft toy left lying, or to get one out again. */
  errand: 'fetch' | 'return' | 'tidy' | 'retrieve' = 'fetch';
  /** The soft toy it is tidying or getting out. */
  toy: PlushKind = 'teddy';
  /** The toy you put away that it means to get out again, in how long; and the last one it got out, which it then lets you put away. */
  wants: PlushKind | 'ball' | undefined;
  wantsInMs = 0;
  gotOut: PlushKind | 'ball' | undefined;
  step: Step = 'reach';
  stepMs = 0;
  /** Where it trots to with its ball before it plays. */
  targetX = 0;
}

/** Wants its ball: plays with it if it is lying about, goes and gets it from its chest if not. */
export function startErrand(b: Buddy): void {
  if (b.world.ball.state === 'free') {
    startPlay(b);
  } else if (b.world.ball.state === 'none') {
    startRummage(b, 'fetch');
  }
}

/** Goes to its chest, pulls it into the view if it is not there, and takes its ball out or puts it back. */
export function startRummage(b: Buddy, errand: 'fetch' | 'return'): void {
  b.rummage.errand = errand;
  step(b, 'reach');
  b.enter('rummage', Infinity);
}

/** Picks up a soft toy that is lying about and puts it away in its chest. */
export function startTidy(b: Buddy, toy: PlushKind): void {
  b.rummage.errand = 'tidy';
  b.rummage.toy = toy;
  step(b, 'pick');
  b.enter('rummage', Infinity);
}

/** You put a toy away. Now and then it is not done playing: it will go and get it out again, once. */
export function wantBack(b: Buddy, toy: PlushKind | 'ball'): void {
  const m = b.rummage;
  const again = m.gotOut === toy;
  m.gotOut = undefined;
  // The better its day, the more often.
  if (!again && roomy(b) && b.world.random() < clamp(PLAYFUL + PLAYFUL_MOOD * b.world.mood, 0.05, 0.9)) {
    m.wants = toy;
    m.wantsInMs = BACK_AFTER_MS;
  }
}

// The moment comes: off to the chest, if nothing more pressing is going on and the toy is still in there.
function goGetIt(b: Buddy, dtMs: number): void {
  const m = b.rummage;
  if (m.wants === undefined) {
    return;
  }
  m.wantsInMs -= dtMs;
  if (m.wantsInMs > 0) {
    return;
  }
  const toy = m.wants;
  m.wants = undefined;
  if (!b.world.chest.holds[toy] || (b.def.priority ?? 0) > 0 || b.def.offscreen || asleep(b)) {
    return;
  }
  b.interrupt();
  m.gotOut = toy;
  if (toy === 'ball') {
    startRummage(b, 'fetch');
  } else {
    m.errand = 'retrieve';
    m.toy = toy;
    step(b, 'reach');
    b.enter('rummage', Infinity);
  }
}

/** A soft toy that has been lying about for at least this long, the one left longest first. */
function leftLying(b: Buddy, ms: number): Plush | undefined {
  return Object.values(b.world.plushes)
    .filter((toy) => toy.landed && toy.lainMs >= ms)
    .sort((one, other) => other.lainMs - one.lainMs)[0];
}

const roomy = (b: Buddy): boolean => b.world.width >= ROOM;

function step(b: Buddy, to: Step): void {
  b.rummage.step = to;
  b.rummage.stepMs = 0;
}

/** Where it stands at its chest, its nose over it, wherever the chest is right now. */
const beside = (b: Buddy): number => clamp(b.world.chest.x + NOSE_IN - b.noseOffset(1), 0, b.maxX);

function done(b: Buddy): void {
  b.world.chest.letGo();
  if (b.world.ball.state === 'mouth' || b.world.plushes[b.rummage.toy].state === 'carried') {
    b.rummage.targetX = Math.max(0, b.x - PLAY_NEAR - (PLAY_FAR - PLAY_NEAR) * b.world.random());
    step(b, 'back');
  } else {
    b.enterNext(b.pickNext());
  }
}

// Back in the middle with its ball: it puts it down to play, or to ask you for a break.
function arrived(b: Buddy): void {
  if (b.world.plushes[b.rummage.toy].state === 'carried') {
    // With the soft toy it went to get: it throws it up for you.
    startTossing(b, b.rummage.toy);
    return;
  }
  dropBall(b);
  if (b.rest.askingBreak) {
    b.rest.askingBreak = false;
    b.enter('askBreak', ASK_BREAK_MS);
  } else {
    startPlay(b);
  }
}

function updateRummage(b: Buddy, dt: number, dtMs: number): void {
  const m = b.rummage;
  const { chest, ball } = b.world;
  const passed = (ms: number): boolean => m.stepMs >= ms && m.stepMs - dtMs < ms;
  b.moving = false;
  b.fall(dt);
  m.stepMs += dtMs;
  const toy = b.world.plushes[m.toy];
  const has = ball.state === 'mouth' || toy.state === 'carried';
  // You were quicker: what it came for is already out, or what it was bringing is no longer its to bring.
  const settled = m.step === 'back' || m.step === 'push' || m.step === 'shut' || (m.step === 'dip' && m.stepMs >= TAKE_AT);
  const asPlanned = m.errand === 'tidy' ? (m.step === 'pick' ? toy.landed : toy.state === 'carried') : m.errand === 'retrieve' ? toy.state === 'none' : (ball.state === 'mouth') === (m.errand === 'return');
  if (!settled && !asPlanned) {
    chest.letGo();
    b.enterNext('sit');
    return;
  }
  if (toy.state === 'carried') {
    carryInMouth(b, toy);
  }
  switch (m.step) {
    case 'pick': {
      if (noseTo(b, toy.center, dt, TROT_SPEED) !== 'going') {
        carryInMouth(b, toy);
        step(b, 'reach');
      }
      break;
    }
    case 'reach':
      b.running = !has && Math.abs(beside(b) - b.x) > FETCH_FAR;
      if (b.walkTo(beside(b), 1, (b.running ? FETCH_RUN_SPEED : TROT_SPEED) * dt)) {
        b.moving = true;
      } else {
        step(b, chest.here ? 'open' : 'haul');
      }
      break;
    case 'haul':
      HAULS_AT.forEach((ms, i) => passed(ms) && chest.haul((i + 1) / HAULS_AT.length));
      // It backs up as the chest comes.
      b.x = beside(b);
      if (m.stepMs >= HAUL_MS) {
        step(b, 'open');
      }
      break;
    case 'open':
      chest.haul(1);
      chest.lift(true);
      if (chest.here && chest.open >= LID_BACK) {
        step(b, 'dip');
      }
      break;
    case 'dip':
      if (passed(TAKE_AT)) {
        if (m.errand === 'tidy') {
          toy.state = 'none';
        } else if (m.errand === 'retrieve') {
          carryInMouth(b, toy);
        } else {
          ball.state = m.errand === 'fetch' ? 'mouth' : 'none';
        }
      }
      if (m.stepMs >= DIP_MS) {
        chest.lift(false);
        step(b, 'shut');
      }
      break;
    case 'shut':
      // With your pointer on it the chest stays: it leaves it to you.
      if (chest.asked) {
        done(b);
      } else if (chest.open === 0) {
        step(b, 'push');
      }
      break;
    case 'push':
      if (passed(SHOVES_AT[0])) {
        chest.haul(0.5);
      }
      if (passed(SHOVES_AT[1])) {
        chest.haul(0);
      }
      // And goes with it as it pushes it out.
      b.x = beside(b);
      if (m.stepMs >= SHOVE_MS) {
        done(b);
      }
      break;
    case 'back':
      if (b.walkTo(m.targetX, -1, TROT_SPEED * dt)) {
        b.moving = true;
      } else {
        arrived(b);
      }
      break;
  }
}

function rummageAnim(b: Buddy): AnimRef {
  const m = b.rummage;
  const ball = b.world.ball.state === 'mouth';
  switch (m.step) {
    case 'haul':
      return { anim: ball ? 'haulCarry' : 'haul', elapsed: m.stepMs };
    case 'open':
    case 'dip':
      return { anim: ball ? 'rummageCarry' : 'rummage', elapsed: b.elapsed };
    case 'push':
      return { anim: ball ? 'shoveCarry' : 'shove', elapsed: m.stepMs };
    default:
      return (m.step === 'reach' || m.step === 'pick') && b.running ? { anim: 'run', elapsed: b.elapsed } : carrying(b);
  }
}

// Its toy chest: it hauls it into the view, noses the lid up, takes its ball out or drops it back in, and pushes it out again.
export const rummageFeature = {
  states: {
    rummage: {
      nightDamped: true,
      ballFocus: true,
      available: roomy,
      begin(b) {
        const left = leftLying(b, TIDY_MAYBE_MS);
        if (left) {
          startTidy(b, left.kind);
        } else {
          startErrand(b);
        }
        const started: BuddyState = b.state;
        if (started !== 'rummage' && started !== 'play') {
          b.enter('idle', b.ambientDuration('idle'));
        }
      },
      update: updateRummage,
      anim: rummageAnim,
    },
  },
  tick: goGetIt,
  // A soft toy left lying long enough, it tidies of its own accord.
  urges: [urge((b) => roomy(b) && leftLying(b, TIDY_MS) !== undefined, (b) => startTidy(b, leftLying(b, TIDY_MS)?.kind ?? 'teddy'))],
  // Called away from its chest: it lets go of it, and of what it was carrying, and the chest goes back out by itself.
  interrupted(b) {
    if (b.state === 'rummage') {
      b.world.chest.letGo();
      Object.values(b.world.plushes).forEach((toy) => toy.state === 'carried' && toy.toss(0, 0));
    }
  },
} satisfies Feature;
