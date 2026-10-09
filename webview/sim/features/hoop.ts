import type { Buddy } from '../buddy';
import type { Feature } from '../state';
import { REACTION_MS } from './reactions';
import { tookBreak } from './rest';
import { wantBack } from './rummage';

// A toy thrown straight into the open chest: it goes in, the lid shuts on it, and the fox is beside itself.
function watchForShots(b: Buddy): void {
  const { chest, ball, plushes } = b.world;
  const scored = (what: 'ball' | 'teddy' | 'duck'): void => {
    chest.stowed();
    b.world.effects.push('confetti');
    tookBreak(b);
    b.tryEnter('happy', REACTION_MS.happy);
    // And being in that mood, it may well go and get it out again.
    wantBack(b, what);
  };
  for (const toy of Object.values(plushes)) {
    if (toy.falling && chest.catches(toy.center, toy.y)) {
      toy.state = 'none';
      scored(toy.kind);
    }
  }
  if (ball.state === 'free' && ball.vy < 0 && chest.catches(ball.center, ball.y)) {
    ball.state = 'none';
    scored('ball');
  }
}

export const hoopFeature = { states: {}, tick: watchForShots } satisfies Feature;
