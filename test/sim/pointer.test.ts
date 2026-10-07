import { describe, expect, it } from 'vitest';
import { grabBall, spawnBall } from '../../webview/sim/features/fetch';
import { react } from '../../webview/sim/features/reactions';
import { pet } from '../../webview/sim/features/touch';
import type { AnimName } from '../../webview/sprites/fox/animations';
import { fixed, simulate, spawn } from './helpers';

function settled(x: number) {
  const b = spawn(fixed(0.5));
  b.world.resize(200, 60);
  b.restore(x, 1);
  b.enter('sit', 60_000);
  return b;
}

describe('coming to the pointer', () => {
  it('runs over when the pointer shows up far away, and wags its tail once its head is under it', () => {
    const b = settled(10);
    b.world.pointer = { x: 150, y: 20 };
    const anims = new Set<AnimName>();
    simulate(b, 8000, () => {
      anims.add(b.current().anim);
      return b.state === 'come' && b.pointer.arrived;
    });
    expect([...anims]).toEqual(expect.arrayContaining(['run', 'walk']));
    expect(b.dir).toBe(1);
    expect(Math.abs(b.x + 21.5 - 150)).toBeLessThan(1);
    expect(b.current().anim).toBe('ready');
    simulate(b, 1500, () => b.state !== 'come');
    expect(b.state).toBe('sit');
  });

  it('walks when the pointer is not far, and comes from the right too', () => {
    const b = settled(120);
    b.world.pointer = { x: 90, y: 20 };
    const anims = new Set<AnimName>();
    simulate(b, 8000, () => {
      anims.add(b.current().anim);
      return b.pointer.arrived;
    });
    expect(anims).toContain('walk');
    expect(anims).not.toContain('run');
    expect(b.dir).toBe(-1);
    expect(Math.abs(b.x + 32 - 21.5 - 90)).toBeLessThan(1);
  });

  it('follows a pointer that moves on, but not at once', () => {
    const b = settled(10);
    b.world.pointer = { x: 100, y: 20 };
    simulate(b, 8000, () => b.state === 'sit' && b.pointer.arrived);
    b.world.pointer = { x: 20, y: 20 };
    simulate(b, 2000);
    expect(b.state).not.toBe('come');
    simulate(b, 5000, () => b.state === 'come');
    expect(b.state).toBe('come');
  });

  it('stays put for a pointer that is close, or gone too soon', () => {
    const near = settled(80);
    near.world.pointer = { x: 80 + 40, y: 40 };
    simulate(near, 3000);
    expect(near.state).toBe('sit');
    const gone = settled(10);
    gone.world.pointer = { x: 150, y: 20 };
    simulate(gone, 200);
    gone.world.pointer = undefined;
    simulate(gone, 2000);
    expect(gone.state).toBe('sit');
  });

  it('looks around when the pointer leaves while it is on its way', () => {
    const b = settled(10);
    b.world.pointer = { x: 180, y: 20 };
    simulate(b, 1500);
    expect(b.state).toBe('come');
    b.world.pointer = undefined;
    simulate(b, 100);
    expect(b.state).toBe('lookAround');
  });

  it('does not leave what it is doing, nor come while you hold its ball', () => {
    const busy = settled(10);
    react(busy, 'celebrate');
    busy.world.pointer = { x: 150, y: 20 };
    simulate(busy, 1000);
    expect(busy.state).toBe('celebrate');
    const playing = settled(10);
    spawnBall(playing, 150, 20, 0);
    simulate(playing, 3000, () => playing.world.ball.resting);
    playing.enter('sit', 60_000);
    grabBall(playing, 150, 20);
    playing.world.pointer = { x: 150, y: 20 };
    simulate(playing, 2000, () => playing.state === 'come');
    expect(playing.state).not.toBe('come');
  });
});

describe('asking to be petted', () => {
  it('pushes its head under a pointer resting on it, then settles when the pointer leaves', () => {
    const b = settled(80);
    b.world.pointer = { x: 80 + 12, y: 12 };
    simulate(b, 300);
    expect(b.state).toBe('sit');
    simulate(b, 400);
    expect(b.state).toBe('nudge');
    expect(b.current().anim).toBe('nudge');
    simulate(b, 2000);
    expect(Math.abs(b.x + 21.5 - 92)).toBeLessThanOrEqual(2);
    b.world.pointer = undefined;
    simulate(b, 800);
    expect(b.state).toBe('sit');
  });

  it('turns around for a hand on its tail', () => {
    const b = settled(80);
    b.world.pointer = { x: 80 + 5, y: 8 };
    simulate(b, 1500);
    expect(b.state).toBe('nudge');
    expect(b.dir).toBe(-1);
  });

  it('melts when you do pet it', () => {
    const b = settled(80);
    b.world.pointer = { x: 80 + 20, y: 12 };
    simulate(b, 1000);
    pet(b);
    expect(b.state).toBe('petted');
  });

  it('does not keep asking: it stops by itself and waits a while', () => {
    const b = settled(80);
    b.world.pointer = { x: 80 + 20, y: 12 };
    simulate(b, 1000);
    expect(b.state).toBe('nudge');
    simulate(b, 7000, () => b.state !== 'nudge');
    expect(b.state).not.toBe('nudge');
    b.enter('sit', 60_000);
    simulate(b, 3000);
    expect(b.state).toBe('sit');
    simulate(b, 3000);
    expect(b.state).toBe('nudge');
  });
});
