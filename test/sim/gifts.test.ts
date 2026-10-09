import { describe, expect, it } from 'vitest';
import { acceptFind, startGift } from '../../webview/sim/features/gifts';
import { react } from '../../webview/sim/features/reactions';
import { recall, remember } from '../../webview/sim/memory';
import { STATES } from '../../webview/sim/registry';
import type { AnimName } from '../../webview/sprites/fox/animations';
import { fixed, simulate, spawn } from './helpers';

function fox(attachment = 0.6, mood = 0.5) {
  const b = spawn(fixed(0.3));
  b.world.resize(300, 60);
  b.restore(150, 1);
  b.world.setClock(new Date(2026, 9, 7, 15), true);
  b.world.attachment = attachment;
  b.world.mood = mood;
  b.enter('sit', 5000);
  return b;
}
const step = (b: ReturnType<typeof fox>, name: string): boolean => b.state === 'gift' && b.gift.step === name;

describe('what it brings you', () => {
  it('only thinks of it once it has grown fond of you, and when its day is not a bad one', () => {
    expect(STATES.gift.available?.(fox(0.1))).toBe(false);
    expect(STATES.gift.available?.(fox(0.6, -0.3))).toBe(false);
    expect(STATES.gift.available?.(fox(0.6))).toBe(true);
  });

  it('trots out of the view, comes back with something in its mouth, puts it down in front of you and sits by it', () => {
    const b = fox();
    const { finds } = b.world;
    startGift(b);
    simulate(b, 30_000, () => step(b, 'out'));
    expect(b.x).toBeLessThanOrEqual(-32);
    expect(finds.offered).toBeUndefined();
    simulate(b, 30_000, () => step(b, 'bring'));
    expect(finds.offered?.state).toBe('carried');
    simulate(b, 400);
    // It hangs from its mouth as it comes.
    expect(Math.abs((finds.box?.x ?? 0) - (b.x + b.mouthOffset()))).toBeLessThan(6);
    expect(finds.box?.y).toBeGreaterThan(3);
    simulate(b, 60_000, () => step(b, 'offer'));
    expect(finds.offered?.state).toBe('down');
    expect(finds.box?.y).toBe(0);
    expect(b.x).toBeGreaterThan(20);
    expect(b.current().anim).toBe('proud');
    expect(b.world.restful).toBe(false);
  });

  it('is thrilled when you click it, and the thing hops over to its corner for the day', () => {
    const b = fox();
    const { finds } = b.world;
    startGift(b);
    expect(acceptFind(b)).toBe(false);
    simulate(b, 90_000, () => step(b, 'offer'));
    const kind = finds.offered?.kind;
    expect(acceptFind(b)).toBe(true);
    expect(finds.offered?.state).toBe('hopping');
    let highest = 0;
    const anims = new Set<AnimName>();
    simulate(b, 5000, () => {
      highest = Math.max(highest, finds.box?.y ?? 0);
      anims.add(b.current().anim);
      return b.state !== 'gift';
    });
    expect(highest).toBeGreaterThan(8);
    expect(anims).toContain('celebrate');
    expect(finds.offered).toBeUndefined();
    expect(finds.kept).toEqual([kind]);
    expect(finds.keptBox(0).x).toBeLessThan(10);
    expect(b.state).toBe('sit');
    expect(b.y).toBe(0);
  });

  it('picks it up again and carries it off without a fuss when you leave it, then comes back', () => {
    const b = fox();
    const { finds } = b.world;
    startGift(b);
    simulate(b, 90_000, () => step(b, 'offer'));
    const seen = new Set<string>();
    simulate(b, 120_000, () => {
      seen.add(b.gift.step);
      return b.state !== 'gift';
    });
    expect([...seen]).toEqual(expect.arrayContaining(['pick', 'off', 'back']));
    expect(finds.offered).toBeUndefined();
    expect(finds.kept).toEqual([]);
    expect(b.state).toBe('sit');
    expect(b.x).toBeGreaterThanOrEqual(0);
  });

  it('brings two things a day at most, some time apart, and no more than its corner holds', () => {
    const b = fox();
    startGift(b);
    simulate(b, 90_000, () => step(b, 'offer'));
    acceptFind(b);
    simulate(b, 5000);
    expect(STATES.gift.available?.(b)).toBe(false);
    simulate(b, 26 * 60_000, () => {
      b.enter('sit', 60_000);
    });
    expect(STATES.gift.available?.(b)).toBe(true);
    startGift(b);
    simulate(b, 30 * 60_000, () => {
      if (b.state !== 'gift') {
        b.enter('sit', 60_000);
      }
    });
    expect(STATES.gift.available?.(b)).toBe(false);
    // The next day it may again.
    b.world.setClock(new Date(2026, 9, 8, 10), true);
    expect(STATES.gift.available?.(b)).toBe(true);
    b.world.finds.kept.push('leaf', 'leaf', 'leaf', 'leaf');
    expect(STATES.gift.available?.(b)).toBe(false);
  });

  it('drops the idea when called away', () => {
    const b = fox();
    startGift(b);
    simulate(b, 60_000, () => step(b, 'bring'));
    react(b, 'love');
    expect(b.state).toBe('love');
    expect(b.world.finds.offered).toBeUndefined();
    expect(b.x).toBeGreaterThanOrEqual(0);
  });
});

