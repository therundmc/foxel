import { clamp } from './ball';
import { BUG_H, BUG_W } from './sprites';

const MIN_HEIGHT = 14;
const HEIGHT_RANGE = 8;
const FLUTTER_AMPLITUDE = 3;
const FLEE_RISE_SPEED = 25;
const FLEE_SPEED = 30;
const EDGE_MARGIN = 6;

// Butterfly that wanders above the ground; y is the height of its bottom above the ground.
export class Bug {
  active = false;
  x = 0;
  y = 0;
  private baseY = 0;
  private t = 0;
  private vx = 0;
  private fleeing = false;
  private frozen = false;

  get wingsUp(): boolean {
    return Math.floor(this.t * 8) % 2 === 0;
  }

  get centerX(): number {
    return this.x + BUG_W / 2;
  }

  get centerY(): number {
    return this.y + BUG_H / 2;
  }

  spawn(worldWidth: number, worldHeight: number, random: () => number): void {
    const fromLeft = random() < 0.5;
    this.active = true;
    this.fleeing = false;
    this.frozen = false;
    this.t = 0;
    this.x = fromLeft ? -BUG_W : worldWidth;
    this.vx = (fromLeft ? 1 : -1) * (8 + random() * 6);
    this.baseY = clamp(MIN_HEIGHT + random() * HEIGHT_RANGE, 2, worldHeight - BUG_H - 2);
    this.y = this.baseY;
  }

  freeze(): void {
    this.frozen = true;
  }

  flee(dir: number): void {
    if (this.active) {
      this.fleeing = true;
      this.frozen = false;
      this.vx = (dir === 0 ? 1 : Math.sign(dir)) * FLEE_SPEED;
    }
  }

  caught(): void {
    this.active = false;
  }

  update(dt: number, worldWidth: number, worldHeight: number, random: () => number): void {
    if (!this.active) {
      return;
    }
    this.t += dt;
    if (this.fleeing) {
      this.x += this.vx * dt;
      this.y += FLEE_RISE_SPEED * dt;
      if (this.x < -BUG_W - 2 || this.x > worldWidth + 2 || this.y > worldHeight) {
        this.active = false;
      }
      return;
    }
    if (this.frozen) {
      this.y = this.baseY + Math.sin(this.t * 5);
      return;
    }
    if (random() < dt * 0.6) {
      this.vx = (random() < 0.5 ? -1 : 1) * (4 + random() * 8);
    }
    this.x += this.vx * dt;
    if (this.x < EDGE_MARGIN) {
      this.vx = Math.abs(this.vx);
    } else if (this.x > worldWidth - BUG_W - EDGE_MARGIN) {
      this.vx = -Math.abs(this.vx);
    }
    this.y = this.baseY + Math.sin(this.t * 4) * FLUTTER_AMPLITUDE;
  }
}
