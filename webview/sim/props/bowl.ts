import { BOWL_W } from '../../sprites/props';
import { clamp } from '../math';

/** A food or water bowl that only shows up when the fox needs it. */
export class Bowl {
  active = false;
  x = 0;
  /** Kibble or sips left. */
  amount = 0;
  private vanishMs = 0;

  get centerX(): number {
    return this.x + BOWL_W / 2;
  }

  get empty(): boolean {
    return this.active && this.amount === 0;
  }

  show(centerX: number, worldWidth: number): void {
    this.active = true;
    this.amount = 0;
    this.vanishMs = 0;
    this.x = clamp(centerX - BOWL_W / 2, 0, Math.max(0, worldWidth - BOWL_W));
  }

  fill(amount: number): void {
    this.amount = amount;
    this.vanishMs = 0;
  }

  /** Lets it linger a moment once emptied, then disappear. */
  finish(afterMs: number): void {
    this.vanishMs = afterMs;
  }

  update(dtMs: number): void {
    if (this.active && this.vanishMs > 0) {
      this.vanishMs -= dtMs;
      if (this.vanishMs <= 0) {
        this.active = false;
      }
    }
  }

  hide(): void {
    this.active = false;
    this.vanishMs = 0;
  }
}
