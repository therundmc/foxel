import { BALL_SIZE } from '../../sprites/props';
import { clamp, type Box } from '../math';

export const BALL_GRAVITY = 140;
const FRICTION = 30;
const AIR_DRAG = 0.4;
const BOUNCE = 0.6;
const REST_VY = 15;
const RESTING_VX = 12;

export type BallState = 'none' | 'mouth' | 'free' | 'held';

// World units are sprite pixels; y is the height of the ball bottom above the ground.
export class Ball {
  state: BallState = 'none';
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  spin = 0;

  get box(): Box {
    return { x: this.x, y: this.y, w: BALL_SIZE, h: BALL_SIZE };
  }

  get center(): number {
    return this.x + BALL_SIZE / 2;
  }

  get resting(): boolean {
    return this.state === 'free' && this.y < 1 && this.vy === 0 && Math.abs(this.vx) < RESTING_VX;
  }

  place(x: number, y: number, worldWidth: number, worldHeight: number): void {
    this.x = clamp(x, 0, worldWidth - BALL_SIZE);
    this.y = clamp(y, 0, maxHeight(worldHeight));
  }

  launch(vx: number, vy: number): void {
    this.state = 'free';
    this.vx = vx;
    this.vy = vy;
  }

  update(dt: number, worldWidth: number, worldHeight: number): void {
    if (this.state !== 'free') {
      return;
    }
    const maxX = worldWidth - BALL_SIZE;
    this.x += this.vx * dt;
    this.spin += this.vx * dt;
    if (this.x < 0 || this.x > maxX) {
      this.x = clamp(this.x, 0, maxX);
      this.vx = -this.vx * BOUNCE;
    }
    if (this.y > 0 || this.vy !== 0) {
      this.vy -= BALL_GRAVITY * dt;
      this.y += this.vy * dt;
      const top = maxHeight(worldHeight);
      if (this.y > top) {
        this.y = top;
        this.vy = -Math.abs(this.vy) * BOUNCE;
      }
      if (this.y <= 0) {
        this.y = 0;
        this.vy = Math.abs(this.vy) > REST_VY ? -this.vy * BOUNCE : 0;
      }
    }
    if (this.y === 0) {
      const friction = FRICTION * dt;
      this.vx = Math.abs(this.vx) <= friction ? 0 : this.vx - Math.sign(this.vx) * friction;
    } else {
      this.vx *= Math.max(0, 1 - AIR_DRAG * dt);
    }
  }
}

function maxHeight(worldHeight: number): number {
  return Math.max(0, worldHeight - BALL_SIZE - 1);
}
