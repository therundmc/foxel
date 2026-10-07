import { describe, expect, it } from 'vitest';
import type { Buddy } from '../../webview/sim/buddy';
import { startHunt } from '../../webview/sim/features/hunt';
import type { AnimName } from '../../webview/sprites/fox/animations';
import { fixed, simulate, spawn } from './helpers';

describe('hunt', () => {
  function hunt(randomValue: number): { anims: Set<AnimName>; b: Buddy } {
    const b = spawn(fixed(randomValue));
    b.world.resize(300, 80);
    startHunt(b);
    const anims = new Set<AnimName>();
    simulate(b, 40_000, () => {
      expect(b.y).toBeLessThanOrEqual(b.maxY);
      anims.add(b.current().anim);
      return b.state !== 'hunt';
    });
    return { anims, b };
  }

  it('spots, stalks, wiggles, leaps and catches the butterfly', () => {
    const { anims, b } = hunt(0.2);
    expect([...anims]).toEqual(expect.arrayContaining(['alert', 'stalk', 'wiggle', 'leap', 'proud']));
    expect(b.world.bug.active).toBe(false);
  });

  it('looks puzzled when the butterfly escapes', () => {
    const { anims } = hunt(0.9);
    expect([...anims]).toEqual(expect.arrayContaining(['leap', 'puzzled']));
    expect(anims.has('proud')).toBe(false);
  });

  it('keeps its eyes on the butterfly', () => {
    const b = spawn(fixed(0.2));
    b.world.resize(300, 80);
    b.world.pointer = { x: 0, y: 0 };
    startHunt(b);
    b.world.update(16);
    expect(b.focusTarget()?.x).toBeCloseTo(b.world.bug.centerX);
  });
});
