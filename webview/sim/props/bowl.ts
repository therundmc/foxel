import { BOWL_H, BOWL_W } from '../../sprites/props';
import { clamp, type Box } from '../math';

/** It is set down from above, and taken back the same way: how fast it falls, how much it bounces, how it is lifted. */
const GRAVITY = 420;
const BOUNCE = 0.28;
const SETTLED_SPEED = 26;
const LIFT = 520;

/** A food or water bowl that is only there when the fox needs it: you set it down, and take it back once it is done. */
export class Bowl {
  x = 0;
  /** How high above the ground it is, while it is being set down or taken away. */
  y = 0;
  /** Kibble or sips left. */
  amount = 0;
  private out = false;
  private leaving = false;
  private vy = 0;
  private top = 0;
  private vanishMs = 0;

  /** There for the fox to use: not one that is being taken away. */
  get active(): boolean {
    return this.out && !this.leaving;
  }

  /** To be drawn: there, or on its way out. */
  get visible(): boolean {
    return this.out;
  }

  get moving(): boolean {
    return this.out && (this.leaving || this.y > 0 || this.vy !== 0);
  }

  get box(): Box {
    return { x: this.x, y: this.y, w: BOWL_W, h: BOWL_H };
  }

  get centerX(): number {
    return this.x + BOWL_W / 2;
  }

  get empty(): boolean {
    return this.active && this.amount === 0;
  }

  /** Sets it down around `centerX`, from the top of a world this wide and high. */
  show(centerX: number, worldWidth: number, worldHeight: number): void {
    this.out = true;
    this.leaving = false;
    this.amount = 0;
    this.vanishMs = 0;
    this.x = clamp(centerX - BOWL_W / 2, 0, Math.max(0, worldWidth - BOWL_W));
    this.top = worldHeight;
    this.y = worldHeight;
    this.vy = 0;
  }

  fill(amount: number): void {
    this.amount = amount;
    this.vanishMs = 0;
  }

  /** Lets it linger a moment once emptied, then takes it away. */
  finish(afterMs: number): void {
    this.vanishMs = afterMs;
  }

  /** Takes it away now. */
  hide(): void {
    this.leaving = this.out;
    this.vanishMs = 0;
    this.vy = 0;
  }

  update(dtMs: number): void {
    if (!this.out) {
      return;
    }
    const dt = dtMs / 1000;
    if (this.leaving) {
      this.vy += LIFT * dt;
      this.y += this.vy * dt;
      this.out = this.y < this.top;
      this.leaving = this.out;
      return;
    }
    if (this.y > 0 || this.vy !== 0) {
      this.vy -= GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        // One small bounce as it touches down, then it stays.
        this.y = 0;
        this.vy = -this.vy * BOUNCE;
        if (this.vy < SETTLED_SPEED) {
          this.vy = 0;
        }
      }
    }
    if (this.vanishMs > 0) {
      this.vanishMs -= dtMs;
      if (this.vanishMs <= 0) {
        this.hide();
      }
    }
  }
}
