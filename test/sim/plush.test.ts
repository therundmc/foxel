import { describe, expect, it } from 'vitest';
import { holdPlush, stowPlush, tossPlush } from '../../webview/sim/features/plush';
import { STATES } from '../../webview/sim/registry';
import type { AnimName } from '../../webview/sprites/fox/animations';
import { fixed, simulate, spawn } from './helpers';

describe('its soft toys', () => {
  function fox() {
    const b = spawn(fixed(0.5));
    b.world.resize(300, 60);
    b.restore(40, 1);
    b.enter('sit', 60_000);
    return b;
  }

  it('stay in your hand, then fall where you let go of them and lie there', () => {
    const b = fox();
    const { teddy } = b.world.plushes;
    expect(teddy.state).toBe('none');
    holdPlush(b, 'teddy', 150, 30);
    expect(teddy.state).toBe('held');
    expect(teddy.center).toBeCloseTo(150);
    simulate(b, 500);
    expect(teddy.y).toBeGreaterThan(20);
    tossPlush(b, 'teddy', 0, 0);
    expect(b.world.restful).toBe(false);
    simulate(b, 3000, () => teddy.landed);
    expect(teddy.landed).toBe(true);
    expect(teddy.y).toBe(0);
  });

  it('goes to its teddy, lies down against it for a while, and counts that as playing', () => {
    const b = fox();
    const { teddy } = b.world.plushes;
    holdPlush(b, 'teddy', 200, 30);
    tossPlush(b, 'teddy', 0, 0);
    expect(b.state).toBe('plush');
    const anims = new Set<AnimName>();
    simulate(b, 30_000, () => {
      anims.add(b.current().anim);
      return b.state !== 'plush';
    });
    expect([...anims]).toEqual(expect.arrayContaining(['run', 'cuddle']));
    expect(Math.abs(b.x + b.noseOffset() - teddy.center)).toBeLessThan(2);
    expect(b.state).toBe('lie');
    expect(b.world.effects).toContain('played');
    // The teddy stays where it played with it.
    expect(teddy.landed).toBe(true);
  });

  it('boops its duck along with its nose, a few times, going after it each time', () => {
    const b = fox();
    const { duck } = b.world.plushes;
    holdPlush(b, 'duck', 100, 30);
    tossPlush(b, 'duck', 0, 0);
    const from = 100;
    let hops = 0;
    let wasUp = false;
    simulate(b, 40_000, () => {
      const up = duck.y > 2;
      hops += up && !wasUp && b.plush.boops > 0 ? 1 : 0;
      wasUp = up;
      return b.state !== 'plush';
    });
    expect(hops).toBe(2);
    expect(duck.center).toBeGreaterThan(from + 10);
    expect(duck.landed).toBe(true);
    expect(b.state).toBe('sit');
    expect(b.world.effects).toContain('played');
  });

  it('leaves it alone when you take it back', () => {
    const b = fox();
    holdPlush(b, 'duck', 200, 30);
    tossPlush(b, 'duck', 0, 0);
    simulate(b, 1000);
    expect(b.state).toBe('plush');
    holdPlush(b, 'duck', 200, 30);
    simulate(b, 100);
    expect(b.state).toBe('sit');
    stowPlush(b, 'duck');
    expect(b.world.plushes.duck.state).toBe('none');
  });

  it('thinks of a soft toy by itself only when one is lying about', () => {
    const b = fox();
    expect(STATES.plush.available?.(b)).toBe(false);
    holdPlush(b, 'teddy', 200, 30);
    expect(STATES.plush.available?.(b)).toBe(false);
    b.world.plushes.teddy.toss(0, 0);
    simulate(b, 2000);
    expect(STATES.plush.available?.(b)).toBe(true);
    b.enterNext('plush');
    expect(b.state).toBe('plush');
    expect(b.plush.toy).toBe('teddy');
  });
});
