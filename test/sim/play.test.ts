import { describe, expect, it } from 'vitest';
import type { BuddyState } from '../../webview/sim/state';
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
