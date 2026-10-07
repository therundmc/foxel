import { describe, expect, it } from 'vitest';
import { react } from '../../webview/sim/features/reactions';
import { pet, touch } from '../../webview/sim/features/touch';
import type { AnimName } from '../../webview/sprites/fox/animations';
import { fixed, simulate, spawn } from './helpers';

describe('touch', () => {
  type Zone = 'nose' | 'head' | 'back' | 'paw' | 'tail';

  function touchedAnims(zone: Zone, times: number): AnimName[] {
    const b = spawn(fixed(0));
    b.world.resize(300, 60);
    const anims: AnimName[] = [];
    for (let i = 0; i < times; i++) {
      touch(b, zone);
      anims.push(b.current().anim);
      simulate(b, 8000, () => b.state !== 'touched');
    }
    return anims;
  }

  it('has several cute reactions for each part of the body', () => {
    expect(touchedAnims('nose', 2)).toEqual(['boop', 'blep']);
    expect(touchedAnims('head', 2)).toEqual(['pat', 'nuzzle']);
    expect(touchedAnims('back', 2)).toEqual(['scratch', 'playBow']);
    expect(touchedAnims('paw', 2)).toEqual(['shake', 'highFive']);
    expect(touchedAnims('tail', 2)).toEqual(['chaseTail', 'startle']);
  });

  it('does not restart a reaction when clicked again', () => {
    const b = spawn(fixed(0));
    b.world.resize(300, 60);
    touch(b, 'nose');
    simulate(b, 300);
    const elapsed = b.elapsed;
    touch(b, 'nose');
    expect(b.current().anim).toBe('boop');
    expect(b.elapsed).toBe(elapsed);
  });

  it('gets the zoomies when clicked over and over, then flops down', () => {
    const b = spawn(fixed(0));
    b.world.resize(300, 60);
    touch(b, 'paw');
    for (let i = 0; i < 3; i++) {
      touch(b, 'paw');
    }
    simulate(b, 5000, () => b.state === 'zoomies');
    expect(b.state).toBe('zoomies');
    const dirs = new Set<number>();
    simulate(b, 6000, () => {
      dirs.add(b.dir);
      return b.state !== 'zoomies';
    });
    expect(dirs.size).toBe(2);
    expect(b.current().anim).toBe('flop');
  });

  it('jumps in the air when its tail is touched by surprise', () => {
    const b = spawn(fixed(0.5));
    b.world.resize(300, 60);
    touch(b, 'tail');
    expect(b.current().anim).toBe('startle');
    let top = 0;
    simulate(b, 2000, () => {
      top = Math.max(top, b.y);
      return b.state !== 'touched';
    });
    expect(top).toBeGreaterThan(5);
    expect(b.y).toBe(0);
  });

  it('twirls around and lands facing the same way', () => {
    const b = spawn(fixed(0.9));
    b.world.resize(300, 60);
    b.restore(100, 1);
    touch(b, 'paw');
    expect(b.current().anim).toBe('twirl');
    const dirs = new Set<number>();
    simulate(b, 3000, () => {
      dirs.add(b.dir);
      return b.state !== 'touched';
    });
    expect(dirs.size).toBe(2);
    expect(b.dir).toBe(1);
  });

  it('stays lying down when its head is patted while resting', () => {
    const b = spawn(fixed(0));
    b.world.resize(300, 60);
    react(b, 'sleep');
    touch(b, 'head');
    // The extension hears about the click and says you are back.
    react(b, 'wake');
    expect(b.current().anim).toBe('patLie');
    simulate(b, 2000);
    expect(b.state).toBe('lie');
  });
});

describe('petting', () => {
  it('melts into a cuddle when petted long enough, then lies down', () => {
    const b = spawn(fixed(0.5));
    b.world.resize(300, 60);
    simulate(b, 3000, () => {
      pet(b);
    });
    expect(b.state).toBe('petted');
    expect(b.current().anim).toBe('cuddle');
    simulate(b, 1600);
    expect(b.state).toBe('lie');
  });
});
