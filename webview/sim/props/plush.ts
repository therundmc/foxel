import { PLUSH, type PlushKind } from '../../sprites/props';
import { clamp, type Box } from '../math';

const GRAVITY = 140;
const BOUNCE = 0.35;
const REST_VY = 18;
/** How much of its sideways speed is left after a second on the ground. */
const GRIP = 0.02;

/** A soft toy: it is in the chest, in your hand, or lying where it fell. It only falls, bounces a little and stops. */
export class Plush {
  state: 'none' | 'held' | 'free' = 'none';
  x = 0;
  y = 0;
  private vx = 0;
  private vy = 0;
  readonly w: number;
  readonly h: number;

  constructor(readonly kind: PlushKind) {
    this.w = PLUSH[kind][0].length;
    this.h = PLUSH[kind].length;
  }

  get box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  get center(): number {
    return this.x + this.w / 2;
  }

  /** Lying still on the ground. */
  get landed(): boolean {
    return this.state === 'free' && this.y === 0 && this.vy === 0 && Math.abs(this.vx) < 1;
  }

  /** In your hand, its middle at this point. */
  hold(centerX: number, centerY: number, worldWidth: number, worldHeight: number): void {
    this.state = 'held';
    this.x = clamp(centerX - this.w / 2, 0, Math.max(0, worldWidth - this.w));
    this.y = clamp(centerY - this.h / 2, 0, Math.max(0, worldHeight - this.h - 1));
  }

  /** Let go of, or sent off, at this speed. */
  toss(vx: number, vy: number): void {
    this.state = 'free';
    this.vx = vx;
    this.vy = vy;
  }

  update(dt: number, worldWidth: number): void {
    if (this.state !== 'free' || this.landed) {
      return;
    }
    this.vy -= GRAVITY * dt;
    this.y += this.vy * dt;
    this.x = clamp(this.x + this.vx * dt, 0, Math.max(0, worldWidth - this.w));
    if (this.y <= 0) {
      this.y = 0;
      this.vy = Math.abs(this.vy) > REST_VY ? -this.vy * BOUNCE : 0;
      this.vx = Math.abs(this.vx) < 1 ? 0 : this.vx * Math.pow(GRIP, dt);
    }
  }
}
