import { SPRITE_SIZE } from '../../sprites/frames';
import type { FindKind } from '../../sprites/props';
import type { Buddy } from '../buddy';
import type { AnimRef, Feature } from '../state';
import { mouthPoint } from './mouth';

const KINDS: readonly FindKind[] = ['flower', 'pebble', 'feather', 'leaf'];
/** It brings you things once it is this attached and in a decent mood: this many a day at most, this long apart. */
export const GIFT_BOND = 0.25;
export const GIFTS_A_DAY = 2;
export const GIFT_EVERY_MS = 25 * 60_000;
/** It draws for you once it is this attached and in a good mood, this long apart. */
export const DOODLE_BOND = 0.5;
export const DOODLE_MOOD = 0.2;
export const DOODLE_EVERY_MS = 30 * 60_000;
const TROT = 16;
/** How long it stays out of sight looking for something, puts it down, waits for you to take it, and thanks you. */
const OUT_MS = 2200;
const SET_DOWN_MS = 500;
const OFFER_MS = 14_000;
const THANKS_MS = 1500;
const THANKS_HOP_MS = 300;
const THANKS_HOP = 5;
/** Drawing: how long it scratches at the earth, and how long it then sits looking at you. */
const SCRATCH_MS = 1800;
const SCRATCH_LOOP_MS = 880;
const SHOW_MS = 2600;

/**
 * Bringing you something, step by step: it trots out of the view (`leave`), is gone a moment (`out`), comes back
 * with it in its mouth (`bring`), puts it down (`set`) and sits by it (`offer`). Click it and it is thrilled
 * (`thanks`); leave it and it picks it up again (`pick`), carries it off (`off`) and comes back without it (`back`).
 */
type Step = 'leave' | 'out' | 'bring' | 'set' | 'offer' | 'thanks' | 'pick' | 'off' | 'back';

export class GiftMemory {
  step: Step = 'leave';
  stepMs = 0;
  kind: FindKind = 'flower';
  targetX = 0;
  /** How many it has brought on `day`, and how long since the last one and since its last drawing. */
  day = '';
  given = 0;
  sinceGiftMs = GIFT_EVERY_MS;
  sinceDoodleMs = DOODLE_EVERY_MS;
}

function step(b: Buddy, to: Step): void {
  b.gift.step = to;
  b.gift.stepMs = 0;
}

const today = (b: Buddy): string => b.world.now.toDateString();

function mayGive(b: Buddy): boolean {
  const m = b.gift;
  const given = m.day === today(b) ? m.given : 0;
  return b.world.attachment >= GIFT_BOND && b.world.mood >= 0 && given < GIFTS_A_DAY && m.sinceGiftMs >= GIFT_EVERY_MS && b.world.finds.room;
}

function mayDraw(b: Buddy): boolean {
  return b.world.attachment >= DOODLE_BOND && b.world.mood >= DOODLE_MOOD && b.gift.sinceDoodleMs >= DOODLE_EVERY_MS && !b.world.doodle.there;
}

/** Goes out of the view to find you something. */
export function startGift(b: Buddy): void {
  const m = b.gift;
  m.given = (m.day === today(b) ? m.given : 0) + 1;
  m.day = today(b);
  m.sinceGiftMs = 0;
  m.kind = KINDS[Math.floor(b.world.random() * KINDS.length) % KINDS.length];
  step(b, 'leave');
  b.enter('gift', Infinity);
}

/** You clicked what it brought: yours now, and off it hops to its corner. Returns whether there was something to accept. */
export function acceptFind(b: Buddy): boolean {
  if (b.state !== 'gift' || b.gift.step !== 'offer' || b.world.finds.offered?.state !== 'down') {
    return false;
  }
  b.world.finds.accept();
  step(b, 'thanks');
  return true;
}

