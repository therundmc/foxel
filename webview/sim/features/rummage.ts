import { ANIMATIONS } from '../../sprites/fox/animations';
import { totalDuration } from '../../sprites/frames';
import type { Buddy } from '../buddy';
import { clamp } from '../math';
import { LID_BACK } from '../props/chest';
import type { AnimRef, BuddyState, Feature } from '../state';
import { ASK_BREAK_MS, FETCH_FAR, FETCH_RUN_SPEED } from '../tuning';
import { carrying, dropBall } from './fetch';
import { startPlay } from './play';

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
/** A view narrower than this has no room for it beside its chest. */
const ROOM = 80;

type Step = 'reach' | 'haul' | 'open' | 'dip' | 'shut' | 'push' | 'back';

export class RummageMemory {
  /** Why it went to its chest: to take its ball out, or to put it away. */
  errand: 'fetch' | 'return' = 'fetch';
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

function step(b: Buddy, to: Step): void {
  b.rummage.step = to;
  b.rummage.stepMs = 0;
}

/** Where it stands at its chest, its nose over it, wherever the chest is right now. */
const beside = (b: Buddy): number => clamp(b.world.chest.x + NOSE_IN - b.noseOffset(1), 0, b.maxX);

function done(b: Buddy): void {
  b.world.chest.letGo();
  if (b.world.ball.state === 'mouth') {
    b.rummage.targetX = Math.max(0, b.x - PLAY_NEAR - (PLAY_FAR - PLAY_NEAR) * b.world.random());
    step(b, 'back');
  } else {
    b.enterNext(b.pickNext());
  }
}

// Back in the middle with its ball: it puts it down to play, or to ask you for a break.
function arrived(b: Buddy): void {
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
  // You were quicker: the ball it came for is already out, or the one it brought was taken from it.
  const has = ball.state === 'mouth';
  if (m.step !== 'back' && m.step !== 'push' && m.step !== 'shut' && has !== (m.errand === 'return') && !(m.step === 'dip' && m.stepMs >= TAKE_AT)) {
    chest.letGo();
    b.enterNext('sit');
    return;
  }
  switch (m.step) {
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
        ball.state = m.errand === 'fetch' ? 'mouth' : 'none';
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
      return m.step === 'reach' && b.running ? { anim: 'run', elapsed: b.elapsed } : carrying(b);
  }
}

// Its toy chest: it hauls it into the view, noses the lid up, takes its ball out or drops it back in, and pushes it out again.
export const rummageFeature = {
  states: {
    rummage: {
      nightDamped: true,
      ballFocus: true,
      available: (b) => b.world.width >= ROOM,
      begin(b) {
        startErrand(b);
        const started: BuddyState = b.state;
        if (started !== 'rummage' && started !== 'play') {
          b.enter('idle', b.ambientDuration('idle'));
        }
      },
      update: updateRummage,
      anim: rummageAnim,
    },
  },
  // Called away from its chest: it lets go of it, and the chest goes back out by itself.
  interrupted(b) {
    if (b.state === 'rummage') {
      b.world.chest.letGo();
    }
  },
} satisfies Feature;
