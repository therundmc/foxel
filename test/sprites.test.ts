import { describe, expect, it } from 'vitest';
import { touchZone } from '../webview/sprites/fox/anchors';
import { ANIMATIONS } from '../webview/sprites/fox/animations';
import { FRAME_PAD, FRAME_SIZE, SPRITE_SIZE, frameAt, totalDuration } from '../webview/sprites/frames';
import { COATS, PALETTE, TRANSPARENT } from '../webview/sprites/palette';
import {
  BALL_FRAMES,
  BALL_SIZE,
  BUG_FRAMES,
  BUG_H,
  BUG_W,
  GRASS,
  GRASS_H,
  GRASS_W,
  BIRD_FRAMES,
  BIRD_H,
  BIRD_W,
  HATS,
  MOUSE_FACE,
  MOUSE_FRAMES,
  TREAT_GLYPH,
  TREAT_H,
  TREAT_W,
} from '../webview/sprites/props';

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
          expect(frame.pixels).toHaveLength(FRAME_SIZE);
          frame.pixels.forEach((line) => expect(line).toHaveLength(FRAME_SIZE));
          expect(usesPalette(frame.pixels)).toBe(true);
        }
      });

      it('fits in its frame, outline and all: nothing of the fox is cut off at an edge', () => {
        const fur = (c: string): boolean => c !== TRANSPARENT && c !== 'K';
        animation.frames.forEach((frame, i) => {
          const edge = [frame.pixels[0], frame.pixels[FRAME_SIZE - 1], ...frame.pixels.map((line) => line[0] + line[FRAME_SIZE - 1])].join('');
          expect(`frame ${i}: ${[...edge].filter(fur).join('')}`).toBe(`frame ${i}: `);
        });
      });

      it('keeps overlays within reach of the sprite and in the palette', () => {
        // An accessory may stand beside the fox, fly in over it or sink into the ground: not wander off.
        const REACH = 36;
        for (const frame of animation.frames) {
          for (const { x, y, glyph } of frame.overlays) {
            expect(x).toBeGreaterThanOrEqual(-REACH);
            expect(y).toBeGreaterThanOrEqual(-REACH);
            expect(x + glyph[0].length).toBeLessThanOrEqual(SPRITE_SIZE + REACH);
            expect(y + glyph.length).toBeLessThanOrEqual(SPRITE_SIZE + REACH / 2);
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
      expect(frame.pixels.join('')).toContain('B');
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
            expect(`${name}:${frame.pixels[y + FRAME_PAD][x + FRAME_PAD]}`).toMatch(new RegExp(`^${name}:[OEW]$`));
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

  it('mouse and grass use the palette, and the grass matches the declared size', () => {
    for (const glyph of [...MOUSE_FRAMES, MOUSE_FACE, ...GRASS]) {
      expect(usesPalette(glyph)).toBe(true);
    }
    for (const glyph of GRASS) {
      expect(glyph).toHaveLength(GRASS_H);
      glyph.forEach((line) => expect(line).toHaveLength(GRASS_W));
    }
  });

  it('bird frames use the palette and are all the declared size', () => {
    for (const glyph of BIRD_FRAMES) {
      expect(usesPalette(glyph)).toBe(true);
      expect(glyph).toHaveLength(BIRD_H);
      glyph.forEach((line) => expect(line).toHaveLength(BIRD_W));
    }
  });

  it('hats use the palette', () => {
    for (const { glyph } of Object.values(HATS)) {
      expect(usesPalette(glyph)).toBe(true);
    }
  });

  it('shows no face when it sits with its back to us', () => {
    for (const frame of ANIMATIONS.gaze.frames) {
      expect(frame.eye).toBeUndefined();
      expect(frame.pixels.join('')).not.toContain('E');
    }
  });

  it('treat glyph matches the declared size', () => {
    expect(TREAT_GLYPH).toHaveLength(TREAT_H);
    TREAT_GLYPH.forEach((line) => expect(line).toHaveLength(TREAT_W));
    expect(usesPalette(TREAT_GLYPH)).toBe(true);
  });

  it('tells which part of the fox is touched', () => {
    const stand = ANIMATIONS.idle.frames[0];
    expect(touchZone(stand, 28.5, 15.5)).toBe('nose');
    expect(touchZone(stand, 21.5, 9.5)).toBe('head');
    expect(touchZone(stand, 24.5, 3.5)).toBe('head');
    expect(touchZone(stand, 13.5, 21.5)).toBe('back');
    expect(touchZone(stand, 19.5, 29.5)).toBe('paw');
    expect(touchZone(stand, 4.5, 13.5)).toBe('tail');
    expect(touchZone(stand, 0.5, 0.5)).toBeUndefined();
    const lying = ANIMATIONS.lie.frames[0];
    const [hx, hy] = lying.head;
    expect(touchZone(lying, hx + 0.5, hy - 3.5)).toBe('head');
  });

  it('coats only recolour existing palette letters', () => {
    for (const coat of Object.values(COATS)) {
      for (const [letter, color] of Object.entries(coat)) {
        expect(letter in PALETTE).toBe(true);
        expect(color).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });
});
