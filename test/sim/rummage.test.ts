import { describe, expect, it } from 'vitest';
import { grabBall } from '../../webview/sim/features/fetch';
import { react } from '../../webview/sim/features/reactions';
import { startErrand, startRummage } from '../../webview/sim/features/rummage';
import { STATES } from '../../webview/sim/registry';
import { fixed, simulate, spawn } from './helpers';

describe('its toy chest', () => {
  function fox(random = 0.3) {
    const b = spawn(fixed(random));
    b.world.resize(300, 60);
    b.restore(200, 1);
    return b;
  }
  const step = (b: ReturnType<typeof fox>, name: string): boolean => b.state === 'rummage' && b.rummage.step === name;

  it('hauls its chest into the view, takes its ball out of it, pushes it back out and goes to play', () => {
    const b = fox();
    const { chest, ball } = b.world;
    startErrand(b);
    expect(b.state).toBe('rummage');
    expect(chest.visible).toBe(false);

    simulate(b, 30_000, () => step(b, 'haul'));
    // It went to the edge of the view to get hold of it.
    expect(b.x).toBe(b.maxX);
    const from = b.x;
    simulate(b, 30_000, () => step(b, 'dip'));
    expect(chest.here).toBe(true);
    expect(chest.open).toBeGreaterThan(0);
    expect(chest.open).toBeLessThan(1);
    // It backed up as the chest came, and its nose is over it.
    expect(b.x).toBeLessThan(from);
    expect(b.x + b.noseOffset()).toBeGreaterThan(chest.x);
    expect(b.x + b.noseOffset()).toBeLessThan(chest.x + chest.box.w);
    expect(ball.state).toBe('none');
    expect(b.current().anim).toBe('rummage');

    simulate(b, 30_000, () => step(b, 'push'));
    expect(ball.state).toBe('mouth');
    expect(chest.open).toBe(0);
    expect(b.current().anim).toBe('shoveCarry');
    simulate(b, 30_000, () => step(b, 'back'));
    simulate(b, 30_000, () => b.state === 'play');
    expect(b.state).toBe('play');
    expect(ball.state).toBe('free');
    expect(chest.visible).toBe(false);
    expect(b.x).toBeLessThan(b.maxX - 20);
  });

  it('puts its ball back in it when it has played enough', () => {
    const b = fox();
    const { chest, ball } = b.world;
    ball.state = 'mouth';
    startRummage(b, 'return');
    simulate(b, 30_000, () => step(b, 'dip'));
    expect(b.current().anim).toBe('rummageCarry');
    simulate(b, 30_000, () => b.state !== 'rummage');
    expect(ball.state).toBe('none');
    simulate(b, 3000);
    expect(chest.visible).toBe(false);
    expect(chest.holds.ball).toBe(true);
  });

  it('does not haul or push a chest your pointer has already called', () => {
    const b = fox();
    const { chest } = b.world;
    const steps = new Set<string>();
    chest.point({ x: 100, y: 20 });
    simulate(b, 1500);
    expect(chest.here).toBe(true);
    startErrand(b);
    let moves = 0;
    simulate(b, 30_000, () => {
      // A pointer that keeps moving about in the view.
      chest.point({ x: 100 + (moves++ % 2), y: 20 });
      steps.add(b.rummage.step);
      return b.state !== 'rummage';
    });
    expect([...steps]).toEqual(expect.arrayContaining(['reach', 'open', 'dip', 'back']));
    expect(steps.has('haul')).toBe(false);
    expect(steps.has('push')).toBe(false);
    expect(chest.here).toBe(true);
  });

  it('lets go of its chest when called away, and drops the ball it had taken', () => {
    const b = fox();
    const { chest, ball } = b.world;
    startErrand(b);
    simulate(b, 30_000, () => ball.state === 'mouth');
    react(b, 'love');
    expect(b.state).toBe('love');
    expect(ball.state).toBe('free');
    simulate(b, 3000);
    expect(chest.visible).toBe(false);
    expect(chest.open).toBe(0);
  });

  it('gives up when you take the ball out before it does', () => {
    const b = fox();
    startErrand(b);
    simulate(b, 30_000, () => step(b, 'haul'));
    grabBall(b, 100, 30);
    simulate(b, 200);
    expect(b.state).not.toBe('rummage');
    simulate(b, 3000);
    expect(b.world.chest.visible).toBe(false);
  });

  it('plays with a ball that is lying about rather than going to its chest', () => {
    const b = fox();
    b.world.ball.state = 'free';
    startErrand(b);
    expect(b.state).toBe('play');
  });

  it('does not think of its chest in a view too narrow to stand beside it', () => {
    const b = fox();
    expect(STATES.rummage.available?.(b)).toBe(true);
    b.world.resize(60, 60);
    expect(STATES.rummage.available?.(b)).toBe(false);
  });
});
