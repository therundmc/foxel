import { describe, expect, it } from 'vitest';
import type { Buddy } from '../../webview/sim/buddy';
import { startContemplate } from '../../webview/sim/features/contemplate';
import { startHunt } from '../../webview/sim/features/hunt';
import type { AnimName } from '../../webview/sprites/fox/animations';
import { fixed, simulate, spawn } from './helpers';

const at = (hours: number): Date => new Date(2026, 9, 7, hours);

function fox(random: number | (() => number), width = 240, clock = at(14)): Buddy {
  const b = spawn(typeof random === 'number' ? fixed(random) : random);
  b.world.resize(width, 70);
  b.restore(40, 1);
  b.world.setClock(clock, true);
  return b;
}

/** Keeps it sitting, so that nothing of its own gets in the way. */
function sitThrough(b: Buddy, ms: number, each: () => boolean | void): void {
  simulate(b, ms, () => {
    if (b.state !== 'sit' && b.state !== 'hunt') {
      b.enter('sit', 60_000);
    }
    return each();
  });
}

describe('visitors', () => {
  it('a butterfly flutters by on its own, stays a while and leaves', () => {
    const b = fox(0.9);
    const { bug } = b.world;
    let cameAt: number | undefined;
    let leftAt: number | undefined;
    let ms = 0;
    sitThrough(b, 120_000, () => {
      ms += 16;
      if (bug.active) {
        cameAt ??= ms;
      } else if (cameAt !== undefined) {
        leftAt ??= ms;
      }
      return leftAt !== undefined;
    });
    expect(cameAt).toBeGreaterThan(20_000);
    expect(cameAt).toBeLessThan(40_000);
    expect(leftAt! - cameAt!).toBeGreaterThan(9000);
    expect(b.state).toBe('sit');
  });

  it('sometimes cannot resist: it goes after the butterfly that is passing, not another one', () => {
    const b = fox(0.2);
    const { bug } = b.world;
    sitThrough(b, 60_000, () => b.state === 'hunt');
    expect(b.state).toBe('hunt');
    expect(b.hunt.prey).toBe('bug');
    expect(bug.active).toBe(true);
    const x = bug.x;
    b.world.update(16);
    expect(Math.abs(bug.x - x)).toBeLessThan(2);
  });

  it('a bird comes down to peck well away from it, and flies off again', () => {
    // It lands (0.5), and the fox lets it be (0.9).
    let random = 0.5;
    const b = fox(() => random);
    b.visitors.butterflyInMs = Infinity;
    const { bird } = b.world;
    let landedAt: number | undefined;
    let ms = 0;
    sitThrough(b, 200_000, () => {
      ms += 16;
      if (bird.state === 'pecking') {
        landedAt ??= ms;
        random = 0.9;
      }
      return landedAt !== undefined && !bird.active;
    });
    expect(landedAt).toBeGreaterThan(60_000);
    expect(bird.active).toBe(false);
    expect(ms - landedAt!).toBeGreaterThan(6000);
  });

  it('creeps up on a bird on the ground, pounces, and always misses', () => {
    for (const random of [0.1, 0.4]) {
      const b = fox(random);
      const { bird } = b.world;
      bird.land(140, 8, b.world.width, b.world.height);
      simulate(b, 4000, () => bird.state === 'pecking');
      b.enter('sit', 60_000);
      startHunt(b, 'bird');
      const anims = new Set<AnimName>();
      simulate(b, 40_000, () => {
        anims.add(b.current().anim);
        return b.state !== 'hunt';
      });
      expect([...anims]).toEqual(expect.arrayContaining(['alert', 'stalk', 'wiggle', 'leap', 'puzzled']));
      expect(anims).not.toContain('proud');
      simulate(b, 4000);
      expect(bird.active).toBe(false);
    }
  });

  it('only flies across where there is no room to land', () => {
    const b = fox(0.1, 90);
    b.visitors.butterflyInMs = Infinity;
    const states = new Set<string>();
    sitThrough(b, 100_000, () => {
      states.add(b.world.bird.state);
    });
    expect(states).toContain('crossing');
    expect(states).not.toContain('pecking');
    expect(b.state).toBe('sit');
  });

  it('nobody comes at night, nor over a sky it is contemplating', () => {
    const night = fox(0.9, 240, at(23));
    simulate(night, 300_000, () => night.world.bug.active || night.world.bird.active);
    expect(night.world.bug.active || night.world.bird.active).toBe(false);

    const gazing = fox(0.9);
    gazing.visitors.butterflyInMs = 3000;
    gazing.visitors.birdInMs = 3000;
    startContemplate(gazing, 'clouds');
    simulate(gazing, 30_000, () => gazing.world.bug.active || gazing.world.bird.active);
    expect(gazing.world.bug.active || gazing.world.bird.active).toBe(false);
  });
});
