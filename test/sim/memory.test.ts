import { describe, expect, it } from 'vitest';
import type { Buddy } from '../../webview/sim/buddy';
import { react } from '../../webview/sim/features/reactions';
import { recall, remember, sameMemory } from '../../webview/sim/memory';
import { fixed, simulate, spawn } from './helpers';

describe('memory', () => {
  const noon = new Date(2026, 9, 7, 12);
  const MINUTE = 60_000;

  function fox(): Buddy {
    const b = spawn(fixed(0.5));
    b.world.resize(300, 60);
    b.restore(120, 1);
    b.world.setClock(noon, true);
    return b;
  }

  // What 1.4.0 noted, as it was written then: it has to go on being read, though stages and finds are no more.
  it('still reads a memory noted by 1.4.0, and lets go of what this version no longer keeps', () => {
    const memory = { savedAt: noon.getTime() - 40 * 24 * 60 * MINUTE, thirsty: true, breakWanted: false, breakAsks: 0, greeted: {}, vistaInMs: 600_000, mouseFriend: true, stage: 3, toys: { duck: 40 }, collected: { leaf: 3, pebble: 1, flower: 2, clover: 1 } };
    const b = fox();
    recall(b, JSON.parse(JSON.stringify(memory)), noon.getTime());
    expect(b.visitors.mouseFriend).toBe(true);
    // What was only of that day has passed.
    expect(b.meals.thirsty).toBe(false);
    // And it is noted again without what it no longer keeps.
    simulate(b, 100);
    const noted = remember(b, noon.getTime());
    expect(noted.mouseFriend).toBe(true);
    expect(noted).not.toHaveProperty('stage');
    expect(noted).not.toHaveProperty('collected');
    expect(noted).not.toHaveProperty('toys');
  });

  it('lets a need pass that was noted hours ago: it is not hungry this morning for yesterday', () => {
    const before = fox();
    react(before, 'hungry');
    react(before, 'breakTime');
    simulate(before, 5000);
    const memory = { ...remember(before, 1000), thirsty: true, breakAsks: 2, mouseFriend: true };

    const after = fox();
    recall(after, memory, 1000 + 5 * 60 * MINUTE);
    expect(after.meals.hungry).toBe(false);
    expect(after.meals.thirsty).toBe(false);
    expect(after.rest.breakAsks).toBe(0);
    // What lasts is still there.
    expect(after.visitors.mouseFriend).toBe(true);
  });

  it('is still hungry in a new view, and hungrier for the time spent away', () => {
    const before = fox();
    react(before, 'hungry');
    simulate(before, 5000);
    const memory = remember(before, 1000);
    expect(memory.hungryForMs).toBeGreaterThan(4000);

    const after = fox();
    recall(after, memory, 1000 + 4 * MINUTE);
    simulate(after, 3000, () => after.state === 'hungry');
    expect(after.state).toBe('hungry');
    simulate(after, 3000);
    expect(after.current().anim).toBe('hungrySad');
    // The extension saying it again changes nothing.
    react(after, 'hungry');
    expect(after.current().anim).toBe('hungrySad');
  });

  it('still wants the drink and the break it could not get to', () => {
    const after = fox();
    recall(after, { savedAt: 0, thirsty: true, breakWanted: false, breakAsks: 0, greeted: {}, vistaInMs: 0, mouseFriend: false }, MINUTE);
    simulate(after, 3000, () => after.state === 'drink');
    expect(after.state).toBe('drink');
  });

  it('remembers it already asked for a break, and only sighs the next time', () => {
    const before = fox();
    react(before, 'breakTime');
    simulate(before, 30_000, () => before.state === 'askBreak');
    const memory = remember(before, 0);
    expect(memory.breakAsks).toBe(1);

    const after = fox();
    recall(after, memory, MINUTE);
    react(after, 'breakTime');
    expect(after.current().anim).toBe('sigh');
  });

  it('only counts as changed when a need comes or goes', () => {
    const b = fox();
    const calm = remember(b, 0);
    react(b, 'hungry');
    const hungry = remember(b, 10);
    simulate(b, 5000);
    expect(sameMemory(calm, remember(fox(), 99))).toBe(true);
    expect(sameMemory(calm, hungry)).toBe(false);
    expect(sameMemory(hungry, remember(b, 5010))).toBe(true);
  });
});

describe('memory of its contemplations', () => {
  const MINUTE = 60_000;

  it('keeps counting down to the next one while its view is closed', () => {
    const before = spawn(fixed(0.5));
    before.contemplate.waitMs = 90 * MINUTE;
    const memory = remember(before, 1000);
    const after = spawn(fixed(0.5));
    recall(after, memory, 1000 + 60 * MINUTE);
    expect(after.contemplate.waitMs).toBe(30 * MINUTE);
    // Long overdue: it still settles in for a few minutes first.
    recall(after, memory, 1000 + 200 * MINUTE);
    expect(after.contemplate.waitMs).toBe(3 * MINUTE);
  });

  it('is the same memory while the wait just runs down, and a new one once it has contemplated', () => {
    const b = spawn(fixed(0.5));
    b.contemplate.waitMs = 90 * MINUTE;
    const first = remember(b, 0);
    b.contemplate.waitMs = 80 * MINUTE;
    expect(sameMemory(first, remember(b, 10 * MINUTE))).toBe(true);
    b.contemplate.waitMs = 180 * MINUTE;
    expect(sameMemory(first, remember(b, 10 * MINUTE))).toBe(false);
  });
});

describe('memory of its friends and dreams', () => {
  it('keeps the dream it has not had yet and its friendship with the mouse', () => {
    const before = spawn(fixed(0.5));
    const plain = remember(before, 0);
    before.contemplate.dream = 'snow';
    before.visitors.mouseFriend = true;
    const memory = remember(before, 0);
    expect(sameMemory(plain, memory)).toBe(false);

    const after = spawn(fixed(0.5));
    recall(after, JSON.parse(JSON.stringify(memory)), 1000);
    expect(after.contemplate.dream).toBe('snow');
    expect(after.visitors.mouseFriend).toBe(true);
  });
});
