import type { WorldPoint } from './sim/world';

const THROW_SAMPLE_MS = 100;
const THROW_SAMPLES = 20;
const MAX_THROW_SPEED = 180;
const STROKE_WINDOW_MS = 1200;
const STROKE_REVERSALS = 2;

/** Works out how fast the hand was moving when it let go of the ball. */
export class ThrowTracker {
  private samples: (WorldPoint & { t: number })[] = [];

  reset(): void {
    this.samples = [];
  }

  sample(p: WorldPoint, now: number): void {
    this.samples.push({ ...p, t: now });
    if (this.samples.length > THROW_SAMPLES) {
      this.samples.shift();
    }
  }

  /**
   * Velocity to throw with, in world units per second: that of the last moments of the drag, capped,
   * and brought up to `minSpeed`, toward `away` if the hand was still.
   */
  velocity(now: number, minSpeed: number, away: WorldPoint): WorldPoint {
    const recent = this.samples.filter((p) => now - p.t <= THROW_SAMPLE_MS);
    let vx = 0;
    let vy = 0;
    if (recent.length >= 2) {
      const a = recent[0];
      const b = recent[recent.length - 1];
      const dt = (b.t - a.t) / 1000;
      if (dt > 0) {
        vx = (b.x - a.x) / dt;
        vy = (b.y - a.y) / dt;
      }
    }
    const speed = Math.hypot(vx, vy);
    if (speed > MAX_THROW_SPEED) {
      vx *= MAX_THROW_SPEED / speed;
      vy *= MAX_THROW_SPEED / speed;
    } else if (speed < minSpeed) {
      const [dx, dy] = speed > 0 ? [vx, vy] : [away.x, away.y];
      const len = Math.hypot(dx, dy);
      vx = (dx / len) * minSpeed;
      vy = (dy / len) * minSpeed;
    }
    return { x: vx, y: vy };
  }
}

/** Petting = moving the pointer back and forth over the buddy. */
export class StrokeTracker {
  private dir = 0;
  private travel = 0;
  private reversals: number[] = [];

  reset(): void {
    this.dir = 0;
    this.travel = 0;
    this.reversals = [];
  }

  /** Takes one horizontal move of the pointer; true while it keeps going back and forth by at least `minTravel`. */
  move(movementX: number, now: number, minTravel: number): boolean {
    if (movementX === 0) {
      return false;
    }
    const dir = Math.sign(movementX);
    if (dir === this.dir) {
      this.travel += Math.abs(movementX);
    } else {
      if (this.dir !== 0 && this.travel >= minTravel) {
        this.reversals.push(now);
      }
      this.dir = dir;
      this.travel = Math.abs(movementX);
    }
    this.reversals = this.reversals.filter((t) => now - t <= STROKE_WINDOW_MS);
    return this.reversals.length >= STROKE_REVERSALS;
  }
}
