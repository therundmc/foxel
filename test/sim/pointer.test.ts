import { describe, expect, it } from 'vitest';
import { grabBall, spawnBall } from '../../webview/sim/features/fetch';
import { callOver } from '../../webview/sim/features/pointer';
import { react } from '../../webview/sim/features/reactions';
import { pet } from '../../webview/sim/features/touch';
import type { AnimName } from '../../webview/sprites/fox/animations';
import { fixed, simulate, spawn } from './helpers';

function settled(x: number, state: 'sit' | 'lie' = 'sit') {
  const b = spawn(fixed(0.5));
  b.world.resize(200, 60);
  b.restore(x, 1);
  b.enter(state, 60_000);
  return b;
}

describe('coming to the pointer', () => {
  it('looks at it for a second, then walks over at its own pace and wags its tail once its head is under it', () => {
    const b = settled(10);
    b.world.pointer = { x: 150, y: 20 };
    simulate(b, 1000);
    expect(b.state).toBe('sit');
    expect(b.x).toBe(10);
    const anims = new Set<AnimName>();
    let ms = 0;
    simulate(b, 30_000, () => {
      ms += 16;
      anims.add(b.current().anim);
      return b.state === 'come' && b.pointer.arrived;
    });
    expect(anims).toContain('walk');
    expect(anims).not.toContain('run');
    expect(ms).toBeGreaterThan(8000);
    expect(b.dir).toBe(1);
    expect(Math.abs(b.x + 21.5 - 150)).toBeLessThan(1);
    expect(b.current().anim).toBe('ready');
    simulate(b, 1500, () => b.state !== 'come');
    expect(b.state).toBe('sit');
  });

  it('comes from the right too', () => {
    const b = settled(120);
    b.world.pointer = { x: 60, y: 20 };
    simulate(b, 30_000, () => b.pointer.arrived);
    expect(b.dir).toBe(-1);
    expect(Math.abs(b.x + 32 - 21.5 - 60)).toBeLessThan(1);
  });

  it('runs when you call it with a click, even on its way', () => {
    const called = settled(10);
    expect(callOver(called, 150)).toBe(true);
    expect(called.state).toBe('come');
    called.world.update(16);
    expect(called.current().anim).toBe('run');
    simulate(called, 5000, () => called.pointer.arrived);
    expect(Math.abs(called.x + 21.5 - 150)).toBeLessThan(1);

    const strolling = settled(10);
    strolling.world.pointer = { x: 150, y: 20 };
    simulate(strolling, 3000);
    expect(strolling.current().anim).toBe('walk');
    expect(callOver(strolling, 180)).toBe(true);
    strolling.world.pointer = { x: 180, y: 20 };
    strolling.world.update(16);
    expect(strolling.current().anim).toBe('run');
  });

  it('does not hear a click when it is busy, or already there', () => {
    const busy = settled(10);
    react(busy, 'celebrate');
    expect(callOver(busy, 150)).toBe(false);
    expect(busy.state).toBe('celebrate');
    const there = settled(80);
    expect(callOver(there, 80 + 24)).toBe(false);
    expect(there.state).toBe('sit');
  });

  it('follows a pointer that moves on, but not at once', () => {
    const b = settled(10);
    b.world.pointer = { x: 60, y: 20 };
    simulate(b, 20_000, () => b.state === 'sit' && b.pointer.arrived);
    b.world.pointer = { x: 150, y: 20 };
    simulate(b, 2000);
    expect(b.state).not.toBe('come');
    simulate(b, 13_000, () => b.state === 'come');
    expect(b.state).toBe('come');
  });

  it('stays put for a pointer that is close, or gone too soon', () => {
    const near = settled(80);
    near.world.pointer = { x: 80 + 40, y: 40 };
    simulate(near, 3000);
    expect(near.state).toBe('sit');
    const gone = settled(10);
    gone.world.pointer = { x: 150, y: 20 };
    simulate(gone, 500);
    gone.world.pointer = undefined;
    simulate(gone, 2000);
    expect(gone.state).toBe('sit');
  });

  it('goes on to where the pointer was when it goes still or leaves, and looks around for you there', () => {
    const b = settled(10);
    b.world.pointer = { x: 120, y: 20 };
    simulate(b, 3000);
    expect(b.state).toBe('come');
    b.world.pointer = undefined;
    simulate(b, 30_000, () => b.state !== 'come');
    expect(Math.abs(b.x + 21.5 - 120)).toBeLessThan(1);
    expect(b.state).toBe('lookAround');
  });

  it('does not leave what it is doing, nor come while you hold its ball', () => {
    const busy = settled(10);
    react(busy, 'celebrate');
    busy.world.pointer = { x: 150, y: 20 };
    simulate(busy, 1500);
    expect(busy.state).toBe('celebrate');
    const playing = settled(10);
    spawnBall(playing, 150, 20, 0);
    simulate(playing, 3000, () => playing.world.ball.resting);
    playing.enter('sit', 60_000);
    grabBall(playing, 150, 20);
    playing.world.pointer = { x: 150, y: 20 };
    simulate(playing, 3000, () => playing.state === 'come');
    expect(playing.state).not.toBe('come');
  });
});

describe('asking to be petted', () => {
  it('presses its head into a pointer resting on it without moving from its spot, then settles when it leaves', () => {
    const b = settled(80);
    b.world.pointer = { x: 80 + 22, y: 12 };
    simulate(b, 300);
    expect(b.state).toBe('sit');
    simulate(b, 400);
    expect(b.state).toBe('nudge');
    expect(b.current().anim).toBe('nudge');
    simulate(b, 2500);
    expect(b.x).toBe(80);
    expect(b.dir).toBe(1);
    b.world.pointer = undefined;
    simulate(b, 800);
    expect(b.state).toBe('sit');
  });

  it('leans its head back for a hand on its back, still without moving', () => {
    const b = settled(80);
    b.world.pointer = { x: 80 + 8, y: 8 };
    simulate(b, 1500);
    expect(b.state).toBe('nudge');
    expect(b.current().anim).toBe('nudgeBack');
    expect(b.x).toBe(80);
    expect(b.dir).toBe(1);
    b.world.pointer = { x: 80 + 24, y: 12 };
    simulate(b, 100);
    expect(b.current().anim).toBe('nudge');
  });

  it('stays lying down if it was', () => {
    const b = settled(80, 'lie');
    b.world.pointer = { x: 80 + 22, y: 8 };
    simulate(b, 1000);
    expect(b.current().anim).toBe('nudgeLie');
    b.world.pointer = undefined;
    simulate(b, 800);
    expect(b.state).toBe('lie');
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
    expect(b.state).toBe('sit');
    b.enter('sit', 60_000);
    simulate(b, 3000);
    expect(b.state).toBe('sit');
    simulate(b, 3000);
    expect(b.state).toBe('nudge');
  });
});
