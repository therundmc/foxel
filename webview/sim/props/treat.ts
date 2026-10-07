import { TREAT_H, TREAT_W } from '../../sprites/props';
import { clamp, type Box } from '../math';

const GRAVITY = 140;
const BOUNCE = 0.3;
const REST_VY = 20;

export type TreatState = 'none' | 'held' | 'free' | 'eating';

// World units are sprite pixels; y is the height of the treat bottom above the ground.
export class Treat {
  state: TreatState = 'none';
  x = 0;
  y = 0;
  vy = 0;
  /** How much is already eaten, as an index into TREAT_STAGES. */
  stage = 0;
  /** Side the bitten end points to, so a half-eaten treat looks the same once dropped. */
  facing: 1 | -1 = 1;

  get box(): Box {
    return { x: this.x, y: this.y, w: TREAT_W, h: TREAT_H };
  }

  get active(): boolean {
    return this.state !== 'none';
  }

  get centerX(): number {
    return this.x + TREAT_W / 2;
  }

  get centerY(): number {
    return this.y + TREAT_H / 2;
  }

  get landed(): boolean {
    return this.state === 'free' && this.y === 0 && this.vy === 0;
  }

  drop(centerX: number, worldWidth: number, worldHeight: number): void {
    this.state = 'free';
    this.stage = 0;
    this.facing = 1;
    this.place(centerX, worldHeight, worldWidth, worldHeight);
    this.vy = 0;
  }

  hold(centerX: number, centerY: number, worldWidth: number, worldHeight: number): void {
    this.state = 'held';
    this.place(centerX, centerY, worldWidth, worldHeight);
  }

  place(centerX: number, centerY: number, worldWidth: number, worldHeight: number): void {
    this.x = clamp(centerX - TREAT_W / 2, 0, Math.max(0, worldWidth - TREAT_W));
    this.y = clamp(centerY - TREAT_H / 2, 0, Math.max(0, worldHeight - TREAT_H - 1));
  }

  release(): void {
    if (this.state === 'held') {
      this.state = 'free';
      this.vy = 0;
    }
  }

  update(dt: number, worldWidth: number): void {
    if (this.state !== 'free') {
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
}
