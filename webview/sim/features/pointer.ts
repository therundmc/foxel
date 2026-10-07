import { HEAD_X } from '../../sprites/fox/anchors';
import { SPRITE_SIZE } from '../../sprites/frames';
import type { Buddy } from '../buddy';
import { clamp } from '../math';
import type { Feature } from '../state';
import type { WorldPoint } from '../world';

/** It first glances at the pointer and turns to it; only if it is still around after this long does it go. */
const NOTICE_MS = 700;
/** Nearer than this, it is already with you. */
const COME_MIN = 26;
/** Farther than this, it runs. */
const COME_FAR = 60;
const COME_SPEED = 16;
const COME_RUN_SPEED = 42;
const COME_MAX_MS = 9000;
/** Once there, it does not trail after the pointer again for this long. */
const COME_REST_MS = 5000;
/** Wagging its tail at you once it got there. */
const ARRIVED_MS = 1100;
const HOVER_MS = 450;
const NUDGE_MAX_MS = 6000;
const NUDGE_LINGER_MS = 500;
const NUDGE_REST_MS = 5000;
const SHUFFLE_SPEED = 9;
const SHUFFLE_SLACK = 2;
/** The part of the sprite the pointer has to rest on, a little inside its edges. */
const OVER_MARGIN = 3;
const OVER_HEIGHT = 30;

export class PointerMemory {
  /** How long the pointer has been in the view, and resting on the fox. */
  hereMs = 0;
  hoverMs = 0;
  sinceComeMs = Infinity;
  sinceNudgeMs = Infinity;
  arrived = false;
  arrivedMs = 0;
  /** While it asks to be petted: how long the pointer has been off it. */
  offMs = 0;
}

function over(b: Buddy, p: WorldPoint): boolean {
  return p.x >= b.x + OVER_MARGIN && p.x <= b.x + SPRITE_SIZE - OVER_MARGIN && p.y >= 0 && p.y <= OVER_HEIGHT;
}

/** Where it has to stand, facing `dir`, for its head to be under the pointer. */
function underPointer(b: Buddy, p: WorldPoint, dir: 1 | -1): number {
  return clamp(p.x - b.offsetFor(HEAD_X, dir), 0, b.maxX);
}

function sideOf(b: Buddy, p: WorldPoint): 1 | -1 {
  return p.x >= b.x + SPRITE_SIZE / 2 ? 1 : -1;
}

/** Trots over to the pointer, runs if it is far, and wags its tail once there. */
export function startCome(b: Buddy): void {
  b.pointer.arrived = false;
  b.running = false;
  b.tryEnter('come', COME_MAX_MS);
}

/** Looks up at the pointer resting on it and pushes its head under it: it would like to be petted. */
export function startNudge(b: Buddy): void {
  b.pointer.offMs = 0;
  b.tryEnter('nudge', NUDGE_MAX_MS);
}

function updateCome(b: Buddy, dt: number, dtMs: number): boolean {
  const m = b.pointer;
  const p = b.world.pointer;
  b.fall(dt);
  m.sinceComeMs = 0;
  if (m.arrived) {
    m.arrivedMs += dtMs;
    if (m.arrivedMs < ARRIVED_MS) {
      return false;
    }
    b.enterNext('sit');
    return true;
  }
  if (!p) {
    // It was on its way and you are gone: it looks around for you.
    b.enterNext('lookAround');
    return true;
  }
  const dir = sideOf(b, p);
  const target = underPointer(b, p, dir);
  b.running = Math.abs(target - b.x) > (b.running ? COME_MIN : COME_FAR);
  b.moving = b.walkTo(target, dir, (b.running ? COME_RUN_SPEED : COME_SPEED) * dt);
  if (!b.moving) {
    m.arrived = true;
    m.arrivedMs = 0;
  }
  return false;
}

function updateNudge(b: Buddy, dt: number, dtMs: number): boolean {
  const m = b.pointer;
  const p = b.world.pointer;
  b.fall(dt);
  m.sinceNudgeMs = 0;
  if (p && over(b, p)) {
    m.offMs = 0;
    // It shuffles until its head is right under your hand.
    b.faceX(p.x, SPRITE_SIZE / 4);
    const target = underPointer(b, p, b.dir);
    if (Math.abs(target - b.x) > SHUFFLE_SLACK) {
      b.approach(target, SHUFFLE_SPEED * dt);
    }
    return false;
  }
  m.offMs += dtMs;
  if (m.offMs < NUDGE_LINGER_MS) {
    return false;
  }
  b.enterNext('sit');
  return true;
}

// The pointer in its view is you: it comes over, and asks for a stroke when you hold your hand on it.
export const pointerFeature = {
  states: {
    come: {
      gazes: true,
      next: [['sit', 60], ['idle', 40]],
      update: updateCome,
      anim(b) {
        if (b.pointer.arrived) {
          return { anim: 'ready', elapsed: b.pointer.arrivedMs };
        }
        return { anim: b.running ? 'run' : 'walk', elapsed: b.elapsed };
      },
    },
    nudge: {
      priority: 1,
      next: [['sit', 70], ['idle', 30]],
      update: updateNudge,
    },
  },
  tick(b, dtMs) {
    const m = b.pointer;
    const { pointer, ball, treat } = b.world;
    m.sinceComeMs += dtMs;
    m.sinceNudgeMs += dtMs;
    m.hereMs = pointer ? m.hereMs + dtMs : 0;
    m.hoverMs = pointer && over(b, pointer) ? m.hoverMs + dtMs : 0;
    // Only when it has nothing better to do, and not when your hand is busy with a toy or it is off to bed.
    const idle = b.def.calm || b.state === 'walk';
    if (!pointer || !idle || b.rest.sleepy || ball.state === 'held' || treat.state === 'held') {
      return;
    }
    if (m.hoverMs >= HOVER_MS) {
      if (m.sinceNudgeMs >= NUDGE_REST_MS) {
        startNudge(b);
      }
    } else if (m.hereMs >= NOTICE_MS && m.sinceComeMs >= COME_REST_MS) {
      const far = Math.abs(underPointer(b, pointer, sideOf(b, pointer)) - b.x) > COME_MIN;
      if (far && !over(b, pointer)) {
        startCome(b);
      }
    }
  },
} satisfies Feature;
