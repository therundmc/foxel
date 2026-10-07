import { describe, expect, it } from 'vitest';
import { spawnBall } from '../../webview/sim/features/fetch';
import { startHunt } from '../../webview/sim/features/hunt';
import { react } from '../../webview/sim/features/reactions';
import { fixed, simulate, spawn } from './helpers';

describe('Buddy', () => {
  it('starts idle', () => {
    expect(spawn(fixed(0.5)).state).toBe('idle');
  });

  it('wakes up with a stretch after sleeping', () => {
    const b = spawn(fixed(0.5));
    react(b, 'sleep');
    b.world.update(60_000);
    expect(b.state).toBe('sleep');
    react(b, 'wake');
    expect(b.state).toBe('stretch');
  });

  it('ignores wake when not asleep', () => {
    const b = spawn(fixed(0.5));
    react(b, 'wake');
    expect(b.state).toBe('idle');
  });

  it('lets a higher priority reaction interrupt a lower one', () => {
    const b = spawn(fixed(0.5));
    react(b, 'typing');
    expect(b.state).toBe('typing');
    react(b, 'love');
    expect(b.state).toBe('love');
  });

  it('keeps walking instead of reacting to every keystroke', () => {
    const b = spawn(fixed(0.1));
    b.world.resize(300, 60);
    simulate(b, 3500);
    expect(b.state).toBe('walk');
    react(b, 'typing');
    react(b, 'notice');
    expect(b.state).toBe('walk');
  });

  it('only notices editor switches when calm', () => {
    const b = spawn(fixed(0.5));
    react(b, 'notice');
    expect(b.state).toBe('alert');
    react(b, 'panic');
    react(b, 'notice');
    expect(b.state).toBe('panic');
  });

  it('does not let a lower priority reaction interrupt panic, then gets dizzy', () => {
    const b = spawn(fixed(0.5));
    react(b, 'panic');
    react(b, 'wave');
    react(b, 'sleep');
    expect(b.state).toBe('panic');
    b.world.update(3000);
    expect(b.state).toBe('dizzy');
  });

  it('lands back on the ground and settles after a reaction', () => {
    const b = spawn(fixed(0.5));
    b.world.resize(200, 100);
    react(b, 'celebrate');
    simulate(b, 2300);
    expect(b.state).toBe('sit');
    expect(b.y).toBe(0);
  });

  it('stays inside the world and turns around at the walls', () => {
    const b = spawn(fixed(0.1));
    b.world.resize(60, 40);
    const dirs = new Set<number>();
    simulate(b, 40_000, () => {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x).toBeLessThanOrEqual(b.maxX);
      if (b.state === 'walk') {
        dirs.add(b.dir);
      }
    });
    expect(dirs).toEqual(new Set([1, -1]));
  });

  it('clamps its position when the view shrinks', () => {
    const b = spawn(fixed(0.9));
    b.world.resize(200, 40);
    b.world.resize(40, 40);
    expect(b.x).toBeLessThanOrEqual(b.maxX);
  });

  it('glances back at the pointer, then turns around, without flickering', () => {
    const b = spawn(fixed(0.5));
    b.world.resize(300, 60);
    simulate(b, 800);
    expect(b.dir).toBe(1);
    // It has just been over to the pointer, so it stays where it is.
    b.pointer.sinceComeMs = 0;
    const eye = { x: b.x + 23, y: 18 };
    b.world.pointer = { x: 0, y: 18 };
    b.world.update(16);
    expect(b.dir).toBe(1);
    expect(b.gaze(eye)).toEqual({ x: -1, y: 0 });
    simulate(b, 500);
    expect(b.dir).toBe(-1);
    b.world.pointer = { x: 299, y: 10 };
    simulate(b, 300);
    expect(b.dir).toBe(-1);
    simulate(b, 800);
    expect(b.dir).toBe(1);
  });

  it('glances up, down or back at what it watches, and otherwise just looks ahead', () => {
    const b = spawn(fixed(0.5));
    b.world.resize(300, 60);
    b.restore(100, 1);
    const eye = { x: 123, y: 18 };
    b.world.pointer = { x: 128, y: 45 };
    expect(b.gaze(eye)).toEqual({ x: 0, y: -1 });
    b.world.pointer = { x: 140, y: 2 };
    expect(b.gaze(eye)).toEqual({ x: 0, y: 1 });
    b.world.pointer = { x: 160, y: 2 };
    expect(b.gaze(eye)).toEqual({ x: 0, y: 0 });
    b.world.pointer = { x: 200, y: 20 };
    expect(b.gaze(eye)).toEqual({ x: 0, y: 0 });
    b.world.pointer = { x: 110, y: 18 };
    expect(b.gaze(eye)).toEqual({ x: -1, y: 0 });
    b.world.pointer = undefined;
    expect(b.gaze(eye)).toBeUndefined();
  });

  it('is restful only when nothing moves fast', () => {
    const b = spawn(fixed(0.5));
    b.world.resize(300, 60);
    expect(b.world.restful).toBe(true);
    react(b, 'sleep');
    expect(b.world.restful).toBe(true);
    spawnBall(b, 100, 30, 40);
    expect(b.world.restful).toBe(false);
    const hunter = spawn(fixed(0.5));
    hunter.world.resize(300, 60);
    startHunt(hunter);
    expect(hunter.world.restful).toBe(false);
  });

  it('restores a saved position inside the world', () => {
    const b = spawn(fixed(0.5));
    b.world.resize(300, 60);
    b.restore(500, -1);
    expect(b.x).toBe(b.maxX);
    expect(b.dir).toBe(-1);
  });

  it('stays put when the view is narrower than the sprite', () => {
    const b = spawn(fixed(0.1));
    b.world.resize(20, 40);
    simulate(b, 10_000, () => {
      expect(b.x).toBe(0);
    });
  });

  it('bounces a rolling ball off its body when not playing', () => {
    const b = spawn(fixed(0.5));
    b.world.resize(300, 60);
    b.restore(100, 1);
    spawnBall(b, 40, 0, 0);
    react(b, 'love');
    b.world.ball.x = 90;
    b.world.ball.vx = 60;
    simulate(b, 300);
    expect(b.world.ball.vx).toBeLessThanOrEqual(0);
    expect(b.world.ball.x + 7).toBeLessThanOrEqual(b.x + 6 + 1);
  });
});
