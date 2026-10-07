import { ANIMATIONS } from '../../sprites/fox/animations';
import { SPRITE_SIZE, totalDuration } from '../../sprites/frames';
import type { Buddy } from '../buddy';
import type { Feature } from '../state';

const RAISE_MS = totalDuration(ANIMATIONS.gazeUp);
const WISH_MS = totalDuration(ANIMATIONS.starWish);
const DROWSE_MS = totalDuration(ANIMATIONS.stargazeDrowsy);
/** How far ahead of itself it looks: the moon hangs there, and the shooting star starts short of it. */
const LOOK_AHEAD = 30;
const SHOOT_FROM = 6;
/** A long quiet moment like this one stays special: not again before this long. */
const AGAIN_MS = 8 * 60_000;

export class StargazeMemory {
  /** When the shooting star comes, counted from the moment it sat down. */
  wishAt = 0;
  wished = false;
  /** Time since it last sat down to gaze. */
  sinceMs = AGAIN_MS / 2;
}

/** Sits down facing the open sky; the stars come out as it looks up. */
export function startStargaze(b: Buddy): void {
  const center = b.x + SPRITE_SIZE / 2;
  b.dir = center < b.world.width / 2 ? 1 : -1;
  b.stargaze.wishAt = b.between(11_000, 15_000);
  b.stargaze.wished = false;
  b.stargaze.sinceMs = 0;
  b.enter('stargaze', b.between(32_000, 40_000));
}

// It looks up, dreams for a while, makes a wish on a shooting star, then lies down and gazes on until its eyes close.
export const stargazeFeature = {
  states: {
    stargaze: {
      restful: true,
      next: [['lie', 45], ['yawn', 30], ['sit', 25]],
      hat: () => 'none',
      available: (b) => b.stargaze.sinceMs >= AGAIN_MS,
      begin: startStargaze,
      update(b, dt) {
        b.fall(dt);
        const m = b.stargaze;
        if (!m.wished && b.elapsed >= m.wishAt) {
          m.wished = true;
          b.world.stars.shoot(b.x + SPRITE_SIZE / 2 + b.dir * SHOOT_FROM, b.dir);
        }
      },
      anim(b) {
        const sinceWish = b.elapsed - b.stargaze.wishAt;
        if (b.elapsed < RAISE_MS) {
          return { anim: 'gazeUp', elapsed: b.elapsed };
        }
        if (sinceWish < 0) {
          return { anim: 'stargaze', elapsed: b.elapsed - RAISE_MS };
        }
        if (sinceWish < WISH_MS) {
          return { anim: 'starWish', elapsed: sinceWish };
        }
        const left = b.duration - b.elapsed;
        return left < DROWSE_MS
          ? { anim: 'stargazeDrowsy', elapsed: Math.max(0, DROWSE_MS - left) }
          : { anim: 'stargazeLie', elapsed: sinceWish - WISH_MS };
      },
    },
  },
  tick(b, dtMs) {
    b.stargaze.sinceMs += dtMs;
  },
  // The sky is only out while it is looking at it.
  entered(b, state) {
    const { stars, width, height } = b.world;
    if (state === 'stargaze') {
      stars.appear(b.x + SPRITE_SIZE / 2 + b.dir * LOOK_AHEAD, width, height);
    } else {
      stars.fade();
    }
  },
} satisfies Feature;
