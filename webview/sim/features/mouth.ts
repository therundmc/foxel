import { ANIMATIONS } from '../../sprites/fox/animations';
import { SPRITE_SIZE, frameAt } from '../../sprites/frames';
import type { Buddy } from '../buddy';
import { clamp } from '../math';
import type { Plush } from '../props/plush';
import { FETCH_FAR, FETCH_RUN_SPEED, FETCH_WALK_SPEED } from '../tuning';
import type { WorldPoint } from '../world';

/** Where its mouth is from the middle of its head, in a frame; what it carries hangs a little under it. */
const MOUTH = 5.5;
const HANGS = 1;
/** A step back this short, to get its nose on something, it does not bother with: it takes it from where it stands. */
const STEP_BACK = 9;

/** Where what it carries in its mouth hangs, wherever its head is in the frame it shows. */
export function mouthPoint(b: Buddy): WorldPoint {
  const { anim, elapsed } = b.current();
  const [hx, hy] = frameAt(ANIMATIONS[anim], elapsed).head;
  return { x: b.x + b.offsetFor(hx + MOUTH), y: b.y + SPRITE_SIZE - (hy + MOUTH) - HANGS };
}

/** The toy hangs from its mouth. */
export function carryInMouth(b: Buddy, toy: Plush): void {
  const at = mouthPoint(b);
  toy.carry(at.x, at.y);
}

/**
 * Goes and puts its nose on `x`: at a run when it is far, and always facing the way it goes. It never walks
 * backwards: if it has overshot, it turns round, steps away and turns back. Returns true once it is there.
 */
export function noseTo(b: Buddy, x: number, dt: number, walk = FETCH_WALK_SPEED): boolean {
  const facing = x >= b.x + SPRITE_SIZE / 2 ? 1 : -1;
  const left = clamp(x - b.noseOffset(facing), 0, b.maxX) - b.x;
  const backing = left * facing < 0;
  b.running = Math.abs(left) > FETCH_FAR;
  const pace = (b.running ? FETCH_RUN_SPEED : walk) * dt;
  b.moving = Math.abs(left) > pace && !(backing && Math.abs(left) <= STEP_BACK);
  if (b.moving) {
    b.dir = left > 0 ? 1 : -1;
    b.x += b.dir * pace;
    return false;
  }
  b.x += backing ? 0 : left;
  b.dir = facing;
  return true;
}
