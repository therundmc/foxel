import { describe, expect, it } from 'vitest';
import { clockAt } from '../../shared/day';
import { SCENES } from '../../shared/protocol';
import { Showcase } from '../../webview/sim/showcase';
import type { AnimName } from '../../webview/sprites/fox/animations';
import type { Hat } from '../../webview/sprites/props';
import { fixed, spawn } from './helpers';

describe('Showcase', () => {
  it('plays every daily moment in one go, then hands the clock back', () => {
    const b = spawn(fixed(0.5));
    b.world.resize(300, 60);
    const showcase = new Showcase();
    showcase.play(SCENES);
    const anims = new Set<AnimName>();
    const hats = new Set<Hat | undefined>();
    const effects = new Set<string>();
    for (let t = 0; t < 200_000 && showcase.active; t += 16) {
      b.world.setClock(clockAt(showcase.hour, new Date(2026, 9, 7, 14)), true);
      b.world.party = showcase.party ? 'friday' : undefined;
      showcase.update(16, b);
      b.world.update(16);
      anims.add(b.current().anim);
      hats.add(b.hat());
      b.world.effects.splice(0).forEach((e) => effects.add(e));
    }
    expect(showcase.active).toBe(false);
    expect(showcase.hour).toBeUndefined();
    for (const anim of [
      'morning',
      'hungry',
      'hungrySad',
      'eatBowl',
      'drink',
      'sigh',
      'doze',
      'typingSleepy',
      'drowsy',
      'goodNight',
    ] as const) {
      expect(anims, anim).toContain(anim);
    }
    expect(hats).toContain('party');
    expect(hats).toContain('nightcap');
    expect(effects).toContain('confetti');
    expect(effects).toContain('fed');
  });
});
