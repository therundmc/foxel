import { describe, expect, it } from 'vitest';
import { missedWhileAway, welcomeBack } from '../../webview/sim/features/bond';
import { startIntro } from '../../webview/sim/features/intro';
import { fillBowl } from '../../webview/sim/features/meals';
import { callOver } from '../../webview/sim/features/pointer';
import { react } from '../../webview/sim/features/reactions';
import { holdPlush, stowPlush } from '../../webview/sim/features/plush';
import { pet, touch } from '../../webview/sim/features/touch';
import type { BuddyState } from '../../webview/sim/state';
import type { AnimName } from '../../webview/sprites/fox/animations';
import { fixed, simulate, spawn } from './helpers';

function fox(random = 0.5, hour = 15) {
  const b = spawn(fixed(random));
  b.world.resize(300, 60);
  b.restore(100, 1);
  b.world.setClock(new Date(2026, 9, 7, hour), true);
  b.enter('sit', 5000);
  return b;
}

describe('sulking and making up', () => {
  it('sulks with its back to you after a break it asked for in vain, and ignores your pointer', () => {
    const b = fox();
    react(b, 'breakTime');
    simulate(b, 60_000, () => b.state === 'askBreak');
    simulate(b, 8000);
    react(b, 'breakTime');
    expect(b.world.effects).toContain('unheard');
    b.world.pointer = { x: 250, y: 20 };
    simulate(b, 20_000, () => {
      b.world.pointer = { x: 250, y: 20 };
      return b.state === 'sulk';
    });
    expect(b.state).toBe('sulk');
    expect(b.current().anim).toBe('sulk');
    // You are on its right: it faces left.
    expect(b.dir).toBe(-1);
    const x = b.x;
    simulate(b, 20_000, () => {
      b.world.pointer = { x: 250, y: 20 };
    });
    expect(b.state).toBe('sulk');
    expect(b.x).toBe(x);
    expect(callOver(b, 250)).toBe(false);
  });

  it('melts at the first stroke, turns back to you, and that counts as a caress', () => {
    const b = fox();
    b.bond.slighted = true;
    b.world.pointer = { x: 250, y: 20 };
    simulate(b, 10_000, () => b.state === 'sulk');
    expect(b.state).toBe('sulk');
    pet(b);
    expect(b.state).toBe('makeUp');
    expect(b.dir).toBe(1);
    expect(b.world.effects).toContain('petted');
    expect(b.bond.sulky).toBe(false);
    const anims = new Set<AnimName>();
    simulate(b, 5000, () => {
      anims.add(b.current().anim);
      return b.state !== 'makeUp';
    });
    expect(anims).toContain('makeUp');
    expect(b.state).toBe('sit');

    const other = fox();
    other.bond.slighted = true;
    simulate(other, 10_000, () => other.state === 'sulk');
    touch(other, 'head');
    expect(other.state).toBe('makeUp');
  });

  it('gets over it by itself with a sigh, but makes up properly the next time you look after it', () => {
    const b = fox();
    b.bond.slighted = true;
    simulate(b, 10_000, () => b.state === 'sulk');
    const states = new Set<BuddyState>();
    simulate(b, 60_000, () => {
      states.add(b.state);
      return b.state !== 'sulk' && b.state !== 'mope';
    });
    expect(states).toContain('mope');
    expect(b.bond.sulky).toBe(true);
    fillBowl(b);
    simulate(b, 60_000, () => {
      states.add(b.state);
      return states.has('makeUp') && b.state !== 'makeUp';
    });
    expect(b.world.effects).toContain('fed');
    expect(states).toContain('makeUp');
    expect(b.bond.sulky).toBe(false);
  });

  it('sulks once of its own accord on a very bad day, and not again until it is over it', () => {
    const b = fox();
    b.world.mood = -0.6;
    simulate(b, 10_000, () => b.state === 'sulk');
    expect(b.state).toBe('sulk');
    pet(b);
    let again = false;
    simulate(b, 120_000, () => {
      again ||= b.state === 'sulk';
    });
    expect(again).toBe(false);
    b.world.mood = 0.2;
    simulate(b, 100);
    b.world.mood = -0.6;
    b.enter('sit', 3000);
    simulate(b, 10_000, () => b.state === 'sulk');
    expect(b.state).toBe('sulk');
  });
});

