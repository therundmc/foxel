import { SPRITE_SIZE } from '../../sprites/frames';
import type { FindKind } from '../../sprites/props';
import type { Buddy } from '../buddy';
import type { AnimRef, Feature } from '../state';
import { has, owns } from '../unlocks';
import { mouthPoint, noseTo } from './mouth';

/** It brings you this many things a day at most, this long apart. */
export const GIFTS_A_DAY = 2;
export const GIFT_EVERY_MS = 25 * 60_000;
/** And draws for you this long apart. */
export const DOODLE_EVERY_MS = 30 * 60_000;
const TROT = 16;
/** How long it stays out of sight looking for something, digs for one, puts it down, waits for you to take it, and thanks you. */
const OUT_MS = 2200;
const DIG_MS = 1760;
const DIG_LOOP_MS = 880;
const SET_DOWN_MS = 500;
const OFFER_MS = 14_000;
const THANKS_MS = 1500;
const THANKS_HOP_MS = 300;
const THANKS_HOP = 5;
/** How far ahead of it the bird lets its find go. */
const BIRD_AHEAD = 34;
/** Drawing: how long it scratches at the earth, and how long it then sits looking at you. */
const SCRATCH_MS = 1800;
const SHOW_MS = 2600;

/**
 * How it comes by what it brings you. It trots out of the view and back (`outside`), digs it up where it stands
 * (`dug`), or a little bird drops it in front of it (`bird`).
 */
type Way = 'outside' | 'dug' | 'bird';
const WAYS: readonly Way[] = ['outside', 'dug', 'bird'];

/**
 * Step by step. Outside: `leave`, `out`. Dug: `dig`. Bird: `await` it, then `fetch` what it dropped. Then, with
 * the thing in its mouth: `bring` it to you, `set` it down, `offer` it. Click it and it is thrilled (`thanks`) and
 * the thing goes into the box of keepsakes; leave it and it picks it up again (`pick`), carries it `off` and
 * comes `back` without it.
 */
type Step = 'leave' | 'out' | 'dig' | 'await' | 'fetch' | 'bring' | 'set' | 'offer' | 'thanks' | 'pick' | 'off' | 'back';

export class GiftMemory {
  way: Way = 'outside';
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
/** How many it has brought today. */
export const broughtToday = (b: Buddy): number => (b.gift.day === today(b) ? b.gift.given : 0);

function mayGive(b: Buddy): boolean {
  return has(b.world, 'finds') && broughtToday(b) < GIFTS_A_DAY && b.gift.sinceGiftMs >= GIFT_EVERY_MS && !b.world.finds.offered && !b.world.album.flying;
}

function mayDraw(b: Buddy): boolean {
  return has(b.world, 'hearts') && b.gift.sinceDoodleMs >= DOODLE_EVERY_MS && !b.world.doodle.there;
}

// Somewhere in the middle, or where your pointer is: where it brings the thing.
const toYou = (b: Buddy): number => Math.min(b.maxX, Math.max(0, (b.world.pointer?.x ?? b.world.width * (0.3 + 0.3 * b.world.random())) - b.noseOffset(1) - 4));

function inMouth(b: Buddy): void {
  const at = mouthPoint(b);
  b.world.finds.carry(b.gift.kind, at.x, at.y);
}

/** A rare find comes this seldom, once it finds them at all. */
const RARE = 0.12;

// What it finds this time: common things at first, prettier ones later, and once in a long while something rare.
function pickKind(b: Buddy): FindKind {
  const { random } = b.world;
  const pick = (kinds: readonly FindKind[]): FindKind => kinds[Math.floor(random() * kinds.length) % kinds.length];
  if (owns(b.world, 'rareFinds') && random() < RARE) {
    return pick(['clover', 'gem']);
  }
  return pick(owns(b.world, 'fineFinds') ? ['leaf', 'pebble', 'flower', 'feather'] : ['leaf', 'pebble']);
}

/** Finds you something: outside, in the earth, or from a bird, as `way` says (or as it happens). */
export function startGift(b: Buddy, way?: Way): void {
  const m = b.gift;
  const { random } = b.world;
  m.given = broughtToday(b) + 1;
  m.day = today(b);
  m.sinceGiftMs = 0;
  m.kind = pickKind(b);
  m.way = way ?? WAYS[Math.floor(random() * WAYS.length) % WAYS.length];
  b.enter('gift', Infinity);
  if (m.way === 'dug') {
    b.world.mound.begin(b.x + b.noseOffset());
    step(b, 'dig');
  } else if (m.way === 'bird') {
    const ahead = b.dir === 1 ? b.maxX - b.x : b.x;
    b.dir = ahead >= BIRD_AHEAD ? b.dir : b.flipped();
    b.world.finds.flyIn(m.kind, Math.min(b.world.width - 8, Math.max(4, b.x + b.noseOffset() + b.dir * BIRD_AHEAD)));
    step(b, 'await');
  } else {
    step(b, 'leave');
  }
}

/** You clicked what it brought: yours now, and off it goes into the box of keepsakes. Returns whether there was something to accept. */
export function acceptFind(b: Buddy): boolean {
  const { finds, album } = b.world;
  const box = finds.box;
  if (b.state !== 'gift' || b.gift.step !== 'offer' || finds.offered?.state !== 'down' || !box) {
    return false;
  }
  album.keep({ find: finds.offered.kind }, box.x, box.y);
  finds.gone();
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
    inMouth(b);
  }
  switch (m.step) {
    case 'leave':
      if (walk(-SPRITE_SIZE, -1)) {
        step(b, 'out');
      }
      break;
    case 'out':
      if (m.stepMs >= OUT_MS) {
        b.dir = 1;
        m.targetX = toYou(b);
        inMouth(b);
        step(b, 'bring');
      }
      break;
    case 'dig':
      // It digs, and there it is.
      if (m.stepMs >= DIG_MS) {
        m.targetX = toYou(b);
        inMouth(b);
        step(b, 'bring');
      }
      break;
    case 'await':
      // It watches the bird come over, and what it lets go of fall.
      b.faceX(finds.box?.x ?? b.x, 3);
      if (finds.offered?.state === 'down') {
        step(b, 'fetch');
      }
      break;
    case 'fetch': {
      const box = finds.box;
      if (!box || noseTo(b, box.x + box.w / 2, dt) !== 'going') {
        m.targetX = toYou(b);
        inMouth(b);
        step(b, 'bring');
      }
      break;
    }
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
        inMouth(b);
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
    case 'dig':
      return { anim: 'dig', elapsed: m.stepMs % DIG_LOOP_MS };
    case 'await':
      return { anim: 'bubbleWatch', elapsed: b.elapsed };
    case 'set':
    case 'pick':
      return { anim: 'sniff', elapsed: m.stepMs };
    case 'offer':
      return { anim: 'proud', elapsed: b.elapsed };
    case 'thanks':
      return { anim: 'celebrate', elapsed: m.stepMs };
    default:
      return { anim: b.moving ? (b.running ? 'run' : 'walk') : 'idle', elapsed: b.elapsed };
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
      begin: (b) => startGift(b),
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
      anim: (b) => (b.elapsed < SCRATCH_MS ? { anim: 'dig', elapsed: b.elapsed % DIG_LOOP_MS } : { anim: 'proud', elapsed: b.elapsed }),
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
      b.world.finds.bird = undefined;
      b.y = 0;
    }
  },
} satisfies Feature;
