import { describe, expect, it } from 'vitest';
import { react } from '../../webview/sim/features/reactions';
import { startStargaze } from '../../webview/sim/features/stargaze';
import { STATES } from '../../webview/sim/registry';
import type { AnimName } from '../../webview/sprites/fox/animations';
import { fixed, simulate, spawn } from './helpers';

describe('stargazing', () => {
  function gazer(x: number) {
    const b = spawn(fixed(0.5));
    b.world.resize(160, 60);
    b.restore(x, 1);
    startStargaze(b);
    return b;
  }

  it('turns to the open sky and the stars come out little by little', () => {
    const b = gazer(120);
    const { stars } = b.world;
    expect(b.dir).toBe(-1);
    expect(stars.moon.x + stars.moon.w / 2).toBeLessThan(b.x + 16);
    simulate(b, 2000);
    expect(b.current().anim).toBe('stargaze');
    const early = stars.glow;
    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(0.5);
    simulate(b, 8000);
    expect(stars.glow).toBe(1);
  });

  it('dreams for a long while: a wish on a shooting star, then lying down until its eyes close', () => {
    const b = gazer(20);
    const anims: AnimName[] = [];
    let shotAt: number | undefined;
    let ms = 0;
    simulate(b, 60_000, () => {
      ms += 16;
      const { anim } = b.current();
      if (anims[anims.length - 1] !== anim) {
        anims.push(anim);
      }
      if (b.world.stars.shooting && shotAt === undefined) {
        shotAt = ms;
        expect(b.world.stars.shooting.dir).toBe(b.dir);
      }
      return b.state !== 'stargaze';
    });
    expect(anims.slice(0, 5)).toEqual(['gazeUp', 'stargaze', 'starWish', 'stargazeLie', 'stargazeDrowsy']);
    expect(shotAt).toBeGreaterThan(10_000);
    expect(ms).toBeGreaterThan(30_000);
    expect(b.world.stars.shooting).toBeUndefined();
  });

  it('lets the sky fade once it looks away', () => {
    const b = gazer(20);
    simulate(b, 10_000);
    expect(b.world.stars.glow).toBe(1);
    react(b, 'celebrate');
    expect(b.state).toBe('celebrate');
    simulate(b, 4000);
    expect(b.world.stars.glow).toBe(0);
  });

  it('does not gaze again for a good while', () => {
    const b = spawn(fixed(0.5));
    b.world.resize(160, 60);
    expect(STATES.stargaze.available?.(b)).toBe(false);
    simulate(b, 5 * 60_000);
    expect(STATES.stargaze.available?.(b)).toBe(true);
    startStargaze(b);
    simulate(b, 5 * 60_000);
    expect(STATES.stargaze.available?.(b)).toBe(false);
    simulate(b, 4 * 60_000);
    expect(STATES.stargaze.available?.(b)).toBe(true);
  });

  it('keeps gazing while you type', () => {
    const b = gazer(20);
    simulate(b, 3000);
    react(b, 'typing');
    expect(b.state).toBe('stargaze');
  });
});
