import { BODY_HEIGHT, BODY_LEFT, BODY_RIGHT, MOUTH_HEIGHT } from '../../sprites/fox/anchors';
import { SPRITE_SIZE } from '../../sprites/frames';
import { BALL_SIZE } from '../../sprites/props';
import type { Buddy } from '../buddy';
import { clamp } from '../math';
import { Ball } from '../props/ball';
import type { AnimRef, Feature } from '../state';
import { ASK_BREAK_MS, AWAIT_MS, CATCH_RADIUS, FETCH_FAR, FETCH_MAX_MS, FETCH_RUN_SPEED, FETCH_WALK_SPEED, NOSE_REACH } from '../tuning';
import { showOff } from './tricks';

const BRING_SPEED = 14;
const BRING_MAX_MS = 15_000;
const BUMP_DAMPING = 0.5;
const STAND_LIFT = 1.5;
const CATCH_LEAP_MAX = 16;
const LEAP_GRAVITY = 300;
const PREDICT_S = 3;
const PREDICT_STEP = 1 / 60;

interface Intercept {
  x: number;
  dir: 1 | -1;
  t: number;
  lift: number;
}

export class FetchMemory {
  /** Where the ball was thrown from, to bring it back there. */
  playerX: number | undefined;
  // The leap to catch the ball in the air; not leaping while airTotalMs is 0.
  airMs = 0;
  airTotalMs = 0;
  leapFrom = 0;
  leapTo = 0;
  leapHeight = 0;
}

function riseTime(lift: number): number {
  return Math.sqrt((2 * Math.max(lift, 0)) / LEAP_GRAVITY);
}

/** Walking with or without the ball in its mouth. */
export function carrying(b: Buddy): AnimRef {
  return { anim: b.world.ball.state === 'mouth' ? 'carry' : 'walk', elapsed: b.elapsed };
}

export function grabBall(b: Buddy, x: number, y: number): void {
  if (b.world.ball.state === 'mouth') {
    return;
  }
  b.world.ball.state = 'held';
  moveHeldBall(b, x, y);
  b.tryEnter('watch', Infinity);
}

export function moveHeldBall(b: Buddy, x: number, y: number): void {
  if (b.world.ball.state === 'held') {
    b.world.ball.place(x - BALL_SIZE / 2, y - BALL_SIZE / 2, b.world.width, b.world.height);
  }
}

export function throwBall(b: Buddy, vx: number, vy: number, playerX: number | undefined): void {
  if (b.world.ball.state !== 'held') {
    return;
  }
  b.world.ball.launch(vx, vy);
  b.fetch.playerX = playerX;
  b.rest.breakAsks = 0;
  b.tryEnter('fetch', FETCH_MAX_MS);
}

export function spawnBall(b: Buddy, x: number, y: number, vx: number): void {
  if (b.world.ball.state === 'mouth' || b.world.ball.state === 'held') {
    return;
  }
  b.world.ball.place(x - BALL_SIZE / 2, y, b.world.width, b.world.height);
  b.world.ball.launch(vx, 0);
  b.fetch.playerX = undefined;
  b.tryEnter('fetch', FETCH_MAX_MS);
}

function updateFetch(b: Buddy, dt: number): void {
  b.moving = false;
  if (b.fetch.airTotalMs > 0) {
    updateCatchLeap(b, dt);
    return;
  }
  b.fall(dt);
  if (b.world.ball.state !== 'free') {
    b.enterNext('sit');
    return;
  }
  if (tryCatch(b)) {
    b.enter('bring', BRING_MAX_MS);
    return;
  }
  const plan = planIntercept(b);
  if (!plan) {
    b.running = true;
    b.moving = b.approach(b.noseTargetFor(b.world.ball.center), FETCH_RUN_SPEED * dt);
    return;
  }
  b.dir = plan.dir;
  if (plan.lift > STAND_LIFT && plan.t - riseTime(plan.lift) <= dt) {
    b.fetch.leapFrom = b.x;
    b.fetch.leapTo = plan.x;
    b.fetch.leapHeight = plan.lift;
    b.fetch.airMs = 0;
    b.fetch.airTotalMs = 2000 * riseTime(plan.lift);
    return;
  }
  b.running = Math.abs(plan.x - b.x) > FETCH_FAR || !b.world.ball.resting;
  const speed = b.running ? FETCH_RUN_SPEED : FETCH_WALK_SPEED;
  b.moving = b.approach(plan.x, speed * dt);
}

function updateCatchLeap(b: Buddy, dt: number): void {
  b.fetch.airMs += dt * 1000;
  const p = Math.min(b.fetch.airMs / b.fetch.airTotalMs, 1);
  b.x = b.fetch.leapFrom + (b.fetch.leapTo - b.fetch.leapFrom) * Math.min(1, 2 * p);
  b.y = 4 * b.fetch.leapHeight * p * (1 - p);
  if (b.world.ball.state === 'free') {
    tryCatch(b);
  }
  if (p < 1) {
    return;
  }
  b.y = 0;
  b.fetch.airTotalMs = 0;
  if (b.world.ball.state === 'mouth') {
    b.enter('bring', BRING_MAX_MS);
  }
}

