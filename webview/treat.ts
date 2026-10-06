import { clamp } from './ball';
import { TREAT_H, TREAT_W } from './sprites';

const GRAVITY = 140;
const BOUNCE = 0.3;
const REST_VY = 20;

// World units are sprite pixels; y is the height of the treat bottom above the ground.
export class Treat {
  active = false;
  x = 0;
  y = 0;
  vy = 0;

  get centerX(): number {
    return this.x + TREAT_W / 2;
  }

  get landed(): boolean {
    return this.active && this.y === 0 && this.vy === 0;
  }

  drop(centerX: number, worldWidth: number, worldHeight: number): void {
    this.active = true;
    this.x = clamp(centerX - TREAT_W / 2, 0, Math.max(0, worldWidth - TREAT_W));
    this.y = Math.max(0, worldHeight - TREAT_H - 1);
    this.vy = 0;
  }

  update(dt: number, worldWidth: number): void {
    if (!this.active) {
      return;
    }
    this.x = clamp(this.x, 0, Math.max(0, worldWidth - TREAT_W));
    if (this.landed) {
      return;
    }
    this.vy -= GRAVITY * dt;
    this.y += this.vy * dt;
    if (this.y <= 0) {
      this.y = 0;
      this.vy = Math.abs(this.vy) > REST_VY ? -this.vy * BOUNCE : 0;
    }
  }

  eat(): void {
    this.active = false;
  }
}
