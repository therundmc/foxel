import { describe, expect, it } from 'vitest';
import { clockAt, dateKey, dayPhase, lightTint, mealAt, partyKind, vistaAt } from '../shared/day';

const at = (hours: number, minutes = 0, day = 7): Date => new Date(2026, 9, day, hours, minutes);

describe('day', () => {
  it('splits the day into phases', () => {
    expect(dayPhase(at(3))).toBe('night');
    expect(dayPhase(at(7))).toBe('dawn');
    expect(dayPhase(at(10))).toBe('morning');
    expect(dayPhase(at(12))).toBe('lunch');
    expect(dayPhase(at(15))).toBe('afternoon');
    expect(dayPhase(at(19))).toBe('evening');
    expect(dayPhase(at(23))).toBe('night');
  });

  it('knows which sky there is to look at', () => {
    expect(vistaAt(at(3))).toBe('stars');
    expect(vistaAt(at(6, 30))).toBe('sunrise');
    expect(vistaAt(at(9))).toBe('clouds');
    expect(vistaAt(at(17))).toBe('clouds');
    expect(vistaAt(at(19))).toBe('sunset');
    expect(vistaAt(at(21))).toBe('stars');
  });

  it('knows the four meal times', () => {
    expect(mealAt(at(8))).toBe('breakfast');
    expect(mealAt(at(10))).toBeUndefined();
    expect(mealAt(at(12, 15))).toBe('lunch');
    expect(mealAt(at(16, 30))).toBe('snack');
    expect(mealAt(at(19))).toBe('dinner');
    expect(mealAt(at(21))).toBeUndefined();
  });

  it('tints the light golden at sunrise and sunset, blue at night', () => {
    expect(lightTint(at(2))).toBe('night');
    expect(lightTint(at(7))).toBe('golden');
    expect(lightTint(at(13))).toBe('day');
    expect(lightTint(at(19))).toBe('golden');
    expect(lightTint(at(22))).toBe('night');
  });

  it('parties on Friday afternoons and on the install anniversary', () => {
    expect(partyKind(at(16, 0, 9), '2026-01-01')).toBe('friday');
    expect(partyKind(at(10, 0, 9), '2026-01-01')).toBeUndefined();
    expect(partyKind(at(10, 0, 7), '2025-10-07')).toBe('anniversary');
    expect(partyKind(at(10, 0, 7), '2026-10-07')).toBeUndefined();
  });

  it('formats a local date key', () => {
    expect(dateKey(at(23, 59))).toBe('2026-10-07');
  });

  it('can force the hour for testing', () => {
    const now = at(9, 41);
    expect(clockAt(undefined, now)).toBe(now);
    expect(clockAt(22, now).getHours()).toBe(22);
    expect(clockAt(22, now).getMinutes()).toBe(41);
    expect(clockAt(12.5, now).getMinutes()).toBe(30);
  });
});
