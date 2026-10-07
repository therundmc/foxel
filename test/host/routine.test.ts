import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Reaction } from '../../shared/protocol';
import type { BuddyConfig } from '../../src/config';
import { Routine } from '../../src/routine';

const MINUTE = 60_000;

describe('Routine', () => {
  let reactions: Reaction[];
  let watcher: { asleep: boolean; workingSince: number };
  let live: boolean;
  let config: BuddyConfig;
  let routine: Routine;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 7, 9, 45));
    reactions = [];
    watcher = { asleep: false, workingSince: Date.now() };
    live = true;
    config = { meals: true, breakReminderMinutes: 50, hydrationReminderMinutes: 60 } as BuddyConfig;
    const stored = new Map<string, unknown>();
    const state = {
      keys: () => [...stored.keys()],
      get: <T>(key: string) => stored.get(key) as T | undefined,
      update: async (key: string, value: unknown) => void stored.set(key, value),
    };
    routine = new Routine(watcher, state, () => config, () => new Date(), (r) => reactions.push(r), () => live);
  });

  afterEach(() => {
    routine.dispose();
    vi.useRealTimers();
  });

  const count = (reaction: Reaction): number => reactions.filter((r) => r === reaction).length;
  const pass = (minutes: number): void => void vi.advanceTimersByTime(minutes * MINUTE);

  it('gets hungry once per meal, and not again once fed', () => {
    pass(60);
    expect(count('hungry')).toBe(0);
    pass(60);
    expect(count('hungry')).toBe(1);
    routine.fed();
    routine.viewReady();
    expect(count('hungry')).toBe(1);
    vi.setSystemTime(new Date(2026, 9, 7, 16, 5));
    pass(1);
    expect(count('hungry')).toBe(2);
  });

  it('tells a new view the fox is still hungry', () => {
    vi.setSystemTime(new Date(2026, 9, 7, 12));
    pass(1);
    routine.viewReady();
    expect(count('hungry')).toBe(2);
  });

  it('asks for a break after a long stretch of work, then every quarter of an hour', () => {
    config.hydrationReminderMinutes = 0;
    config.meals = false;
    pass(49);
    expect(reactions).toEqual([]);
    pass(2);
    expect(reactions).toEqual(['breakTime']);
    pass(15);
    expect(count('breakTime')).toBe(2);
    watcher.workingSince = Date.now();
    pass(49);
    expect(count('breakTime')).toBe(2);
  });

  it('has a drink every hour', () => {
    config.breakReminderMinutes = 0;
    config.meals = false;
    pass(61);
    expect(reactions).toEqual(['drink']);
    pass(60);
    expect(count('drink')).toBe(2);
  });

  it('lets its needs wait while it sleeps or has no view, and brings them up when one opens', () => {
    config.meals = false;
    live = false;
    pass(120);
    expect(reactions).toEqual([]);
    live = true;
    routine.viewReady();
    expect(reactions.sort()).toEqual(['breakTime', 'drink']);
    watcher.asleep = true;
    pass(120);
    expect(reactions).toHaveLength(2);
  });
});