describe('the heart it draws for you', () => {
  it('scratches it in the earth stroke by stroke, then sits looking at you; the wind takes it after a while', () => {
    const b = fox(0.7, 0.6);
    const { doodle } = b.world;
    expect(STATES.doodle.available?.(fox(0.3, 0.6))).toBe(false);
    expect(STATES.doodle.available?.(fox(0.7, 0))).toBe(false);
    expect(STATES.doodle.available?.(b)).toBe(true);
    b.enterNext('doodle');
    expect(b.state).toBe('doodle');
    expect(doodle.stage).toBeUndefined();
    const stages: number[] = [];
    const anims = new Set<AnimName>();
    simulate(b, 10_000, () => {
      if (doodle.stage !== undefined && doodle.stage !== stages[stages.length - 1]) {
        stages.push(doodle.stage);
      }
      anims.add(b.current().anim);
      return b.state !== 'doodle';
    });
    expect(stages).toEqual([0, 1, 2]);
    expect([...anims]).toEqual(expect.arrayContaining(['dig', 'proud']));
    expect(Math.abs((doodle.x ?? 0) - (b.x + b.noseOffset()))).toBeLessThan(2);
    expect(STATES.doodle.available?.(b)).toBe(false);
    b.enter('sleep', 3_600_000);
    simulate(b, 5 * 60_000, () => {
      if (doodle.stage !== undefined && doodle.stage !== stages[stages.length - 1]) {
        stages.push(doodle.stage);
      }
    });
    expect(stages).toEqual([0, 1, 2, 1, 0]);
    expect(doodle.there).toBe(false);
  });
});

describe('the traces of its day', () => {
  it('leaves a little mound where it dug', () => {
    const b = fox(0, 0);
    b.enterNext('dig');
    simulate(b, 4000);
    expect(b.world.mound.there).toBe(true);
    expect(b.world.mound.stage).toBe(2);
  });

  it('finds what it brought you and its mound again when the view is opened the same day, not the next', () => {
    const before = fox();
    before.world.finds.kept.push('flower', 'pebble');
    before.world.mound.begin(120);
    simulate(before, 3000);
    const noon = new Date(2026, 9, 7, 12).getTime();
    const memory = remember(before, noon);
    expect(memory.finds).toEqual(['flower', 'pebble']);
    expect(memory.mound).toBe(120);

    const after = fox();
    recall(after, memory, noon + 3_600_000);
    expect(after.world.finds.kept).toEqual(['flower', 'pebble']);
    expect(after.world.mound.stage).toBe(2);
    const tomorrow = fox();
    recall(tomorrow, memory, noon + 24 * 3_600_000);
    expect(tomorrow.world.finds.kept).toEqual([]);
    expect(tomorrow.world.mound.there).toBe(false);
  });
});
