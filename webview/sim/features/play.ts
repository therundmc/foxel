import { SPRITE_SIZE } from '../../sprites/frames';
import type { Buddy } from '../buddy';
import type { BuddyState, Feature } from '../state';
import { ASK_BREAK_MS, NOSE_REACH } from '../tuning';
import { carrying, dropBall } from './fetch';

const ERRAND_SPEED = 14;
const PLAY_SPEED = 28;
const POUNCE_MS = 400;
const PLAY_MAX_MS = 25_000;
const BALL_NEARBY = 80;

export class PlayMemory {
  /** Why it left the view: to fetch its ball, or to put it away. */
  errand: 'fetch' | 'return' = 'fetch';
  /** Where it stops when it comes back in. */
  targetX = 0;
  kicks = 0;
  kicksWanted = 0;
  pounceMs = 0;
}

export function startErrand(b: Buddy): void {
  if (b.world.ball.state === 'free') {
    startPlay(b);
  } else if (b.world.ball.state === 'none') {
    startLeave(b, 'fetch');
  }
}

export function startLeave(b: Buddy, errand: 'fetch' | 'return'): void {
  b.play.errand = errand;
  b.dir = b.x + SPRITE_SIZE / 2 < b.world.width / 2 ? -1 : 1;
  b.enter('leave', Infinity);
}

function startArrive(b: Buddy): void {
  const fromLeft = b.world.random() < 0.5;
  b.x = fromLeft ? -SPRITE_SIZE : b.world.width;
  b.dir = fromLeft ? 1 : -1;
  b.play.targetX = b.maxX * (0.2 + 0.6 * b.world.random());
  b.world.ball.state = b.play.errand === 'fetch' ? 'mouth' : 'none';
  b.enter('arrive', Infinity);
}

function arrived(b: Buddy): void {
  if (b.world.ball.state === 'mouth' && b.rest.askingBreak) {
    b.rest.askingBreak = false;
    dropBall(b);
    b.enter('askBreak', ASK_BREAK_MS);
  } else if (b.world.ball.state === 'mouth') {
    dropBall(b);
    startPlay(b);
  } else {
    b.enterNext(b.pickNext());
  }
}

function startPlay(b: Buddy): void {
  b.play.kicks = 0;
  b.play.kicksWanted = 2 + Math.floor(b.world.random() * 3);
  b.play.pounceMs = 0;
  b.moving = false;
  b.enter('play', PLAY_MAX_MS);
}

function updatePlay(b: Buddy, dt: number): void {
  b.moving = false;
  if (b.play.pounceMs > 0) {
    b.play.pounceMs -= dt * 1000;
    return;
  }
  if (b.world.ball.state !== 'free') {
    b.enterNext('sit');
    return;
  }
  const target = b.noseTargetFor(b.world.ball.center);
  const toNose = b.x + b.noseOffset() - b.world.ball.center;
  if (b.world.ball.y < 1 && Math.abs(toNose) <= NOSE_REACH) {
    touchBall(b);
    return;
  }
  if (b.world.ball.vx !== 0 && Math.sign(b.world.ball.vx) === Math.sign(toNose)) {
    return;
  }
  if (b.approach(target, PLAY_SPEED * dt)) {
    b.moving = true;
    return;
  }
  if (b.world.ball.resting) {
    touchBall(b);
  }
}

function touchBall(b: Buddy): void {
  if (b.play.kicks >= b.play.kicksWanted) {
    b.finishState();
    return;
  }
  const kickDir = b.world.ball.center < b.world.width / 2 ? 1 : -1;
  b.dir = kickDir;
  b.world.ball.launch(kickDir * (35 + b.world.random() * 25), 18 + b.world.random() * 17);
  b.play.kicks++;
  b.play.pounceMs = POUNCE_MS;
}

function ballNearby(b: Buddy): boolean {
  const ball = b.world.ball;
  return ball.state === 'free' && ball.resting && Math.abs(ball.center - (b.x + SPRITE_SIZE / 2)) <= BALL_NEARBY;
}

// Leaves the view and comes back the other way, at a trot.
function trot(b: Buddy, dt: number): void {
  b.x += b.dir * ERRAND_SPEED * dt;
}

// Playing with the ball on its own, and the trips out of the view to fetch it or put it away.
export const playFeature = {
  states: {
    play: {
      ballFocus: true,
      nightDamped: true,
      available: ballNearby,
      begin(b) {
        if (b.world.ball.state === 'free') {
          startPlay(b);
        } else {
          b.enter('sit', b.ambientDuration('sit'));
        }
      },
      update: updatePlay,
      anim(b) {
        if (b.play.pounceMs > 0) {
          return { anim: 'pounce', elapsed: POUNCE_MS - b.play.pounceMs };
        }
        return { anim: b.moving ? 'run' : 'idle', elapsed: b.elapsed };
      },
      finish(b) {
        if (b.world.random() < 0.5) {
          b.world.ball.state = 'mouth';
          startLeave(b, 'return');
        } else {
          b.enterNext('lie');
        }
      },
    },
    leave: {
      offscreen: true,
      nightDamped: true,
      begin(b) {
        startErrand(b);
        const started: BuddyState = b.state;
        if (started !== 'leave' && started !== 'play') {
          b.enter('idle', b.ambientDuration('idle'));
        }
      },
      update(b, dt) {
        trot(b, dt);
        if (b.x <= -SPRITE_SIZE || b.x >= b.world.width) {
          b.enter('away', 1500 + b.world.random() * 2000);
        }
        return true;
      },
      anim: (b) => carrying(b),
    },
    away: {
      offscreen: true,
      hidden: true,
      anim: (b) => ({ anim: 'idle', elapsed: b.elapsed }),
      finish: startArrive,
    },
    arrive: {
      offscreen: true,
      update(b, dt) {
        trot(b, dt);
        if ((b.x - b.play.targetX) * b.dir >= 0) {
          b.x = b.play.targetX;
          arrived(b);
        }
        return true;
      },
      anim: (b) => carrying(b),
    },
  },
} satisfies Feature;
