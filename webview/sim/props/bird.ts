import { BIRD_H, BIRD_W } from '../../sprites/props';
import { clamp, type Box } from '../math';

type BirdState = 'away' | 'crossing' | 'landing' | 'pecking' | 'leaving';

const CROSS_SPEED = 26;
const LAND_S = 2.4;
const PECK_S = 0.42;
const HOP_EVERY_S = 1.9;
const HOP_S = 0.3;
const HOP_REACH = 4;
const HOP_HEIGHT = 2;
const LEAVE_SPEED = 46;
const LEAVE_RISE = 34;
const FLAP_S = 0.14;

/** A little bird: it flies across in the distance, or comes down to peck at the ground for a while. */
export class Bird {
  state: BirdState = 'away';
  x = 0;
  /** Height of its feet above the ground. */
  y = 0;
  dir: 1 | -1 = 1;
  private t = 0;
  private fromX = 0;
  private fromY = 0;
  private toX = 0;
  private stayS = 0;
  private hopFrom = 0;

  get active(): boolean {
    return this.state !== 'away';
  }

  /** On the ground, or about to be: something to creep up on. */
  get around(): boolean {
    return this.state === 'landing' || this.state === 'pecking';
  }

  get box(): Box {
    return { x: this.x, y: this.y, w: BIRD_W, h: BIRD_H };
  }

  get centerX(): number {
    return this.x + BIRD_W / 2;
  }

  get centerY(): number {
    return this.y + BIRD_H / 2;
  }

  /** Which picture of it to show: wings up, wings down, standing, pecking. */
  get frame(): number {
    if (this.state === 'pecking' && this.y === 0) {
      return Math.floor(this.t / PECK_S) % 3 === 1 ? 3 : 2;
    }
    return Math.floor(this.t / FLAP_S) % 2;
  }

  /** Flies straight across at `height`, without stopping. */
  cross(fromLeft: boolean, height: number, worldWidth: number): void {
    this.state = 'crossing';
    this.t = 0;
    this.dir = fromLeft ? 1 : -1;
    this.x = fromLeft ? -BIRD_W : worldWidth;
    this.fromY = height;
    this.y = height;
  }

  /** Glides down from the nearer edge to the ground at `spotX`, and stays there for `stayS` seconds. */
  land(spotX: number, stayS: number, worldWidth: number, worldHeight: number): void {
    const fromLeft = spotX < worldWidth / 2;
    this.state = 'landing';
    this.t = 0;
    this.dir = fromLeft ? 1 : -1;
    this.toX = clamp(spotX - BIRD_W / 2, 2, Math.max(2, worldWidth - BIRD_W - 2));
    this.fromX = fromLeft ? -BIRD_W : worldWidth;
    this.fromY = clamp(worldHeight - BIRD_H - 2, 6, 44);
    this.x = this.fromX;
    this.y = this.fromY;
    this.stayS = stayS;
  }

  /** Something is creeping up on it: it does not leave by itself any more. */
  freeze(): void {
    this.stayS = Infinity;
  }

  /** Takes off, away from what comes from `dir`'s back. */
  flee(dir: number): void {
    if (this.active && this.state !== 'leaving') {
      this.state = 'leaving';
      this.t = 0;
      this.dir = dir < 0 ? -1 : 1;
    }
  }

  /** Nobody catches a bird. */
  caught(): void {
    this.flee(this.dir);
  }

  update(dt: number, worldWidth: number, worldHeight: number): void {
    if (this.state === 'away') {
      return;
    }
    this.t += dt;
    switch (this.state) {
      case 'crossing':
        this.x += this.dir * CROSS_SPEED * dt;
        this.y = this.fromY + Math.sin(this.t * 3);
        break;
      case 'landing': {
        const p = Math.min(1, this.t / LAND_S);
        // Fast at first, then it brakes and drops the last bit.
        const eased = 1 - (1 - p) * (1 - p);
        this.x = this.fromX + (this.toX - this.fromX) * eased;
        this.y = this.fromY * (1 - eased);
        if (p >= 1) {
          this.state = 'pecking';
          this.t = 0;
          this.y = 0;
          this.hopFrom = this.x;
        }
        break;
      }
      case 'pecking': {
        // Now and then a little hop, back and forth around where it landed.
        const cycle = this.t % HOP_EVERY_S;
        const hops = Math.floor(this.t / HOP_EVERY_S);
        const hop = Math.min(1, cycle / HOP_S);
        if (hops > 0) {
          const side = hops % 2 === 1 ? 1 : -1;
          this.dir = side;
          this.x = clamp(this.hopFrom + (hops % 2 === 1 ? hop : 1 - hop) * HOP_REACH, 2, worldWidth - BIRD_W - 2);
          this.y = hop < 1 ? 4 * HOP_HEIGHT * hop * (1 - hop) : 0;
        }
        if (this.t >= this.stayS && this.y === 0) {
          this.flee(this.dir);
        }
        break;
      }
      case 'leaving':
        this.x += this.dir * LEAVE_SPEED * dt;
        this.y += LEAVE_RISE * dt;
        break;
    }
    if (this.x < -BIRD_W - 2 || this.x > worldWidth + 2 || this.y > worldHeight + 2) {
      this.state = 'away';
    }
  }
}
