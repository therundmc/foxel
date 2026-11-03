import { NOSE_X } from '../../sprites/fox/anchors';
import { SPRITE_SIZE } from '../../sprites/frames';
import type { Buddy } from '../buddy';
import { FETCH_FAR, FETCH_RUN_SPEED, FETCH_WALK_SPEED } from '../tuning';

/** How far ahead of its middle its nose is; how far short of its nose a thing may lie and still be taken; and how far behind its middle a thing is behind it. */
const NOSE_AHEAD = NOSE_X - SPRITE_SIZE / 2;
const SHORT = 9;
const BEHIND = 12;

/** Whether its nose is on the thing, it is on its way, or the thing is under it, too close to its paws for its nose. */
export type Reach = 'there' | 'going' | 'under';

/**
 * Goes and puts its nose on something at `x`, the way an animal would: it walks or runs forward to what is ahead of
 * it, turns round once for what is behind it, and never walks backwards or turns this way and that. What lies just
 * short of its nose it takes from where it stands; what is right under it, it cannot reach (`under`).
 */
export function noseTo(b: Buddy, x: number, dt: number, walk = FETCH_WALK_SPEED): Reach {
  const ahead = (x - (b.x + SPRITE_SIZE / 2)) * b.dir;
  const gap = ahead - NOSE_AHEAD;
  b.running = gap > FETCH_FAR;
  b.moving = false;
  if (ahead < -BEHIND) {
    // Behind it: it turns round, and that puts it well ahead, so it does not turn back.
    b.dir = b.flipped();
    return 'going';
  }
  if (gap <= 0) {
    return gap >= -SHORT ? 'there' : 'under';
  }
  const room = b.dir === 1 ? b.maxX - b.x : b.x;
  const pace = Math.min(gap, room, (b.running ? FETCH_RUN_SPEED : walk) * dt);
  b.x += b.dir * pace;
  b.moving = pace < gap && pace < room;
  return b.moving ? 'going' : 'there';
}

/** The last few steps to where it is going it may take without turning, so as not to turn round for nothing. */
const SHUFFLE = 6;

/**
 * Goes to `x` facing the way it goes, and only turns to `facing` once there (or for the last few steps): it does
 * not run backwards. Returns true while it is still on its way.
 */
export function goTo(b: Buddy, x: number, pace: number, facing: 1 | -1): boolean {
  const left = Math.min(b.maxX, Math.max(0, x)) - b.x;
  if (Math.abs(left) <= pace) {
    b.x += left;
    b.dir = facing;
    return false;
  }
  b.dir = Math.abs(left) > SHUFFLE ? (left > 0 ? 1 : -1) : facing;
  b.x += Math.sign(left) * pace;
  return true;
}
