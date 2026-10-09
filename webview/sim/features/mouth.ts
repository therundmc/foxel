import { ANIMATIONS } from '../../sprites/fox/animations';
import { SPRITE_SIZE, frameAt } from '../../sprites/frames';
import type { Buddy } from '../buddy';
import type { WorldPoint } from '../world';

/** Where its mouth is from the middle of its head, in a frame; what it carries hangs a little under it. */
const MOUTH = 5.5;
const HANGS = 1;

/** Where what it carries in its mouth hangs, wherever its head is in the frame it shows. */
export function mouthPoint(b: Buddy): WorldPoint {
  const { anim, elapsed } = b.current();
  const [hx, hy] = frameAt(ANIMATIONS[anim], elapsed).head;
  return { x: b.x + b.offsetFor(hx + MOUTH), y: b.y + SPRITE_SIZE - (hy + MOUTH) - HANGS };
}
