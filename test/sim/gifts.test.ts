import { describe, expect, it } from 'vitest';
import { acceptFind, startGift } from '../../webview/sim/features/gifts';
import { react } from '../../webview/sim/features/reactions';
import { recall, remember } from '../../webview/sim/memory';
import { STATES } from '../../webview/sim/registry';
import type { AnimName } from '../../webview/sprites/fox/animations';
import { fixed, simulate, spawn } from './helpers';

function fox(stage = 5, mood = 0.5) {
  const b = spawn(fixed(0.3));
  b.world.resize(300, 60);
  b.restore(150, 1);
  b.world.setClock(new Date(2026, 9, 7, 15), true);
  b.world.stage = stage;
  b.world.mood = mood;
  b.enter('sit', 5000);
  return b;
}
const step = (b: ReturnType<typeof fox>, name: string): boolean => b.state === 'gift' && b.gift.step === name;

describe('what it brings you', () => {
  it('only thinks of it once it is fond of you, and when its day is not a bad one', () => {
    expect(STATES.gift.available?.(fox(1))).toBe(false);
    expect(STATES.gift.available?.(fox(2, -0.3))).toBe(false);
    expect(STATES.gift.available?.(fox(2, 0))).toBe(true);
  });

  it('trots out of the view, comes back with something in its mouth, puts it down in front of you and sits by it', () => {
    const b = fox();
    const { finds } = b.world;
    startGift(b, 'outside');
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
    expect(b.current().anim).toBe('proud');
  });

  it('digs one up where it stands, leaving a little mound', () => {
    const b = fox();
    const x = b.x;
    startGift(b, 'dug');
    const anims = new Set<AnimName>();
    simulate(b, 10_000, () => {
      anims.add(b.current().anim);
      return step(b, 'bring');
    });
    expect(anims).toContain('dig');
    expect(b.x).toBe(x);
    expect(b.world.mound.there).toBe(true);
    expect(b.world.finds.offered?.state).toBe('carried');
    simulate(b, 60_000, () => step(b, 'offer'));
    expect(b.world.finds.offered?.state).toBe('down');
  });

  it('is brought one by a little bird, which lets it go in front of it and flies on', () => {
    const b = fox();
    const { finds } = b.world;
    startGift(b, 'bird');
    expect(finds.bird).toBeDefined();
    expect(finds.offered?.state).toBe('flown');
    let fell = false;
    let highest = 0;
    simulate(b, 30_000, () => {
      fell ||= finds.offered?.state === 'falling';
      highest = Math.max(highest, finds.box?.y ?? 0);
      return step(b, 'fetch');
    });
    expect(fell).toBe(true);
    expect(highest).toBeGreaterThan(15);
    expect(finds.box?.y).toBe(0);
    expect(Math.abs((finds.box?.x ?? 0) - (b.x + b.noseOffset()))).toBeLessThan(45);
    simulate(b, 60_000, () => step(b, 'offer'));
    expect(finds.offered?.state).toBe('down');
    simulate(b, 12_000, () => finds.bird === undefined);
    expect(finds.bird).toBeUndefined();
  });

  it('is thrilled when you click it, and the thing goes into its box of keepsakes, which comes out to take it', () => {
    const b = fox();
    const { finds, album } = b.world;
    startGift(b, 'outside');
    expect(acceptFind(b)).toBe(false);
    simulate(b, 90_000, () => step(b, 'offer'));
    const kind = finds.offered?.kind;
    expect(kind).toBeDefined();
    expect(album.here).toBe(false);
    expect(acceptFind(b)).toBe(true);
    expect(finds.offered).toBeUndefined();
    expect(album.flying).toBeDefined();
    const anims = new Set<AnimName>();
    let out = false;
    simulate(b, 8000, () => {
      anims.add(b.current().anim);
      out ||= album.here;
      return album.flying === undefined && b.state !== 'gift';
    });
    expect(out).toBe(true);
    expect(anims).toContain('celebrate');
    expect(kind && album.finds[kind]).toBe(1);
    expect(b.state).toBe('sit');
    // Left alone, the box goes back to its edge of the view.
    simulate(b, 6000);
    expect(album.here).toBe(false);
  });

  it('picks it up again and carries it off without a fuss when you leave it, then comes back', () => {
    const b = fox();
    startGift(b, 'outside');
    simulate(b, 90_000, () => step(b, 'offer'));
    const seen = new Set<string>();
    simulate(b, 120_000, () => {
      seen.add(b.gift.step);
      return b.state !== 'gift';
    });
    expect([...seen]).toEqual(expect.arrayContaining(['pick', 'off', 'back']));
    expect(b.world.finds.offered).toBeUndefined();
    expect(b.world.album.finds).toEqual({});
    expect(b.x).toBeGreaterThanOrEqual(0);
  });

  it('brings two things a day at most, some time apart', () => {
    const b = fox();
    startGift(b, 'dug');
    simulate(b, 90_000, () => step(b, 'offer'));
    acceptFind(b);
    simulate(b, 8000);
    expect(STATES.gift.available?.(b)).toBe(false);
    simulate(b, 26 * 60_000, () => {
      b.enter('sit', 60_000);
    });
    expect(STATES.gift.available?.(b)).toBe(true);
    startGift(b, 'dug');
    simulate(b, 30 * 60_000, () => {
      if (b.state !== 'gift') {
        b.enter('sit', 60_000);
      }
    });
    expect(STATES.gift.available?.(b)).toBe(false);
    b.world.setClock(new Date(2026, 9, 8, 10), true);
    expect(STATES.gift.available?.(b)).toBe(true);
  });

  it('drops the idea when called away', () => {
    const b = fox();
    startGift(b, 'bird');
    simulate(b, 500);
    react(b, 'love');
    expect(b.state).toBe('love');
    expect(b.world.finds.offered).toBeUndefined();
    expect(b.world.finds.bird).toBeUndefined();
  });

  it('keeps what you accepted for good: the box holds it when the view is opened again, the next day too', () => {
    const before = fox();
    before.world.album.finds.feather = 2;
    before.world.album.finds.leaf = 1;
    const noon = new Date(2026, 9, 7, 12).getTime();
    const memory = remember(before, noon);
    expect(memory.collected).toEqual({ feather: 2, leaf: 1 });
    const later = fox();
    recall(later, memory, noon + 5 * 24 * 3_600_000);
    expect(later.world.album.finds).toEqual({ feather: 2, leaf: 1 });
  });
});

