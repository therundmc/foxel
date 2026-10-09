import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LIFE_VERSION, type Life } from '../../shared/life';
import type { BuddyMemory } from '../../shared/protocol';
import { LIFE_KEY, LifeStore, NEEDS_KEY, UNREADABLE_KEY, type Keep } from '../../src/lifeStore';

const MINUTE = 60_000;
const TODAY = '2026-10-07';

/** What the editor keeps things in. Like the real one it hands out copies: what a window holds is its own. */
function keeper() {
  const stored = new Map<string, string>();
  const writes: string[] = [];
  const synced: string[] = [];
  const keep: Keep = {
    keys: () => [...stored.keys()],
    get: <T>(key: string) => (stored.has(key) ? (JSON.parse(stored.get(key)!) as T) : undefined),
    update: async (key: string, value: unknown) => {
      writes.push(key);
      stored.set(key, JSON.stringify(value));
    },
    setKeysForSync: (keys) => void synced.splice(0, synced.length, ...keys),
  };
  return { keep, writes, synced, saved: () => keep.get<Life>(LIFE_KEY), put: (key: string, value: unknown) => void stored.set(key, JSON.stringify(value)) };
}

describe('LifeStore', () => {
  let kept: ReturnType<typeof keeper>;
  const stores: LifeStore[] = [];
  const open = (born = TODAY): LifeStore => {
    const store = new LifeStore(kept.keep, born, () => new Date());
    stores.push(store);
    return store;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 7, 10));
    kept = keeper();
  });

  afterEach(() => {
    stores.splice(0).forEach((store) => store.dispose());
    vi.useRealTimers();
  });

  it('starts a life the first time, and writes nothing until something happens', () => {
    const store = open();
    expect(store.life.born).toBe(TODAY);
    expect(store.feelings).toEqual({ attachment: 0, peak: 0, mood: 0, daysAway: undefined });
    vi.advanceTimersByTime(30 * MINUTE);
    expect(kept.writes).toEqual([]);
    expect(kept.synced).toEqual([LIFE_KEY]);
  });

  it('writes a care soon after it was given', () => {
    const store = open();
    store.care('fed');
    expect(kept.saved()).toBeUndefined();
    vi.advanceTimersByTime(15_000);
    expect(kept.saved()?.days[TODAY].cares).toEqual({ fed: 1 });
    expect(store.feelings.attachment).toBeGreaterThan(0);
    expect(store.feelings.mood).toBeGreaterThan(0);
  });

  it('writes the time spent together only now and then', () => {
    const store = open();
    for (let minute = 0; minute < 12; minute++) {
      store.present(1, []);
      vi.advanceTimersByTime(MINUTE);
    }
    expect(kept.writes).toEqual([LIFE_KEY, LIFE_KEY]);
    expect(kept.saved()?.days[TODAY].presentMin).toBeGreaterThanOrEqual(10);
  });

  it('writes what is left when it is closed, and is found again the next time', async () => {
    const store = open();
    store.present(3, ['fed']);
    store.slight('unheard');
    await store.save();
    await store.save();
    expect(kept.writes).toEqual([LIFE_KEY]);

    vi.setSystemTime(new Date(2026, 9, 9, 10));
    const later = open('2026-10-09');
    expect(later.life.born).toBe(TODAY);
    expect(later.life.days[TODAY]).toEqual({ cares: {}, slights: { unheard: 1 }, presentMin: 3, off: ['fed'] });
    expect(later.feelings.daysAway).toBe(2);
  });

  it('notes each thing on the day it happens', () => {
    const store = open();
    vi.setSystemTime(new Date(2026, 9, 7, 23, 59));
    store.care('petted');
    vi.setSystemTime(new Date(2026, 9, 8, 0, 1));
    store.care('petted');
    expect(Object.keys(store.life.days)).toEqual([TODAY, '2026-10-08']);
  });

  it('loses nothing when two windows write in turn', () => {
    const one = open();
    const two = open();
    one.care('fed');
    two.care('petted');
    one.present(20, []);
    two.present(5, []);
    vi.advanceTimersByTime(15_000);
    expect(kept.saved()?.days[TODAY]).toEqual({ cares: { fed: 1, petted: 1 }, slights: {}, presentMin: 20, off: [] });
    // Each of them knows what the other noted, without having to write for that.
    expect(one.life.days[TODAY].cares).toEqual({ fed: 1, petted: 1 });
    expect(one.feelings).toEqual(two.feelings);
  });

  it('takes in what another machine has synced, and keeps the earliest birthday', () => {
    const store = open();
    store.care('played');
    kept.put(LIFE_KEY, { version: LIFE_VERSION, born: '2026-09-01', days: { '2026-10-06': { cares: { fed: 1 }, slights: {}, presentMin: 50, off: [] } }, past: { attachment: 0, peak: 0 } });
    vi.advanceTimersByTime(15_000);
    const saved = kept.saved();
    expect(saved?.born).toBe('2026-09-01');
    expect(Object.keys(saved?.days ?? {}).sort()).toEqual(['2026-10-06', TODAY]);
  });

  it('never writes over a life kept by a newer Foxel, even one that shows up later', async () => {
    const newer = { version: LIFE_VERSION + 1, born: '2026-09-01', days: {}, past: { attachment: 0.5, peak: 0.5, until: '2026-10-01' }, friends: ['a mouse'] };
    kept.put(LIFE_KEY, newer);
    const store = open();
    expect(store.feelings.attachment).toBeGreaterThan(0.4);
    store.care('fed');
    await store.save();
    expect(kept.keep.get(LIFE_KEY)).toEqual(newer);

    kept = keeper();
    const other = open();
    other.care('fed');
    kept.put(LIFE_KEY, newer);
    vi.advanceTimersByTime(15_000);
    other.care('petted');
    await other.save();
    expect(kept.keep.get(LIFE_KEY)).toEqual(newer);
  });

  it('sets aside a life it cannot read rather than throwing it away', async () => {
    kept.put(LIFE_KEY, 'once upon a time');
    const store = open();
    expect(kept.keep.get(UNREADABLE_KEY)).toBe('once upon a time');
    store.care('fed');
    await store.save();
    expect(kept.saved()?.days[TODAY].cares.fed).toBe(1);
  });

  it('keeps its needs of the moment on this machine, apart from its life', () => {
    const store = open();
    expect(store.needs).toBeUndefined();
    const needs = { savedAt: Date.now(), thirsty: true, breakWanted: false, breakAsks: 0, greeted: {}, vistaInMs: 0, mouseFriend: false } satisfies BuddyMemory;
    store.noteNeeds(needs);
    expect(kept.writes).toEqual([NEEDS_KEY]);
    expect(open().needs).toEqual(needs);
    kept.put(NEEDS_KEY, 'thirsty');
    expect(store.needs).toBeUndefined();
  });
});
