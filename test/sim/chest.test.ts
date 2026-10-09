import { describe, expect, it } from 'vitest';
import { spawnBall } from '../../webview/sim/features/fetch';
import { giveTreat, takeTreat } from '../../webview/sim/features/treat';
import { DRAWERS } from '../../webview/sim/props/chest';
import { fixed, simulate, spawn } from './helpers';

describe('the toy chest', () => {
  function scene() {
    const b = spawn(fixed(0.5));
    b.world.resize(120, 60);
    b.restore(10, 1);
    const { chest } = b.world;
    const onChest = { x: chest.x + 6, y: 4 };
    /** Runs a moment with the pointer there. */
    const point = (at: { x: number; y: number } | undefined, ms = 600): void => {
      chest.point(at);
      simulate(b, ms);
    };
    /** The middle of a tile, once it has settled. */
    const middle = (box: { x: number; y: number; w: number; h: number }) => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 });
    return { b, chest, onChest, point, middle };
  }

  it('stands in the corner of the view, shut, and stays there when the view is resized', () => {
    const { b, chest } = scene();
    expect(chest.open).toBe(0);
    expect(chest.box.x + chest.box.w).toBeLessThanOrEqual(120);
    expect(chest.box.x).toBeGreaterThan(100);
    b.world.resize(200, 60);
    expect(chest.box.x).toBeGreaterThan(180);
    expect(chest.moving).toBe(false);
    expect(b.world.restful).toBe(true);
  });

  it('opens when the pointer comes to it: the lid first, then its drawers rise out one above the other', () => {
    const { chest, onChest, point } = scene();
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

  it('does not open for a pointer that only passes over the view', () => {
    const { chest, point } = scene();
    point({ x: 40, y: 20 });
    point({ x: chest.x + 6, y: 30 });
    expect(chest.open).toBe(0);
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
