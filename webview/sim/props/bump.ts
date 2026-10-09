import { BALL_SIZE } from '../../sprites/props';
import type { Ball } from './ball';
import type { Plush } from './plush';

/** How much of the speed at which two things meet they keep as they part, and how much of it lifts them off the ground. */
const BOUNCE = 0.7;
const LIFT = 0.35;
/** Slower than this, they only lean against each other. */
const GENTLE = 6;

/** Something round enough that flies about the view: where its middle is, how big, how fast, and how to send it off. */
interface Body {
  out: boolean;
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  knock(vx: number, vy: number): void;
}

const ofPlush = (toy: Plush): Body => ({
  out: toy.state === 'free',
  x: toy.center,
  y: toy.y + toy.h / 2,
  radius: Math.min(toy.w, toy.h) / 2,
  vx: toy.velocity.x,
  vy: toy.velocity.y,
  knock: (vx, vy) => toy.toss(vx, vy),
});

const ofBall = (ball: Ball): Body => ({
  out: ball.state === 'free',
  x: ball.center,
  y: ball.y + BALL_SIZE / 2,
  radius: BALL_SIZE / 2,
  vx: ball.vx,
  vy: ball.vy,
  knock: (vx, vy) => ball.launch(vx, vy),
});

// Two of them that meet swap what speed they had toward each other, as two things of the same weight do.
function knock(a: Body, b: Body): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const apart = Math.hypot(dx, dy);
  if (!a.out || !b.out || apart === 0 || apart >= a.radius + b.radius) {
    return;
  }
  const nx = dx / apart;
  const ny = dy / apart;
  const closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
  if (closing < GENTLE) {
    return;
  }
  const push = (closing * (1 + BOUNCE)) / 2;
  a.knock(a.vx - push * nx, a.vy - push * ny + closing * LIFT);
  b.knock(b.vx + push * nx, b.vy + push * ny + closing * LIFT);
}

/** Its toys knock into one another: a soft toy thrown at another, or at the ball, sends it off. */
export function knockTogether(plushes: readonly Plush[], ball: Ball): void {
  plushes.forEach((toy, i) => {
    plushes.slice(i + 1).forEach((other) => knock(ofPlush(toy), ofPlush(other)));
    knock(ofPlush(toy), ofBall(ball));
  });
}
