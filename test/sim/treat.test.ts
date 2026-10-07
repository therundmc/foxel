import { describe, expect, it } from 'vitest';
import type { Buddy } from '../../webview/sim/buddy';
import { react } from '../../webview/sim/features/reactions';
import { giveTreat, grabTreat, moveHeldTreat, releaseTreat } from '../../webview/sim/features/treat';
import { ANIMATIONS, type AnimName } from '../../webview/sprites/fox/animations';
import { frameAt, totalDuration } from '../../webview/sprites/frames';
import { fixed, simulate, spawn } from './helpers';

describe('treat', () => {
  function eatTrace(b: Buddy): { anims: Set<AnimName>; eatMs: number } {
    const anims = new Set<AnimName>();
    let eatMs = 0;
    simulate(b, 30_000, () => {
      anims.add(b.current().anim);
      if (b.current().anim === 'eat') {
        eatMs += 16;
      }
      return b.state !== 'snack' && b.state !== 'beg';
    });
    return { anims, eatMs };
  }

  it('runs to a dropped treat and eats it bite by bite, taking its time', () => {
    const b = spawn(fixed(0.5));
    b.world.resize(300, 60);
    b.restore(20, 1);
    giveTreat(b, 240);
    expect(b.state).toBe('snack');
    const { anims, eatMs } = eatTrace(b);
    expect([...anims]).toEqual(expect.arrayContaining(['run', 'eat']));
    expect(eatMs).toBeGreaterThan(6000);
    expect(b.state).toBe('lie');
    expect(b.world.treat.active).toBe(false);
  });

  it('eats with the treat just past its nose, on whichever side fits', () => {
    for (const at of [6, 150, 294]) {
      const b = spawn(fixed(0.5));
      b.world.resize(300, 60);
      b.restore(130, 1);
      giveTreat(b, at);
      simulate(b, 10_000, () => b.world.treat.state === 'eating');
      expect(b.world.treat.state).toBe('eating');
      const nose = b.x + (b.dir === 1 ? 29 : 2);
      expect(Math.abs(b.world.treat.centerX - nose)).toBeLessThan(6);
      expect((b.world.treat.centerX - nose) * b.dir).toBeGreaterThan(0);
    }
  });

  it('begs for a treat held in the hand and takes it from there', () => {
    const b = spawn(fixed(0.5));
    b.world.resize(300, 60);
    b.restore(20, 1);
    giveTreat(b, 200);
    simulate(b, 3000, () => b.world.treat.landed);
    grabTreat(b, 200, 40);
    expect(b.state).toBe('beg');
    simulate(b, 8000, () => b.current().anim === 'beg');
    expect(b.current().anim).toBe('beg');
    expect(b.world.treat.state).toBe('held');
    const mouth = b.x + (b.dir === 1 ? 26.5 : 5.5);
    moveHeldTreat(b, mouth, 14.5);
    b.world.update(16);
    expect(b.world.treat.state).toBe('eating');
    const { eatMs } = eatTrace(b);
    expect(eatMs).toBeGreaterThan(6000);
    expect(b.world.treat.active).toBe(false);
  });

  it('goes after a treat dropped from the hand', () => {
    const b = spawn(fixed(0.5));
    b.world.resize(300, 60);
    giveTreat(b, 150);
    simulate(b, 3000, () => b.world.treat.landed);
    grabTreat(b, 250, 40);
    releaseTreat(b);
    b.world.update(16);
    expect(b.state).toBe('snack');
    eatTrace(b);
    expect(b.world.treat.active).toBe(false);
  });

  it('wakes up for a treat', () => {
    const b = spawn(fixed(0.5));
    b.world.resize(300, 60);
    react(b, 'sleep');
    giveTreat(b, 150);
    expect(b.state).toBe('snack');
  });

  it('picks a half-eaten treat back up where it left off after being interrupted', () => {
    const b = spawn(fixed(0.5));
    b.world.resize(300, 60);
    giveTreat(b, 150);
    simulate(b, 10_000, () => b.world.treat.state === 'eating');
    simulate(b, 4000);
    react(b, 'panic');
    expect(b.world.treat.state).toBe('free');
    const stage = b.world.treat.stage;
    expect(stage).toBeGreaterThan(0);
    simulate(b, 30_000, () => b.world.treat.state === 'eating');
    const shown = new Set<number | undefined>();
    let eatMs = 0;
    simulate(b, 30_000, () => {
      if (b.current().anim === 'eat') {
        shown.add(frameAt(ANIMATIONS.eat, b.current().elapsed).treat);
        eatMs += 16;
      }
      return !b.world.treat.active;
    });
    expect(b.world.treat.active).toBe(false);
    expect(Math.min(...[...shown].filter((s) => s !== undefined))).toBe(stage);
    expect(eatMs).toBeLessThan(totalDuration(ANIMATIONS.eat) - 3000);
  });

  it('finishes for good if interrupted while licking its lips', () => {
    const b = spawn(fixed(0.5));
    b.world.resize(300, 60);
    giveTreat(b, 150);
    simulate(b, 10_000, () => b.world.treat.state === 'eating');
    simulate(b, totalDuration(ANIMATIONS.eat) - 500);
    react(b, 'panic');
    expect(b.world.treat.active).toBe(false);
  });
});
