import { dayPhase, type DayPhase, type Party } from '../../shared/day';
import { SPRITE_SIZE } from '../sprites/frames';
import type { Buddy } from './buddy';
import { Ball } from './props/ball';
import { Bird } from './props/bird';
import { Bowl } from './props/bowl';
import { Bug } from './props/bug';
import { knockTogether } from './props/bump';
import { Chest } from './props/chest';
import { Grass } from './props/grass';
import { Finds, newDoodle, newMound } from './props/keepsakes';
import { Mouse } from './props/mouse';
import { Plush } from './props/plush';
import { Shelf } from './props/shelf';
import { Basket } from './props/basket';
import { Bubbles } from './props/bubbles';
import { Scenery } from './props/scenery';
import { Treat } from './props/treat';

/** How long its eyes stay on your scrolling after you stop. */
const SCROLL_GLANCE_MS = 450;

export interface WorldPoint {
  x: number;
  y: number;
}

/** One-off things for the view to act on: tell the extension it ate or was played with, throw confetti. */
export type Effect = 'fed' | 'played' | 'confetti' | 'petted' | 'treated' | 'unfed' | 'unheard';

/** What the buddies share: the ground, the toys and bowls on it, the pointer and the time of day. */
export class World {
  width = SPRITE_SIZE;
  height = SPRITE_SIZE;
  readonly buddies: Buddy[] = [];
  readonly ball = new Ball();
  readonly bug = new Bug();
  readonly bird = new Bird();
  readonly grass = new Grass();
  readonly mouse = new Mouse();
  readonly scenery = new Scenery();
  readonly treat = new Treat();
  readonly foodBowl = new Bowl();
  readonly waterBowl = new Bowl();
  readonly basket = new Basket();
  readonly bubbles = new Bubbles();
  readonly chest = new Chest();
  readonly shelf = new Shelf();
  /** What it brought you, the heart it scratched in the earth, the mound where it dug. */
  readonly finds = new Finds();
  readonly doodle = newDoodle();
  readonly mound = newMound();
  /** Its soft toys. */
  readonly plushes = { teddy: new Plush('teddy'), duck: new Plush('duck') };
  /** Which way you are scrolling a file, for a moment after you do: up (-1), down (1), or not (0). */
  scroll: -1 | 0 | 1 = 0;
  private scrollMs = 0;
  readonly effects: Effect[] = [];
  /** Where the user's pointer is, while it is around and not busy with the chest. */
  pointer: WorldPoint | undefined;
  party: Party | undefined;
  /** Its mood today, from -1 to 1, and how attached to you it has grown, from 0 to 1: told by the extension. */
  mood = 0;
  attachment = 0;
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
    const plushes = Object.values(this.plushes);
    const critters = this.bug.active || this.bird.active || this.mouse.active || this.grass.active || this.scenery.active;
    return !ballMoving && !treatMoving && !critters && !this.basket.moving && !this.bubbles.active && !this.chest.moving && !this.shelf.moving && !this.finds.moving && !this.doodle.moving && !this.mound.moving && plushes.every((p) => p.state === 'none' || p.landed) && !this.foodBowl.moving && !this.waterBowl.moving && this.buddies.every((b) => b.restful);
  }

  /** You scrolled: it shows for a moment. */
  scrolled(way: -1 | 1): void {
    this.scroll = way;
    this.scrollMs = SCROLL_GLANCE_MS;
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
    this.chest.place(this.width);
    this.shelf.place(this.width, this.height);
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    this.ball.update(dt, this.width, this.height);
    this.bug.update(dt, this.width, this.height, this.random);
    this.bird.update(dt, this.width, this.height);
    this.grass.update(dtMs);
    this.mouse.update(dt, this.width);
    this.scenery.update(dtMs);
    this.scrollMs = Math.max(0, this.scrollMs - dtMs);
    if (this.scrollMs === 0) {
      this.scroll = 0;
    }
    this.basket.update(dt);
    this.bubbles.update(dt, this.width, this.height, this.random);
    this.treat.update(dt, this.width);
    this.foodBowl.update(dtMs);
    this.waterBowl.update(dtMs);
    // A toy that is out in the view is not in the chest.
    const { teddy, duck } = this.plushes;
    teddy.update(dt, this.width, this.height);
    duck.update(dt, this.width, this.height);
    knockTogether([teddy, duck], this.ball);
    this.chest.update(dtMs, { ball: this.ball.state === 'none', treat: !this.treat.active, teddy: teddy.state === 'none', duck: duck.state === 'none' });
    this.shelf.update(dtMs, !this.chest.asked);
    this.finds.update(dtMs);
    this.doodle.update(dtMs);
    this.mound.update(dtMs);
    // A pointer busy with the chest or the shelf is not there for the fox: it does not come to it, or ask it for a stroke.
    if (this.chest.asked || this.shelf.asked) {
      this.pointer = undefined;
    }
    this.buddies.forEach((b) => b.update(dtMs));
  }
}
