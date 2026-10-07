import { MOUSE_FRAMES } from '../../sprites/props';
import { clamp, type Box } from '../math';

const RUN_SPEED = 16;
const FLEE_SPEED = 62;
const EDGE_MARGIN = 2;
const SIT_FRAME = 2;

/** A little mouse that scurries in, sits up to sniff the air, and is always quicker than the fox. */
export class Mouse {
  active = false;
  x = 0;
  dir: 1 | -1 = 1;
  private mode: 'run' | 'sit' | 'flee' = 'run';
  private targetX = 0;
  private t = 0;

  /** Index into MOUSE_FRAMES. */
  get frame(): number {
    return this.mode === 'sit' ? SIT_FRAME : Math.floor(this.t * 10) % 2;
  }

  get box(): Box {
    const glyph = MOUSE_FRAMES[this.frame];
    return { x: this.x, y: 0, w: glyph[0].length, h: glyph.length };
  }

  get centerX(): number {
    return this.x + this.box.w / 2;
  }

  get sitting(): boolean {
    return this.active && this.mode === 'sit';
  }

  /** Comes in from an edge and stops at `targetX`, where it sits up. */
  enter(fromLeft: boolean, targetX: number, worldWidth: number): void {
    const w = MOUSE_FRAMES[0][0].length;
    this.active = true;
    this.mode = 'run';
    this.t = 0;
    this.dir = fromLeft ? 1 : -1;
    this.x = fromLeft ? -w : worldWidth;
    this.targetX = clamp(targetX, EDGE_MARGIN, Math.max(EDGE_MARGIN, worldWidth - w - EDGE_MARGIN));
  }

  /** Shows up at `x`, already running away. */
  appear(x: number, dir: 1 | -1): void {
    this.active = true;
    this.x = x;
    this.flee(dir);
  }

  flee(dir: 1 | -1): void {
    if (this.active) {
      this.mode = 'flee';
      this.dir = dir;
    }
  }

  caught(): void {
    this.active = false;
  }

  update(dt: number, worldWidth: number): void {
    if (!this.active) {
      return;
    }
    this.t += dt;
    if (this.mode === 'run') {
      this.x += this.dir * RUN_SPEED * dt;
      if ((this.x - this.targetX) * this.dir >= 0) {
        this.x = this.targetX;
        this.mode = 'sit';
      }
    } else if (this.mode === 'flee') {
      this.x += this.dir * FLEE_SPEED * dt;
      if (this.x < -this.box.w || this.x > worldWidth) {
        this.active = false;
      }
    }
  }
}
