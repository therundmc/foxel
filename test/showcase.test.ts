import { describe, expect, it } from 'vitest';
import { clockAt } from '../shared/day';
import { SCENES } from '../shared/protocol';
import { Behavior } from '../webview/behavior';
import { Showcase } from '../webview/showcase';
import type { AnimName, Hat } from '../webview/sprites';

describe('Showcase', () => {
  it('plays every daily moment in one go, then hands the clock back', () => {
    const b = new Behavior(() => 0.5);
    b.setWorldSize(300, 60);
    const showcase = new Showcase();
    showcase.play(SCENES);
    const anims = new Set<AnimName>();
    const hats = new Set<Hat | undefined>();
    const effects = new Set<string>();
    for (let t = 0; t < 200_000 && showcase.active; t += 16) {
      b.setClock(clockAt(showcase.hour, new Date(2026, 9, 7, 14)), true);
      b.setParty(showcase.party ? 'friday' : undefined);
      showcase.update(16, b);
      b.update(16);
      anims.add(b.current().anim);
      hats.add(b.hat());
      b.effects.splice(0).forEach((e) => effects.add(e));
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
