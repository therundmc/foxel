import { describe, expect, it } from 'vitest';
import {
  ANIMATIONS,
  BALL_FRAMES,
  BALL_SIZE,
  BUG_FRAMES,
  BUG_H,
  BUG_W,
  PALETTE,
  SPRITE_SIZE,
  TRANSPARENT,
  frameAt,
  totalDuration,
} from '../webview/sprites';

const usesPalette = (lines: readonly string[]): boolean =>
  lines.every((line) => [...line].every((c) => c === TRANSPARENT || c in PALETTE));

describe('sprites', () => {
  for (const [name, animation] of Object.entries(ANIMATIONS)) {
    describe(name, () => {
      it('has one positive duration per frame', () => {
        expect(animation.frames.length).toBeGreaterThan(0);
        expect(animation.durations).toHaveLength(animation.frames.length);
        animation.durations.forEach((d) => expect(d).toBeGreaterThan(0));
      });

      it('has square frames using only palette colors', () => {
        for (const frame of animation.frames) {
          expect(frame.pixels).toHaveLength(SPRITE_SIZE);
          frame.pixels.forEach((line) => expect(line).toHaveLength(SPRITE_SIZE));
          expect(usesPalette(frame.pixels)).toBe(true);
        }
      });

      it('keeps overlays inside the sprite and in the palette', () => {
        for (const frame of animation.frames) {
          for (const { x, y, glyph } of frame.overlays) {
            expect(x).toBeGreaterThanOrEqual(0);
            expect(y).toBeGreaterThanOrEqual(0);
            expect(x + glyph[0].length).toBeLessThanOrEqual(SPRITE_SIZE);
            expect(y + glyph.length).toBeLessThanOrEqual(SPRITE_SIZE);
            expect(usesPalette(glyph)).toBe(true);
          }
        }
      });
    });
  }

  it('walk frames differ', () => {
    const { frames } = ANIMATIONS.walk;
    expect(frames[0].pixels.join('')).not.toBe(frames[2].pixels.join(''));
  });

  it('frameAt picks the frame matching the elapsed time and loops', () => {
    const idle = ANIMATIONS.idle;
    const total = totalDuration(idle);
    expect(frameAt(idle, 0)).toBe(idle.frames[0]);
    expect(frameAt(idle, idle.durations[0])).toBe(idle.frames[1]);
    expect(frameAt(idle, total - 1)).toBe(idle.frames[idle.frames.length - 1]);
    expect(frameAt(idle, total)).toBe(idle.frames[0]);
  });

  it('ball frames are square and use the palette', () => {
    expect(BALL_FRAMES.length).toBeGreaterThan(1);
    for (const glyph of BALL_FRAMES) {
      expect(glyph).toHaveLength(BALL_SIZE);
      glyph.forEach((line) => expect(line).toHaveLength(BALL_SIZE));
      expect(usesPalette(glyph)).toBe(true);
    }
  });

  it('draws the ball in the mouth while carrying', () => {
    for (const frame of ANIMATIONS.carry.frames) {
      expect(frame.pixels.join('')).toContain('R');
    }
  });

  it('exposes an eye anchor surrounded by fur only, so the eye can be repainted', () => {
    expect(ANIMATIONS.sleep.frames[0].eye).toBeUndefined();
    expect(ANIMATIONS.idle.frames[0].eye).toBeDefined();
    for (const [name, anim] of Object.entries(ANIMATIONS)) {
      for (const frame of anim.frames.filter((f) => f.eye)) {
        const [ex, ey] = frame.eye!;
        for (let y = ey - 1; y <= ey + 2; y++) {
          for (let x = ex - 1; x <= ex + 2; x++) {
            expect(`${name}:${frame.pixels[y][x]}`).toMatch(new RegExp(`^${name}:[OEW]$`));
          }
        }
      }
    }
  });

  it('butterfly frames match the declared size', () => {
    for (const glyph of BUG_FRAMES) {
      expect(glyph).toHaveLength(BUG_H);
      glyph.forEach((line) => expect(line).toHaveLength(BUG_W));
      expect(usesPalette(glyph)).toBe(true);
    }
  });
});
