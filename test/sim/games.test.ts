import { describe, expect, it } from 'vitest';
import { grabBall, moveHeldBall, throwBall } from '../../webview/sim/features/fetch';
import { holdPlush, tossPlush } from '../../webview/sim/features/plush';
import { STATES } from '../../webview/sim/registry';
import type { AnimName } from '../../webview/sprites/fox/animations';
import { fixed, simulate, spawn } from './helpers';

function fox(random = 0.2) {
  const b = spawn(fixed(random));
  b.world.resize(300, 60);
  b.restore(60, 1);
  b.world.setClock(new Date(2026, 9, 7, 15), true);
  b.enter('sit', 60_000);
  return b;
}

describe('a shot into the chest', () => {
  it('brings the chest out while a toy is in your hand, lifts its lid for a throw, and takes one that drops in', () => {
    const b = fox();
    const { chest } = b.world;
    const { teddy } = b.world.plushes;
    expect(chest.tucked).toBe(true);
    simulate(b, 1500, () => {
      holdPlush(b, 'teddy', chest.corner + 9, 45);
    });
    expect(chest.here).toBe(true);
    expect(chest.lid).toBe(0);
    tossPlush(b, 'teddy', 0, 0);
    let lifted = false;
    simulate(b, 3000, () => {
      lifted ||= chest.lid === 2;
      return teddy.state === 'none';
    });
    expect(lifted).toBe(true);
    expect(teddy.state).toBe('none');
    expect(b.world.effects).toContain('confetti');
    expect(b.world.effects).toContain('played');
    expect(b.state).toBe('happy');
    simulate(b, 600);
    expect(chest.lid).toBe(0);
    expect(chest.holds.teddy).toBe(true);
  });

  it('takes the ball too, even off the wall, but not a throw that lands beside it', () => {
    const b = fox(0.5);
    const { chest, ball } = b.world;
    b.enter('sleep', 3_600_000);
    grabBall(b, 200, 40);
    simulate(b, 1500, () => {
      moveHeldBall(b, 200, 40);
    });
    expect(chest.here).toBe(true);
    moveHeldBall(b, chest.corner + 9, 45);
    throwBall(b, 0, 0, undefined);
    simulate(b, 3000, () => ball.state === 'none');
    expect(ball.state).toBe('none');
    expect(b.world.effects).toContain('confetti');

    const miss = fox(0.5);
    miss.enter('sleep', 3_600_000);
    simulate(miss, 1500, () => {
      miss.world.plushes.duck.hold(miss.world.chest.corner - 14, 45, 300, 60);
    });
    miss.world.plushes.duck.toss(0, 0);
    simulate(miss, 3000);
    expect(miss.world.plushes.duck.landed).toBe(true);
    expect(miss.world.effects).not.toContain('confetti');
  });
});

describe('the things it keeps in its corner', () => {
  it('goes and plays with one of them: it blows its feather up, which drifts down and makes it sneeze', () => {
    const b = fox(0.5);
    const { finds } = b.world;
    expect(STATES.fiddle.available?.(b)).toBe(false);
    finds.kept.push('feather');
    expect(STATES.fiddle.available?.(b)).toBe(true);
    b.restore(150, 1);
    b.enterNext('fiddle');
    const anims = new Set<AnimName>();
    let highest = 0;
    let swayed = new Set<number>();
    simulate(b, 30_000, () => {
      anims.add(b.current().anim);
      const box = finds.keptBox(0);
      highest = Math.max(highest, box.y);
      swayed = swayed.add(Math.round(box.x));
      return b.state !== 'fiddle';
    });
    expect([...anims]).toEqual(expect.arrayContaining(['toyBoop', 'sneeze']));
    expect(highest).toBeGreaterThan(8);
    expect(swayed.size).toBeGreaterThan(2);
    // The feather is still coming down when it has finished: it lands a moment later.
    simulate(b, 2000);
    expect(finds.keptBox(0).y).toBe(0);
    expect(b.x).toBeLessThan(40);
    expect(b.state).toBe('sit');
  });

  it('does something else with each kind of thing', () => {
    for (const [kind, anim] of [['leaf', 'pounce'], ['pebble', 'toyPaw'], ['flower', 'sniff']] as const) {
      const b = fox(0.5);
      b.world.finds.kept.push(kind);
      b.enterNext('fiddle');
      const anims = new Set<AnimName>();
      let lifted = 0;
      simulate(b, 30_000, () => {
        anims.add(b.current().anim);
        lifted = Math.max(lifted, b.world.finds.keptBox(0).y);
        return b.state !== 'fiddle';
      });
      expect(anims).toContain(anim);
      expect(lifted).toBeGreaterThan(2);
    }
  });
});
