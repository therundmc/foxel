import { CHEST_H, CHEST_OPEN_H, CHEST_RIM, CHEST_W, TILE, type ChestItem } from '../../sprites/props';
import type { Box } from '../math';

/** Everything it may come to hold, as its tiles are laid out above it: from the bottom row up, left to right. */
export const CHEST_ITEMS: readonly ChestItem[] = ['ball', 'duck', 'teddy'];
const COLUMNS = 2;

/** Air left between the chest and the edge of the view, and between two of its tiles. */
const MARGIN = 2;
const GAP = 1;
/** The first row of tiles sits a little over the top of the raised lid, so that two rows fit in a low view. */
const LID_OVERLAP = 2;
/** How far from one of its parts the pointer still counts as on it. */
const REACH = 2;
/** How far from it a hand that holds a toy already has its lid lifting. */
const NEAR = 14;
const OPEN_MS = 220;
/** How long it stays open once the pointer has left: time to come back. */
const LINGER_MS = 350;
/** The lid is thrown back by the time it is this far open; only then do its things start to rise. */
export const LID_BACK = 0.3;
/** How much of it shows at the edge of the view while it waits. */
const PEEK = 6;
/** It comes out for a pointer this close to its corner: a small patch of the view round it. */
const CALL = 10;
/** How long the pointer has to be there before it comes: one that only passes does not call it. */
const DWELL_MS = 250;
/** While it waits it fidgets now and then, to be noticed: this often (and soon after the view opens), for this long. */
const FIDGET_EVERY_MS = 9000;
const FIDGET_SOON_MS = 3000;
const FIDGET_MS = 900;
/** One nudge of its fidgeting: a pixel into the view, its lid ajar, then back. */
const NUDGE_MS = 150;
/** A pointer left lying still this long is no longer asking for anything, unless it lies on the chest. */
const IDLE_MS = 4000;
/** How quickly it slides in and out: the share of the way left that it covers in a second. */
const SLIDE = 10;
const CLOSE_ENOUGH = 0.4;
/** A thing can be taken once the chest is this far open. */
const TAKEABLE = 0.9;

const STEP = TILE + GAP;
const ease = (t: number): number => t * t * (3 - 2 * t);
const toward = (from: number, to: number, step: number): number => (from < to ? Math.min(to, from + step) : Math.max(to, from - step));
const within = (box: Box, x: number, y: number, pad: number): boolean => x >= box.x - pad && x < box.x + box.w + pad && y >= box.y - pad && y < box.y + box.h + pad;

/**
 * The toy chest: everything you can give it is in there. It waits at the edge of the view, only a bit of it showing,
 * and fidgets now and then to be noticed. It slides out into its corner when the pointer comes close, and back when
 * it goes. Bring the pointer to it and its lid opens and what is in it rises out, each thing on its tile. A hand
 * that holds a toy only gets the lid: that is where the toy goes back. It only knows where the pointer is and how far open it is: what taking a
 * thing does, or putting one back, is the business of whoever does it.
 */
export class Chest {
  /** Its left edge; it stands on the ground. */
  x = 0;
  /** Its place in the corner, and where it waits at the edge of the view. */
  corner = 0;
  private away = 0;
  /** While it fidgets: a pixel into the view, its lid ajar. */
  nudge: 0 | 1 = 0;
  private waitedMs = FIDGET_EVERY_MS - FIDGET_SOON_MS;
  /** How much of the way in it is meant to be, from 0 (out of view) to 1 (in its corner). */
  private share = 0;
  /** The pointer is asking for it. */
  asked = false;
  /** How far in the fox has pulled it, while the fox is the one moving it; and whether it holds the lid up. */
  private hauled: number | undefined;
  private lifted = false;
  /** How far its lid is open and its things are out, from 0 to 1. */
  open = 0;
  /** What is in it right now. A toy that is out in the view is not in the chest. */
  readonly holds: Record<ChestItem, boolean> = { ball: true, teddy: true, duck: true };
  /** The toys that have come into its life so far: the others have no place in it yet. */
  items: readonly ChestItem[] = CHEST_ITEMS;
  private pointer: { x: number; y: number } | undefined;
  /** The hand holds a toy. */
  private carrying = false;
  private aroundMs = 0;
  private stillMs = 0;
  private lingerMs = 0;
  /** Something was just put back in it: it stays shut until the pointer has left it. */
  private full = false;

  get box(): Box {
    return { x: this.x, y: 0, w: CHEST_W, h: this.open > 0 ? CHEST_OPEN_H : CHEST_H };
  }

  /** It, its lid or its things are on their way. */
  get moving(): boolean {
    return this.x !== this.target || this.waitedMs >= FIDGET_EVERY_MS || (this.open !== 0 && this.open !== 1) || (this.open > 0 && this.lingerMs < LINGER_MS);
  }

  /** In its corner, ready to be opened. */
  get here(): boolean {
    return this.x === this.corner;
  }

  /** Waiting at the edge of the view, only a bit of it showing. */
  get tucked(): boolean {
    return this.x === this.away;
  }

  /** How its lid shows: shut (0), ajar (1) or thrown back (2). */
  get lid(): 0 | 1 | 2 {
    return this.open >= LID_BACK ? 2 : this.open > 0 || this.nudge === 1 ? 1 : 0;
  }

  place(worldWidth: number): void {
    this.corner = Math.max(0, worldWidth - CHEST_W - MARGIN);
    this.away = Math.max(worldWidth - PEEK, this.corner);
    this.x = this.target;
  }

