import { describe, expect, it } from 'vitest';
import { fixed, simulate, spawn } from './helpers';

describe('the shelf', () => {
  function scene() {
    const b = spawn(fixed(0.5));
    b.world.resize(160, 70);
    b.restore(10, 1);
    const { shelf, chest } = b.world;
    const point = (at: { x: number; y: number } | undefined, ms = 1500): void => {
      shelf.point(at);
      chest.point(at);
      simulate(b, ms);
    };
    const middle = (box: { x: number; y: number; w: number; h: number }) => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 });
    return { b, shelf, chest, point, middle };
  }

  it('waits at the top right of the view, only its end showing, with nothing on it within reach', () => {
    const { b, shelf } = scene();
    expect(shelf.here).toBe(false);
    expect(shelf.x).toBeGreaterThan(150);
    expect(shelf.x).toBeLessThan(160);
    expect(shelf.y).toBeGreaterThan(50);
    expect(shelf.itemAt(shelf.slot('meal').x + 2, shelf.y + 3)).toBeUndefined();
    expect(b.world.restful).toBe(true);
  });

  it('slides out when the pointer comes close, and back when it goes or lies still', () => {
    const { shelf, point } = scene();
    point({ x: 150, y: 60 }, 100);
    expect(shelf.asked).toBe(false);
    point({ x: 150, y: 60 });
    expect(shelf.here).toBe(true);
    expect(shelf.x + 20).toBeLessThan(160);
    point({ x: 60, y: 60 });
    expect(shelf.here).toBe(false);
    point({ x: 150, y: 44 });
    expect(shelf.here).toBe(true);
    point({ x: 150, y: 44 }, 6000);
    expect(shelf.here).toBe(false);
    // Lying on the shelf itself, the pointer keeps it out.
    point({ x: 150, y: 60 });
    point({ x: 150, y: 60 }, 6000);
    expect(shelf.here).toBe(true);
  });

  it('holds its kibble and its soap, each within reach once it is out, and dips the one that is used', () => {
    const { shelf, point, middle } = scene();
    point({ x: 150, y: 60 });
    const meal = middle(shelf.slot('meal'));
    const soap = middle(shelf.slot('bubbles'));
    expect(shelf.itemAt(meal.x, meal.y)).toBe('meal');
    expect(shelf.itemAt(soap.x, soap.y)).toBe('bubbles');
    expect(shelf.itemAt(meal.x, shelf.y - 4)).toBeUndefined();
    const before = shelf.slot('bubbles').y;
    shelf.press('bubbles');
    expect(shelf.slot('bubbles').y).toBe(before - 1);
    expect(shelf.slot('meal').y).toBe(before);
    expect(shelf.moving).toBe(true);
    point({ x: 150, y: 60 }, 300);
    expect(shelf.slot('bubbles').y).toBe(before);
  });

  it('sets its things swaying as it slides out and stops short, the tall bottle more and for longer than the bag', () => {
    const { b, shelf } = scene();
    const leans: Record<'meal' | 'bubbles', number[]> = { meal: [], bubbles: [] };
    const watch = (ms: number): void => {
      simulate(b, ms, () => {
        for (const item of ['meal', 'bubbles'] as const) {
          const lean = shelf.sway(item);
          if (lean !== leans[item][leans[item].length - 1]) {
            leans[item].push(lean);
          }
        }
      });
    };
    shelf.point({ x: 150, y: 60 });
    watch(3000);
    expect(shelf.here).toBe(true);
    // Thrown back toward the wall as it sets off to the left, forward as it stops, then back and forth to rest.
    expect(leans.bubbles.slice(0, 4)).toEqual([0, 1, 0, -1]);
    expect(leans.bubbles.filter((lean) => lean !== 0).length).toBeGreaterThanOrEqual(3);
    expect(leans.meal.filter((lean) => lean !== 0).length).toBeGreaterThanOrEqual(1);
    expect(leans.meal.length).toBeLessThan(leans.bubbles.length);
    expect(leans.bubbles[leans.bubbles.length - 1]).toBe(0);
    expect(shelf.moving).toBe(false);

    // Used, a thing wobbles a little by itself.
    leans.meal.length = 0;
    shelf.press('meal');
    watch(1000);
    expect(leans.meal).toContain(1);
    expect(shelf.sway('meal')).toBe(0);
    expect(shelf.moving).toBe(false);
  });

  it('stays in when the pointer is busy with the chest, and neither brings the fox over', () => {
    const { b, shelf, chest, point } = scene();
    b.world.resize(160, 40);
    b.enter('sit', 60_000);
    point({ x: 150, y: 14 });
    expect(chest.asked).toBe(true);
    expect(shelf.asked).toBe(false);
    b.world.resize(160, 70);
    let came = false;
    let moves = 0;
    simulate(b, 20_000, () => {
      const at = { x: 150 + (moves++ % 2), y: 60 };
      shelf.point(at);
      chest.point(at);
      b.world.pointer = at;
      came ||= b.state === 'come';
    });
    expect(shelf.here).toBe(true);
    expect(came).toBe(false);
  });
});
