import { ANIMATIONS } from '../../sprites/fox/animations';
import { SPRITE_SIZE, frameAt } from '../../sprites/frames';
import type { Buddy } from '../buddy';
import { begin, phase, playingWith } from './plush';
import { asleep } from './rest';

/** A toy that comes at its head this fast knocks it silly for a moment: how near its head, and how the toy bounces off. */
const BONK_SPEED = 45;
const BONK_NEAR = 8;
const BONK_BACK = 0.4;
const BONK_UP = 38;

// A toy coming down on its head, or thrown at it, bounces off and leaves it dazed: it missed that one.
export function bonk(b: Buddy): void {
  if (b.def.offscreen || b.def.hidden || asleep(b) || (b.state === 'plush' && (b.plush.phase === 'leap' || b.plush.phase === 'dazed' || b.plush.phase === 'trick' || b.plush.phase === 'tug'))) {
    return;
  }
  const { anim, elapsed } = b.current();
  const [hx, hy] = frameAt(ANIMATIONS[anim], elapsed).head;
  const headX = b.x + b.offsetFor(hx);
  const headY = b.y + SPRITE_SIZE - hy;
  for (const toy of Object.values(b.world.plushes)) {
    const { x: vx, y: vy } = toy.velocity;
    const coming = toy.state === 'free' && toy.speed >= BONK_SPEED && (vy < 0 || Math.abs(vx) >= BONK_SPEED);
    if (!coming || Math.hypot(toy.center - headX, toy.y + toy.h / 2 - headY) > BONK_NEAR) {
      continue;
    }
    const away = vx !== 0 ? -Math.sign(vx) : toy.center < headX ? -1 : 1;
    toy.toss(away * Math.max(14, Math.abs(vx) * BONK_BACK), BONK_UP);
    if (playingWith(b, toy.kind)) {
      b.plush.misses += b.plush.inPlay ? 1 : 0;
      b.plush.inPlay = false;
      b.plush.rally = 0;
      phase(b, 'dazed');
    } else {
      b.tryEnter('plush', Infinity);
      if (b.state === 'plush') {
        begin(b, toy.kind, 'dazed');
      }
    }
    return;
  }
}
