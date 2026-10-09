import { describe, expect, it } from 'vitest';
import {
  LIFE_VERSION,
  attachmentOn,
  dayWorth,
  daysAway,
  mergeLives,
  moodOn,
  newLife,
  peakOn,
  readLife,
  trimmed,
  withCare,
  withPresence,
  withSlight,
  type Care,
  type Life,
} from '../shared/life';

const day = (n: number): string => new Date(Date.UTC(2026, 0, 1 + n)).toISOString().slice(0, 10);
const CARES: Care[] = ['fed', 'played', 'petted', 'treated'];

/** A day on which everything was done. */
const perfect = (life: Life, on: string, off: readonly Care[] = []): Life =>
  CARES.filter((care) => !off.includes(care)).reduce((l, care) => withCare(l, on, care), withPresence(life, on, 60, off));
const perfectDays = (life: Life, from: number, count: number): Life =>
  Array.from({ length: count }, (_, i) => day(from + i)).reduce((l, on) => perfect(l, on), life);

describe('a day together', () => {
  it('is worth nothing when nothing happened, and everything when all was done', () => {
    expect(dayWorth(newLife(day(0)).days[day(0)] ?? { cares: {}, slights: {}, presentMin: 0, off: [] })).toBe(0);
    expect(dayWorth(perfect(newLife(day(0)), day(0)).days[day(0)])).toBeCloseTo(1);
  });

  it('counts a care once, however many times it was given', () => {
    const once = withCare(newLife(day(0)), day(0), 'petted');
    const often = withCare(withCare(once, day(0), 'petted'), day(0), 'petted');
    expect(often.days[day(0)].cares.petted).toBe(3);
    expect(dayWorth(often.days[day(0)])).toBe(dayWorth(once.days[day(0)]));
  });

  it('does not hold against you a care that is switched off', () => {
    const life = perfect(newLife(day(0)), day(0), ['fed']);
    expect(life.days[day(0)].cares.fed).toBeUndefined();
    expect(dayWorth(life.days[day(0)])).toBeCloseTo(1);
  });

  it('counts being there little by little', () => {
    const short = withPresence(newLife(day(0)), day(0), 5, []);
    const long = withPresence(short, day(0), 55, []);
    expect(dayWorth(short.days[day(0)])).toBeGreaterThan(0);
    expect(dayWorth(long.days[day(0)])).toBeGreaterThan(dayWorth(short.days[day(0)]));
    expect(dayWorth(withPresence(long, day(0), 600, []).days[day(0)])).toBe(dayWorth(long.days[day(0)]));
  });
});

describe('attachment', () => {
  it('starts at nothing and grows with every day spent together, more slowly as it nears the top', () => {
    const life = perfectDays(newLife(day(0)), 0, 60);
    expect(attachmentOn(newLife(day(0)), day(0))).toBe(0);
    const week = attachmentOn(life, day(6));
    const month = attachmentOn(life, day(29));
    const two = attachmentOn(life, day(59));
    expect(week).toBeGreaterThan(0.3);
    expect(month).toBeGreaterThan(0.85);
    expect(two).toBeGreaterThan(month);
    expect(two).toBeLessThanOrEqual(1);
    expect(two - month).toBeLessThan(week);
  });

  it('grows less on a day you only dropped by', () => {
    const cared = attachmentOn(perfect(newLife(day(0)), day(0)), day(0));
    const dropped = attachmentOn(withPresence(newLife(day(0)), day(0), 5, []), day(0));
    expect(dropped).toBeGreaterThan(0);
    expect(dropped).toBeLessThan(cared / 5);
  });

  it('holds for three days away, then wears off, and never under a share of what it was', () => {
    const life = perfectDays(newLife(day(0)), 0, 30);
    const before = attachmentOn(life, day(29));
    expect(attachmentOn(life, day(32))).toBe(before);
    const fourth = attachmentOn(life, day(33));
    expect(fourth).toBeLessThan(before);
    expect(attachmentOn(life, day(60))).toBeLessThan(fourth);
    const years = attachmentOn(life, day(29 + 1000));
    expect(years).toBeGreaterThan(0.29 * before);
    expect(years).toBeLessThan(0.35 * before);
  });

  it('picks up again when you come back', () => {
    const away = perfectDays(newLife(day(0)), 0, 30);
    const back = perfect(away, day(60));
    expect(attachmentOn(back, day(60))).toBeGreaterThan(attachmentOn(away, day(60)));
  });
});

