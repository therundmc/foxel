import { describe, expect, it } from 'vitest';
import { startErrand } from '../../webview/sim/features/play';
import { react } from '../../webview/sim/features/reactions';
import type { BuddyState } from '../../webview/sim/state';
import { fixed, simulate, spawn } from './helpers';

describe('errand', () => {
  it('leaves the screen, comes back with a ball, plays, then brings it back', () => {
    const b = spawn(fixed(0.3));
    b.world.resize(300, 60);
    startErrand(b);
    const states = new Set<BuddyState>();
    const ballStates = new Set<string>();
    simulate(b, 120_000, () => {
      states.add(b.state);
      ballStates.add(b.world.ball.state);
      if (b.state === 'away') {
        expect(b.visible).toBe(false);
      }
      return states.has('play') && b.state === 'arrive';
    });
    expect([...states]).toEqual(expect.arrayContaining(['leave', 'away', 'arrive', 'play']));
    expect([...ballStates]).toEqual(expect.arrayContaining(['mouth', 'free']));
    expect(b.world.ball.state).toBe('none');
  });

  it('drops the ball and comes back on screen when interrupted', () => {
    const b = spawn(fixed(0.3));
    b.world.resize(300, 60);
    startErrand(b);
    simulate(b, 30_000, () => b.state === 'arrive');
    expect(b.world.ball.state).toBe('mouth');
    react(b, 'love');
    expect(b.state).toBe('love');
    expect(b.world.ball.state).toBe('free');
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x).toBeLessThanOrEqual(b.maxX);
  });
});

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
