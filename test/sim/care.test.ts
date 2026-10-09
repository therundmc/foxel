import { describe, expect, it } from 'vitest';
import { fillBowl } from '../../webview/sim/features/meals';
import { react } from '../../webview/sim/features/reactions';
import { recall, remember } from '../../webview/sim/memory';
import type { AnimName } from '../../webview/sprites/fox/animations';
import { fixed, simulate, spawn } from './helpers';

const at = (hour: number, minute = 0): Date => new Date(2026, 9, 7, hour, minute);

function fox(now: Date, x = 100) {
  const b = spawn(fixed(0.5));
  b.world.resize(300, 60);
  b.restore(x, 1);
  b.world.setClock(now, true);
  b.enter('sit', 5000);
  return b;
}

describe('looking after it without being caught out', () => {
  it('says no to another bowl when it has just eaten, and yes again later or at meal time', () => {
    const b = fox(at(15));
    fillBowl(b);
    simulate(b, 60_000, () => b.world.effects.includes('fed'));
    simulate(b, 20_000, () => !b.world.foodBowl.active && b.def.calm === true);
    expect(b.world.effects.filter((e) => e === 'fed')).toHaveLength(1);

    // Ten minutes later: it shakes its head, and no bowl comes.
    b.world.setClock(at(15, 10), true);
    b.enter('sit', 5000);
    const anims = new Set<AnimName>();
    fillBowl(b);
    simulate(b, 3000, () => {
      anims.add(b.current().anim);
    });
    expect(anims).toContain('toyShake');
    expect(b.world.foodBowl.active).toBe(false);
    expect(b.world.effects.filter((e) => e === 'fed')).toHaveLength(1);

    // An hour later it is glad of it.
    b.world.setClock(at(16, 10), true);
    b.enter('sit', 5000);
    fillBowl(b);
    expect(b.world.foodBowl.active).toBe(true);

    // And at meal time it is hungry whatever it had before.
    const hungry = fox(at(12));
    hungry.meals.ateAt = at(11, 50).getTime();
    react(hungry, 'hungry');
    fillBowl(hungry);
    expect(hungry.world.foodBowl.amount).toBeGreaterThan(0);
  });

  it('does not hold a missed meal against you when it was asleep because you were away', () => {
    const b = fox(at(13, 59));
    react(b, 'hungry');
    simulate(b, 1000);
    b.enter('sleep', 3_600_000);
    b.world.setClock(at(14, 1), true);
    simulate(b, 200);
    expect(b.meals.hungry).toBe(false);
    expect(b.world.effects).not.toContain('unfed');
    expect(b.bond.slighted).toBe(false);

    const there = fox(at(13, 59));
    react(there, 'hungry');
    simulate(there, 1000);
    there.world.setClock(at(14, 1), true);
    simulate(there, 200);
    expect(there.world.effects).toContain('unfed');
    expect(there.bond.slighted).toBe(true);
  });

  it('always pulls its basket in on the left, where its corner is', () => {
    const b = fox(at(23), 240);
    react(b, 'sleep');
    expect(b.state).toBe('toBed');
    expect(b.world.basket.home).toBe(0);
    expect(b.world.basket.outward).toBe(-1);
  });

  it('finds a treat left half eaten where it lay when the view is opened again', () => {
    const before = fox(at(15));
    before.enter('sleep', 3_600_000);
    before.world.treat.rest(200, 2, -1, 300);
    simulate(before, 100);
    const noon = at(15).getTime();
    const memory = remember(before, noon);
    expect(memory.treat).toEqual({ x: 200, stage: 2, facing: -1 });

    const after = fox(at(15));
    after.enter('sleep', 3_600_000);
    recall(after, memory, noon + 60_000);
    expect(after.world.treat.landed).toBe(true);
    expect(Math.round(after.world.treat.centerX)).toBe(200);
    expect(after.world.treat.stage).toBe(2);
    expect(after.world.treat.facing).toBe(-1);
    const tomorrow = fox(at(15));
    recall(tomorrow, memory, noon + 24 * 3_600_000);
    expect(tomorrow.world.treat.active).toBe(false);
  });
});
