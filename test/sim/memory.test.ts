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

  // What 1.4.0 noted, as it was written then: an update never takes its progression away, so this has to go on being read.
  it('finds the stage it had reached and what it had found in a memory noted by 1.4.0, however long ago', () => {
    const memory = { savedAt: noon.getTime() - 40 * 24 * 60 * MINUTE, thirsty: true, breakWanted: false, breakAsks: 0, greeted: {}, vistaInMs: 600_000, mouseFriend: true, stage: 3, toys: { duck: 40 }, collected: { leaf: 3, pebble: 1, flower: 2, clover: 1 } };
    const b = fox();
    b.world.stage = -1;
    recall(b, JSON.parse(JSON.stringify(memory)), noon.getTime());
    expect(b.world.stage).toBe(3);
    expect(b.world.album.pictures).toBe(4);
    expect(b.world.album.finds).toEqual({ leaf: 3, pebble: 1, flower: 2, clover: 1 });
    expect(b.visitors.mouseFriend).toBe(true);
    // What was only of that day has passed.
    expect(b.meals.thirsty).toBe(false);
    expect(b.world.plushes.duck.state).toBe('none');
    // And it is noted again as it was.
    simulate(b, 100);
    expect(remember(b, noon.getTime())).toMatchObject({ stage: 3, collected: memory.collected, mouseFriend: true });
  });

  it('lets a need pass that was noted hours ago: it does not sulk this morning over yesterday', () => {
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

  it('finds its toys where they were left when the view is opened again the same day', () => {
    const before = fox();
    before.world.ball.place(200, 0, 300, 60);
    before.world.ball.launch(0, 0);
    before.world.plushes.teddy.rest(60, 300);
    before.world.plushes.duck.hold(100, 30, 300, 60);
    simulate(before, 100);
    const memory = remember(before, noon.getTime());
    // A toy in your hand is not lying anywhere.
    expect(memory.toys).toEqual({ ball: Math.round(before.world.ball.x), teddy: 60 });
    expect(sameMemory(memory, remember(before, noon.getTime() + 1000))).toBe(true);
    before.world.plushes.teddy.rest(90, 300);
    simulate(before, 100);
    expect(sameMemory(memory, remember(before, noon.getTime()))).toBe(false);

    const after = fox();
    recall(after, memory, noon.getTime() + 3 * 60 * MINUTE);
    expect(after.world.ball.state).toBe('free');
    expect(after.world.ball.x).toBe(memory.toys?.ball);
    expect(after.world.plushes.teddy.landed).toBe(true);
    expect(after.world.plushes.teddy.x).toBe(60);
    expect(after.world.plushes.duck.state).toBe('none');
    simulate(after, 500);
    expect(after.world.ball.x).toBe(memory.toys?.ball);
    expect(after.world.chest.holds).toEqual({ ball: false, teddy: false, duck: true, rugby: true });

    // By the next day everything is back in the chest.
    const tomorrow = fox();
    recall(tomorrow, memory, noon.getTime() + 24 * 60 * MINUTE);
    expect(tomorrow.world.ball.state).toBe('none');
    expect(tomorrow.world.plushes.teddy.state).toBe('none');
    // And a memory from before toys were kept is still read.
    recall(tomorrow, { ...memory, toys: undefined }, noon.getTime());
    expect(tomorrow.world.plushes.teddy.state).toBe('none');
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
    recall(after, { savedAt: 0, thirsty: true, breakWanted: false, breakAsks: 0, greeted: {}, vistaInMs: 0, mouseFriend: false, stage: 5 }, MINUTE);
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
