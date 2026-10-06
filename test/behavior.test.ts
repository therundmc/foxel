import { describe, expect, it } from 'vitest';
import { Behavior, type BuddyState } from '../webview/behavior';
import type { AnimName } from '../webview/sprites';

const fixed = (value: number) => () => value;

function simulate(b: Behavior, ms: number, each?: () => boolean | void): void {
  for (let t = 0; t < ms; t += 16) {
    b.update(16);
    if (each?.() === true) {
      return;
    }
  }
}

describe('Behavior', () => {
  it('starts idle', () => {
    expect(new Behavior(fixed(0.5)).state).toBe('idle');
  });

  it('wakes up with a stretch after sleeping', () => {
    const b = new Behavior(fixed(0.5));
    b.react('sleep');
    b.update(60_000);
    expect(b.state).toBe('sleep');
    b.react('wake');
    expect(b.state).toBe('stretch');
  });

  it('ignores wake when not asleep', () => {
    const b = new Behavior(fixed(0.5));
    b.react('wake');
    expect(b.state).toBe('idle');
  });

  it('lets a higher priority reaction interrupt a lower one', () => {
    const b = new Behavior(fixed(0.5));
    b.react('typing');
    expect(b.state).toBe('typing');
    b.react('love');
    expect(b.state).toBe('love');
  });

  it('keeps walking instead of reacting to every keystroke', () => {
    const b = new Behavior(fixed(0.1));
    b.setWorldSize(300, 60);
    simulate(b, 3500);
    expect(b.state).toBe('walk');
    b.react('typing');
    b.react('notice');
    expect(b.state).toBe('walk');
  });

  it('only notices editor switches when calm', () => {
    const b = new Behavior(fixed(0.5));
    b.react('notice');
    expect(b.state).toBe('alert');
    b.react('panic');
    b.react('notice');
    expect(b.state).toBe('panic');
  });

  it('does not let a lower priority reaction interrupt panic, then gets dizzy', () => {
    const b = new Behavior(fixed(0.5));
    b.react('panic');
    b.react('wave');
    b.react('sleep');
    expect(b.state).toBe('panic');
    b.update(3000);
    expect(b.state).toBe('dizzy');
  });

  it('lands back on the ground and settles after a reaction', () => {
    const b = new Behavior(fixed(0.5));
    b.setWorldSize(200, 100);
    b.react('celebrate');
    simulate(b, 2300);
    expect(b.state).toBe('sit');
    expect(b.y).toBe(0);
  });

  it('stays inside the world and turns around at the walls', () => {
    const b = new Behavior(fixed(0.1));
    b.setWorldSize(60, 40);
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
    const b = new Behavior(fixed(0.9));
    b.setWorldSize(200, 40);
    b.setWorldSize(40, 40);
    expect(b.x).toBeLessThanOrEqual(b.maxX);
  });

  it('turns toward the pointer while idle, without flickering', () => {
    const b = new Behavior(fixed(0.5));
    b.setWorldSize(300, 60);
    simulate(b, 800);
    b.setPointer({ x: 0, y: 10 });
    b.update(16);
    expect(b.dir).toBe(-1);
    b.setPointer({ x: 299, y: 10 });
    b.update(16);
    expect(b.dir).toBe(-1);
    simulate(b, 800);
    expect(b.dir).toBe(1);
  });

  it('is restful only when nothing moves fast', () => {
    const b = new Behavior(fixed(0.5));
    b.setWorldSize(300, 60);
    expect(b.restful).toBe(true);
    b.react('sleep');
    expect(b.restful).toBe(true);
    b.spawnBall(100, 30, 40);
    expect(b.restful).toBe(false);
    const hunter = new Behavior(fixed(0.5));
    hunter.setWorldSize(300, 60);
    hunter.startHunt();
    expect(hunter.restful).toBe(false);
  });

  it('restores a saved position inside the world', () => {
    const b = new Behavior(fixed(0.5));
    b.setWorldSize(300, 60);
    b.restore(500, -1);
    expect(b.x).toBe(b.maxX);
    expect(b.dir).toBe(-1);
  });

  it('stays put when the view is narrower than the sprite', () => {
    const b = new Behavior(fixed(0.1));
    b.setWorldSize(20, 40);
    simulate(b, 10_000, () => {
      expect(b.x).toBe(0);
    });
  });

  it('bounces a rolling ball off its body when not playing', () => {
    const b = new Behavior(fixed(0.5));
    b.setWorldSize(300, 60);
    b.restore(100, 1);
    b.spawnBall(40, 0, 0);
    b.react('love');
    b.ball.x = 90;
    b.ball.vx = 60;
    simulate(b, 300);
    expect(b.ball.vx).toBeLessThanOrEqual(0);
    expect(b.ball.x + 7).toBeLessThanOrEqual(b.x + 6 + 1);
  });

  describe('errand', () => {
    it('leaves the screen, comes back with a ball, plays, then brings it back', () => {
      const b = new Behavior(fixed(0.3));
      b.setWorldSize(300, 60);
      b.startErrand();
      const states = new Set<BuddyState>();
      const ballStates = new Set<string>();
      simulate(b, 120_000, () => {
        states.add(b.state);
        ballStates.add(b.ball.state);
        if (b.state === 'away') {
          expect(b.visible).toBe(false);
        }
        return states.has('play') && b.state === 'arrive';
      });
      expect([...states]).toEqual(expect.arrayContaining(['leave', 'away', 'arrive', 'play']));
      expect([...ballStates]).toEqual(expect.arrayContaining(['mouth', 'free']));
      expect(b.ball.state).toBe('none');
    });

    it('drops the ball and comes back on screen when interrupted', () => {
      const b = new Behavior(fixed(0.3));
      b.setWorldSize(300, 60);
      b.startErrand();
      simulate(b, 30_000, () => b.state === 'arrive');
      expect(b.ball.state).toBe('mouth');
      b.react('love');
      expect(b.state).toBe('love');
      expect(b.ball.state).toBe('free');
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x).toBeLessThanOrEqual(b.maxX);
    });
  });

  describe('ball game with the user', () => {
    it('watches the held ball, fetches it once thrown and brings it back', () => {
      const b = new Behavior(fixed(0.5));
      b.setWorldSize(300, 60);
      b.grabBall(150, 20);
      expect(b.state).toBe('watch');
      expect(b.focusTarget()?.x).toBeCloseTo(150);
      b.throwBall(80, 30, 40);
      expect(b.state).toBe('fetch');
      const states = new Set<BuddyState>();
      simulate(b, 30_000, () => {
        states.add(b.state);
        return b.state === 'await';
      });
      expect([...states]).toEqual(expect.arrayContaining(['fetch', 'bring']));
      expect(b.state).toBe('await');
      expect(b.ball.state).toBe('free');
      expect(Math.abs(b.ball.center - 40)).toBeLessThan(6);
    });

    it('fetches a spawned ball', () => {
      const b = new Behavior(fixed(0.5));
      b.setWorldSize(300, 60);
      b.spawnBall(100, 40, 20);
      expect(b.state).toBe('fetch');
      expect(b.ball.state).toBe('free');
    });

    it('leaps to catch a ball thrown its way', () => {
      const b = new Behavior(fixed(0.5));
      b.setWorldSize(300, 80);
      b.restore(120, 1);
      b.grabBall(190, 40);
      b.throwBall(-50, 20, 250);
      let caughtInAir = false;
      simulate(b, 5000, () => {
        caughtInAir ||= b.ball.state === 'mouth' && b.y > 0;
        return b.state === 'bring';
      });
      expect(caughtInAir).toBe(true);
      expect(b.state).toBe('bring');
      expect(b.y).toBe(0);
    });

    it('meets a ball rolling toward it instead of backing away', () => {
      const b = new Behavior(fixed(0.5));
      b.setWorldSize(300, 60);
      b.restore(100, 1);
      b.spawnBall(250, 0, 0);
      b.ball.vx = -40;
      let lastX = b.x;
      simulate(b, 5000, () => {
        expect(b.x).toBeGreaterThanOrEqual(lastX);
        lastX = b.x;
        return b.state === 'bring';
      });
      expect(b.state).toBe('bring');
    });
  });

  it('melts into a cuddle when petted long enough, then lies down', () => {
    const b = new Behavior(fixed(0.5));
    b.setWorldSize(300, 60);
    simulate(b, 3000, () => {
      b.pet();
    });
    expect(b.state).toBe('petted');
    expect(b.current().anim).toBe('cuddle');
    simulate(b, 1600);
    expect(b.state).toBe('lie');
  });

  it('squints and sneezes when booped, then settles', () => {
    const b = new Behavior(fixed(0.5));
    b.setWorldSize(300, 60);
    b.boop();
    expect(b.state).toBe('boop');
    expect(b.current().anim).toBe('boop');
    simulate(b, 1100);
    expect(b.state).not.toBe('boop');
  });

  describe('laser pointer', () => {
    function wiggle(b: Behavior, ms: number, around: number): void {
      let t = 0;
      simulate(b, ms, () => {
        t += 16;
        b.setPointer({ x: around + 15 * Math.sin(t / 40), y: 4 });
      });
    }

    it('chases a darting pointer, pounces on it, then gives up once it stops', () => {
      const b = new Behavior(fixed(0.5));
      b.setWorldSize(300, 60);
      b.restore(20, 1);
      wiggle(b, 200, 220);
      expect(b.state).toBe('chase');
      b.setPointer({ x: 220, y: 4 });
      const anims = new Set<AnimName>();
      simulate(b, 8000, () => {
        anims.add(b.current().anim);
        return b.state !== 'chase';
      });
      expect([...anims]).toEqual(expect.arrayContaining(['run', 'pounce']));
      expect(b.state).toBe('sit');
    });

    it('looks around when the pointer leaves', () => {
      const b = new Behavior(fixed(0.5));
      b.setWorldSize(300, 60);
      b.restore(20, 1);
      wiggle(b, 200, 220);
      b.setPointer(undefined);
      b.update(16);
      expect(b.state).toBe('lookAround');
    });

    it('ignores the pointer while asleep or fetching', () => {
      const sleeper = new Behavior(fixed(0.5));
      sleeper.setWorldSize(300, 60);
      sleeper.react('sleep');
      wiggle(sleeper, 500, 220);
      expect(sleeper.state).toBe('sleep');

      const fetcher = new Behavior(fixed(0.5));
      fetcher.setWorldSize(300, 60);
      fetcher.spawnBall(100, 30, 20);
      wiggle(fetcher, 500, 220);
      expect(fetcher.state).toBe('fetch');
    });

    it('does not mistake petting for a laser', () => {
      const b = new Behavior(fixed(0.5));
      b.setWorldSize(300, 60);
      b.restore(100, 1);
      wiggle(b, 500, 116);
      expect(b.state).not.toBe('chase');
    });
  });

  describe('treat', () => {
    it('watches it fall, runs to it, eats it and is delighted', () => {
      const b = new Behavior(fixed(0.5));
      b.setWorldSize(300, 60);
      b.restore(20, 1);
      b.giveTreat(240);
      expect(b.state).toBe('snack');
      const anims = new Set<AnimName>();
      simulate(b, 15_000, () => {
        anims.add(b.current().anim);
        return b.state !== 'snack';
      });
      expect([...anims]).toEqual(expect.arrayContaining(['run', 'eat']));
      expect(b.state).toBe('love');
      expect(b.treat.active).toBe(false);
    });

    it('wakes up for a treat', () => {
      const b = new Behavior(fixed(0.5));
      b.setWorldSize(300, 60);
      b.react('sleep');
      b.giveTreat(150);
      expect(b.state).toBe('snack');
    });

    it('eats a treat it missed once it calms down', () => {
      const b = new Behavior(fixed(0.5));
      b.setWorldSize(300, 60);
      b.react('panic');
      b.giveTreat(150);
      expect(b.state).toBe('panic');
      simulate(b, 20_000, () => !b.treat.active);
      expect(b.treat.active).toBe(false);
    });
  });

  describe('hunt', () => {
    function hunt(randomValue: number): { anims: Set<AnimName>; b: Behavior } {
      const b = new Behavior(fixed(randomValue));
      b.setWorldSize(300, 80);
      b.startHunt();
      const anims = new Set<AnimName>();
      simulate(b, 40_000, () => {
        expect(b.y).toBeLessThanOrEqual(b.maxY);
        anims.add(b.current().anim);
        return b.state !== 'hunt';
      });
      return { anims, b };
    }

    it('spots, stalks, wiggles, leaps and catches the butterfly', () => {
      const { anims, b } = hunt(0.2);
      expect([...anims]).toEqual(expect.arrayContaining(['alert', 'stalk', 'wiggle', 'leap', 'proud']));
      expect(b.bug.active).toBe(false);
    });

    it('looks puzzled when the butterfly escapes', () => {
      const { anims } = hunt(0.9);
      expect([...anims]).toEqual(expect.arrayContaining(['leap', 'puzzled']));
      expect(anims.has('proud')).toBe(false);
    });

    it('keeps its eyes on the butterfly', () => {
      const b = new Behavior(fixed(0.2));
      b.setWorldSize(300, 80);
      b.setPointer({ x: 0, y: 0 });
      b.startHunt();
      b.update(16);
      expect(b.focusTarget()?.x).toBeCloseTo(b.bug.centerX);
    });
  });
});
