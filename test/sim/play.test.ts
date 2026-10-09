import { describe, expect, it } from 'vitest';
import type { BuddyState } from '../../webview/sim/state';
import { spawnBall } from '../../webview/sim/features/fetch';
import { simulate, spawn } from './helpers';

describe('playing alone', () => {
  it('plays on its own with a ball lying next to it', () => {
    let seed = 7;
    const random = (): number => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const b = spawn(random);
    b.world.resize(300, 60);
    b.restore(100, 1);
    b.world.ball.place(140, 0, 300, 60);
    b.world.ball.launch(0, 0);
    let from: BuddyState | undefined;
    let previous = b.state;
    simulate(b, 300_000, () => {
      if (b.state === 'play') {
        from = previous;
        return true;
      }
      previous = b.state;
    });
    expect(from).toBeDefined();
    expect(['idle', 'walk', 'sit', 'sniff', 'lookAround']).toContain(from);
  });
});

describe('going to its ball', () => {
  it('faces the way it goes: it never runs backwards, whether it plays alone or chases your throws', () => {
    const b = spawn(() => 0.5);
    let seed = 3;
    (b.world as { random: () => number }).random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    b.world.resize(300, 60);
    b.restore(150, 1);
    let before = b.x;
    let backing = 0;
    let worst = 0;
    let throws = 0;
    simulate(b, 240_000, () => {
      if (b.world.ball.state === 'none' || (b.world.ball.resting && b.def.calm)) {
        // Thrown again, now one way, now the other, over its head or along the ground.
        spawnBall(b, 30 + ((throws * 97) % 240), throws % 3 === 0 ? 0 : 30, (throws % 2 === 0 ? 1 : -1) * (20 + ((throws * 31) % 60)));
        throws++;
      }
      const moved = b.x - before;
      before = b.x;
      const onFoot = (b.state === 'fetch' || b.state === 'play' || b.state === 'bring') && b.moving && b.y === 0;
      backing = onFoot && Math.abs(moved) > 0.01 && Math.sign(moved) !== b.dir ? backing + Math.abs(moved) : 0;
      worst = Math.max(worst, backing);
    });
    expect(throws).toBeGreaterThan(10);
    // A last shuffle of a few pixels to line itself up, never more.
    expect(worst).toBeLessThanOrEqual(7);
  });
});

