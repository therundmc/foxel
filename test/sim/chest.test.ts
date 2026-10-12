import { describe, expect, it } from 'vitest';
import { grabBall, spawnBall, stowBall } from '../../webview/sim/features/fetch';
import { stowTreat, takeTreat } from '../../webview/sim/features/treat';
import { holdPlush, stowPlush } from '../../webview/sim/features/plush';
import { CHEST_ITEMS } from '../../webview/sim/props/chest';
import { ALBUM_W } from '../../webview/sprites/keepsakes';
import { fixed, simulate, spawn } from './helpers';

describe('the toy chest', () => {
  /** The fox and its chest: `there` once the pointer has been in the view long enough for the chest to come. */
  function scene(there = true) {
    const b = spawn(fixed(0.5));
    b.world.resize(120, 60);
    b.restore(10, 1);
    const { chest } = b.world;
    /** Its place in the corner. */
    const onChest = { x: 108, y: 4 };
    /** Runs a moment with the pointer there. */
    const point = (at: { x: number; y: number } | undefined, ms = 600, carrying = false): void => {
      chest.point(at, carrying);
      simulate(b, ms);
    };
    /** The middle of a tile, once it has settled. */
    const middle = (box: { x: number; y: number; w: number; h: number }) => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 });
    if (there) {
      point({ x: 100, y: 20 }, 1500);
    }
    return { b, chest, onChest, point, middle };
  }

  it('draws right out of sight with the shelf and the box of keepsakes while a sky is out, and is back at the edge once it has gone', () => {
    const { b, chest, point } = scene(false);
    const { shelf, album, scenery } = b.world;
    const showing = (): boolean[] => [chest.box.x < 120, shelf.x < 120, album.x + ALBUM_W > 0];
    simulate(b, 1000);
    expect(showing()).toEqual([true, true, true]);
    scenery.appear('stars', 40, 1, 10_000, 20_000);
    simulate(b, 2000);
    expect(showing()).toEqual([false, false, false]);
    // Nothing fidgets at the edge during the sky.
    simulate(b, 12_000, () => expect(chest.nudge).toBe(0));
    expect(showing()).toEqual([false, false, false]);
    // It still comes for a pointer that goes to its corner.
    point({ x: 100, y: 20 }, 1500);
    expect(chest.here).toBe(true);
    point(undefined, 3000);
    expect(showing()).toEqual([false, false, false]);
    simulate(b, 60_000, () => !scenery.active);
    expect(scenery.active).toBe(false);
    simulate(b, 2000);
    expect(showing()).toEqual([true, true, true]);
    expect(chest.tucked).toBe(true);
  });

  it('waits at the edge of the view, a bit of it showing, and rolls into its corner when the pointer comes close', () => {
    const { b, chest, point } = scene(false);
    expect(chest.tucked).toBe(true);
    expect(chest.box.x).toBeLessThan(120);
    expect(chest.box.x).toBeGreaterThan(110);
    point({ x: 100, y: 20 }, 100);
    expect(chest.tucked).toBe(true);
    point({ x: 100, y: 20 }, 300);
    expect(chest.tucked).toBe(false);
    expect(chest.here).toBe(false);
    expect(chest.moving).toBe(true);
    point({ x: 100, y: 20 }, 1000);
    expect(chest.here).toBe(true);
    expect(chest.box.x + chest.box.w).toBeLessThanOrEqual(120);
    expect(chest.box.x).toBeGreaterThan(95);
    expect(chest.open).toBe(0);
    expect(chest.moving).toBe(false);
    expect(b.world.restful).toBe(true);
  });

  it('stays where it is for a pointer anywhere else in the view', () => {
    const { chest, point } = scene(false);
    point({ x: 40, y: 20 }, 2000);
    expect(chest.tucked).toBe(true);
    point({ x: 100, y: 45 }, 2000);
    expect(chest.tucked).toBe(true);
  });

  it('fidgets now and then while it waits, to be noticed: soon after the view opens, then every so often', () => {
    const { b, chest } = scene(false);
    b.enter('sleep', 3_600_000);
    const nudgedWithin = (ms: number): boolean => {
      let nudged = false;
      simulate(b, ms, () => {
        nudged ||= chest.nudge === 1 && chest.lid === 1;
      });
      return nudged;
    };
    expect(nudgedWithin(2500)).toBe(false);
    expect(nudgedWithin(1500)).toBe(true);
    simulate(b, 1000);
    expect(chest.nudge).toBe(0);
    expect(chest.lid).toBe(0);
    expect(b.world.restful).toBe(true);
    expect(nudgedWithin(6000)).toBe(false);
    expect(nudgedWithin(4000)).toBe(true);
    // Not while it is out for you.
    chest.point({ x: 108, y: 4 });
    expect(nudgedWithin(12_000)).toBe(false);
    expect(chest.tucked).toBe(false);
  });

  it('slides back out when the pointer leaves the view, or lies still for a while', () => {
    const { chest, point } = scene(false);
    point({ x: 100, y: 20 }, 1500);
    point(undefined, 1500);
    expect(chest.tucked).toBe(true);
    point({ x: 100, y: 20 }, 1500);
    expect(chest.here).toBe(true);
    point({ x: 100, y: 20 }, 5000);
    expect(chest.tucked).toBe(true);
    // A pointer lying on the chest keeps it there.
    point({ x: 101, y: 20 }, 1500);
    point({ x: 108, y: 4 }, 8000);
    expect(chest.here).toBe(true);
    expect(chest.open).toBe(1);
  });

  it('does not come for a pointer that only passes close to it', () => {
    const { chest, point } = scene(false);
    point({ x: 100, y: 20 }, 150);
    point(undefined, 1000);
    expect(chest.tucked).toBe(true);
  });

  it('follows its corner when the view is resized', () => {
    const { b, chest, point } = scene();
    b.world.resize(200, 60);
    expect(chest.box.x).toBeGreaterThan(175);
    expect(chest.here).toBe(true);
    point(undefined, 1500);
    b.world.resize(90, 60);
    expect(chest.tucked).toBe(true);
  });

  it('opens when the pointer comes to it: the lid first, then its things rise out, each on its tile', () => {
    const { chest, onChest, point, middle } = scene();
    expect(chest.here).toBe(true);
    point(onChest, 30);
    expect(chest.open).toBeGreaterThan(0);
    expect(chest.moving).toBe(true);
    // Nothing shows above its rim until the lid is back.
    expect(chest.slot('ball').y + chest.slot('ball').h).toBeLessThanOrEqual(chest.box.h);
    expect(chest.itemAt(onChest.x, 20)).toBeUndefined();
    point(onChest);
    expect(chest.open).toBe(1);
    const places = CHEST_ITEMS.map((item) => chest.slot(item));
    // Two rows of two, above the chest and inside the view.
    expect(new Set(places.map((box) => `${box.x},${box.y}`)).size).toBe(CHEST_ITEMS.length);
    for (const box of places) {
      expect(box.y).toBeGreaterThanOrEqual(chest.box.h - 2);
      expect(box.y + box.h).toBeLessThanOrEqual(40);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.w).toBeLessThanOrEqual(120);
    }
    for (const item of CHEST_ITEMS) {
      const at = middle(chest.slot(item));
      expect(chest.itemAt(at.x, at.y)).toBe(item);
    }
  });

  it('stays open while the pointer goes over its things, then waits a little, puts them away and shuts', () => {
    const { chest, onChest, point, middle } = scene();
    point(onChest);
    point(middle(chest.slot('duck')));
    expect(chest.open).toBe(1);
    point({ x: 60, y: 30 }, 200);
    expect(chest.open).toBe(1);
    point({ x: 60, y: 30 }, 800);
    expect(chest.open).toBe(0);
    expect(chest.itemAt(onChest.x, 20)).toBeUndefined();
  });

  it('stays open if the pointer comes back in time', () => {
    const { chest, onChest, point } = scene();
    point(onChest);
    point(undefined, 200);
    point(onChest, 400);
    expect(chest.open).toBe(1);
  });

  it('does not open for a pointer that is close to it but not on it', () => {
    const { chest, point } = scene();
    point({ x: 92, y: 20 });
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
    expect(chest.slot('ball').y + chest.slot('ball').h).toBeLessThanOrEqual(chest.box.h);
    expect(chest.accepts(onChest.x, onChest.y)).toBe(true);

    stowBall(b);
    chest.stowed();
    expect(b.world.ball.state).toBe('none');
    expect(b.state).not.toBe('watch');
    // The lid shuts on it and stays shut until the pointer has gone and come back.
    point(onChest, 600);
    expect(chest.open).toBe(0);
    expect(chest.holds.ball).toBe(true);
    point({ x: 100, y: 20 }, 100);
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
    holdPlush(b, 'teddy', 50, 20);
    point(onChest);
    const ball = middle(chest.slot('ball'));
    expect(chest.holds).toEqual({ ball: false, teddy: false, duck: true, rugby: true });
    expect(chest.itemAt(ball.x, ball.y)).toBeUndefined();

    stowPlush(b, 'teddy');
    simulate(b, 100);
    expect(chest.holds).toEqual({ ball: false, teddy: true, duck: true, rugby: true });
  });

  it('only has a place for what has come into its life so far', () => {
    const { b, chest, onChest, point, middle } = scene();
    b.world.stage = 0;
    point(onChest);
    expect(chest.items).toEqual(['ball']);
    expect(chest.holds).toEqual({ ball: true, teddy: false, duck: false, rugby: false });
    const ball = middle(chest.slot('ball'));
    expect(chest.itemAt(ball.x, ball.y)).toBe('ball');
    b.world.stage = 1;
    point(onChest, 100);
    expect(chest.items).toEqual(['ball', 'duck']);
    const duck = middle(chest.slot('duck'));
    expect(chest.itemAt(duck.x, duck.y)).toBe('duck');
    b.world.stage = -1;
    point(onChest, 100);
    expect(chest.items).toEqual([]);
    expect(chest.itemAt(ball.x, ball.y)).toBeUndefined();
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
