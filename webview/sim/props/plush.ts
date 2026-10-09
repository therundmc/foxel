import { PLUSH, type PlushKind } from '../../sprites/props';
import { clamp, type Box } from '../math';

const GRAVITY = 150;
/** How much of its speed it keeps when it hits the ground, a wall or the top of the view. */
const BOUNCE = 0.45;
const WALL_BOUNCE = 0.6;
/** Slower than this when it comes down, it stays down. */
const REST_VY = 20;
/** How much of its sideways speed is left after each bounce, and after a second of sliding on the ground. */
const SCRUB = 0.6;
const GRIP = 0.02;
/** It tumbles as it flies: quarter turns a second for each pixel a second of sideways speed, and how much of that a bounce leaves. */
const TUMBLE = 0.11;
const TUMBLE_KEPT = 0.45;
/** A rugby ball keeps this much of its bounce as a kick to the side. */
const ODD_BOUNCE = 0.45;
/** A hard landing squashes it for a moment. */
const SQUASH_VY = 35;
const SQUASH_MS = 90;

/**
 * A toy to throw about, soft or not: it is in the chest, in your hand, in the fox's mouth, or out in the view. Thrown, it tumbles through
 * the air, bounces off the ground, the walls and the top of the view, and comes to rest however it lands.
 */
export class Plush {
  state: 'none' | 'held' | 'carried' | 'free' = 'none';
  x = 0;
  y = 0;
  /** For how long it has been lying there. */
  lainMs = 0;
  private vx = 0;
  private vy = 0;
  /** How far it has turned, in quarter turns, and how fast it is turning. */
  private turned = 0;
  private spin = 0;
  private squashMs = 0;
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

  /** How fast it is going, and which way. */
  get velocity(): { x: number; y: number } {
    return { x: this.vx, y: this.vy };
  }

  get speed(): number {
    return Math.hypot(this.vx, this.vy);
  }

  /** Coming down. */
  get falling(): boolean {
    return this.state === 'free' && this.vy < 0;
  }

  /** Lying still on the ground. */
  get landed(): boolean {
    return this.state === 'free' && this.y === 0 && this.vy === 0 && this.vx === 0;
  }

  /** Which way up it is: so many quarter turns clockwise from upright. */
  get quarter(): 0 | 1 | 2 | 3 {
    return (((Math.round(this.turned) % 4) + 4) % 4) as 0 | 1 | 2 | 3;
  }

  /** Flattened for a moment by a hard landing. */
  get squashed(): boolean {
    return this.squashMs > 0;
  }

  /** In your hand, its middle at this point. */
  hold(centerX: number, centerY: number, worldWidth: number, worldHeight: number): void {
    this.upright('held');
    this.x = clamp(centerX - this.w / 2, 0, Math.max(0, worldWidth - this.w));
    this.y = clamp(centerY - this.h / 2, 0, Math.max(0, worldHeight - this.h - 1));
  }

  /** In the fox's mouth, its middle at this point. */
  carry(centerX: number, centerY: number): void {
    this.upright('carried');
    this.x = centerX - this.w / 2;
    this.y = Math.max(0, centerY - this.h / 2);
  }

  /** Lying at `x`, as it was left. */
  rest(x: number, worldWidth: number): void {
    this.upright('free');
    this.x = clamp(x, 0, Math.max(0, worldWidth - this.w));
    this.y = 0;
  }

  /** Let go of, or sent off, at this speed: the harder sideways, the more it tumbles. */
  toss(vx: number, vy: number): void {
    this.state = 'free';
    this.vx = vx;
    this.vy = vy;
    this.spin = vx * TUMBLE;
  }

  update(dt: number, worldWidth: number, worldHeight: number): void {
    this.squashMs = Math.max(0, this.squashMs - dt * 1000);
    this.lainMs = this.landed ? this.lainMs + dt * 1000 : 0;
    if (this.state !== 'free' || this.landed) {
      return;
    }
    const maxX = Math.max(0, worldWidth - this.w);
    const top = Math.max(0, worldHeight - this.h - 1);
    const airborne = this.y > 0 || this.vy !== 0;
    this.x += this.vx * dt;
    if (this.x < 0 || this.x > maxX) {
      this.x = clamp(this.x, 0, maxX);
      this.vx = -this.vx * WALL_BOUNCE;
      this.spin = -this.spin * TUMBLE_KEPT;
    }
    if (!airborne) {
      // Sliding to a stop.
      this.vx = Math.abs(this.vx) < 2 ? 0 : this.vx * Math.pow(GRIP, dt);
      return;
    }
    this.turned += this.spin * dt;
    this.vy -= GRAVITY * dt;
    this.y += this.vy * dt;
    if (this.y > top && this.vy > 0) {
      this.y = top;
      this.vy = -this.vy * BOUNCE;
    }
    if (this.y <= 0) {
      this.y = 0;
      this.squashMs = -this.vy > SQUASH_VY ? SQUASH_MS : this.squashMs;
      this.vy = -this.vy > REST_VY ? -this.vy * BOUNCE : 0;
      this.vx *= SCRUB;
      this.spin *= TUMBLE_KEPT;
      if (this.kind === 'rugby' && this.vy > 0) {
        // Landing on one of its points, it shoots off to the side: which one depends on how it came down.
        this.vx += (this.quarter % 2 === 1 ? 1 : -1) * this.vy * ODD_BOUNCE;
        this.spin = this.vx * TUMBLE;
      }
      if (this.vy === 0) {
        // Down for good: it lies whichever way up it ended.
        this.turned = this.quarter;
        this.spin = 0;
      }
    }
  }

  private upright(state: Plush['state']): void {
    this.state = state;
    this.vx = 0;
    this.vy = 0;
    this.turned = 0;
    this.spin = 0;
  }
}