describe('the heart it draws for you', () => {
  it('scratches it in the earth stroke by stroke, then sits looking at you; then the heart lifts off and floats away', () => {
    const b = fox(4, 0.6);
    const { doodle } = b.world;
    expect(STATES.doodle.available?.(fox(3, 0.6))).toBe(false);
    expect(STATES.doodle.available?.(fox(4, 0))).toBe(false);
    expect(STATES.doodle.available?.(b)).toBe(true);
    b.enterNext('doodle');
    const stages: number[] = [];
    const anims = new Set<AnimName>();
    simulate(b, 4400, () => {
      if (doodle.stage !== undefined && doodle.stage !== stages[stages.length - 1]) {
        stages.push(doodle.stage);
      }
      anims.add(b.current().anim);
    });
    expect(stages).toEqual([0, 1, 2]);
    expect([...anims]).toEqual(expect.arrayContaining(['dig', 'proud']));
    // Drawn on the ground for a moment...
    expect(doodle.lifted).toBe(0);
    expect(doodle.box?.y).toBe(0);
    expect(STATES.doodle.available?.(b)).toBe(false);
    // ...then up it goes, whole, swaying, until it is gone.
    const heights: number[] = [];
    const sides = new Set<number>();
    simulate(b, 6000, () => {
      const box = doodle.box;
      if (box) {
        heights.push(box.y);
        sides.add(Math.round(box.x));
        expect(doodle.stage).toBe(2);
      }
    });
    expect(heights[heights.length - 1]).toBeGreaterThan(50);
    expect(heights.every((y, i) => i === 0 || y >= heights[i - 1])).toBe(true);
    expect(sides.size).toBeGreaterThan(2);
    expect(doodle.there).toBe(false);
    expect(doodle.moving).toBe(false);
  });
});

describe('the traces of its day', () => {
  it('leaves a little mound where it dug, found again the same day and gone the next', () => {
    const b = fox(0, 0);
    b.enterNext('dig');
    simulate(b, 4000);
    expect(b.world.mound.stage).toBe(2);
    const noon = new Date(2026, 9, 7, 12).getTime();
    const memory = remember(b, noon);
    const after = fox();
    recall(after, memory, noon + 3_600_000);
    expect(after.world.mound.stage).toBe(2);
    const tomorrow = fox();
    recall(tomorrow, memory, noon + 24 * 3_600_000);
    expect(tomorrow.world.mound.there).toBe(false);
  });
});
