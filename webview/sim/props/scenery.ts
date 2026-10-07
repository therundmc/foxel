import type { Vista } from '../../../shared/day';
import { clamp } from '../math';

const APPEAR_MS = 5000;
const FADE_MS = 6000;

/**
 * What the fox contemplates: a whole sky painted behind it for a while. The simulation only says which one,
 * since when, and when its great moment comes; how it looks is up to the view.
 */
export class Scenery {
  /** The sky that is out, or still fading away. */
  vista: Vista | undefined;
  /** How much of it shows through, from 0 to 1. */
  glow = 0;
  /** Time since it began to appear. */
  ageMs = 0;
  /** Time since its great moment began (a shooting star, the sun clearing the hills...), once it has. */
  momentMs: number | undefined;
  /** Where the fox watching it sits, and the side it looks to. */
  x = 0;
  dir: 1 | -1 = 1;
  private out = false;

  get active(): boolean {
    return this.vista !== undefined;
  }

  appear(vista: Vista, x: number, dir: 1 | -1): void {
    this.vista = vista;
    this.out = true;
    this.glow = 0;
    this.ageMs = 0;
    this.momentMs = undefined;
    this.x = x;
    this.dir = dir;
  }

  /** Its great moment starts now. */
  highlight(): void {
    this.momentMs = 0;
  }

  fade(): void {
    this.out = false;
  }

  update(dtMs: number): void {
    if (this.vista === undefined) {
      return;
    }
    this.ageMs += dtMs;
    if (this.momentMs !== undefined) {
      this.momentMs += dtMs;
    }
    this.glow = clamp(this.glow + (this.out ? dtMs / APPEAR_MS : -dtMs / FADE_MS), 0, 1);
    if (!this.out && this.glow === 0) {
      this.vista = undefined;
      this.momentMs = undefined;
    }
  }
}
