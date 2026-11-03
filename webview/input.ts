import { StrokeTracker, ThrowTracker } from './gestures';
import { currentFrame } from './render/renderer';
import { foxShown, type Session } from './session';
import { popBubbleAt } from './sim/features/bubbles';
import { spawnBall } from './sim/features/fetch';
import { fillBowl } from './sim/features/meals';
import { callOver } from './sim/features/pointer';
import { asleep } from './sim/features/rest';
import { pet, touch } from './sim/features/touch';
import type { Box } from './sim/math';
import type { WorldPoint } from './sim/world';
import { touchZone, type TouchZone } from './sprites/fox/anchors';
import { SPRITE_SIZE } from './sprites/frames';
import { inside, type Stage } from './stage';
import { draggables, type Draggable } from './toys';

const POINTER_IDLE_MS = 4000;
const STROKE_MIN_TRAVEL = 3;
const EXIT_THROW_SPEED = 90;
const CLICK_SLOP = 2;

/**
 * Turns what the mouse does on the canvas into what happens to the buddy and its toys. On the fox: a click
 * touches it where it lands, a double click makes it twirl, a triple click sets off the zoomies, and stroking it
 * with the button down pets it. Elsewhere: a click calls it over, a double click drops a ball there.
 */
export class Input {
  /** What the user is dragging around. */
  holding: Draggable | undefined;
  private readonly draggables: readonly Draggable[];
  private pointer: { x: number; y: number; time: number } | undefined;
  private dragged = false;
  private pressedOnBuddy: { x: number; y: number } | undefined;
  private readonly throwing = new ThrowTracker();
  private readonly stroke = new StrokeTracker();

  constructor(
    private readonly stage: Stage,
    private readonly session: Session,
    /** Called whenever the user does something with the fox or its things. */
    private readonly onInteraction: () => void,
  ) {
    this.draggables = draggables(session);
    const canvas = stage.canvas;
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    window.addEventListener('blur', () => this.onBlur());
    window.addEventListener('mouseout', (e) => this.onMouseOut(e));
    canvas.addEventListener('click', (e) => this.onClick(e));
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

  private overBubble(x: number, y: number): boolean {
    const at = this.stage.toWorld(x, y);
    return this.session.world.bubbles.at(at.x, at.y, 3) !== undefined;
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
    const away = { x: out.x - stage.width / stage.scale / 2, y: 1 };
    held.release(out, this.throwing.velocity(performance.now(), minSpeed, away));
  }

  private updateCursor(x: number, y: number): void {
    let cursor = 'default';
    if (this.holding || (this.pressedOnBuddy && this.dragged)) {
      cursor = 'grabbing';
    } else if (this.draggableAt(x, y)) {
      cursor = 'grab';
    } else if (this.zoneAt(x, y) || this.overFoodBowl(x, y) || this.overBubble(x, y)) {
      cursor = 'pointer';
    }
    this.stage.canvas.style.cursor = cursor;
  }

  private onMouseDown(e: MouseEvent): void {
    this.pointer = { x: e.clientX, y: e.clientY, time: performance.now() };
    this.dragged = false;
    const picked = this.draggableAt(e.clientX, e.clientY);
    if (picked) {
      this.onInteraction();
      this.holding = picked;
      this.throwing.reset();
      const p = this.stage.toWorld(e.clientX, e.clientY);
      picked.grab(p);
      this.throwing.sample(p, performance.now());
      this.dragged = true;
    } else if (this.zoneAt(e.clientX, e.clientY)) {
      this.pressedOnBuddy = { x: e.clientX, y: e.clientY };
      this.stroke.reset();
    } else {
      return;
    }
    this.updateCursor(e.clientX, e.clientY);
    e.preventDefault();
  }

  private onMouseMove(e: MouseEvent): void {
    const { buddy } = this.session;
    const pressed = this.pressedOnBuddy;
    this.pointer = { x: e.clientX, y: e.clientY, time: performance.now() };
    // A pointer moving in its view is you being there: it would not come to it, or ask for a stroke, half asleep.
    // But it takes more than that to wake it once it has gone to sleep.
    if (!asleep(buddy)) {
      this.onInteraction();
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
    this.releaseHeld(e.clientX, e.clientY);
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
    this.releaseHeld(e.clientX, e.clientY, EXIT_THROW_SPEED);
    this.pointer = undefined;
  }

  // `detail` counts the clicks in a row: 2 on a double click, 3 on a triple one.
  private onClick(e: MouseEvent): void {
    const { buddy } = this.session;
    if (this.dragged || buddy.state === 'petted') {
      return;
    }
    const clicks = Math.min(e.detail, 3) || 1;
    // A bubble under the pointer bursts, whatever is behind it.
    const at = this.stage.toWorld(e.clientX, e.clientY);
    if (popBubbleAt(buddy, at.x, at.y)) {
      this.onInteraction();
      return;
    }
    if (this.overFoodBowl(e.clientX, e.clientY)) {
      fillBowl(buddy);
      this.onInteraction();
      return;
    }
    if (this.overBuddy(e.clientX, e.clientY)) {
      // A twirl may have lifted it off the spot the first click found: a click on it is a click on it.
      const zone = this.zoneAt(e.clientX, e.clientY) ?? (clicks > 1 ? 'head' : undefined);
      if (zone) {
        // Told after the touch, so that a sleeping fox is patted in its sleep before it hears you are there.
        touch(buddy, zone, clicks);
        this.onInteraction();
      }
    } else if (clicks === 2 && this.session.world.ball.state === 'none') {
      // A double click on an empty spot drops its ball there.
      spawnBall(buddy, at.x, at.y, 0);
      this.onInteraction();
    } else if (clicks === 1 && (callOver(buddy, at.x) || asleep(buddy))) {
      // A click in its view calls it over, or wakes it.
      this.onInteraction();
    }
  }
}