describe('mood', () => {
  it('rises with the day, and keeps a third of the day before', () => {
    const life = perfect(newLife(day(0)), day(0));
    expect(moodOn(life, day(0))).toBeCloseTo(1);
    expect(moodOn(life, day(1))).toBeCloseTo(1 / 3);
    expect(moodOn(life, day(2))).toBeCloseTo(1 / 9);
    expect(moodOn(life, day(9))).toBe(0);
  });

  it('sinks with what it had to put up with, and gets over it', () => {
    const life = withSlight(withSlight(newLife(day(0)), day(0), 'unfed'), day(0), 'unheard');
    expect(moodOn(life, day(0))).toBeCloseTo(-0.5);
    expect(moodOn(perfect(life, day(0)), day(0))).toBeCloseTo(0.5);
    expect(moodOn(life, day(1))).toBeGreaterThan(-0.2);
    const awful = Array.from({ length: 9 }).reduce((l: Life) => withSlight(l, day(0), 'unfed'), life);
    expect(moodOn(awful, day(0))).toBe(-1);
  });
});

describe('days away', () => {
  it('counts from the last day you were there, today aside', () => {
    const life = perfect(perfect(newLife(day(0)), day(0)), day(3));
    expect(daysAway(newLife(day(0)), day(5))).toBeUndefined();
    expect(daysAway(life, day(3))).toBe(3);
    expect(daysAway(life, day(4))).toBe(1);
    expect(daysAway(life, day(10))).toBe(7);
    // A day with nothing but a slight is not a day you were there.
    expect(daysAway(withSlight(life, day(8), 'unfed'), day(10))).toBe(7);
  });
});

describe('two copies of a life', () => {
  it('become one that knows what both knew', () => {
    const base = perfect(newLife(day(0)), day(0));
    const here = withCare(withPresence(base, day(1), 30, []), day(1), 'fed');
    const there = withSlight(withCare(withPresence(base, day(1), 10, []), day(1), 'petted'), day(2), 'unfed');
    const one = mergeLives(here, there);
    expect(one.days[day(1)]).toEqual({ cares: { fed: 1, petted: 1 }, slights: {}, presentMin: 30, off: [] });
    expect(one.days[day(2)].slights.unfed).toBe(1);
    expect(one.days[day(0)]).toEqual(base.days[day(0)]);
  });

  it('give the same life whatever the order, and however many times', () => {
    const here = withCare(withPresence(newLife(day(2)), day(3), 30, ['fed']), day(3), 'played');
    const there = withCare(withPresence(newLife(day(0)), day(3), 40, []), day(4), 'petted');
    const one = mergeLives(here, there);
    expect(mergeLives(there, here)).toEqual(one);
    expect(mergeLives(one, there)).toEqual(one);
    expect(mergeLives(one, one)).toEqual(one);
    expect(one.born).toBe(day(0));
    // Switched off on one machine only: it could be done, so it counts.
    expect(one.days[day(3)].off).toEqual([]);
  });

  it('keep the past of the one that has folded more of it away', () => {
    const long = perfectDays(newLife(day(0)), 0, 120);
    const folded = trimmed(long, day(119));
    const one = mergeLives(long, folded);
    expect(one.past).toEqual(folded.past);
    expect(Object.keys(one.days).sort()).toEqual(Object.keys(folded.days).sort());
    expect(mergeLives(folded, long)).toEqual(one);
  });
});

