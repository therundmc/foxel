import { MOUTH_HEIGHT } from '../../sprites/fox/anchors';
import { ANIMATIONS, TOSS_CATCH_MS, TOSS_FLICK_MS } from '../../sprites/fox/animations';
import { totalDuration } from '../../sprites/frames';
import { BALL_SIZE } from '../../sprites/props';
import type { Buddy } from '../buddy';
import { BALL_GRAVITY } from '../props/ball';
import type { Feature } from '../state';
import { AWAIT_MS, CATCH_RADIUS, FETCH_MAX_MS } from '../tuning';
import { dropBall } from './fetch';

type Trick = 'balance' | 'toss' | 'pawPlay';
// What it does with the ball once brought back; undefined just drops it and waits.
const TRICKS: readonly (Trick | undefined)[] = ['balance', 'toss', 'pawPlay', undefined];
const TOSS_VY = 75;
const TOSS_THROWS = 2;
const TOSS_MAX_MS = 12_000;

export class TricksMemory {
  trick: Trick = 'balance';
  /** Index of the last pick in TRICKS, so it does not do the same twice in a row. */
  last = -1;
  tossPhase: 'flick' | 'air' | 'catch' = 'flick';
  trickMs = 0;
  tosses = 0;
}

export function showOff(b: Buddy): void {
  let pick = Math.floor(b.world.random() * TRICKS.length) % TRICKS.length;
  if (pick === b.tricks.last) {
    pick = (pick + 1) % TRICKS.length;
  }
  b.tricks.last = pick;
  const trick = TRICKS[pick];
  if (!trick) {
    dropBall(b);
    b.world.ball.vx = 0;
    b.enter('await', AWAIT_MS);
    return;
  }
  b.tricks.trick = trick;
  b.tricks.trickMs = 0;
  b.tricks.tosses = 0;
  b.tricks.tossPhase = 'flick';
  b.enter('trick', trick === 'toss' ? TOSS_MAX_MS : totalDuration(ANIMATIONS[trick]));
}

// The toss uses the real ball: flick it straight up, watch it, catch it on the way down.
function updateToss(b: Buddy, dt: number): void {
  const ball = b.world.ball;
  b.tricks.trickMs += dt * 1000;
  switch (b.tricks.tossPhase) {
    case 'flick':
      if (b.tricks.trickMs >= TOSS_FLICK_MS) {
        const mouthX = b.x + b.mouthOffset();
        ball.place(mouthX - BALL_SIZE / 2, MOUTH_HEIGHT - BALL_SIZE / 2, b.world.width, b.world.height);
        const room = b.world.height - BALL_SIZE - MOUTH_HEIGHT - 2;
        ball.launch(0, Math.min(TOSS_VY, Math.sqrt(2 * BALL_GRAVITY * Math.max(room, 4))));
        b.tricks.tossPhase = 'air';
        b.tricks.trickMs = 0;
      }
      return;
    case 'air': {
      if (ball.state !== 'free') {
        return;
      }
      const gap = Math.hypot(ball.center - (b.x + b.mouthOffset()), ball.y + BALL_SIZE / 2 - MOUTH_HEIGHT);
      if (ball.vy < 0 && gap <= CATCH_RADIUS) {
        ball.state = 'mouth';
        ball.vx = 0;
        ball.vy = 0;
        b.tricks.tossPhase = 'catch';
        b.tricks.trickMs = 0;
      } else if (ball.y === 0) {
        b.finishState();
      }
      return;
    }
    case 'catch':
      if (b.tricks.trickMs >= TOSS_CATCH_MS) {
        b.tricks.tosses++;
        if (b.tricks.tosses >= TOSS_THROWS) {
          b.finishState();
        } else {
          b.tricks.tossPhase = 'flick';
          b.tricks.trickMs = 0;
        }
      }
      return;
  }
}

// Showing off with the ball it just brought back.
export const tricksFeature = {
  states: {
    trick: {
      priority: 2,
      ballFocus: true,
      update(b, dt) {
        b.fall(dt);
        if (b.tricks.trick === 'toss') {
          updateToss(b, dt);
        }
      },
      anim(b) {
        const { trick, tossPhase, trickMs } = b.tricks;
        if (trick !== 'toss') {
          return { anim: trick, elapsed: b.elapsed };
        }
        return {
          anim: tossPhase === 'flick' ? 'tossFlick' : tossPhase === 'air' ? 'tossWait' : 'tossCatch',
          elapsed: trickMs,
        };
      },
      finish(b) {
        if (b.world.ball.state === 'mouth') {
          dropBall(b);
          b.world.ball.vx = 0;
          b.enter('await', AWAIT_MS);
        } else {
          b.enter('fetch', FETCH_MAX_MS);
        }
      },
    },
  },
} satisfies Feature;
