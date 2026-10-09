import { SHELF_ABOVE, SHELF_H, SHELF_ITEMS, SHELF_W, type ShelfItem } from '../../sprites/props';
import type { Box } from '../math';

/** How much of it shows at the edge of the view while it waits. */
const PEEK = 5;
/** It comes out for a pointer this close to its place. */
const CALL = 8;
/** How long the pointer has to be there before it comes, and how long it may lie still before it goes. */
const DWELL_MS = 250;
const IDLE_MS = 4000;
/** It slides at a steady pace and stops short: that is what sets the things on it swaying. */
const SPEED = 90;
/**
 * How each thing on it answers a jolt: how far it is thrown for the speed gained or lost, how fast it swings back
 * (radians a second) and how soon it settles. The bag is heavy and squat, the bottle tall and light.
 */
const SWAY: Record<ShelfItem, { thrown: number; swing: number; settles: number }> = {
  meal: { thrown: 0.3, swing: 26, settles: 8 },
  treat: { thrown: 0.22, swing: 30, settles: 10 },
  bubbles: { thrown: 0.36, swing: 20, settles: 3.2 },
};
/** A thing used is knocked a little, too. */
const KNOCK = 34;
/** Under this it has stopped swaying. */
const STILL = 0.06;
/** How far from a thing on it the pointer still counts as on it, and how long a thing stays pushed down once taken. */
const REACH = 1;
const PRESS_MS = 160;

const within = (box: Box, x: number, y: number, pad: number): boolean => x >= box.x - pad && x < box.x + box.w + pad && y >= box.y - pad && y < box.y + box.h + pad;

/**
 * The little shelf on the wall, top right: what is not a toy stands on it, its kibble, its cookies and its soap. Like the chest
 * it waits at the edge of the view, only its end showing, and slides out when the pointer comes close. It only knows
 * where the pointer is: what using a thing does is the business of whoever uses it.
 */
export class Shelf {
  /** Its left end, and how high its board is above the ground. */
  x = 0;
  y = 0;
  /** The pointer is asking for it. */
  asked = false;
  /** What stands on it: the things that have come into its life so far. */
  items: readonly ShelfItem[] = Object.keys(SHELF_ITEMS) as ShelfItem[];
  /** The thing just used, pushed down a little for a moment. */
  pressed: ShelfItem | undefined;
  private out = 0;
  private away = 0;
  private pointer: { x: number; y: number } | undefined;
  private aroundMs = 0;
  private stillMs = 0;
  private pressMs = 0;
  private speed = 0;
  /** How far the top of each thing leans (in sprite pixels, to the right when positive), and how fast that is changing. */
  private readonly lean: Record<ShelfItem, { at: number; speed: number }> = { meal: { at: 0, speed: 0 }, treat: { at: 0, speed: 0 }, bubbles: { at: 0, speed: 0 } };

  /** Out at its place, its things within reach. */
  get here(): boolean {
    return this.x === this.out;
  }

  get moving(): boolean {
    return this.x !== (this.asked ? this.out : this.away) || this.pressed !== undefined || Object.values(this.lean).some((lean) => lean.at !== 0 || lean.speed !== 0);
  }

  place(worldWidth: number, worldHeight: number): void {
    this.out = Math.max(0, worldWidth - SHELF_W);
    this.away = Math.max(worldWidth - PEEK, this.out);
    this.y = Math.max(0, worldHeight - SHELF_ABOVE - 2);
    this.x = this.asked ? this.out : this.away;
  }

  /** Where the pointer is in the view, or undefined when it is not there or holds something. */
  point(at: { x: number; y: number } | undefined): void {
    if (at?.x !== this.pointer?.x || at?.y !== this.pointer?.y) {
      this.stillMs = 0;
    }
    this.pointer = at;
  }

  /** Where a thing on it stands right now. */
  slot(item: ShelfItem): Box {
    const { glyph, x } = SHELF_ITEMS[item];
    return { x: this.x + x, y: this.y - (this.pressed === item ? 1 : 0), w: glyph[0].length, h: glyph.length };
  }

  /** The thing on it at this point, once it is out. */
  itemAt(x: number, y: number): ShelfItem | undefined {
    return this.here ? this.items.find((item) => within(this.slot(item), x, y, REACH)) : undefined;
  }

  /** By how many pixels the top of a thing leans right now: thrown back as the shelf sets off, forward as it stops, then swaying to rest. */
  sway(item: ShelfItem): -1 | 0 | 1 {
    const at = this.lean[item].at;
    return at >= 0.5 ? 1 : at <= -0.5 ? -1 : 0;
  }

  /** A thing on it was used: it dips for a moment, and wobbles. */
  press(item: ShelfItem): void {
    this.pressed = item;
    this.pressMs = PRESS_MS;
    this.lean[item].speed += KNOCK;
  }

  /** `free` is false while the pointer is busy with something else that comes out of the wall. */
  update(dtMs: number, free = true): void {
    const at = this.pointer;
    const whole = { x: this.out, y: this.y - SHELF_H, w: SHELF_W, h: SHELF_H + SHELF_ABOVE };
    const near = free && at !== undefined && within(whole, at.x, at.y, CALL);
    this.aroundMs = near ? Math.min(DWELL_MS, this.aroundMs + dtMs) : 0;
    this.stillMs += dtMs;
    const on = near && at !== undefined && within(whole, at.x, at.y, REACH);
    this.asked = this.aroundMs >= DWELL_MS && (this.stillMs < IDLE_MS || on);
    const dt = dtMs / 1000;
    const target = this.asked ? this.out : this.away;
    const left = target - this.x;
    const moved = Math.sign(left) * Math.min(Math.abs(left), SPEED * dt);
    this.x = Math.abs(left) <= SPEED * dt ? target : this.x + moved;
    this.swing(dt, dt > 0 ? moved / dt : 0);
    this.pressMs = Math.max(0, this.pressMs - dtMs);
    if (this.pressMs === 0) {
      this.pressed = undefined;
    }
  }

  // Each thing is a weight on a spring: a change in the shelf's speed throws it the other way, and it swings back to rest.
  private swing(dt: number, speed: number): void {
    const jolt = speed - this.speed;
    this.speed = speed;
    for (const item of Object.keys(SWAY) as ShelfItem[]) {
      const { thrown, swing, settles } = SWAY[item];
      const lean = this.lean[item];
      lean.speed -= jolt * thrown;
      lean.speed += (-swing * swing * lean.at - 2 * settles * lean.speed) * dt;
      lean.at += lean.speed * dt;
      if (Math.abs(lean.at) < STILL && Math.abs(lean.speed) < STILL * swing) {
        lean.at = 0;
        lean.speed = 0;
      }
    }
  }
}