describe('a long life', () => {
  it('folds its oldest days away without changing what it feels', () => {
    const long = perfectDays(perfectDays(newLife(day(0)), 0, 40), 60, 140);
    const folded = trimmed(long, day(199));
    expect(Object.keys(folded.days).length).toBeLessThanOrEqual(91);
    expect(folded.past.until).toBeDefined();
    for (const on of [day(199), day(205), day(400)]) {
      expect(attachmentOn(folded, on)).toBeCloseTo(attachmentOn(long, on), 10);
    }
    expect(folded.past.peak).toBeGreaterThanOrEqual(folded.past.attachment);
    expect(trimmed(folded, day(199))).toBe(folded);
  });

  it('remembers how long you have been gone even when every day has been folded away', () => {
    const life = trimmed(perfectDays(newLife(day(0)), 0, 10), day(300));
    expect(Object.keys(life.days)).toHaveLength(0);
    expect(daysAway(life, day(300))).toBeGreaterThan(90);
    expect(attachmentOn(life, day(300))).toBeGreaterThan(0);
  });
});

describe('reading what was saved', () => {
  it('starts a life when there is none', () => {
    expect(readLife(undefined, day(0))).toEqual({ life: newLife(day(0)), foreign: false, lost: false });
  });

  it('reads back what it wrote', () => {
    const life = trimmed(withSlight(perfectDays(newLife(day(0)), 0, 120), day(119), 'unfed'), day(119));
    const read = readLife(JSON.parse(JSON.stringify(life)), day(50));
    expect(read).toEqual({ life, foreign: false, lost: false });
  });

  it('says so when what is there cannot be read, and starts afresh', () => {
    for (const raw of ['fox', 42, [], {}, { days: {} }]) {
      expect(readLife(raw, day(0))).toEqual({ life: newLife(day(0)), foreign: false, lost: true });
    }
  });

  it('keeps what it understands of a damaged save', () => {
    const raw = {
      version: 1,
      born: 7,
      days: { [day(1)]: { cares: { fed: 2, flown: 1, petted: 'yes', played: -1 }, presentMin: -5, off: ['fed', 'flown', 3] }, yesterday: { cares: { fed: 1 } }, [day(2)]: 'gone' },
      past: { attachment: 4, peak: 'high' },
    };
    const { life, lost } = readLife(raw, day(0));
    expect(lost).toBe(false);
    expect(life).toEqual({
      version: LIFE_VERSION,
      born: day(0),
      days: { [day(1)]: { cares: { fed: 2 }, slights: {}, presentMin: 0, off: ['fed'] } },
      past: { attachment: 1, peak: 1, until: undefined },
    });
  });

  it('reads a life written by a newer Foxel as far as it can, and says it is not ours to write', () => {
    const newer = { ...perfect(newLife(day(0)), day(1)), version: LIFE_VERSION + 1, friends: ['a mouse'] };
    const { life, foreign, lost } = readLife(newer, day(5));
    expect(foreign).toBe(true);
    expect(lost).toBe(false);
    expect(life.born).toBe(day(0));
    expect(life.days[day(1)].cares.fed).toBe(1);
  });
});

describe('what it has reached, and a day without a look', () => {
  it('never loses the most it was attached, however long you stay away', () => {
    const life = perfectDays(newLife(day(0)), 0, 20);
    const top = peakOn(life, day(19));
    expect(top).toBeCloseTo(attachmentOn(life, day(19)));
    expect(peakOn(life, day(400))).toBe(top);
    expect(attachmentOn(life, day(400))).toBeLessThan(top);
  });

  it('is out of sorts when you were there for a long while without once looking after it, until the first care', () => {
    const there = withPresence(newLife(day(0)), day(0), 50, []);
    expect(moodOn(there, day(0))).toBeLessThan(-0.2);
    expect(moodOn(withPresence(newLife(day(0)), day(0), 20, []), day(0))).toBeGreaterThan(0);
    expect(moodOn(withCare(there, day(0), 'petted'), day(0))).toBeGreaterThan(0.3);
  });
});
