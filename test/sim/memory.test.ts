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
    recall(after, { savedAt: 0, thirsty: true, breakWanted: false, breakAsks: 0, greeted: {} }, MINUTE);
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
