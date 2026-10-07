import { describe, expect, it } from 'vitest';
import type { Buddy } from '../../webview/sim/buddy';
import { grabBall, spawnBall, throwBall } from '../../webview/sim/features/fetch';
import type { BuddyState } from '../../webview/sim/state';
import type { AnimName } from '../../webview/sprites/fox/animations';
import { fixed, simulate, spawn } from './helpers';

describe('ball game with the user', () => {
  it('watches the held ball, fetches it once thrown and brings it back', () => {
    const b = spawn(fixed(0.5));
    b.world.resize(300, 60);
    grabBall(b, 150, 20);
    expect(b.state).toBe('watch');
    expect(b.focusTarget()?.x).toBeCloseTo(150);
    throwBall(b, 80, 30, 40);
    expect(b.state).toBe('fetch');
    const states = new Set<BuddyState>();
    simulate(b, 30_000, () => {
      states.add(b.state);
      return b.state === 'await';
    });
    expect([...states]).toEqual(expect.arrayContaining(['fetch', 'bring']));
    expect(b.state).toBe('await');
    expect(b.world.ball.state).toBe('free');
    expect(Math.abs(b.world.ball.center - 40)).toBeLessThan(6);
  });

  describe('shows off with the ball once it brings it back', () => {
    function play(random: number): { anims: Set<AnimName>; top: number; b: Buddy } {
      const b = spawn(fixed(random));
      b.world.resize(300, 80);
      grabBall(b, 150, 20);
      throwBall(b, 80, 30, 40);
      const anims = new Set<AnimName>();
      let top = 0;
      simulate(b, 40_000, () => {
        anims.add(b.current().anim);
        if (b.state === 'trick' && b.world.ball.state === 'free') {
          top = Math.max(top, b.world.ball.y);
        }
        return b.state === 'await';
      });
      return { anims, top, b };
    }

    it('balances it on its nose like a seal', () => {
      const { anims, b } = play(0);
      expect(anims).toContain('balance');
      expect(b.state).toBe('await');
      expect(b.world.ball.state).toBe('free');
    });

    it('tosses it up and catches it', () => {
      const { anims, top, b } = play(0.3);
      expect([...anims]).toEqual(expect.arrayContaining(['tossFlick', 'tossWait', 'tossCatch']));
      expect(top).toBeGreaterThan(20);
      expect(b.state).toBe('await');
    });

    it('rolls it between its paws', () => {
      const { anims } = play(0.5);
      expect(anims).toContain('pawPlay');
    });

    it('sometimes just drops it and waits', () => {
      const { anims, b } = play(0.8);
      expect([...anims].some((a) => ['balance', 'tossFlick', 'pawPlay'].includes(a))).toBe(false);
      expect(b.state).toBe('await');
    });
  });

  it('fetches a spawned ball', () => {
    const b = spawn(fixed(0.5));
    b.world.resize(300, 60);
    spawnBall(b, 100, 40, 20);
    expect(b.state).toBe('fetch');
    expect(b.world.ball.state).toBe('free');
  });

  it('leaps to catch a ball thrown its way', () => {
    const b = spawn(fixed(0.5));
    b.world.resize(300, 80);
    b.restore(120, 1);
    grabBall(b, 190, 40);
    throwBall(b, -50, 20, 250);
    let caughtInAir = false;
    simulate(b, 5000, () => {
      caughtInAir ||= b.world.ball.state === 'mouth' && b.y > 0;
      return b.state === 'bring';
    });
    expect(caughtInAir).toBe(true);
    expect(b.state).toBe('bring');
    expect(b.y).toBe(0);
  });

  it('meets a ball rolling toward it instead of backing away', () => {
    const b = spawn(fixed(0.5));
    b.world.resize(300, 60);
    b.restore(100, 1);
    spawnBall(b, 250, 0, 0);
    b.world.ball.vx = -40;
    let lastX = b.x;
    simulate(b, 5000, () => {
      expect(b.x).toBeGreaterThanOrEqual(lastX);
      lastX = b.x;
      return b.state === 'bring';
    });
    expect(b.state).toBe('bring');
  });
});
