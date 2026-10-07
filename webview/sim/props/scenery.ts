import type { Vista } from '../../../shared/day';
import { clamp } from '../math';

const APPEAR_MS = 5000;
const FADE_MS = 6000;

/**
 * What the fox contemplates: a whole sky painted behind it for a while. The simulation only says which one,
 * since when, and when its great moment comes; how it looks is up to the view. Once out, a sky lives its own
 * life to the end, whether the fox goes on watching it or is drawn away to play.
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
  /** Where the fox sat down to watch it, the side it looks to, and whether it is still sitting there. */
  x = 0;
  dir: 1 | -1 = 1;
  watched = false;
  private momentAtMs = 0;
  private fadeAtMs = 0;

  get active(): boolean {
    return this.vista !== undefined;
  }

  /** Brings `vista` out: its great moment comes `momentAtMs` from now, and it starts to go at `fadeAtMs`. */
  appear(vista: Vista, x: number, dir: 1 | -1, momentAtMs: number, fadeAtMs: number): void {
    this.vista = vista;
    this.glow = 0;
    this.ageMs = 0;
    this.momentMs = undefined;
    this.x = x;
    this.dir = dir;
    this.watched = true;
    this.momentAtMs = momentAtMs;
    this.fadeAtMs = fadeAtMs;
  }

  update(dtMs: number): void {
    if (this.vista === undefined) {
      return;
    }
    this.ageMs += dtMs;
    if (this.ageMs >= this.momentAtMs) {
      this.momentMs = this.ageMs - this.momentAtMs;
    }
    const out = this.ageMs < this.fadeAtMs;
    this.glow = clamp(this.glow + (out ? dtMs / APPEAR_MS : -dtMs / FADE_MS), 0, 1);
    if (!out && this.glow === 0) {
      this.vista = undefined;
      this.momentMs = undefined;
      this.watched = false;
    }
  }
}