function tryCatch(b: Buddy): boolean {
  const ball = b.world.ball;
  const mouthGap = Math.hypot(
    ball.center - (b.x + b.mouthOffset()),
    ball.y + BALL_SIZE / 2 - (b.y + MOUTH_HEIGHT),
  );
  const atNose = b.y === 0 && ball.y < 1 && Math.abs(ball.center - (b.x + b.noseOffset())) <= NOSE_REACH;
  if (mouthGap > CATCH_RADIUS && !atNose) {
    return false;
  }
  ball.state = 'mouth';
  ball.vx = 0;
  ball.vy = 0;
  b.fetch.playerX ??= b.world.pointer?.x ?? b.world.width / 2;
  return true;
}

// Earliest point on the ball's predicted path the buddy can reach in time, by nose on the ground or mouth in the air.
function planIntercept(b: Buddy): Intercept | undefined {
  const sim = Object.assign(new Ball(), b.world.ball);
  const body = b.x + SPRITE_SIZE / 2;
  const maxLift = Math.min(CATCH_LEAP_MAX, b.maxY);
  for (let t = 0; t <= PREDICT_S; t += PREDICT_STEP) {
    const cx = sim.center;
    const lift = sim.y + BALL_SIZE / 2 - MOUTH_HEIGHT;
    const grounded = sim.y < 1;
    if (grounded || (lift >= -CATCH_RADIUS && lift <= maxLift)) {
      const dir = cx > body + 2 ? 1 : cx < body - 2 ? -1 : b.dir;
      const offset = grounded ? b.noseOffset(dir) : b.mouthOffset(dir);
      const x = clamp(cx - offset, 0, b.maxX);
      const inTime = grounded || lift <= STAND_LIFT || t >= riseTime(lift) - PREDICT_STEP;
      const reachable =
        Math.abs(x + offset - cx) <= CATCH_RADIUS && Math.abs(x - b.x) <= FETCH_RUN_SPEED * t + 1;
      if (inTime && reachable) {
        return { x, dir, t, lift: grounded ? 0 : lift };
      }
    }
    sim.update(PREDICT_STEP, b.world.width, b.world.height);
  }
  return undefined;
}

function updateBring(b: Buddy, dt: number): void {
  const playerX = b.fetch.playerX ?? b.world.width / 2;
  if (!b.approach(b.noseTargetFor(playerX), BRING_SPEED * dt)) {
    if (b.rest.askingBreak) {
      b.rest.askingBreak = false;
      dropBall(b);
      b.world.ball.vx = 0;
      b.enter('askBreak', ASK_BREAK_MS);
    } else {
      showOff(b);
    }
  }
}

// A rolling ball bounces off the body unless the buddy is the one playing with it.
function bumpBall(b: Buddy): void {
  const ball = b.world.ball;
  if (ball.state !== 'free' || b.def.ballFocus || !b.visible) {
    return;
  }
  const left = b.x + BODY_LEFT;
  const right = b.x + BODY_RIGHT;
  const overlapping = ball.x + BALL_SIZE > left && ball.x < right && ball.y < BODY_HEIGHT + b.y;
  if (!overlapping) {
    return;
  }
  const fromLeft = ball.center < (left + right) / 2;
  if ((fromLeft && ball.vx > 0) || (!fromLeft && ball.vx < 0)) {
    ball.vx = -ball.vx * BUMP_DAMPING;
    ball.x = fromLeft ? left - BALL_SIZE : right;
    ball.place(ball.x, ball.y, b.world.width, b.world.height);
  }
}

export function dropBall(b: Buddy): void {
  const nose = b.x + b.noseOffset();
  b.world.ball.place(nose - BALL_SIZE / 2, 4, b.world.width, b.world.height);
  b.world.ball.launch(b.dir * 10, 0);
}

// Fetch: it watches the ball in your hand, runs after it, catches it and brings it back.
export const fetchFeature = {
  states: {
    watch: {
      priority: 2,
      facesTarget: true,
      ballFocus: true,
      anim: (b) => ({ anim: 'ready', elapsed: b.elapsed }),
    },
    fetch: {
      priority: 2,
      ballFocus: true,
      update: updateFetch,
      anim(b) {
        const ball = b.world.ball;
        if (b.fetch.airTotalMs > 0) {
          return { anim: ball.state === 'mouth' ? 'snatch' : 'leap', elapsed: b.fetch.airMs };
        }
        if (!b.moving) {
          return { anim: ball.y > 0 ? 'idle' : 'watch', elapsed: b.elapsed };
        }
        return { anim: b.running ? 'run' : 'walk', elapsed: b.elapsed };
      },
    },
    bring: {
      priority: 2,
      update: updateBring,
      anim: carrying,
      finish(b) {
        dropBall(b);
        b.enter('await', AWAIT_MS);
      },
    },
    await: {
      priority: 2,
      restful: true,
      facesTarget: true,
      next: [['play', 40], ['lie', 30], ['sit', 30]],
      anim: (b) => ({ anim: 'watch', elapsed: b.elapsed }),
    },
  },
  tick: bumpBall,
  entered(b) {
    b.fetch.airTotalMs = 0;
  },
  interrupted(b) {
    if (b.world.ball.state === 'mouth') {
      dropBall(b);
    }
  },
} satisfies Feature;
