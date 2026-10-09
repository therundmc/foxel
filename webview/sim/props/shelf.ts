import { SHELF_ABOVE, SHELF_H, SHELF_ITEMS, SHELF_W, type ShelfItem } from '../../sprites/props';
import type { Box } from '../math';

/** How much of it shows at the edge of the view while it waits. */
const PEEK = 5;
/** It comes out for a pointer this close to its place. */
const CALL = 8;
/** How long the pointer has to be there before it comes, and how long it may lie still before it goes. */
const DWELL_MS = 250;
const IDLE_MS = 4000;
/** How quickly it slides in and out: the share of the way left that it covers in a second. */
const SLIDE = 10;
const CLOSE_ENOUGH = 0.4;
/** How far from a thing on it the pointer still counts as on it, and how long a thing stays pushed down once taken. */
const REACH = 1;
const PRESS_MS = 160;

const within = (box: Box, x: number, y: number, pad: number): boolean => x >= box.x - pad && x < box.x + box.w + pad && y >= box.y - pad && y < box.y + box.h + pad;

/**
 * The little shelf on the wall, top right: what is not a toy stands on it, its kibble and its soap. Like the chest
 * it waits at the edge of the view, only its end showing, and slides out when the pointer comes close. It only knows
 * where the pointer is: what using a thing does is the business of whoever uses it.
 */
export class Shelf {
  /** Its left end, and how high its board is above the ground. */
  x = 0;
  y = 0;
  /** The pointer is asking for it. */
  asked = false;
  /** The thing just used, pushed down a little for a moment. */
  pressed: ShelfItem | undefined;
  private out = 0;
  private away = 0;
  private pointer: { x: number; y: number } | undefined;
  private aroundMs = 0;
  private stillMs = 0;
  private pressMs = 0;

  /** Out at its place, its things within reach. */
  get here(): boolean {
    return this.x === this.out;
  }

  get moving(): boolean {
    return this.x !== (this.asked ? this.out : this.away) || this.pressed !== undefined;
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
    return this.here ? (Object.keys(SHELF_ITEMS) as ShelfItem[]).find((item) => within(this.slot(item), x, y, REACH)) : undefined;
  }

  /** A thing on it was used: it dips for a moment. */
  press(item: ShelfItem): void {
    this.pressed = item;
    this.pressMs = PRESS_MS;
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
    const left = (this.asked ? this.out : this.away) - this.x;
    this.x = Math.abs(left) < CLOSE_ENOUGH ? this.x + left : this.x + left * Math.min(1, (SLIDE * dtMs) / 1000);
    this.pressMs = Math.max(0, this.pressMs - dtMs);
    if (this.pressMs === 0) {
      this.pressed = undefined;
    }
  }
}
