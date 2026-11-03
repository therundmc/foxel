import { describe, expect, it } from 'vitest';
import type { BuddyState } from '../../webview/sim/state';
import { spawnBall } from '../../webview/sim/features/fetch';
import { fixed, simulate, spawn } from './helpers';

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

describe('getting its ball', () => {
  it('trots out of the view to get its ball, comes back in with it from either side, and plays with it', () => {
    const b = spawn(fixed(0.2));
    b.world.resize(300, 60);
    b.restore(60, 1);
    b.enterNext('leave');
    expect(b.state).toBe('leave');
    expect(b.dir).toBe(-1);
    const states = new Set<BuddyState>();
    simulate(b, 30_000, () => {
      states.add(b.state);
      return b.state === 'play';
    });
    expect([...states]).toEqual(expect.arrayContaining(['leave', 'away', 'arrive']));
    expect(b.state).toBe('play');
    expect(b.world.ball.state).toBe('free');
    expect(b.x).toBeGreaterThanOrEqual(0);
  });

  it('just plays with its ball when it is already lying in the view', () => {
    const b = spawn(fixed(0.2));
    b.world.resize(300, 60);
    b.world.ball.place(140, 0, 300, 60);
    b.world.ball.launch(0, 0);
    b.enterNext('leave');
    expect(b.state).toBe('play');
  });

  it('may take its ball away with it once it has played enough', () => {
    const b = spawn(fixed(0.2));
    b.world.resize(300, 60);
    b.restore(150, 1);
    b.world.ball.place(150, 0, 300, 60);
    b.world.ball.launch(0, 0);
    b.enterNext('leave');
    simulate(b, 60_000, () => b.state === 'away');
    expect(b.state).toBe('away');
    expect(b.visible).toBe(false);
    simulate(b, 20_000, () => b.def.calm === true);
    expect(b.world.ball.state).toBe('none');
    expect(b.x).toBeGreaterThanOrEqual(0);
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
    expect(throws).toBeGreaterThan(8);
    // A last shuffle of a few pixels to line itself up, never more.
    expect(worst).toBeLessThanOrEqual(7);
  });
});

