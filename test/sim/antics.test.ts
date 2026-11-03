import { describe, expect, it } from 'vitest';
import { touch } from '../../webview/sim/features/touch';
import { STATES } from '../../webview/sim/registry';
import type { BuddyState } from '../../webview/sim/state';
import { ANIMATIONS, PRONK_HOPS } from '../../webview/sprites/fox/animations';
import { totalDuration } from '../../webview/sprites/frames';
import { fixed, simulate, spawn } from './helpers';

/** A repeatable stream of random numbers. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Every state it goes through on its own over `hours`, starting from `random`. */
function lived(random: () => number, hours: number, set?: (b: ReturnType<typeof spawn>) => void): Set<BuddyState> {
  const b = spawn(random);
  b.world.resize(300, 60);
  set?.(b);
  const seen = new Set<BuddyState>();
  for (let t = 0; t < hours * 3_600_000; t += 100) {
    b.world.update(100);
    seen.add(b.state);
  }
  return seen;
}

describe('antics', () => {
  it('turns round twice on the spot, then lies down where it stood', () => {
    const b = spawn(fixed(0.1));
    b.world.resize(300, 60);
    b.restore(120, 1);
    b.enterNext('circleDown');
    expect(b.current().anim).toBe('circleDown');
    const dirs: number[] = [];
    simulate(b, totalDuration(ANIMATIONS.circleDown) + 100, () => {
      if (dirs[dirs.length - 1] !== b.dir) {
        dirs.push(b.dir);
      }
      return b.state !== 'circleDown';
    });
    expect(dirs).toEqual([1, -1, 1, -1, 1]);
    expect(b.x).toBe(120);
    expect(b.state).toBe('lie');
  });

  it('bounces for joy on the spot, the last bounce the highest, and lands', () => {
    const b = spawn(fixed(0.5));
    b.world.resize(300, 100);
    b.restore(120, 1);
    b.enterNext('pronk');
    let takeoffs = 0;
    let top = 0;
    let lastTop = 0;
    let was = 0;
    simulate(b, totalDuration(ANIMATIONS.pronk) + 100, () => {
      if (was === 0 && b.y > 0) {
        takeoffs++;
      }
      top = Math.max(top, b.y);
      if (takeoffs === PRONK_HOPS.length) {
        lastTop = Math.max(lastTop, b.y);
      }
      was = b.y;
      return b.state !== 'pronk';
    });
    expect(takeoffs).toBe(PRONK_HOPS.length);
    expect(lastTop).toBe(top);
    expect(top).toBeGreaterThan(6);
    expect(b.y).toBe(0);
    expect(b.x).toBe(120);
    expect(b.state).not.toBe('pronk');
  });

  it('plays each little thing once, then goes on with its day', () => {
    for (const state of ['earScratch', 'petalSneeze', 'hiccups', 'knead', 'circleDown'] as const) {
      const b = spawn(fixed(0.3));
      b.world.resize(300, 60);
      b.enterNext(state);
      expect(b.current().anim).toBe(state);
      simulate(b, totalDuration(ANIMATIONS[state]) + 50);
      expect(b.state, state).not.toBe(state);
      expect(b.y).toBe(0);
    }
  });

  it('kneads the ground before settling into a loaf or lying down', () => {
    const b = spawn(fixed(0.3));
    b.world.resize(300, 60);
    b.enterNext('knead');
    simulate(b, totalDuration(ANIMATIONS.knead) + 50);
    expect(b.state).toBe('loaf');
  });

  it('rolls onto its back only for someone it is fond of, and when it is in the mood', () => {
    const b = spawn(fixed(0.5));
    const rolls = (): boolean => STATES.bellyUp.available?.(b) ?? true;
    expect(rolls()).toBe(false);
    b.world.attachment = 0.3;
    expect(rolls()).toBe(true);
    b.world.mood = -0.4;
    expect(rolls()).toBe(false);
  });

  it('comes up with all of them by itself, the belly in the air only once it is fond of you', () => {
    const OWN: BuddyState[] = ['circleDown', 'loaf', 'knead', 'pronk', 'earScratch', 'petalSneeze', 'hiccups'];
    const stranger = lived(seeded(7), 6);
    for (const state of OWN) {
      expect(stranger.has(state), state).toBe(true);
    }
    expect(stranger.has('bellyUp')).toBe(false);
    const friend = lived(seeded(7), 6, (b) => (b.world.attachment = 0.3));
    expect(friend.has('bellyUp')).toBe(true);
  });

  it('turns shy when its head is touched, and rolls over for a belly rub only for a friend', () => {
    const b = spawn(fixed(0.99));
    b.world.resize(300, 60);
    touch(b, 'head');
    expect(b.current().anim).toBe('shy');
    simulate(b, 8000, () => b.state !== 'touched');
    touch(b, 'back');
    expect(b.current().anim).toBe('flop');
    simulate(b, 8000, () => b.state !== 'touched');
    b.world.attachment = 0.3;
    b.touch.lastVariant.back = undefined;
    touch(b, 'back');
    expect(b.current().anim).toBe('bellyUp');
    simulate(b, 8000, () => b.state !== 'touched');
    expect(b.state).toBe('lie');
  });
});
