import { CHEST_H, CHEST_OPEN_H, CHEST_RIM, CHEST_W, TILE, type ChestDrawer, type ChestItem } from '../../sprites/props';
import type { Box } from '../math';

/** Its drawers from the bottom one up, and what each holds, nearest the chest first. */
export const DRAWERS: readonly { drawer: ChestDrawer; items: readonly ChestItem[] }[] = [
  { drawer: 'food', items: ['meal', 'treat'] },
  { drawer: 'play', items: ['ball', 'bubbles'] },
];

/** Air left between the chest and the edge of the view, and between two of its tiles. */
const MARGIN = 2;
const GAP = 1;
/** The first drawer sits a little over the top of the raised lid, so that both drawers fit in a low view. */
const LID_OVERLAP = 2;
/** How far from one of its parts the pointer still counts as on it. */
const REACH = 2;
/** How far from it a hand that holds a toy already has its lid lifting. */
const NEAR = 14;
const OPEN_MS = 220;
const UNFOLD_MS = 130;
/** How long it stays open once the pointer has left: time to come back, or to cross from a drawer to its things. */
const LINGER_MS = 350;
/** The lid is thrown back by the time it is this far open; only then do the drawers start to rise. */
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
/** A thing can be taken once its drawer is this far out. */
const TAKEABLE = 0.9;

const STEP = TILE + GAP;
const ease = (t: number): number => t * t * (3 - 2 * t);
const toward = (from: number, to: number, step: number): number => (from < to ? Math.min(to, from + step) : Math.max(to, from - step));
const within = (box: Box, x: number, y: number, pad: number): boolean => x >= box.x - pad && x < box.x + box.w + pad && y >= box.y - pad && y < box.y + box.h + pad;

/**
 * The toy chest: everything you can give it is in there. It waits at the edge of the view, only a bit of it showing,
 * and fidgets now and then to be noticed. It rolls out into its corner when the pointer comes close, and back when
 * it goes. Bring the pointer to it and its lid opens and its
 * drawers rise out; bring it to a drawer and its things come out in a row. A hand that holds a toy only gets the
 * lid: that is where the toy goes back. It only knows where the pointer is and how far open it is: what taking a
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
  /** How far its lid is open and its drawers are out, from 0 to 1. */
  open = 0;
  /** The drawer whose things are out. */
  drawer: ChestDrawer | undefined;
  /** How far out the things of each drawer are, from 0 to 1. */
  readonly unfolded: Record<ChestDrawer, number> = { food: 0, play: 0 };
  /** What is in it right now. A toy that is out in the view is not in the chest. */
  readonly holds: Record<ChestItem, boolean> = { meal: true, treat: true, ball: true, bubbles: true };
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

  /** Its lid or its drawers are on their way. */
  get moving(): boolean {
    const settled = (v: number): boolean => v === 0 || v === 1;
    return this.x !== this.target || this.waitedMs >= FIDGET_EVERY_MS || !settled(this.open) || !DRAWERS.every(({ drawer }) => settled(this.unfolded[drawer])) || (this.open > 0 && this.lingerMs < LINGER_MS);
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

  /** Where a drawer's tile is right now: it rises out of the chest as the lid opens. */
  tab(drawer: ChestDrawer): Box {
    const home = this.home(drawer);
    const risen = ease(Math.max(0, (this.open - LID_BACK) / (1 - LID_BACK)));
    return { ...home, y: CHEST_RIM - TILE + (home.y - CHEST_RIM + TILE) * risen };
  }

  /** Where a thing's tile is right now: it slides out from behind its drawer. */
  slot(item: ChestItem): Box {
    const { drawer, items } = DRAWERS.find((d) => d.items.includes(item)) ?? DRAWERS[0];
    const tab = this.tab(drawer);
    return { ...tab, x: tab.x - (items.indexOf(item) + 1) * STEP * ease(this.unfolded[drawer]) };
  }

  /** The thing that can be taken at this point: out of its drawer, and still in the chest. */
  itemAt(x: number, y: number): ChestItem | undefined {
    const open = DRAWERS.find((d) => d.drawer === this.drawer);
    if (!open || this.unfolded[open.drawer] < TAKEABLE) {
      return undefined;
    }
    return open.items.find((item) => this.holds[item] && within(this.slot(item), x, y, GAP / 2));
  }

  /** `holds` says, for the toys that can be out in the view, whether they are in the chest. */
  update(dtMs: number, holds: Partial<Record<ChestItem, boolean>> = {}): void {
    Object.assign(this.holds, holds);
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
    if (!wanted || this.carrying) {
      this.drawer = undefined;
    } else if (typeof over === 'string' && this.open === 1) {
      this.drawer = over;
    }
    for (const { drawer } of DRAWERS) {
      this.unfolded[drawer] = toward(this.unfolded[drawer], this.drawer === drawer ? 1 : 0, dtMs / UNFOLD_MS);
    }
    // Its things go back in their drawers before the drawers sink back in the chest.
    const folded = DRAWERS.every(({ drawer }) => this.unfolded[drawer] === 0);
    // A full hand only gets the lid.
    const forPointer = !folded ? 1 : !wanted ? 0 : this.carrying ? LID_BACK : 1;
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

  /** Whether the pointer is on it: the drawer it is on, or true for the chest itself or the things that are out. */
  private over(): ChestDrawer | boolean {
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
    if (this.open === 0) {
      return false;
    }
    for (const { drawer, items } of DRAWERS) {
      const home = this.home(drawer);
      // A drawer takes the whole height down to the one under it, so the pointer never falls between two.
      if (within({ x: home.x - REACH, y: home.y - GAP, w: TILE + 2 * REACH, h: STEP }, at.x, at.y, 0)) {
        return drawer;
      }
      if (this.drawer === drawer && within({ ...home, x: home.x - items.length * STEP, w: items.length * STEP }, at.x, at.y, REACH)) {
        return true;
      }
    }
    // The way up from the chest to its first drawer.
    return within({ x: this.x, y: 0, w: CHEST_W, h: CHEST_OPEN_H }, at.x, at.y, REACH);
  }

  /** Where a drawer's tile sits once the chest is open, above the raised lid. */
  private home(drawer: ChestDrawer): Box {
    const index = DRAWERS.findIndex((d) => d.drawer === drawer);
    return { x: this.x + (CHEST_W - TILE) / 2, y: CHEST_OPEN_H - LID_OVERLAP + index * STEP, w: TILE, h: TILE };
  }
}
