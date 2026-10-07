import { HEAD_X } from '../../sprites/fox/anchors';
import { SPRITE_SIZE } from '../../sprites/frames';
import type { Buddy } from '../buddy';
import { clamp } from '../math';
import type { Feature } from '../state';
import type { WorldPoint } from '../world';

/** It first looks at the pointer, and turns to it; only if it is still around after this long does it set off. */
const NOTICE_MS = 1100;
/** Nearer than this, it is already with you. */
const COME_MIN = 26;
/** An easy walk; it only runs when you call it with a click. */
const COME_SPEED = 11;
const COME_RUN_SPEED = 42;
const COME_MAX_MS = 40_000;
/** Once there, it does not trail after the pointer again for this long. */
const COME_REST_MS = 12_000;
/** Wagging its tail at you once it got there. */
const ARRIVED_MS = 1100;
const HOVER_MS = 450;
const NUDGE_MAX_MS = 6000;
const NUDGE_LINGER_MS = 500;
const NUDGE_REST_MS = 5000;
/** How far behind the middle of its head the pointer has to be for it to lean back into it, or ahead to lean forward again. */
const LEAN_SLACK = 3;
/** A hand farther back than this from the middle of its head is on its neck or its back. */
const HEAD_BACK = 5;
/** The part of the sprite the pointer has to rest on, a little inside its edges. */
const OVER_MARGIN = 3;
const OVER_HEIGHT = 30;

export class PointerMemory {
  /** How long the pointer has been in the view, and resting on the fox. */
  hereMs = 0;
  hoverMs = 0;
  sinceComeMs = Infinity;
  sinceNudgeMs = Infinity;
  /** Where it is heading: the last place it saw the pointer. */
  goalX = 0;
  /** You clicked: it runs. */
  called = false;
  arrived = false;
  arrivedMs = 0;
  /** While it asks to be petted: whether it was lying down, which way it leans its head, how long the pointer has been off it. */
  lying = false;
  lean: 1 | -1 = 1;
  offMs = 0;
}

function over(b: Buddy, p: WorldPoint): boolean {
  return p.x >= b.x + OVER_MARGIN && p.x <= b.x + SPRITE_SIZE - OVER_MARGIN && p.y >= 0 && p.y <= OVER_HEIGHT;
}

/** Where it has to stand, coming from where it is, for its head to be under `x`. */
function standingUnder(b: Buddy, x: number): { at: number; dir: 1 | -1 } {
  const dir = x >= b.x + SPRITE_SIZE / 2 ? 1 : -1;
  return { at: clamp(x - b.offsetFor(HEAD_X, dir), 0, b.maxX), dir };
}

/** Nothing better to do: it may go to the pointer or ask for a stroke. */
function atLeisure(b: Buddy): boolean {
  const { ball, treat } = b.world;
  return (b.def.calm || b.state === 'walk') && !b.rest.sleepy && ball.state !== 'held' && treat.state !== 'held';
}

/** Walks over to where the pointer is, and wags its tail once there. */
function startCome(b: Buddy, x: number): void {
  b.pointer.goalX = x;
  b.pointer.called = false;
  b.pointer.arrived = false;
  b.tryEnter('come', COME_MAX_MS);
}

/** You clicked on an empty spot at `x`: it comes running. Returns whether it heard. */
export function callOver(b: Buddy, x: number): boolean {
  if (b.state === 'come' && !b.pointer.arrived) {
    b.pointer.goalX = x;
    b.pointer.called = true;
    return true;
  }
  if (!atLeisure(b) || Math.abs(standingUnder(b, x).at - b.x) <= COME_MIN / 2) {
    return false;
  }
  startCome(b, x);
  b.pointer.called = b.state === 'come';
  return b.pointer.called;
}

/** Looks up at the pointer resting on it and presses its head into it: it would like to be petted. */
function startNudge(b: Buddy): void {
  b.pointer.lying = b.state === 'lie';
  b.pointer.lean = 1;
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
  // A pointer that went still, or left, is still where it last saw it.
  m.goalX = p?.x ?? m.goalX;
  const { at, dir } = standingUnder(b, m.goalX);
  b.running = m.called;
  b.moving = b.walkTo(at, dir, (m.called ? COME_RUN_SPEED : COME_SPEED) * dt);
  if (b.moving) {
    return false;
  }
  if (!p) {
    // It got there and you are gone: it looks around for you.
    b.enterNext('lookAround');
    return true;
  }
  m.arrived = true;
  m.arrivedMs = 0;
  return false;
}

function updateNudge(b: Buddy, dt: number, dtMs: number): boolean {
  const m = b.pointer;
  const p = b.world.pointer;
  b.fall(dt);
  m.sinceNudgeMs = 0;
  if (p && over(b, p)) {
    m.offMs = 0;
    // It stays where it is: only its head goes to your hand.
    const ahead = (p.x - (b.x + b.offsetFor(HEAD_X))) * b.dir;
    if (Math.abs(ahead + HEAD_BACK) > LEAN_SLACK) {
      m.lean = ahead + HEAD_BACK > 0 ? 1 : -1;
    }
    return false;
  }
  m.offMs += dtMs;
  if (m.offMs < NUDGE_LINGER_MS) {
    return false;
  }
  b.enterNext(m.lying ? 'lie' : 'sit');
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
      finish: (b) => b.enterNext(b.pointer.lying ? 'lie' : 'sit'),
      anim(b) {
        const { lying, lean } = b.pointer;
        const forward = lying ? 'nudgeLie' : 'nudge';
        const back = lying ? 'nudgeLieBack' : 'nudgeBack';
        return { anim: lean === 1 ? forward : back, elapsed: b.elapsed };
      },
    },
  },
  tick(b, dtMs) {
    const m = b.pointer;
    const { pointer } = b.world;
    m.sinceComeMs += dtMs;
    m.sinceNudgeMs += dtMs;
    m.hereMs = pointer ? m.hereMs + dtMs : 0;
    m.hoverMs = pointer && over(b, pointer) ? m.hoverMs + dtMs : 0;
    if (!pointer || !atLeisure(b)) {
      return;
    }
    if (m.hoverMs >= HOVER_MS) {
      if (m.sinceNudgeMs >= NUDGE_REST_MS) {
        startNudge(b);
      }
    } else if (m.hereMs >= NOTICE_MS && m.sinceComeMs >= COME_REST_MS && !over(b, pointer) && b.state !== 'lie') {
      // Lying down, it is comfortable: it watches the pointer, and only gets up if you call it.
      if (Math.abs(standingUnder(b, pointer.x).at - b.x) > COME_MIN) {
        startCome(b, pointer.x);
      }
    }
  },
} satisfies Feature;
