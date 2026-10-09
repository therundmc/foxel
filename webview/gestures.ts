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

/** A sign made with the pointer, no button pressed: a circle, a wave from side to side, a nod up and down. */
export type Sign = 'circle' | 'wave' | 'nod';

const SIGN_WINDOW_MS = 1600;
/** A stroke of a wave or a nod is at least this long, in world units, and there are this many of them. */
const SIGN_STROKE = 9;
const SIGN_STROKES = 4;
/** A circle goes round by at least this much of a full turn, over at least this much path, without turning back. */
const CIRCLE_TURN = 0.92 * 2 * Math.PI;
const CIRCLE_PATH = 45;
const CIRCLE_BACK = 0.6;
/** Moves shorter than this are the hand shaking, not a direction. */
const SIGN_STEP = 1.5;

/** Reads signs in the way the pointer moves. Feed it every move; it answers with the sign once one is complete. */
export class SignTracker {
  private last: (WorldPoint & { t: number }) | undefined;
  private steps: { dx: number; dy: number; t: number }[] = [];

  reset(): void {
    this.last = undefined;
    this.steps = [];
  }

  move(p: WorldPoint, now: number): Sign | undefined {
    const last = this.last;
    if (!last) {
      this.last = { ...p, t: now };
      return undefined;
    }
    const dx = p.x - last.x;
    const dy = p.y - last.y;
    if (Math.hypot(dx, dy) < SIGN_STEP) {
      return undefined;
    }
    this.last = { ...p, t: now };
    this.steps.push({ dx, dy, t: now });
    this.steps = this.steps.filter((step) => now - step.t <= SIGN_WINDOW_MS);
    const sign = this.circle() ?? this.strokes('dx', 'dy', 'wave') ?? this.strokes('dy', 'dx', 'nod');
    if (sign) {
      this.reset();
    }
    return sign;
  }

  // Going round: every step turns the same way, and the turns add up to a whole one.
  private circle(): Sign | undefined {
    let turned = 0;
    let back = 0;
    let path = 0;
    for (let i = 1; i < this.steps.length; i++) {
      const a = this.steps[i - 1];
      const b = this.steps[i];
      const turn = Math.atan2(a.dx * b.dy - a.dy * b.dx, a.dx * b.dx + a.dy * b.dy);
      turned += turn;
      back = Math.sign(turn) === Math.sign(turned) ? back : back + Math.abs(turn);
      path += Math.hypot(b.dx, b.dy);
    }
    return Math.abs(turned) >= CIRCLE_TURN && path >= CIRCLE_PATH && back <= CIRCLE_BACK ? 'circle' : undefined;
  }

  // Back and forth along one axis, hardly moving along the other.
  private strokes(along: 'dx' | 'dy', across: 'dx' | 'dy', sign: Sign): Sign | undefined {
    let strokes = 0;
    let run = 0;
    let drift = 0;
    let travelled = 0;
    for (const step of this.steps) {
      if (run !== 0 && Math.sign(step[along]) === -Math.sign(run)) {
        strokes += Math.abs(run) >= SIGN_STROKE ? 1 : 0;
        run = 0;
      }
      run += step[along];
      drift += step[across];
      travelled += Math.abs(step[along]);
    }
    strokes += Math.abs(run) >= SIGN_STROKE ? 1 : 0;
    return strokes >= SIGN_STROKES && Math.abs(drift) < SIGN_STROKE && travelled >= SIGN_STROKES * SIGN_STROKE ? sign : undefined;
  }
}
