import { SPRITE_SIZE } from '../../sprites/frames';
import type { Buddy } from '../buddy';
import type { Feature } from '../state';
import { NOSE_REACH } from '../tuning';
import { startRummage } from './rummage';

const PLAY_SPEED = 28;
const POUNCE_MS = 400;
const PLAY_MAX_MS = 25_000;
const BALL_NEARBY = 80;

export class PlayMemory {
  kicks = 0;
  kicksWanted = 0;
  pounceMs = 0;
}

export function startPlay(b: Buddy): void {
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

// Playing with the ball on its own.
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
          startRummage(b, 'return');
        } else {
          b.enterNext('lie');
        }
      },
    },
  },
} satisfies Feature;
