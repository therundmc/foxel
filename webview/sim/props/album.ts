import { ALBUM_CELL, ALBUM_COLUMNS, ALBUM_H, ALBUM_IN, ALBUM_W, FIND_ORDER, type FindKind } from '../../sprites/props';
import type { Box } from '../math';

/** How much of it shows at the edge of the view while it waits: its handle, and a little of its wicker. */
const PEEK = 5;
/** It comes out for a pointer this close to its place, after this long; and goes back for one that lies still this long. */
const CALL = 8;
const DWELL_MS = 250;
const IDLE_MS = 4000;
const SPEED = 90;
/** Something new goes into it: it comes out by itself, the thing flies to its place in this long, and it stays out a while. */
const FLIGHT_MS = 900;
const ARC = 9;
const SHOWN_MS = 2600;

const within = (box: Box, x: number, y: number, pad: number): boolean => x >= box.x - pad && x < box.x + box.w + pad && y >= box.y - pad && y < box.y + box.h + pad;

/** Something kept in it: the picture of a stage of your life together, or a kind of thing it found for you. */
export type Keepsake = { picture: number } | { find: FindKind };

/**
 * The box of keepsakes, top left: a little case lying open, with a photograph for each stage of your life together
 * and one of each kind of thing it has found for you. Like the chest and the shelf it waits at the edge of the view and slides out when
 * the pointer comes close; it also comes out by itself when something new goes into it. It is only there to be
 * looked at.
 */
export class Album {
  x = 0;
  /** The height of its bottom above the ground. */
  y = 0;
  asked = false;
  /** How many pictures are in it, and how many of each kind of find. */
  pictures = 0;
  readonly finds: Partial<Record<FindKind, number>> = {};
  /** What is on its way into it, from where, and for how long it has been flying. */
  flying: { what: Keepsake; fromX: number; fromY: number; ms: number } | undefined;
  private away = 0;
  private pointer: { x: number; y: number } | undefined;
  private aroundMs = 0;
  private stillMs = 0;
  private shownMs = 0;

  get here(): boolean {
    return this.x === 0;
  }

  get moving(): boolean {
    return this.x !== (this.wanted ? 0 : this.away) || this.flying !== undefined;
  }

  private get wanted(): boolean {
    return this.asked || this.shownMs > 0 || this.flying !== undefined;
  }

  place(worldHeight: number): void {
    this.away = -(ALBUM_W - PEEK);
    this.y = Math.max(0, worldHeight - ALBUM_H - 2);
    this.x = this.wanted ? 0 : this.away;
  }

  point(at: { x: number; y: number } | undefined): void {
    if (at?.x !== this.pointer?.x || at?.y !== this.pointer?.y) {
      this.stillMs = 0;
    }
    this.pointer = at;
  }

  /** Where a keepsake has its place in the tray: pictures along the top, finds under them. */
  slot(what: Keepsake): Box {
    const [column, row] = 'picture' in what ? [what.picture, 0] : [FIND_ORDER.indexOf(what.find), 1];
    return { x: this.x + ALBUM_IN + (column % ALBUM_COLUMNS) * (ALBUM_CELL + 1), y: this.y + ALBUM_H - ALBUM_IN - ALBUM_CELL - row * (ALBUM_CELL + 1), w: ALBUM_CELL, h: ALBUM_CELL };
  }

  /** Where the thing on its way in is right now. */
  get flight(): Box | undefined {
    const f = this.flying;
    if (!f) {
      return undefined;
    }
    const to = this.slot(f.what);
    const p = Math.min(1, f.ms / FLIGHT_MS);
    return { ...to, x: f.fromX + (to.x - f.fromX) * p, y: f.fromY + (to.y - f.fromY) * p + Math.sin(Math.PI * p) * ARC };
  }

  /** Something new for it, thrown from this point: it comes out to take it. */
  keep(what: Keepsake, fromX: number, fromY: number): void {
    this.land();
    this.flying = { what, fromX, fromY, ms: 0 };
  }

  /** `free` is false while the pointer is busy with something else that comes out of the wall. */
  update(dtMs: number, free = true): void {
    const at = this.pointer;
    const whole = { x: 0, y: this.y, w: ALBUM_W, h: ALBUM_H };
    const near = free && at !== undefined && within(whole, at.x, at.y, CALL);
    this.aroundMs = near ? Math.min(DWELL_MS, this.aroundMs + dtMs) : 0;
    this.stillMs += dtMs;
    this.asked = this.aroundMs >= DWELL_MS && (this.stillMs < IDLE_MS || (at !== undefined && within(whole, at.x, at.y, 1)));
    this.shownMs = Math.max(0, this.shownMs - dtMs);
    const target = this.wanted ? 0 : this.away;
    const left = target - this.x;
    this.x = Math.abs(left) <= (SPEED * dtMs) / 1000 ? target : this.x + (Math.sign(left) * SPEED * dtMs) / 1000;
    // The thing only sets off once the box is out to take it.
    if (this.flying && this.here) {
      this.flying.ms += dtMs;
      if (this.flying.ms >= FLIGHT_MS) {
        this.land();
        this.shownMs = SHOWN_MS;
      }
    }
  }

  // What was flying is in its place.
  private land(): void {
    const what = this.flying?.what;
    this.flying = undefined;
    if (!what) {
      return;
    }
    if ('picture' in what) {
      this.pictures = Math.max(this.pictures, what.picture + 1);
    } else {
      this.finds[what.find] = (this.finds[what.find] ?? 0) + 1;
    }
  }
}
