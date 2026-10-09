import { describe, expect, it } from 'vitest';
import { grabBall, spawnBall, stowBall } from '../../webview/sim/features/fetch';
import { giveTreat, stowTreat, takeTreat } from '../../webview/sim/features/treat';
import { DRAWERS } from '../../webview/sim/props/chest';
import { fixed, simulate, spawn } from './helpers';

describe('the toy chest', () => {
  /** The fox and its chest: `there` once the pointer has been in the view long enough for the chest to come. */
  function scene(there = true) {
    const b = spawn(fixed(0.5));
    b.world.resize(120, 60);
    b.restore(10, 1);
    const { chest } = b.world;
    /** Its place in the corner. */
    const onChest = { x: 111, y: 4 };
    /** Runs a moment with the pointer there. */
    const point = (at: { x: number; y: number } | undefined, ms = 600, carrying = false): void => {
      chest.point(at, carrying);
      simulate(b, ms);
    };
    /** The middle of a tile, once it has settled. */
    const middle = (box: { x: number; y: number; w: number; h: number }) => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 });
    if (there) {
      point({ x: 40, y: 20 }, 1500);
    }
    return { b, chest, onChest, point, middle };
  }

  it('waits out of view, and slides into its corner when the pointer comes into the view', () => {
    const { b, chest, point } = scene(false);
    expect(chest.visible).toBe(false);
    expect(chest.moving).toBe(false);
    expect(b.world.restful).toBe(true);
    point({ x: 30, y: 20 }, 100);
    expect(chest.visible).toBe(false);
    point({ x: 30, y: 20 }, 300);
    expect(chest.visible).toBe(true);
    expect(chest.here).toBe(false);
    expect(chest.moving).toBe(true);
    point({ x: 30, y: 20 }, 1000);
    expect(chest.here).toBe(true);
    expect(chest.box.x + chest.box.w).toBeLessThanOrEqual(120);
    expect(chest.box.x).toBeGreaterThan(100);
    expect(chest.open).toBe(0);
    expect(chest.moving).toBe(false);
  });

  it('slides back out when the pointer leaves the view, or lies still for a while', () => {
    const { chest, point } = scene(false);
    point({ x: 30, y: 20 }, 1500);
    point(undefined, 1500);
    expect(chest.visible).toBe(false);
    point({ x: 30, y: 20 }, 1500);
    expect(chest.here).toBe(true);
    point({ x: 30, y: 20 }, 5000);
    expect(chest.visible).toBe(false);
    // A pointer lying on the chest keeps it there.
    point({ x: 31, y: 20 }, 1500);
    point({ x: 111, y: 4 }, 8000);
    expect(chest.here).toBe(true);
    expect(chest.open).toBe(1);
  });

  it('does not come for a pointer that only crosses the view', () => {
    const { chest, point } = scene(false);
    point({ x: 30, y: 20 }, 150);
    point(undefined, 1000);
    expect(chest.visible).toBe(false);
  });

  it('follows its corner when the view is resized', () => {
    const { b, chest, point } = scene();
    b.world.resize(200, 60);
    expect(chest.box.x).toBeGreaterThan(180);
    expect(chest.here).toBe(true);
    point(undefined, 1500);
    b.world.resize(90, 60);
    expect(chest.visible).toBe(false);
  });

  it('opens when the pointer comes to it: the lid first, then its drawers rise out one above the other', () => {
    const { chest, onChest, point } = scene();
    expect(chest.here).toBe(true);
    point(onChest, 30);
    expect(chest.open).toBeGreaterThan(0);
    expect(chest.moving).toBe(true);
    // Nothing shows above its rim until the lid is back.
    expect(chest.tab('food').y + chest.tab('food').h).toBeLessThanOrEqual(chest.box.h);
    point(onChest);
    expect(chest.open).toBe(1);
    const food = chest.tab('food');
    const play = chest.tab('play');
    expect(food.y).toBeGreaterThanOrEqual(chest.box.h);
    expect(play.y).toBeGreaterThanOrEqual(food.y + food.h);
    expect(play.y + play.h).toBeLessThanOrEqual(40);
    // No drawer is out yet, so there is nothing to take.
    expect(chest.drawer).toBeUndefined();
    expect(chest.itemAt(food.x - 6, food.y + 5)).toBeUndefined();
  });

  it('brings out the things of the drawer the pointer is on, and puts them back for the other one', () => {
    const { chest, onChest, point, middle } = scene();
    point(onChest);
    point(middle(chest.tab('food')));
    expect(chest.drawer).toBe('food');
    expect(chest.unfolded).toEqual({ food: 1, play: 0 });
    const meal = middle(chest.slot('meal'));
    const treat = middle(chest.slot('treat'));
    expect(treat.x).toBeLessThan(meal.x);
    expect(meal.x).toBeLessThan(chest.tab('food').x);
    expect(chest.itemAt(meal.x, meal.y)).toBe('meal');
    expect(chest.itemAt(treat.x, treat.y)).toBe('treat');

    // Going along the row keeps it out; going up to the other drawer swaps them.
    point(treat);
    expect(chest.drawer).toBe('food');
    point(middle(chest.tab('play')));
    expect(chest.unfolded).toEqual({ food: 0, play: 1 });
    const ball = middle(chest.slot('ball'));
    expect(chest.itemAt(ball.x, ball.y)).toBe('ball');
    expect(chest.itemAt(meal.x, meal.y)).toBeUndefined();
  });

  it('holds every thing in one drawer, each in a place of its own', () => {
    const { chest, onChest, point, middle } = scene();
    point(onChest);
    for (const { drawer, items } of DRAWERS) {
      point(middle(chest.tab(drawer)));
      const places = items.map((item) => chest.slot(item).x);
      expect(new Set(places).size).toBe(items.length);
      expect(Math.min(...places)).toBeGreaterThanOrEqual(0);
    }
  });

  it('waits a little when the pointer leaves, then puts its things away and shuts', () => {
    const { chest, onChest, point, middle } = scene();
    point(onChest);
    point(middle(chest.tab('play')));
    point(undefined, 200);
    expect(chest.open).toBe(1);
    expect(chest.unfolded.play).toBe(1);
    // The things go back in their drawer before the drawers sink in.
    point(undefined, 220);
    expect(chest.unfolded.play).toBeLessThan(1);
    expect(chest.open).toBe(1);
    point(undefined, 800);
    expect(chest.open).toBe(0);
    expect(chest.unfolded.play).toBe(0);
    expect(chest.moving).toBe(false);
  });

  it('stays open if the pointer comes back in time', () => {
    const { chest, onChest, point } = scene();
    point(onChest);
    point(undefined, 200);
    point(onChest, 400);
    expect(chest.open).toBe(1);
  });

  it('does not open for a pointer that is in the view but not on it', () => {
    const { chest, onChest, point } = scene();
    point({ x: onChest.x, y: 30 });
    expect(chest.here).toBe(true);
    expect(chest.open).toBe(0);
  });

  it('only lifts its lid for a hand that holds a toy, and takes the toy back', () => {
    const { b, chest, onChest, point } = scene();
    grabBall(b, 40, 20);
    expect(b.state).toBe('watch');
    expect(chest.accepts(40, 20)).toBe(false);
    point(onChest, 600, true);
    expect(chest.open).toBeGreaterThan(0);
    expect(chest.open).toBeLessThan(1);
    expect(chest.tab('food').y + chest.tab('food').h).toBeLessThanOrEqual(chest.box.h);
    expect(chest.accepts(onChest.x, onChest.y)).toBe(true);

    stowBall(b);
    chest.stowed();
    expect(b.world.ball.state).toBe('none');
    expect(b.state).not.toBe('watch');
    // The lid shuts on it and stays shut until the pointer has gone and come back.
    point(onChest, 600);
    expect(chest.open).toBe(0);
    expect(chest.holds.ball).toBe(true);
    point({ x: 40, y: 20 }, 100);
    point(onChest, 600);
    expect(chest.open).toBe(1);
  });

  it('takes a treat back too, and the fox stops begging', () => {
    const { b } = scene();
    takeTreat(b, 60, 30);
    expect(b.state).toBe('beg');
    stowTreat(b);
    expect(b.world.treat.active).toBe(false);
    expect(b.state).not.toBe('beg');
    simulate(b, 2000);
    expect(b.state).not.toBe('snack');
  });

  it('is not there to take a toy back while it is still out of view', () => {
    const { chest, onChest } = scene(false);
    expect(chest.accepts(onChest.x, onChest.y)).toBe(false);
  });

  it('no longer holds a toy that is out in the view', () => {
    const { b, chest, onChest, point, middle } = scene();
    spawnBall(b, 30, 20, 0);
    point(onChest);
    point(middle(chest.tab('play')));
    const ball = middle(chest.slot('ball'));
    expect(chest.holds.ball).toBe(false);
    expect(chest.itemAt(ball.x, ball.y)).toBeUndefined();
    expect(chest.holds.bubbles).toBe(true);

    giveTreat(b, 60);
    simulate(b, 100);
    expect(chest.holds.treat).toBe(false);
  });

  it('gives a treat straight into your hand, and the fox comes to beg for it', () => {
    const { b } = scene();
    takeTreat(b, 100, 30);
    expect(b.world.treat.state).toBe('held');
    expect(b.state).toBe('beg');
    // There is only ever one treat out.
    takeTreat(b, 20, 30);
    expect(b.world.treat.centerX).toBeGreaterThan(80);
  });
});
