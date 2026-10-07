import { describe, expect, it } from 'vitest';
import { StrokeTracker, ThrowTracker } from '../webview/gestures';

describe('ThrowTracker', () => {
  const away = { x: 1, y: 0 };

  it('throws at the speed of the last moments of the drag', () => {
    const t = new ThrowTracker();
    t.sample({ x: 0, y: 0 }, 0);
    t.sample({ x: 100, y: 0 }, 500);
    t.sample({ x: 104, y: 2 }, 550);
    t.sample({ x: 108, y: 4 }, 600);
    expect(t.velocity(600, 0, away)).toEqual({ x: 80, y: 40 });
  });

  it('caps a wild throw without changing its direction', () => {
    const t = new ThrowTracker();
    t.sample({ x: 0, y: 0 }, 0);
    t.sample({ x: 300, y: 400 }, 50);
    const v = t.velocity(50, 0, away);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(180);
    expect(v.y / v.x).toBeCloseTo(4 / 3);
  });

  it('drops the ball when the hand was still', () => {
    const t = new ThrowTracker();
    t.sample({ x: 10, y: 10 }, 0);
    expect(t.velocity(400, 0, away)).toEqual({ x: 0, y: 0 });
  });

  it('pushes a ball let go at the edge away at the speed asked for', () => {
    const t = new ThrowTracker();
    t.sample({ x: 10, y: 10 }, 0);
    expect(t.velocity(400, 90, { x: -3, y: 4 })).toEqual({ x: -54, y: 72 });
  });
});

describe('StrokeTracker', () => {
  it('takes two changes of direction, each after enough travel, to count as petting', () => {
    const s = new StrokeTracker();
    expect(s.move(20, 0, 12)).toBe(false);
    expect(s.move(-20, 100, 12)).toBe(false);
    expect(s.move(20, 200, 12)).toBe(true);
  });

  it('ignores jitter and strokes that are too slow', () => {
    const jitter = new StrokeTracker();
    expect([4, -4, 4, -4].some((dx, i) => jitter.move(dx, i * 50, 12))).toBe(false);
    const slow = new StrokeTracker();
    expect([20, -20, 20].some((dx, i) => slow.move(dx, i * 2000, 12))).toBe(false);
  });

  it('starts over after a reset', () => {
    const s = new StrokeTracker();
    s.move(20, 0, 12);
    s.move(-20, 100, 12);
    s.reset();
    expect(s.move(20, 200, 12)).toBe(false);
  });
});
