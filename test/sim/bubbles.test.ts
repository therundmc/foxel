import { describe, expect, it } from 'vitest';
import type { Buddy } from '../../webview/sim/buddy';
import { blowBubbles, popBubbleAt } from '../../webview/sim/features/bubbles';
import { react } from '../../webview/sim/features/reactions';
import type { AnimName } from '../../webview/sprites/fox/animations';
import { simulate, spawn } from './helpers';

/** A stream of numbers that looks random and is the same every time. */
function seeded(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let v = Math.imul(s ^ (s >>> 15), 1 | s);
    v = (v + Math.imul(v ^ (v >>> 7), 61 | v)) ^ v;
    return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
  };
}

function fox(seed: number, width = 220, height = 60): Buddy {
  const b = spawn(seeded(seed));
  b.world.resize(width, height);
  b.restore(40, 1);
  b.enter('sit', 60_000);
  return b;
}

describe('soap bubbles', () => {
  it('blows a stream of them from the bottom of the view, which swell and float up', () => {
    const b = fox(1);
    blowBubbles(b);
    const { bubbles } = b.world;
    expect(bubbles.list.length).toBeGreaterThanOrEqual(9);
    // They leave the wand one after the other.
    expect(bubbles.floating.length).toBeLessThan(bubbles.list.length);
    simulate(b, 300);
    expect(bubbles.floating.some((bubble) => bubble.grown > 0 && bubble.grown < 1)).toBe(true);
    simulate(b, 2500, () => bubbles.list.length === 0);
    expect(bubbles.floating.every((bubble) => bubble.y > bubble.r)).toBe(true);
  });

  it('adds more every time you blow, up to a limit', () => {
    const b = fox(2);
    blowBubbles(b);
    const once = b.world.bubbles.list.length;
    blowBubbles(b);
    expect(b.world.bubbles.list.length).toBeGreaterThan(once);
    for (let i = 0; i < 10; i++) {
      blowBubbles(b);
    }
    expect(b.world.bubbles.list.length).toBe(48);
  });

  it('goes after them, bursts them one way and another, and is pleased with itself when they are gone', () => {
    const anims = new Set<AnimName>();
    let burst = 0;
    for (const seed of [3, 4, 5, 6]) {
      const b = fox(seed);
      blowBubbles(b);
      expect(b.state).toBe('bubbles');
      expect(b.world.effects).toContain('played');
      simulate(b, 90_000, () => {
        expect(b.y).toBeGreaterThanOrEqual(0);
        expect(b.y).toBeLessThanOrEqual(Math.max(0, b.maxY));
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x).toBeLessThanOrEqual(b.maxX);
        anims.add(b.current().anim);
        return b.state !== 'bubbles';
      });
      expect(b.state).not.toBe('bubbles');
      expect(b.world.bubbles.around).toBe(false);
      expect(b.y).toBe(0);
      burst += b.bubbles.burst;
    }
    expect(burst).toBeGreaterThan(20);
    expect(anims).toContain('proud');
    // More than one way of bursting them over a few games.
    const ways = ['popLeap', 'leap', 'swat', 'tailWhip', 'spinBall', 'chomp'].filter((anim) => anims.has(anim as AnimName));
    expect(ways.length).toBeGreaterThanOrEqual(4);
  });

  it('lets the last one come and sit on its nose', () => {
    const b = fox(7);
    blowBubbles(b);
    const { bubbles } = b.world;
    // You burst all but one yourself.
    simulate(b, 2500);
    while (bubbles.list.length > 1) {
      const bubble = bubbles.list[0];
      bubble.age = Math.max(bubble.age, 0);
      expect(popBubbleAt(b, bubble.x, bubble.y)).toBe(true);
      while (bubbles.list.some((other) => other.small)) {
        bubbles.pop(bubbles.list.find((other) => other.small) ?? bubbles.list[0], b.world.random);
      }
    }
    const last = bubbles.list[0];
    simulate(b, 20_000, () => b.current().anim === 'bubbleNose' && last.held !== undefined);
    expect(b.current().anim).toBe('bubbleNose');
    simulate(b, 8000, () => !bubbles.around);
    expect(bubbles.around).toBe(false);
    expect(bubbles.droplets.length).toBeGreaterThan(0);
  });

  it('bursts under your pointer in a ring and a spray of droplets, and a big one lets little ones out', () => {
    const b = fox(8);
    const { bubbles } = b.world;
    blowBubbles(b);
    simulate(b, 2000);
    const big = bubbles.list.find((bubble) => bubble.r >= 5 && bubble.grown >= 1);
    const any = big ?? bubbles.floating[0];
    const before = bubbles.list.length;
    const bursts = bubbles.bursts.length;
    const droplets = bubbles.droplets.length;
    expect(popBubbleAt(b, any.x, any.y)).toBe(true);
    expect(bubbles.bursts.length).toBe(bursts + 1);
    expect(bubbles.droplets.length).toBeGreaterThanOrEqual(droplets + 6);
    if (big) {
      expect(bubbles.list.length).toBeGreaterThan(before - 1);
      expect(bubbles.list.some((bubble) => bubble.small)).toBe(true);
    }
    expect(popBubbleAt(b, -50, -50)).toBe(false);
  });

  it('does not wake a sleeping fox', () => {
    const b = fox(9);
    react(b, 'sleep');
    expect(b.state).toBe('sleep');
    blowBubbles(b);
    simulate(b, 3000);
    expect(b.state).toBe('sleep');
    expect(b.world.bubbles.around).toBe(true);
  });
});
