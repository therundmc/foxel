import { describe, expect, it } from 'vitest';
import type { Buddy } from '../../webview/sim/buddy';
import { startMousing } from '../../webview/sim/features/mousing';
import { react } from '../../webview/sim/features/reactions';
import { STATES } from '../../webview/sim/registry';
import type { AnimName } from '../../webview/sprites/fox/animations';
import { fixed, simulate, spawn } from './helpers';

describe('mouse hunt', () => {
  function hunt(random: number): { b: Buddy; anims: Set<AnimName>; hidden: boolean } {
    const b = spawn(fixed(random));
    b.world.resize(160, 60);
    b.restore(20, 1);
    startMousing(b);
    const anims = new Set<AnimName>();
    let hidden = false;
    simulate(b, 45_000, () => {
      anims.add(b.current().anim);
      hidden ||= b.mousing.phase === 'lurk' && Math.abs(b.x + 16 - b.world.grass.centerX) < 1;
      return b.state !== 'mousing';
    });
    return { b, anims, hidden };
  }

  it('slips into the tall grass, lies in wait for the mouse and pounces', () => {
    const { anims, hidden } = hunt(0.3);
    expect(hidden).toBe(true);
    expect([...anims]).toEqual(expect.arrayContaining(['alert', 'stalk', 'lurk', 'wiggle', 'leap']));
  });

  it('ends up with the mouse on its head, then waves it goodbye', () => {
    const { b, anims } = hunt(0.3);
    expect(anims).toContain('mouseFriend');
    expect(anims).not.toContain('dive');
    expect(b.state).toBe('wave');
    expect(b.world.mouse.active).toBe(true);
    simulate(b, 5000);
    expect(b.world.mouse.active).toBe(false);
    expect(b.world.grass.active).toBe(false);
  });

  it('lands nose first and wonders where the mouse went when it was too slow', () => {
    const { b, anims } = hunt(0.9);
    expect([...anims]).toEqual(expect.arrayContaining(['dive', 'puzzled']));
    expect(anims).not.toContain('mouseFriend');
    expect(b.world.mouse.active).toBe(false);
  });

  it('lets the mouse go and the grass down when something else comes up', () => {
    const b = spawn(fixed(0.3));
    b.world.resize(160, 60);
    b.restore(20, 1);
    startMousing(b);
    simulate(b, 20_000, () => b.world.mouse.sitting);
    react(b, 'celebrate');
    expect(b.state).toBe('celebrate');
    simulate(b, 3000);
    expect(b.world.mouse.active).toBe(false);
    expect(b.world.grass.active).toBe(false);
  });

  it('does not start where there is no room for it', () => {
    const b = spawn(fixed(0.3));
    b.world.resize(70, 60);
    expect(STATES.mousing.available?.(b)).toBe(false);
    b.world.resize(160, 60);
    expect(STATES.mousing.available?.(b)).toBe(true);
  });
});

describe('little moments', () => {
  for (const state of ['dig', 'glass'] as const) {
    it(`plays ${state} and moves on`, () => {
      const b = spawn(fixed(0.5));
      b.world.resize(160, 60);
      b.enterNext(state);
      expect(b.current().anim).toBe(state);
      simulate(b, 20_000, () => b.state !== state);
      expect(b.state).not.toBe(state);
    });
  }
});
