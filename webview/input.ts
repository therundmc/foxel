import { SignTracker, StrokeTracker, ThrowTracker } from './gestures';
import { currentFrame } from './render/renderer';
import { pressDebug } from './render/debug';
import { foxShown, type Session } from './session';
import { blowBubbles, popBubbleAt } from './sim/features/bubbles';
import { acceptFind } from './sim/features/gifts';
import { signed } from './sim/features/lessons';
import { spawnBall } from './sim/features/fetch';
import { fillBowl } from './sim/features/meals';
import { callOver } from './sim/features/pointer';
import { asleep } from './sim/features/rest';
import { pet, touch } from './sim/features/touch';
import type { Box } from './sim/math';
import type { WorldPoint } from './sim/world';
import { touchZone, type TouchZone } from './sprites/fox/anchors';
import { SPRITE_SIZE } from './sprites/frames';
import type { ChestItem, ShelfItem } from './sprites/props';
import { inside, type Stage } from './stage';
import { draggables, type Draggable } from './toys';

const POINTER_IDLE_MS = 4000;
const STROKE_MIN_TRAVEL = 3;
const EXIT_THROW_SPEED = 90;
const CLICK_SLOP = 2;

/** Turns what the mouse does on the canvas into what happens to the buddy and its toys. */
export class Input {
  /** What the user is dragging around. */
  holding: Draggable | undefined;
  private readonly toys: Record<ChestItem, Draggable>;
  private readonly draggables: readonly Draggable[];
  private pointer: { x: number; y: number; time: number } | undefined;
  private dragged = false;
  /** The press started on the debug corner: dragging goes on setting its gauges. */
  private onDebug = false;
  private pressedOnBuddy: { x: number; y: number } | undefined;
  private readonly throwing = new ThrowTracker();
  private readonly stroke = new StrokeTracker();
  private readonly signs = new SignTracker();

