import { MOON_H, MOON_W } from '../../sprites/props';
import { clamp, type Box } from '../math';

const APPEAR_MS = 9000;
const FADE_MS = 3000;
const SHOOT_MS = 1500;
/** How high the moon hangs when there is room for it. */
const MOON_HEIGHT = 38;
const MOON_MARGIN = 3;

/** A shooting star: where it started, which way it goes and how far along it is, from 0 to 1. */
export interface ShootingStar {
  x: number;
  dir: 1 | -1;
  progress: number;
}

/** The night sky the fox looks up at: it comes out little by little while it gazes, and fades when it stops. */
export class Stars {
  /** How much of the sky is out, from 0 to 1. */
  glow = 0;
  shooting: ShootingStar | undefined;
  private out = false;
  private moonX = 0;
  private moonY = 0;

  get moon(): Box {
    return { x: this.moonX, y: this.moonY, w: MOON_W, h: MOON_H };
  }

  /** Brings the sky out, with the moon above `x`. */
  appear(x: number, worldWidth: number, worldHeight: number): void {
    this.out = true;
    if (this.glow === 0) {
      this.moonX = Math.round(clamp(x - MOON_W / 2, MOON_MARGIN, Math.max(MOON_MARGIN, worldWidth - MOON_W - MOON_MARGIN)));
      this.moonY = Math.round(clamp(worldHeight - MOON_H - MOON_MARGIN, 0, MOON_HEIGHT));
    }
  }

  fade(): void {
    this.out = false;
  }

  shoot(x: number, dir: 1 | -1): void {
    this.shooting = { x, dir, progress: 0 };
  }

  update(dtMs: number): void {
    this.glow = clamp(this.glow + (this.out ? dtMs / APPEAR_MS : -dtMs / FADE_MS), 0, 1);
    if (this.shooting) {
      this.shooting.progress += dtMs / SHOOT_MS;
      if (this.shooting.progress >= 1) {
        this.shooting = undefined;
      }
    }
  }
}
