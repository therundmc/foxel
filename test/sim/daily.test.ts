import { describe, expect, it } from 'vitest';
import type { Buddy } from '../../webview/sim/buddy';
import { grabBall, spawnBall, throwBall } from '../../webview/sim/features/fetch';
import { startIntro } from '../../webview/sim/features/intro';
import { fillBowl } from '../../webview/sim/features/meals';
import { react } from '../../webview/sim/features/reactions';
import { recall, remember } from '../../webview/sim/memory';
import type { BuddyState } from '../../webview/sim/state';
import type { AnimName } from '../../webview/sprites/fox/animations';
import { SPRITE_SIZE } from '../../webview/sprites/frames';
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

  it('has its bowl set down from above, and taken back up once it is empty', () => {
    const b = fox(at(12));
    const bowl = b.world.foodBowl;
    react(b, 'hungry');
    expect(bowl.y).toBe(b.world.height);
    simulate(b, 3000, () => !bowl.moving);
    expect(bowl.y).toBe(0);
    fillBowl(b);
    simulate(b, 10_000, () => b.world.effects.includes('fed'));
    simulate(b, 3000, () => !bowl.active);
    // It is no longer there to eat from, but still to be seen on its way up.
    expect(bowl.visible).toBe(true);
    simulate(b, 60);
    expect(bowl.y).toBeGreaterThan(0);
    simulate(b, 2000);
    expect(bowl.visible).toBe(false);
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

  it('pulls its basket in at night, and sleeps in it with the nightcap that was waiting there', () => {
    const b = fox(at(23));
    const { basket } = b.world;
    react(b, 'sleep');
    expect(b.state).toBe('toBed');
    // The basket waits just out of view, the nightcap in it.
    expect(basket.home).toBe(0);
    expect(basket.x).toBeLessThan(-SPRITE_SIZE);
    expect(basket.cap).toBe(true);
    expect(b.hat()).toBeUndefined();
    simulate(b, 30_000, () => b.current().anim === 'tug');
    expect(b.x).toBeGreaterThan(basket.home);
    expect(b.dir).toBe(-1);
    simulate(b, 30_000, () => b.state === 'sleep');
    expect(basket.x).toBe(0);
    expect(b.x).toBe(0);
    expect(basket.cap).toBe(false);
    expect(b.hat()).toBe('nightcap');
  });

  it('stretches when woken, leaves its nightcap in the basket and pushes it out of the view', () => {
    const b = fox(at(23));
    const { basket } = b.world;
    react(b, 'sleep');
    simulate(b, 30_000, () => b.state === 'sleep');
    react(b, 'wake');
    expect(b.state).toBe('tidyBed');
    expect(b.current().anim).toBe('stretch');
    expect(b.hat()).toBe('nightcap');
    simulate(b, 10_000, () => b.current().anim === 'shove');
    expect(basket.cap).toBe(true);
    expect(b.hat()).toBeUndefined();
    expect(b.dir).toBe(-1);
    expect(basket.x).toBe(0);
    simulate(b, 10_000, () => b.state !== 'tidyBed');
    simulate(b, 1500);
    expect(basket.active).toBe(false);
    expect(basket.cap).toBe(false);
  });

  it('lets its basket slide off by itself when it is drawn out of bed', () => {
    const b = fox(at(23));
    const { basket } = b.world;
    react(b, 'sleep');
    simulate(b, 30_000, () => b.state === 'sleep');
    react(b, 'hungry');
    expect(b.state).not.toBe('sleep');
    expect(basket.active).toBe(true);
    simulate(b, 1500);
    expect(basket.active).toBe(false);
  });

  it('naps where it is during the day, and when day and night are turned off', () => {
    const day = fox(at(14));
    react(day, 'sleep');
    expect(day.state).toBe('sleep');
    expect(day.world.basket.active).toBe(false);
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

  it('finishes what it is doing before falling asleep, and stays up if you are back first', () => {
    const b = fox(at(15));
    spawnBall(b, 200, 20, 0);
    react(b, 'sleep');
    expect(b.state).toBe('fetch');
    simulate(b, 60_000, () => b.state === 'sleep');
    expect(b.state).toBe('sleep');

    const back = fox(at(15));
    spawnBall(back, 200, 20, 0);
    react(back, 'sleep');
    react(back, 'wake');
    const states = new Set<BuddyState>();
    simulate(back, 60_000, () => {
      states.add(back.state);
    });
    expect(states).not.toContain('sleep');
  });

  it('turns back from its basket if you return before it gets there', () => {
    const b = fox(at(23));
    react(b, 'sleep');
    simulate(b, 500);
    expect(b.state).toBe('toBed');
    react(b, 'wake');
    simulate(b, 100);
    expect(b.state).not.toBe('toBed');
    simulate(b, 1500);
    expect(b.world.basket.active).toBe(false);
  });

  it('takes a game of fetch as the break it asked for', () => {
    const b = fox(at(15));
    react(b, 'breakTime');
    simulate(b, 30_000, () => b.state === 'askBreak');
    const ball = b.world.ball;
    grabBall(b, ball.center, 10);
    throwBall(b, 60, 40, 150);
    expect(b.world.effects).toContain('played');
    // Asked again much later, it asks nicely once more instead of sighing.
    simulate(b, 60_000, () => b.def.calm === true);
    react(b, 'breakTime');
    const anims = new Set<AnimName>();
    const emotes = new Set<string | undefined>();
    simulate(b, 40_000, () => {
      anims.add(b.current().anim);
      emotes.add(b.emote());
    });
    expect(anims).not.toContain('sigh');
    expect(emotes).toContain('cup');
  });

  it('keeps the big welcome for the first time it sees you', () => {
    const comeIn = (b: Buddy): void => {
      startIntro(b);
      simulate(b, 15_000, () => b.state !== 'intro');
    };
    const b = fox(at(8));
    comeIn(b);
    expect(b.current().anim).toBe('morning');
    simulate(b, 10_000);
    comeIn(b);
    expect(b.state).toBe('wave');

    const reopened = fox(at(8, 30));
    recall(reopened, remember(b, 0), 0);
    comeIn(reopened);
    expect(reopened.state).toBe('wave');

    b.world.setClock(at(22), true);
    comeIn(b);
    expect(b.current().anim).toBe('goodNight');
  });
});
