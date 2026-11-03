import { describe, expect, it } from 'vitest';
import { devoted, fond } from '../../webview/sim/affection';
import { missedWhileAway, welcomeBack } from '../../webview/sim/features/bond';
import { startIntro } from '../../webview/sim/features/intro';
import { react } from '../../webview/sim/features/reactions';
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

describe('its affection, never shown', () => {
  it('grows fond of you after a few good days, and devoted after weeks; a bad day hides its hearts', () => {
    const b = fox();
    expect(fond(b.world)).toBe(false);
    b.world.attachment = 0.15;
    expect(fond(b.world)).toBe(true);
    expect(devoted(b.world)).toBe(false);
    b.world.mood = -0.3;
    expect(fond(b.world)).toBe(false);
    b.world.attachment = 0.5;
    expect(devoted(b.world)).toBe(true);
  });

  it('lies down by your pointer once devoted to you, and only sits by it before', () => {
    const settles = (attachment: number): BuddyState => {
      const b = fox();
      b.world.attachment = attachment;
      b.restore(10, 1);
      b.enter('sit', 600_000);
      simulate(b, 60_000, () => {
        b.world.pointer = { x: 250, y: 20 };
        return b.state === 'come' && b.pointer.arrived;
      });
      simulate(b, 2000, () => b.state !== 'come');
      return b.state;
    };
    expect(settles(0)).toBe('sit');
    expect(settles(0.6)).toBe('lie');
  });

  it('comes to your pointer sooner once devoted, and on a good day', () => {
    const delay = (mood: number, attachment: number): number => {
      const b = fox();
      b.enter('sit', 600_000);
      b.world.mood = mood;
      b.world.attachment = attachment;
      let ms = 0;
      simulate(b, 60_000, () => {
        b.world.pointer = { x: 250, y: 20 };
        ms += 16;
        return b.state === 'come';
      });
      return ms;
    };
    expect(delay(0.9, 0)).toBeLessThan(delay(0, 0));
    expect(delay(0, 0.6)).toBeLessThan(delay(0, 0));
    expect(delay(0, 0)).toBeLessThan(delay(-0.9, 0));
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
    b.world.ball.place(200, 0, 300, 60);
    b.world.ball.launch(0, 0);
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
    const playful = (c: Record<string, number>): number => (c.play ?? 0) + (c.leave ?? 0) + (c.jump ?? 0) + (c.run ?? 0);
    expect(playful(good)).toBeGreaterThan(playful(plain) * 1.5);
    expect((bad.lie ?? 0) + (bad.sit ?? 0)).toBeGreaterThan((plain.lie ?? 0) + (plain.sit ?? 0));
  });

});

describe('coming back after days away', () => {
  const enter = (days: number | undefined, attachment = 0.3) => {
    const b = spawn(fixed(0.2));
    b.world.resize(300, 60);
    b.world.attachment = attachment;
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

  it('just waves when it is not fond of you yet, however long you were gone', () => {
    const { states } = enter(20, 0);
    expect(states).toContain('wave');
    expect(states.has('overjoyed')).toBe(false);
  });

  it('gives that welcome even when it was already in the view', () => {
    const b = fox();
    b.world.attachment = 0.3;
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