describe('its mood in what it does', () => {
  const picks = (mood: number): Record<string, number> => {
    const b = fox();
    b.world.mood = mood;
    let seed = 11;
    (b.world as { random: () => number }).random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    b.world.plushes.teddy.rest(200, 300);
    simulate(b, 100);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 4000; i++) {
      b.enter('idle', 1000);
      const next = b.pickNext();
      counts[next] = (counts[next] ?? 0) + 1;
    }
    return counts;
  };

  it('is more playful on a good day and listless on a bad one', () => {
    const plain = picks(0);
    const good = picks(0.8);
    const bad = picks(-0.6);
    const playful = (c: Record<string, number>): number => (c.play ?? 0) + (c.plush ?? 0) + (c.jump ?? 0) + (c.run ?? 0) + (c.rummage ?? 0);
    expect(playful(good)).toBeGreaterThan(playful(plain) * 1.5);
    expect(bad.mope ?? 0).toBeGreaterThan(100);
    expect(plain.mope).toBeUndefined();
    expect(good.mope).toBeUndefined();
    expect((bad.lie ?? 0) + (bad.sit ?? 0)).toBeGreaterThan((plain.lie ?? 0) + (plain.sit ?? 0));
  });

  it('comes to your pointer sooner on a good day than on a bad one', () => {
    const delay = (mood: number): number => {
      const b = fox();
      b.enter('sit', 600_000);
      b.world.mood = mood;
      let ms = 0;
      simulate(b, 60_000, () => {
        b.world.pointer = { x: 250, y: 20 };
        ms += 16;
        return b.state === 'come';
      });
      return ms;
    };
    expect(delay(0.9)).toBeLessThan(delay(0));
    expect(delay(0)).toBeLessThan(delay(-0.9));
  });

  it('fetches back a toy you put away more often when it is in a good mood', () => {
    const wants = (mood: number, random: number): boolean => {
      const b = fox(random);
      b.world.mood = mood;
      holdPlush(b, 'duck', 250, 20);
      stowPlush(b, 'duck');
      return b.rummage.wants === 'duck';
    };
    expect(wants(0, 0.6)).toBe(false);
    expect(wants(0.9, 0.6)).toBe(true);
    expect(wants(-0.9, 0.3)).toBe(false);
    expect(wants(0, 0.3)).toBe(true);
  });
});

describe('coming back after days away', () => {
  const enter = (days: number | undefined, random = 0.2) => {
    const b = spawn(fixed(random));
    b.world.resize(300, 60);
    b.world.setClock(new Date(2026, 9, 7, 15), true);
    if (days !== undefined) {
      welcomeBack(b, days);
    }
    startIntro(b);
    const states = new Set<BuddyState>();
    const anims = new Set<AnimName>();
    let hopped = 0;
    simulate(b, 40_000, () => {
      states.add(b.state);
      anims.add(b.current().anim);
      hopped = Math.max(hopped, b.state === 'overjoyed' ? b.y : 0);
      return b.def.calm === true;
    });
    return { b, states, anims, hopped };
  };

  it('waves as usual when you were only gone for the night', () => {
    const { b, states } = enter(1);
    expect(states).toContain('wave');
    expect(states.has('overjoyed')).toBe(false);
    expect(b.bond.awayDays).toBeUndefined();
  });

  it('is beside itself after a few days: it bounces about, then melts into hearts', () => {
    const { states, anims, hopped } = enter(3);
    expect(states).toContain('overjoyed');
    expect(states.has('wave')).toBe(false);
    expect(anims).toContain('celebrate');
    expect(anims).toContain('love');
    expect(hopped).toBeGreaterThan(4);
  });

  it('needs a moment to forgive you after weeks: it turns its back, then comes round by itself', () => {
    const { b, states, anims } = enter(20);
    expect(states).toContain('sulk');
    expect(states).toContain('makeUp');
    expect(anims).toContain('sulk');
    expect(states.has('mope')).toBe(false);
    expect(b.bond.sulky).toBe(false);
  });

  it('has lived without you: its things are lying about', () => {
    const { b } = enter(3, 0.2);
    expect(b.world.ball.state).toBe('free');
    expect(Object.values(b.world.plushes).some((toy) => toy.state === 'free')).toBe(true);
    const tidy = enter(undefined, 0.2).b;
    expect(tidy.world.ball.state).toBe('none');
  });

  it('gives that welcome even when it was already in the view', () => {
    const b = fox();
    welcomeBack(b, 5);
    simulate(b, 10_000, () => b.state === 'overjoyed');
    expect(b.state).toBe('overjoyed');
  });
});

describe('what it missed while its view was out of sight', () => {
  it('plays the last thing once it has a quiet moment, and only once', () => {
    const b = fox();
    react(b, 'love');
    missedWhileAway(b, 'commit');
    missedWhileAway(b, 'push');
    expect(b.state).toBe('love');
    const states: BuddyState[] = [];
    simulate(b, 30_000, () => {
      if (states[states.length - 1] !== b.state) {
        states.push(b.state);
      }
    });
    expect(b.bond.missed).toBeUndefined();
    expect(states.filter((s) => s === 'acting')).toHaveLength(1);
  });
});
