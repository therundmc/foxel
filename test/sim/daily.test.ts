import { describe, expect, it } from 'vitest';
import type { Buddy } from '../../webview/sim/buddy';
import { spawnBall } from '../../webview/sim/features/fetch';
import { startIntro } from '../../webview/sim/features/intro';
import { fillBowl } from '../../webview/sim/features/meals';
import { react } from '../../webview/sim/features/reactions';
import type { BuddyState } from '../../webview/sim/state';
import type { AnimName } from '../../webview/sprites/fox/animations';
import { fixed, simulate, spawn } from './helpers';

describe('living with you', () => {
  const at = (hours: number, minutes = 0, day = 7): Date => new Date(2026, 9, day, hours, minutes);

  function fox(time: Date, random = 0.5): Buddy {
    const b = spawn(fixed(random));
    b.world.resize(300, 60);
    b.restore(120, 1);
    b.world.setClock(time, true);
    return b;
  }

  it('gets hungry at meal time, pushes out its bowl and begs until you fill it, then eats kibble by kibble', () => {
    const b = fox(at(12));
    react(b, 'hungry');
    expect(b.state).toBe('hungry');
    expect(b.world.foodBowl.active).toBe(true);
    expect(b.world.foodBowl.empty).toBe(true);
    const emotes = new Set<string | undefined>();
    simulate(b, 7000, () => {
      emotes.add(b.emote());
    });
    expect(b.state).toBe('hungry');
    expect(b.current().anim).toBe('hungry');
    expect(emotes).toContain('bowl');

    fillBowl(b);
    expect(b.world.foodBowl.amount).toBe(5);
    const anims = new Set<AnimName>();
    simulate(b, 10_000, () => {
      anims.add(b.current().anim);
      return b.world.effects.includes('fed');
    });
    expect(anims).toContain('eatBowl');
    expect(b.world.foodBowl.amount).toBe(0);
    expect(b.world.effects).toEqual(['fed']);
    simulate(b, 2000);
    expect(b.world.foodBowl.active).toBe(false);
    expect(b.state).not.toBe('hungry');
  });

  it('serves a smaller portion at snack time', () => {
    const b = fox(at(16, 15));
    fillBowl(b);
    expect(b.world.foodBowl.amount).toBe(3);
  });

  it('looks sad when the meal time passes and nobody fed it', () => {
    const b = fox(at(13, 59));
    react(b, 'hungry');
    simulate(b, 1000);
    b.world.setClock(at(14, 1), true);
    b.world.update(16);
    expect(b.state).toBe('sad');
    expect(b.world.foodBowl.active).toBe(false);
  });

  it('waits until it is free before going after food or water', () => {
    const b = fox(at(12));
    spawnBall(b, 200, 20, 0);
    react(b, 'hungry');
    react(b, 'drink');
    expect(b.state).toBe('fetch');
  });

  it('has a drink from a water bowl that then goes away', () => {
    const b = fox(at(10));
    react(b, 'drink');
    expect(b.state).toBe('drink');
    expect(b.world.waterBowl.active).toBe(true);
    expect(b.emote()).toBe('drop');
    const anims = new Set<AnimName>();
    simulate(b, 10_000, () => {
      anims.add(b.current().anim);
      return b.world.waterBowl.amount === 0;
    });
    expect(anims).toContain('drink');
    simulate(b, 2000);
    expect(b.world.waterBowl.active).toBe(false);
  });

  it('fetches its ball and asks for a break, then sighs when you keep working', () => {
    const b = fox(at(15));
    react(b, 'breakTime');
    expect(b.state).toBe('leave');
    simulate(b, 30_000, () => b.state === 'askBreak');
    expect(b.state).toBe('askBreak');
    expect(b.emote()).toBe('cup');
    expect(b.world.ball.state).toBe('free');
    simulate(b, 7000);
    react(b, 'breakTime');
    expect(b.current().anim).toBe('sigh');
  });

  it('trots to its basket with a nightcap at night, and leaves it in the morning', () => {
    const b = fox(at(23));
    react(b, 'sleep');
    expect(b.state).toBe('toBed');
    expect(b.world.bed).toBe(0);
    expect(b.hat()).toBe('nightcap');
    simulate(b, 30_000, () => b.state === 'sleep');
    expect(b.x).toBe(b.world.bed);
    expect(b.hat()).toBe('nightcap');
    react(b, 'wake');
    expect(b.world.bed).toBeDefined();
    simulate(b, 5000, () => b.state !== 'stretch');
    expect(b.world.bed).toBeUndefined();
  });

  it('naps where it is during the day, and when day and night are turned off', () => {
    const day = fox(at(14));
    react(day, 'sleep');
    expect(day.state).toBe('sleep');
    expect(day.world.bed).toBeUndefined();
    const off = fox(at(23));
    off.world.setClock(at(23), false);
    react(off, 'sleep');
    expect(off.state).toBe('sleep');
    expect(off.hat()).toBeUndefined();
  });

  for (const [hour, anim, emote] of [
    [8, 'morning', 'sun'],
    [22, 'goodNight', 'moon'],
  ] as const) {
    it(`says ${anim === 'morning' ? 'good morning' : 'good night'} when it comes in`, () => {
      const b = fox(at(hour));
      startIntro(b);
      simulate(b, 15_000, () => b.state !== 'intro');
      expect(b.current().anim).toBe(anim);
      const emotes = new Set<string | undefined>();
      simulate(b, 5000, () => {
        emotes.add(b.emote());
        return b.state !== 'touched';
      });
      expect(emotes).toContain(emote);
    });
  }

  it('wears a party hat and throws confetti on Friday afternoon', () => {
    const b = fox(at(16, 0, 9));
    b.world.party = 'friday';
    expect(b.hat()).toBe('party');
    startIntro(b);
    simulate(b, 15_000, () => b.state !== 'intro');
    expect(b.state).toBe('celebrate');
    expect(b.world.effects).toContain('confetti');
  });

  it('dozes off in the afternoon and gets drowsy at night, but not in the morning', () => {
    const seen = (time: Date): Set<BuddyState> => {
      let seed = 11;
      const random = (): number => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      const b = spawn(random);
      b.world.resize(300, 60);
      b.world.setClock(time, true);
      const states = new Set<BuddyState>();
      simulate(b, 600_000, () => {
        states.add(b.state);
      });
      return states;
    };
    expect(seen(at(15))).toContain('doze');
    expect(seen(at(23))).toContain('drowsy');
    const morning = seen(at(10));
    expect(morning).not.toContain('doze');
    expect(morning).not.toContain('drowsy');
  });

  it('types along sleepily late at night', () => {
    const b = fox(at(1));
    react(b, 'typing');
    expect(b.current().anim).toBe('typingSleepy');
  });
});