  constructor(
    private readonly stage: Stage,
    private readonly session: Session,
    /** Called whenever the user does something with the fox or its things. */
    private readonly onInteraction: () => void,
  ) {
    this.toys = draggables(session);
    this.draggables = Object.values(this.toys);
    const canvas = stage.canvas;
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    window.addEventListener('blur', () => this.onBlur());
    window.addEventListener('mouseout', (e) => this.onMouseOut(e));
    canvas.addEventListener('click', (e) => this.onClick(e));
    canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));
  }

  /** Where the pointer is in the world, as long as it moved recently or holds something. */
  pointerAt(now: number): WorldPoint | undefined {
    const pointer = this.pointer;
    const active = pointer !== undefined && (this.holding || now - pointer.time < POINTER_IDLE_MS);
    return active && pointer ? this.stage.toWorld(pointer.x, pointer.y) : undefined;
  }

  private overBuddy(x: number, y: number): boolean {
    return foxShown(this.session) && inside(this.stage.buddyRect(this.session.buddy), x, y);
  }

  private zoneAt(x: number, y: number): TouchZone | undefined {
    if (!this.overBuddy(x, y)) {
      return undefined;
    }
    const { buddy } = this.session;
    const scale = this.stage.scale;
    const r = this.stage.buddyRect(buddy);
    const lx = (x - r.x) / scale;
    return touchZone(currentFrame(buddy), buddy.dir === 1 ? lx : SPRITE_SIZE - lx, (y - r.y) / scale);
  }

  // Toys are small, so the pointer may be a little off.
  private over(box: Box, x: number, y: number): boolean {
    return inside(this.stage.rect(box), x, y, this.stage.scale * 2);
  }

  private draggableAt(x: number, y: number): Draggable | undefined {
    return this.draggables.find((d) => d.free() && this.over(d.box(), x, y));
  }

  private shelfItemAt(x: number, y: number): ShelfItem | undefined {
    const at = this.stage.toWorld(x, y);
    return this.session.world.shelf.itemAt(at.x, at.y);
  }

  private chestItemAt(x: number, y: number): ChestItem | undefined {
    const at = this.stage.toWorld(x, y);
    return this.session.world.chest.itemAt(at.x, at.y);
  }

  // What using each thing on the shelf does.
  private useShelf(item: ShelfItem): void {
    const { buddy, world } = this.session;
    this.onInteraction();
    // The click that ends this press is not one on its view.
    this.dragged = true;
    world.shelf.press(item);
    switch (item) {
      case 'meal':
        fillBowl(buddy);
        break;
      case 'bubbles':
        blowBubbles(buddy);
        break;
      default:
        // A thing added to the shelf must say here what using it does.
        item satisfies never;
    }
  }

  private hold(picked: Draggable, p: WorldPoint, how: 'grab' | 'take'): void {
    this.holding = picked;
    this.throwing.reset();
    picked[how](p);
    this.throwing.sample(p, performance.now());
    // A hand that holds something is not rummaging in the chest: it only gets its lid.
    this.session.world.chest.point(p, true);
  }

  private overBubble(x: number, y: number): boolean {
    const at = this.stage.toWorld(x, y);
    return this.session.world.bubbles.at(at.x, at.y, 3) !== undefined;
  }

  private overFind(x: number, y: number): boolean {
    const { offered, box } = this.session.world.finds;
    return offered?.state === 'down' && box !== undefined && this.over(box, x, y);
  }

  private overFoodBowl(x: number, y: number): boolean {
    const bowl = this.session.world.foodBowl;
    return bowl.active && this.over(bowl.box, x, y);
  }

  private releaseHeld(cssX: number, cssY: number, minSpeed = 0): void {
    const held = this.holding;
    if (!held) {
      return;
    }
    this.holding = undefined;
    const { stage } = this;
    const out = stage.toWorld(cssX, cssY);
    const { chest } = this.session.world;
    if (chest.accepts(out.x, out.y)) {
      // Let go of over the chest, a toy goes back in it.
      held.stow();
      chest.stowed();
      return;
    }
    const away = { x: out.x - stage.width / stage.scale / 2, y: 1 };
    held.release(out, this.throwing.velocity(performance.now(), minSpeed, away));
  }

  private updateCursor(x: number, y: number): void {
    let cursor = 'default';
    if (this.holding || (this.pressedOnBuddy && this.dragged)) {
      cursor = 'grabbing';
    } else if (this.draggableAt(x, y) || this.chestItemAt(x, y)) {
      cursor = 'grab';
    } else if (this.shelfItemAt(x, y) || this.overFind(x, y) || this.zoneAt(x, y) || this.overFoodBowl(x, y) || this.overBubble(x, y)) {
      cursor = 'pointer';
    }
    this.stage.canvas.style.cursor = cursor;
  }

  private onMouseDown(e: MouseEvent): void {
    this.pointer = { x: e.clientX, y: e.clientY, time: performance.now() };
    this.dragged = false;
    // The debug corner takes what is pressed on it: the fox does not get that click.
    this.onDebug = this.session.settings.debug === true && pressDebug(this.stage, this.session, e.clientX, e.clientY);
    if (this.onDebug) {
      this.dragged = true;
      e.preventDefault();
      return;
    }
    const p = this.stage.toWorld(e.clientX, e.clientY);
    const item = this.chestItemAt(e.clientX, e.clientY);
    const picked = this.draggableAt(e.clientX, e.clientY);
    const onShelf = this.shelfItemAt(e.clientX, e.clientY);
    if (item || onShelf) {
      if (item) {
        // Out of the chest, straight into the hand.
        this.onInteraction();
        this.hold(this.toys[item], p, 'take');
      } else if (onShelf) {
        this.useShelf(onShelf);
      }
      this.dragged = true;
      this.updateCursor(e.clientX, e.clientY);
      e.preventDefault();
      return;
    } else if (picked) {
      this.onInteraction();
      this.hold(picked, p, 'grab');
    } else if (this.zoneAt(e.clientX, e.clientY)) {
      this.pressedOnBuddy = { x: e.clientX, y: e.clientY };
      this.stroke.reset();
      this.updateCursor(e.clientX, e.clientY);
      e.preventDefault();
      return;
    } else {
      return;
    }
    this.dragged = true;
    this.updateCursor(e.clientX, e.clientY);
    e.preventDefault();
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.onDebug && (e.buttons & 1) !== 0) {
      pressDebug(this.stage, this.session, e.clientX, e.clientY, true);
      return;
    }
    const { buddy } = this.session;
    const pressed = this.pressedOnBuddy;
    this.pointer = { x: e.clientX, y: e.clientY, time: performance.now() };
    // A pointer moving in its view is you being there: it would not come to it, or ask for a stroke, half asleep.
    // But it takes more than that to wake it once it has gone to sleep.
    if (!asleep(buddy)) {
      this.onInteraction();
    }
    const { chest } = this.session.world;
    const at = this.stage.toWorld(e.clientX, e.clientY);
    chest.point(at, this.holding !== undefined);
    this.session.world.shelf.point(this.holding ? undefined : at);
    // A sign made with an empty hand, away from the chest and the shelf, is for the fox to answer.
    if (this.holding || pressed || (e.buttons & 1) !== 0 || chest.asked || this.session.world.shelf.asked) {
      this.signs.reset();
    } else {
      const sign = this.signs.move(at, performance.now());
      if (sign && signed(buddy, sign)) {
        this.onInteraction();
      }
    }
    if (this.holding) {
      this.dragged = true;
      const p = this.stage.toWorld(e.clientX, e.clientY);
      this.holding.move(p);
      this.throwing.sample(p, performance.now());
    } else if (pressed && (e.buttons & 1) !== 0) {
      if (Math.hypot(e.clientX - pressed.x, e.clientY - pressed.y) > CLICK_SLOP * this.stage.scale) {
        this.dragged = true;
      }
      const minTravel = STROKE_MIN_TRAVEL * this.stage.scale;
      if (this.overBuddy(e.clientX, e.clientY) && this.stroke.move(e.movementX, performance.now(), minTravel)) {
        pet(buddy);
        this.onInteraction();
      }
    }
    this.updateCursor(e.clientX, e.clientY);
  }

  private onMouseUp(e: MouseEvent): void {
    this.pressedOnBuddy = undefined;
    this.onDebug = false;
    if (this.holding) {
      this.releaseHeld(e.clientX, e.clientY);
      // The hand is empty again.
      this.session.world.chest.point(this.stage.toWorld(e.clientX, e.clientY));
    }
    this.updateCursor(e.clientX, e.clientY);
  }

  private onBlur(): void {
    if (this.holding && this.pointer) {
      this.releaseHeld(this.pointer.x, this.pointer.y);
    }
  }

  // The webview stops receiving mouse events once the pointer leaves it, so let go of what is held there.
  private onMouseOut(e: MouseEvent): void {
    if (e.relatedTarget) {
      return;
    }
    this.pressedOnBuddy = undefined;
    if (this.holding) {
      this.releaseHeld(e.clientX, e.clientY, EXIT_THROW_SPEED);
    }
    this.pointer = undefined;
    this.session.world.chest.point(undefined);
    this.session.world.shelf.point(undefined);
  }

  private onClick(e: MouseEvent): void {
    const { buddy } = this.session;
    if (this.dragged || buddy.state === 'petted') {
      return;
    }
    // A bubble under the pointer bursts, whatever is behind it.
    const at = this.stage.toWorld(e.clientX, e.clientY);
    if (popBubbleAt(buddy, at.x, at.y)) {
      this.onInteraction();
      return;
    }
    if (this.overFind(e.clientX, e.clientY) && acceptFind(buddy)) {
      this.onInteraction();
      return;
    }
    if (this.overFoodBowl(e.clientX, e.clientY)) {
      fillBowl(buddy);
      this.onInteraction();
      return;
    }
    const zone = this.zoneAt(e.clientX, e.clientY);
    if (zone) {
      // Told after the touch, so that a sleeping fox is patted in its sleep before it hears you are there.
      touch(buddy, zone);
      this.onInteraction();
    } else if (this.session.world.chest.asked || this.session.world.shelf.asked) {
      // A click at the chest or the shelf is for them: it does not call the fox over.
    } else if (!this.overBuddy(e.clientX, e.clientY) && (callOver(buddy, this.stage.toWorld(e.clientX, e.clientY).x) || asleep(buddy))) {
      // A click in its view calls it over, or wakes it.
      this.onInteraction();
    }
  }

  private onDoubleClick(e: MouseEvent): void {
    const { world } = this.session;
    if (world.ball.state === 'none' && !this.overBuddy(e.clientX, e.clientY)) {
      const p = this.stage.toWorld(e.clientX, e.clientY);
      spawnBall(this.session.buddy, p.x, p.y, 0);
      this.onInteraction();
    }
  }
}
