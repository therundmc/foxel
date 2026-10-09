import { describe, expect, it } from 'vitest';
import { startIntro } from '../../webview/sim/features/intro';
import type { AnimName } from '../../webview/sprites/fox/animations';
import { fixed, simulate, spawn } from './helpers';

describe('intro', () => {
  for (const random of [0.2, 0.8]) {
    it(`always peeks its head in from the left, looks around, then trots in and says hello (${random})`, () => {
      const b = spawn(fixed(random));
      b.world.resize(300, 60);
      startIntro(b);
      expect(b.state).toBe('intro');
      expect(b.current().anim).toBe('peek');
      const headOnScreen = b.x + 32;
      expect(b.dir).toBe(1);
      expect(headOnScreen).toBeGreaterThan(10);
      expect(headOnScreen).toBeLessThan(20);
      const glances = new Set<string>();
      const anims = new Set<AnimName>();
      simulate(b, 15_000, () => {
        anims.add(b.current().anim);
        const g = b.gaze({ x: 0, y: 0 });
        if (g) {
          glances.add(`${g.x},${g.y}`);
        }
        return b.state !== 'intro';
      });
      expect(glances.size).toBeGreaterThanOrEqual(3);
      expect([...anims]).toEqual(expect.arrayContaining(['peek', 'run']));
      expect(b.state).toBe('wave');
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x).toBeLessThanOrEqual(b.maxX);
    });
  }
});
