import { dayPhase, type DayPhase, type Party } from '../../shared/day';
import { SPRITE_SIZE } from '../sprites/frames';
import type { Buddy } from './buddy';
import { Ball } from './props/ball';
import { Bowl } from './props/bowl';
import { Bug } from './props/bug';
import { Treat } from './props/treat';

export interface WorldPoint {
  x: number;
  y: number;
}

/** One-off things for the view to act on: tell the extension it ate, throw confetti. */
export type Effect = 'fed' | 'confetti';

/** What the buddies share: the ground, the toys and bowls on it, the pointer and the time of day. */
export class World {
  width = SPRITE_SIZE;
  height = SPRITE_SIZE;
  readonly buddies: Buddy[] = [];
  readonly ball = new Ball();
  readonly bug = new Bug();
  readonly treat = new Treat();
  readonly foodBowl = new Bowl();
  readonly waterBowl = new Bowl();
  /** Fox x while it sleeps in its basket at night; undefined when there is no basket out. */
  bed: number | undefined;
  readonly effects: Effect[] = [];
  /** Where the user's pointer is, while it is around. */
  pointer: WorldPoint | undefined;
  party: Party | undefined;
  now = new Date();
  private dayLife = false;

  constructor(readonly random: () => number = Math.random) {}

  /** Time of day they live by, or undefined when day and night are turned off. */
  get phase(): DayPhase | undefined {
    return this.dayLife ? dayPhase(this.now) : undefined;
  }

  /** True when nothing moves fast, so the view can be redrawn less often. */
  get restful(): boolean {
    const ballMoving = this.ball.state === 'held' || (this.ball.state === 'free' && !this.ball.resting);
    const treatMoving = this.treat.state === 'held' || (this.treat.state === 'free' && !this.treat.landed);
    return !ballMoving && !treatMoving && !this.bug.active && this.buddies.every((b) => b.restful);
  }

  setClock(now: Date, dayLife: boolean): void {
    this.now = now;
    this.dayLife = dayLife;
  }

  resize(width: number, height: number): void {
    this.width = Math.max(width, SPRITE_SIZE);
    this.height = Math.max(height, SPRITE_SIZE);
    this.buddies.forEach((b) => b.worldResized());
    this.ball.place(this.ball.x, this.ball.y, this.width, this.height);
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    this.ball.update(dt, this.width, this.height);
    this.bug.update(dt, this.width, this.height, this.random);
    this.treat.update(dt, this.width);
    this.foodBowl.update(dtMs);
    this.waterBowl.update(dtMs);
    this.buddies.forEach((b) => b.update(dtMs));
  }
}
