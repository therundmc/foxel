import { describe, expect, it } from 'vitest';
import { SignTracker, StrokeTracker, ThrowTracker } from '../webview/gestures';

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

describe('SignTracker', () => {
  /** Feeds the points of a path, a few milliseconds apart, and says which sign came out of it, if any. */
  const read = (points: readonly [number, number][], stepMs = 12): string | undefined => {
    const signs = new SignTracker();
    let found: string | undefined;
    points.forEach(([x, y], i) => {
      found ??= signs.move({ x, y }, i * stepMs);
    });
    return found;
  };
  const circle = (turns: number, radius = 12, clockwise = true): [number, number][] =>
    Array.from({ length: Math.round(40 * turns) + 1 }, (_, i) => {
      const a = ((clockwise ? 1 : -1) * i * 2 * Math.PI) / 40;
      return [100 + radius * Math.cos(a), 30 + radius * Math.sin(a)];
    });
  const zigzag = (strokes: number, along: 'x' | 'y', length = 16): [number, number][] =>
    Array.from({ length: strokes * 8 + 1 }, (_, i) => {
      const stroke = Math.floor(i / 8);
      const within = (i % 8) / 8;
      const at = (stroke % 2 === 0 ? within : 1 - within) * length;
      return along === 'x' ? [100 + at, 30] : [100, 20 + at];
    });

  it('reads a circle drawn either way round, but not an arc', () => {
    expect(read(circle(1.1))).toBe('circle');
    expect(read(circle(1.1, 12, false))).toBe('circle');
    expect(read(circle(0.6))).toBeUndefined();
    expect(read(circle(1.1, 3))).toBeUndefined();
  });

  it('reads a wave from side to side and a nod up and down, by their strokes', () => {
    expect(read(zigzag(4, 'x'))).toBe('wave');
    expect(read(zigzag(4, 'y'))).toBe('nod');
    expect(read(zigzag(2, 'x'))).toBeUndefined();
    expect(read(zigzag(4, 'x', 4))).toBeUndefined();
  });

  it('sees nothing in a pointer that just crosses the view, or dawdles', () => {
    expect(read(Array.from({ length: 60 }, (_, i) => [i * 4, 30 + Math.sin(i / 9) * 6] as [number, number]))).toBeUndefined();
    expect(read(circle(1.1), 80)).toBeUndefined();
  });
});

