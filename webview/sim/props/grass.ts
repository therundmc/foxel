import { GRASS_H, GRASS_W } from '../../sprites/props';
import { clamp, type Box } from '../math';

const GROW_MS = 450;
const SWAY_S = 0.45;

/** A tuft of tall grass that comes up for the fox to hide in, then goes back into the ground. */
export class Grass {
  active = false;
  x = 0;
  /** How much of it is out of the ground, from 0 to 1. */
  grown = 0;
  private growing = false;
  private t = 0;

  get centerX(): number {
    return this.x + GRASS_W / 2;
  }

  get box(): Box {
    return { x: this.x, y: 0, w: GRASS_W, h: Math.round(this.grown * GRASS_H) };
  }

  /** Which way it leans right now. */
  get swayed(): boolean {
    return Math.floor(this.t / SWAY_S) % 2 === 1;
  }

  sprout(centerX: number, worldWidth: number): void {
    this.active = true;
    this.growing = true;
    this.grown = 0;
    this.x = clamp(centerX - GRASS_W / 2, 0, Math.max(0, worldWidth - GRASS_W));
  }

  wilt(): void {
    this.growing = false;
  }

  update(dtMs: number): void {
    if (!this.active) {
      return;
    }
    this.t += dtMs / 1000;
    this.grown = clamp(this.grown + ((this.growing ? 1 : -1) * dtMs) / GROW_MS, 0, 1);
    if (!this.growing && this.grown === 0) {
      this.active = false;
    }
  }
}