  /** The fox pulls it this much of the way in (1 is its corner), or pushes it back out. */
  haul(share: number): void {
    this.hauled = share;
  }

  /** The fox lifts its lid with its nose, or lets it drop. */
  lift(up: boolean): void {
    this.lifted = up;
  }

  /** The fox is done with it: it is the pointer's again. */
  letGo(): void {
    this.hauled = undefined;
    this.lifted = false;
  }

  /** Where the pointer is in the view, or undefined when it is not there; `carrying` when the hand holds a toy. */
  point(at: { x: number; y: number } | undefined, carrying = false): void {
    if (at?.x !== this.pointer?.x || at?.y !== this.pointer?.y) {
      this.stillMs = 0;
    }
    this.pointer = at;
    this.carrying = carrying;
  }

  /** Whether a toy held at this point is over the chest, to be put back in it. */
  accepts(x: number, y: number): boolean {
    return this.here && within({ x: this.x, y: 0, w: CHEST_W, h: CHEST_OPEN_H }, x, y, REACH);
  }

  /** A toy was put back in it: the lid shuts on it. */
  stowed(): void {
    this.full = true;
    this.carrying = false;
  }

  /** Where a thing's tile is right now: it rises out of the chest once the lid is back. */
  slot(item: ChestItem): Box {
    const home = this.home(item);
    const risen = ease(Math.max(0, (this.open - LID_BACK) / (1 - LID_BACK)));
    return { ...home, y: CHEST_RIM - TILE + (home.y - CHEST_RIM + TILE) * risen };
  }

  /** The thing that can be taken at this point: risen out, and still in the chest. */
  itemAt(x: number, y: number): ChestItem | undefined {
    if (this.open < TAKEABLE || this.carrying) {
      return undefined;
    }
    return this.items.find((item) => this.holds[item] && within(this.home(item), x, y, GAP / 2));
  }

  /** `holds` says, for the toys that can be out in the view, whether they are in the chest; one that has not come into its life yet is not. */
  update(dtMs: number, holds: Partial<Record<ChestItem, boolean>> = {}): void {
    Object.assign(this.holds, holds);
    CHEST_ITEMS.forEach((item) => (this.holds[item] &&= this.items.includes(item)));
    const over = this.here && this.over();
    const at = this.pointer;
    const near = at !== undefined && (over !== false || within({ x: this.corner, y: 0, w: CHEST_W, h: CHEST_OPEN_H }, at.x, at.y, CALL));
    this.aroundMs = near ? Math.min(DWELL_MS, this.aroundMs + dtMs) : 0;
    this.stillMs += dtMs;
    // It comes for a pointer that is close to its corner and doing something, and never leaves while it is open.
    this.asked = this.aroundMs >= DWELL_MS && (this.stillMs < IDLE_MS || over !== false);
    this.share = this.asked || this.open > 0 ? 1 : (this.hauled ?? 0);
    this.fidget(dtMs);
    const left = this.target - this.x;
    this.x = Math.abs(left) < CLOSE_ENOUGH ? this.x + left : this.x + left * Math.min(1, (SLIDE * dtMs) / 1000);

    this.full &&= over !== false;
    this.lingerMs = over && !this.full ? LINGER_MS : Math.max(0, this.full ? 0 : this.lingerMs - dtMs);
    const wanted = this.lingerMs > 0;
    // A full hand only gets the lid.
    const forPointer = !wanted ? 0 : this.carrying ? LID_BACK : 1;
    const upTo = Math.max(forPointer, this.lifted && this.here ? LID_BACK : 0);
    this.open = toward(this.open, upTo, dtMs / OPEN_MS);
  }

  // Left waiting, it gives a few little nudges now and then: something is in there.
  private fidget(dtMs: number): void {
    this.waitedMs = this.tucked && this.share === 0 ? this.waitedMs + dtMs : 0;
    const since = this.waitedMs - FIDGET_EVERY_MS;
    this.nudge = since >= 0 && Math.floor(since / NUDGE_MS) % 2 === 0 ? 1 : 0;
    if (since >= FIDGET_MS) {
      this.waitedMs = 0;
      this.nudge = 0;
    }
  }

  private get target(): number {
    return this.away + (this.corner - this.away) * this.share;
  }

  /** Whether the pointer is on it, or on what has risen out of it. */
  private over(): boolean {
    const at = this.pointer;
    if (!at) {
      return false;
    }
    if (this.carrying) {
      // A hand bringing a toy is seen coming, so the lid is up by the time it gets there.
      return within(this.box, at.x, at.y, NEAR);
    }
    if (within({ x: this.x, y: 0, w: CHEST_W, h: CHEST_H }, at.x, at.y, REACH)) {
      return true;
    }
    // Open, it is the chest and its tiles above it, all in one piece.
    const rows = Math.ceil(this.items.length / COLUMNS);
    const left = this.home(CHEST_ITEMS[0]).x;
    return this.open > 0 && rows > 0 && within({ x: left, y: 0, w: COLUMNS * STEP - GAP, h: CHEST_OPEN_H - LID_OVERLAP + rows * STEP }, at.x, at.y, REACH);
  }

  /** Where a thing's tile sits once the chest is open, above the raised lid. */
  private home(item: ChestItem): Box {
    const index = Math.max(0, this.items.indexOf(item));
    const left = this.x + (CHEST_W - (COLUMNS * STEP - GAP)) / 2;
    return { x: left + (index % COLUMNS) * STEP, y: CHEST_OPEN_H - LID_OVERLAP + Math.floor(index / COLUMNS) * STEP, w: TILE, h: TILE };
  }
}
