import { describe, expect, it } from 'vitest';
import { STRIP_SHARE, withStripBelow } from '../../src/editorStrip';

describe('the strip across the bottom of the editor area', () => {
  it('goes under a single editor', () => {
    expect(withStripBelow({ orientation: 0, groups: [{ size: 1200 }] })).toEqual({
      orientation: 1,
      groups: [{ groups: [{ size: 1200 }], size: 1 - STRIP_SHARE }, { size: STRIP_SHARE }],
    });
  });

  it('goes under editors side by side, across all of them, leaving their split alone', () => {
    const columns = [{ size: 0.5 }, { size: 0.5, groups: [{ size: 0.6 }, { size: 0.4 }] }];
    const layout = withStripBelow({ orientation: 0, groups: columns });
    expect(layout.orientation).toBe(1);
    expect(layout.groups).toHaveLength(2);
    expect(layout.groups[0].groups).toEqual(columns);
    expect(layout.groups[1]).toEqual({ size: STRIP_SHARE });
  });

  it('is added under editors already one above the other, which keep their proportions', () => {
    const layout = withStripBelow({ orientation: 1, groups: [{ size: 600 }, { size: 200 }] });
    expect(layout.groups).toHaveLength(3);
    const [first, second, strip] = layout.groups.map((group) => group.size ?? 0);
    expect(first / second).toBeCloseTo(3);
    expect(first + second + strip).toBeCloseTo(1);
    expect(strip).toBe(STRIP_SHARE);
  });
});