function updateGift(b: Buddy, dt: number, dtMs: number): boolean {
  const m = b.gift;
  const { finds } = b.world;
  // Trots to `to`, which may be out of the view; true once it is there.
  const walk = (to: number, arrival: 1 | -1): boolean => {
    const pace = TROT * dt;
    b.moving = Math.abs(to - b.x) > pace;
    b.dir = b.moving ? (to > b.x ? 1 : -1) : arrival;
    b.x = b.moving ? b.x + b.dir * pace : to;
    return !b.moving;
  };
  b.moving = false;
  m.stepMs += dtMs;
  if (finds.offered?.state === 'carried') {
    const at = mouthPoint(b);
    finds.carry(m.kind, at.x, at.y);
  }
  switch (m.step) {
    case 'leave':
      if (walk(-SPRITE_SIZE, -1)) {
        step(b, 'out');
      }
      break;
    case 'out':
      if (m.stepMs >= OUT_MS) {
        // Somewhere in the middle, or where your pointer is.
        m.targetX = Math.min(b.maxX, Math.max(0, (b.world.pointer?.x ?? b.world.width * (0.3 + 0.3 * b.world.random())) - b.noseOffset(1) - 4));
        b.dir = 1;
        const at = mouthPoint(b);
        finds.carry(m.kind, at.x, at.y);
        step(b, 'bring');
      }
      break;
    case 'bring':
      if (walk(m.targetX, 1)) {
        step(b, 'set');
      }
      break;
    case 'set':
      if (m.stepMs >= SET_DOWN_MS) {
        finds.setDown();
        step(b, 'offer');
      }
      break;
    case 'offer':
      if (m.stepMs >= OFFER_MS) {
        step(b, 'pick');
      }
      break;
    case 'thanks':
      b.y = Math.min(THANKS_HOP, b.maxY) * Math.abs(Math.sin((m.stepMs / THANKS_HOP_MS) * Math.PI));
      if (m.stepMs >= THANKS_MS) {
        b.y = 0;
        b.enterNext('sit');
      }
      break;
    case 'pick':
      if (m.stepMs >= SET_DOWN_MS) {
        const at = mouthPoint(b);
        finds.carry(m.kind, at.x, at.y);
        step(b, 'off');
      }
      break;
    case 'off':
      if (walk(-SPRITE_SIZE, -1)) {
        finds.gone();
        step(b, 'back');
      }
      break;
    case 'back':
      if (m.stepMs >= OUT_MS / 2 && walk(m.targetX, 1)) {
        b.enterNext('sit');
      }
      break;
  }
  return true;
}

function giftAnim(b: Buddy): AnimRef {
  const m = b.gift;
  switch (m.step) {
    case 'set':
    case 'pick':
      return { anim: 'sniff', elapsed: m.stepMs };
    case 'offer':
      return { anim: 'proud', elapsed: b.elapsed };
    case 'thanks':
      return { anim: 'celebrate', elapsed: m.stepMs };
    default:
      return { anim: b.moving ? 'walk' : 'idle', elapsed: b.elapsed };
  }
}

function updateDoodle(b: Buddy): boolean {
  if (b.elapsed >= SCRATCH_MS + SHOW_MS) {
    b.enterNext('sit');
  }
  return true;
}

// What it does for you once it has grown fond of you: it brings you small finds, and scratches a heart in the earth.
export const giftsFeature = {
  states: {
    gift: {
      offscreen: true,
      nightDamped: true,
      available: mayGive,
      begin: startGift,
      update: updateGift,
      anim: giftAnim,
    },
    doodle: {
      nightDamped: true,
      available: mayDraw,
      begin(b) {
        b.gift.sinceDoodleMs = 0;
        b.world.doodle.begin(b.x + b.noseOffset());
        b.enter('doodle', Infinity);
      },
      update: updateDoodle,
      anim: (b) => (b.elapsed < SCRATCH_MS ? { anim: 'dig', elapsed: b.elapsed % SCRATCH_LOOP_MS } : { anim: 'proud', elapsed: b.elapsed }),
    },
  },
  tick(b, dtMs) {
    b.gift.sinceGiftMs += dtMs;
    b.gift.sinceDoodleMs += dtMs;
    // Where it digs, a little mound is left.
    if (b.state === 'dig' && !b.world.mound.there) {
      b.world.mound.begin(b.x + b.noseOffset());
    }
  },
  // Called away in the middle of it: the find is for another time.
  interrupted(b) {
    if (b.state === 'gift') {
      b.world.finds.gone();
      b.y = 0;
    }
  },
} satisfies Feature;
