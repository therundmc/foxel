import { StrokeTracker, ThrowTracker } from './gestures';
import { currentFrame } from './render/renderer';
import { foxShown, type Session } from './session';
import { grabBall, moveHeldBall, spawnBall, throwBall } from './sim/features/fetch';
import { fillBowl } from './sim/features/meals';
import { pet, touch } from './sim/features/touch';
import { grabTreat, moveHeldTreat, releaseTreat } from './sim/features/treat';
import type { WorldPoint } from './sim/world';
import { touchZone, type TouchZone } from './sprites/fox/anchors';
import { SPRITE_SIZE } from './sprites/frames';
import { inside, type Stage } from './stage';

const POINTER_IDLE_MS = 4000;
const STROKE_MIN_TRAVEL = 3;
const EXIT_THROW_SPEED = 90;
const CLICK_SLOP = 2;

/** Turns what the mouse does on the canvas into what happens to the buddy and its toys. */
export class Input {
  /** What the user is dragging around. */
  holding: 'ball' | 'treat' | undefined;
  private pointer: { x: number; y: number; time: number } | undefined;
  private dragged = false;
  private pressedOnBuddy: { x: number; y: number } | undefined;
  private readonly throwing = new ThrowTracker();
  private readonly stroke = new StrokeTracker();

  constructor(
    private readonly stage: Stage,
    private readonly session: Session,
  ) {
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

  private overBall(x: number, y: number): boolean {
    const ball = this.session.world.ball;
    return ball.state === 'free' && inside(this.stage.ballRect(ball), x, y, this.stage.scale * 2);
  }

  private overTreat(x: number, y: number): boolean {
    const treat = this.session.world.treat;
    return treat.state === 'free' && inside(this.stage.treatRect(treat), x, y, this.stage.scale * 2);
  }

  private overFoodBowl(x: number, y: number): boolean {
    const bowl = this.session.world.foodBowl;
    return bowl.active && inside(this.stage.bowlRect(bowl), x, y, this.stage.scale * 2);
  }

  private releaseHeld(cssX: number, cssY: number, minSpeed = 0): void {
    const { buddy } = this.session;
    if (this.holding === 'ball') {
      this.holding = undefined;
      const { stage } = this;
      const out = stage.toWorld(cssX, cssY);
      const away = { x: out.x - stage.width / stage.scale / 2, y: 1 };
      const v = this.throwing.velocity(performance.now(), minSpeed, away);
      throwBall(buddy, v.x, v.y, out.x);
    } else if (this.holding === 'treat') {
      this.holding = undefined;
      releaseTreat(buddy);
    }
  }

  private updateCursor(x: number, y: number): void {
    let cursor = 'default';
    if (this.holding || (this.pressedOnBuddy && this.dragged)) {
      cursor = 'grabbing';
    } else if (this.overBall(x, y) || this.overTreat(x, y)) {
      cursor = 'grab';
    } else if (this.zoneAt(x, y) || this.overFoodBowl(x, y)) {
      cursor = 'pointer';
    }
    this.stage.canvas.style.cursor = cursor;
  }

  private onMouseDown(e: MouseEvent): void {
    const { buddy } = this.session;
    this.pointer = { x: e.clientX, y: e.clientY, time: performance.now() };
    this.dragged = false;
    const p = this.stage.toWorld(e.clientX, e.clientY);
    if (this.overBall(e.clientX, e.clientY)) {
      this.holding = 'ball';
      this.throwing.reset();
      grabBall(buddy, p.x, p.y);
      this.throwing.sample(p, performance.now());
    } else if (this.overTreat(e.clientX, e.clientY)) {
      this.holding = 'treat';
      grabTreat(buddy, p.x, p.y);
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
    const { buddy } = this.session;
    const pressed = this.pressedOnBuddy;
    this.pointer = { x: e.clientX, y: e.clientY, time: performance.now() };
    if (this.holding) {
      this.dragged = true;
      const p = this.stage.toWorld(e.clientX, e.clientY);
      if (this.holding === 'ball') {
        moveHeldBall(buddy, p.x, p.y);
        this.throwing.sample(p, performance.now());
      } else {
        moveHeldTreat(buddy, p.x, p.y);
      }
    } else if (pressed && (e.buttons & 1) !== 0) {
      if (Math.hypot(e.clientX - pressed.x, e.clientY - pressed.y) > CLICK_SLOP * this.stage.scale) {
        this.dragged = true;
      }
      const minTravel = STROKE_MIN_TRAVEL * this.stage.scale;
      if (this.overBuddy(e.clientX, e.clientY) && this.stroke.move(e.movementX, performance.now(), minTravel)) {
        pet(buddy);
      }
    }
    this.updateCursor(e.clientX, e.clientY);
  }

  private onMouseUp(e: MouseEvent): void {
    this.pressedOnBuddy = undefined;
    if (this.holding) {
      this.releaseHeld(e.clientX, e.clientY);
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
  }

  private onClick(e: MouseEvent): void {
    const { buddy } = this.session;
    if (this.dragged || buddy.state === 'petted') {
      return;
    }
    if (this.overFoodBowl(e.clientX, e.clientY)) {
      fillBowl(buddy);
      return;
    }
    const zone = this.zoneAt(e.clientX, e.clientY);
    if (zone) {
      touch(buddy, zone);
    }
  }

  private onDoubleClick(e: MouseEvent): void {
    const { world } = this.session;
    if (world.ball.state === 'none' && !this.overBuddy(e.clientX, e.clientY)) {
      const p = this.stage.toWorld(e.clientX, e.clientY);
      spawnBall(this.session.buddy, p.x, p.y, 0);
    }
  }
}
