import type { Buddy } from '../buddy';
import type { Plush } from '../props/plush';
import type { AnimRef } from '../state';
import { mouthPoint } from './mouth';

/**
 * Tug of war. You take hold of the toy it has in its mouth and pull: it digs in and lets itself be dragged a little,
 * and every now and then it yanks back with a shake of its head. Pull hard for long enough and it comes away in
 * your hand; hold on too tight while it yanks and it slips through your fingers.
 */

/** How far your hand can be from its mouth before the toy is taut. */
const SLACK = 5;
/** It follows a taut toy, digging its paws in: this much of the stretch a second, and no faster than this. */
const GIVE = 3;
const GIVE_MOST = 30;
/** Pulled further than this, its grip gives a little; that much strain (pixels held over this, times seconds) and you have it. */
const STRAIN_FROM = 13;
const STRAIN_MOST = 11;
const STRAIN_EASES = 6;
/** Its yanks: how long, how fast it backs, how often, and how taut the toy can be at the end of one before it slips from your hand. */
const YANK_MS = 220;
const YANK_SPEED = 46;
const YANK_EVERY_MS = 520;
const YANK_EVERY_MORE_MS = 650;
const SLIPS_OVER = 19;
/** How long it makes of having won, and of having lost. */
const WON_MS = 760;
const LOST_MS = 900;

export class TugMemory {
  /** Where your hand is. */
  handX = 0;
  handY = 0;
  strain = 0;
  yankMs = 0;
  nextYankMs = 0;
  /** How it ended, and for how long that has been showing. */
  over: 'won' | 'lost' | undefined;
  overMs = 0;
  /** It slipped from your hand: you have to let go and take hold again. */
  slipped = false;
}

export function startTug(b: Buddy, x: number, y: number): void {
  const m = b.plush.tug;
  m.strain = 0;
  m.yankMs = 0;
  m.nextYankMs = YANK_EVERY_MS;
  m.over = undefined;
  m.overMs = 0;
  pullTug(b, x, y);
  b.faceX(x, 0);
}

/** Your hand moved. */
export function pullTug(b: Buddy, x: number, y: number): void {
  b.plush.tug.handX = x;
  b.plush.tug.handY = y;
}

/** You let go: it is the fox's. */
export function dropTug(b: Buddy): void {
  const m = b.plush.tug;
  m.over ??= 'won';
  m.slipped = false;
}

/**
 * One moment of the tug. Returns how it has ended once that has been shown: the fox `won` (it has the toy) or `lost`
 * (it is in your hand, where `toy` has been put).
 */
export function updateTug(b: Buddy, toy: Plush, dt: number, dtMs: number): 'won' | 'lost' | undefined {
  const m = b.plush.tug;
  if (m.over) {
    m.overMs += dtMs;
    return m.overMs >= (m.over === 'won' ? WON_MS : LOST_MS) ? m.over : undefined;
  }
  const stretch = (m.handX - mouthPoint(b).x) * b.dir;
  if (m.yankMs > 0) {
    // A yank: it backs away with a shake of its head.
    m.yankMs -= dtMs;
    b.x = Math.min(b.maxX, Math.max(0, b.x - b.dir * YANK_SPEED * dt));
    if (m.yankMs <= 0 && stretch > SLIPS_OVER) {
      m.over = 'won';
      m.slipped = true;
    }
    return undefined;
  }
  if (stretch > SLACK) {
    b.x = Math.min(b.maxX, Math.max(0, b.x + b.dir * Math.min(GIVE_MOST, (stretch - SLACK) * GIVE) * dt));
  }
  m.strain = Math.max(0, m.strain + (stretch > STRAIN_FROM ? stretch - STRAIN_FROM : -STRAIN_EASES) * dt);
  if (m.strain >= STRAIN_MOST) {
    // It comes away in your hand.
    m.over = 'lost';
    toy.hold(m.handX, m.handY, b.world.width, b.world.height);
    return undefined;
  }
  m.nextYankMs -= dtMs;
  if (m.nextYankMs <= 0) {
    m.yankMs = YANK_MS;
    m.nextYankMs = YANK_EVERY_MS + YANK_EVERY_MORE_MS * b.world.random();
  }
  return undefined;
}

export function tugAnim(b: Buddy, t: number): AnimRef {
  const m = b.plush.tug;
  if (m.over === 'lost') {
    return { anim: 'puzzled', elapsed: m.overMs };
  }
  // Braced low and pulling; its head shakes when it yanks, and when it has won.
  return m.over === 'won' || m.yankMs > 0 ? { anim: 'toyShake', elapsed: t } : { anim: 'haul', elapsed: t % 1000 };
}
