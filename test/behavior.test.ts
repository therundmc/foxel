import { describe, expect, it } from 'vitest';
import { Behavior, type BuddyState } from '../webview/behavior';
import { ANIMATIONS, frameAt, totalDuration, type AnimName } from '../webview/sprites';

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

  it('glances back at the pointer, then turns around, without flickering', () => {
    const b = new Behavior(fixed(0.5));
    b.setWorldSize(300, 60);
    simulate(b, 800);
    expect(b.dir).toBe(1);
    const eye = { x: b.x + 23, y: 18 };
    b.setPointer({ x: 0, y: 18 });
    b.update(16);
    expect(b.dir).toBe(1);
    expect(b.gaze(eye)).toEqual({ x: -1, y: 0 });
    simulate(b, 500);
    expect(b.dir).toBe(-1);
    b.setPointer({ x: 299, y: 10 });
    simulate(b, 300);
    expect(b.dir).toBe(-1);
    simulate(b, 800);
    expect(b.dir).toBe(1);
  });

  it('glances up, down or back at what it watches, and otherwise just looks ahead', () => {
    const b = new Behavior(fixed(0.5));
    b.setWorldSize(300, 60);
    b.restore(100, 1);
    const eye = { x: 123, y: 18 };
    b.setPointer({ x: 128, y: 45 });
    expect(b.gaze(eye)).toEqual({ x: 0, y: -1 });
    b.setPointer({ x: 140, y: 2 });
    expect(b.gaze(eye)).toEqual({ x: 0, y: 1 });
    b.setPointer({ x: 160, y: 2 });
    expect(b.gaze(eye)).toEqual({ x: 0, y: 0 });
    b.setPointer({ x: 200, y: 20 });
    expect(b.gaze(eye)).toEqual({ x: 0, y: 0 });
    b.setPointer({ x: 110, y: 18 });
    expect(b.gaze(eye)).toEqual({ x: -1, y: 0 });
    b.setPointer(undefined);
    expect(b.gaze(eye)).toBeUndefined();
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

    describe('shows off with the ball once it brings it back', () => {
      function play(random: number): { anims: Set<AnimName>; top: number; b: Behavior } {
        const b = new Behavior(fixed(random));
        b.setWorldSize(300, 80);
        b.grabBall(150, 20);
        b.throwBall(80, 30, 40);
        const anims = new Set<AnimName>();
        let top = 0;
        simulate(b, 40_000, () => {
          anims.add(b.current().anim);
          if (b.state === 'trick' && b.ball.state === 'free') {
            top = Math.max(top, b.ball.y);
          }
          return b.state === 'await';
        });
        return { anims, top, b };
      }

      it('balances it on its nose like a seal', () => {
        const { anims, b } = play(0);
        expect(anims).toContain('balance');
        expect(b.state).toBe('await');
        expect(b.ball.state).toBe('free');
      });

      it('tosses it up and catches it', () => {
        const { anims, top, b } = play(0.3);
        expect([...anims]).toEqual(expect.arrayContaining(['tossFlick', 'tossWait', 'tossCatch']));
        expect(top).toBeGreaterThan(20);
        expect(b.state).toBe('await');
      });

      it('rolls it between its paws', () => {
        const { anims } = play(0.5);
        expect(anims).toContain('pawPlay');
      });

      it('sometimes just drops it and waits', () => {
        const { anims, b } = play(0.8);
        expect([...anims].some((a) => ['balance', 'tossFlick', 'pawPlay'].includes(a))).toBe(false);
        expect(b.state).toBe('await');
      });
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

  it('plays on its own with a ball lying next to it', () => {
    let seed = 7;
    const random = (): number => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const b = new Behavior(random);
    b.setWorldSize(300, 60);
    b.restore(100, 1);
    b.ball.place(140, 0, 300, 60);
    b.ball.launch(0, 0);
    let from: BuddyState | undefined;
    let previous = b.state;
    simulate(b, 300_000, () => {
      if (b.state === 'play') {
        from = previous;
        return true;
      }
      previous = b.state;
    });
    expect(from).toBeDefined();
    expect(['idle', 'walk', 'sit', 'sniff', 'lookAround']).toContain(from);
  });

  describe('intro', () => {
    for (const [side, random] of [['left', 0.2], ['right', 0.8]] as const) {
      it(`peeks its head in from the ${side}, looks around, then trots in and says hello`, () => {
        const b = new Behavior(fixed(random));
        b.setWorldSize(300, 60);
        b.startIntro();
        expect(b.state).toBe('intro');
        expect(b.current().anim).toBe('peek');
        const headOnScreen = side === 'left' ? b.x + 32 : 300 - b.x;
        expect(headOnScreen).toBeGreaterThan(10);
        expect(headOnScreen).toBeLessThan(20);
        const glances = new Set<string>();
        const anims = new Set<AnimName>();
        simulate(b, 15_000, () => {
          anims.add(b.current().anim);
          const g = b.gaze({ x: 0, y: 0 });
          if (g) {
            glances.add(`${g.x},${g.y}`);
          }
          return b.state !== 'intro';
        });
        expect(glances.size).toBeGreaterThanOrEqual(3);
        expect([...anims]).toEqual(expect.arrayContaining(['peek', 'run']));
        expect(b.state).toBe('wave');
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x).toBeLessThanOrEqual(b.maxX);
      });
    }
  });

  describe('touch', () => {
    type Zone = 'nose' | 'head' | 'back' | 'paw' | 'tail';

    function touchedAnims(zone: Zone, times: number): AnimName[] {
      const b = new Behavior(fixed(0));
      b.setWorldSize(300, 60);
      const anims: AnimName[] = [];
      for (let i = 0; i < times; i++) {
        b.touch(zone);
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
      const b = new Behavior(fixed(0));
      b.setWorldSize(300, 60);
      b.touch('nose');
      simulate(b, 300);
      const elapsed = b.elapsed;
      b.touch('nose');
      expect(b.current().anim).toBe('boop');
      expect(b.elapsed).toBe(elapsed);
    });

    it('gets the zoomies when clicked over and over, then flops down', () => {
      const b = new Behavior(fixed(0));
      b.setWorldSize(300, 60);
      b.touch('paw');
      for (let i = 0; i < 3; i++) {
        b.touch('paw');
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
      const b = new Behavior(fixed(0.5));
      b.setWorldSize(300, 60);
      b.touch('tail');
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
      const b = new Behavior(fixed(0.9));
      b.setWorldSize(300, 60);
      b.restore(100, 1);
      b.touch('paw');
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
      const b = new Behavior(fixed(0));
      b.setWorldSize(300, 60);
      b.react('sleep');
      b.touch('head');
      expect(b.current().anim).toBe('patLie');
      simulate(b, 2000);
      expect(b.state).toBe('lie');
    });
  });

  describe('treat', () => {
    function eatTrace(b: Behavior): { anims: Set<AnimName>; eatMs: number } {
      const anims = new Set<AnimName>();
      let eatMs = 0;
      simulate(b, 30_000, () => {
        anims.add(b.current().anim);
        if (b.current().anim === 'eat') {
          eatMs += 16;
        }
        return b.state !== 'snack' && b.state !== 'beg';
      });
      return { anims, eatMs };
    }

    it('runs to a dropped treat and eats it bite by bite, taking its time', () => {
      const b = new Behavior(fixed(0.5));
      b.setWorldSize(300, 60);
      b.restore(20, 1);
      b.giveTreat(240);
      expect(b.state).toBe('snack');
      const { anims, eatMs } = eatTrace(b);
      expect([...anims]).toEqual(expect.arrayContaining(['run', 'eat']));
      expect(eatMs).toBeGreaterThan(6000);
      expect(b.state).toBe('lie');
      expect(b.treat.active).toBe(false);
    });

    it('eats with the treat just past its nose, on whichever side fits', () => {
      for (const at of [6, 150, 294]) {
        const b = new Behavior(fixed(0.5));
        b.setWorldSize(300, 60);
        b.restore(130, 1);
        b.giveTreat(at);
        simulate(b, 10_000, () => b.treat.state === 'eating');
        expect(b.treat.state).toBe('eating');
        const nose = b.x + (b.dir === 1 ? 29 : 2);
        expect(Math.abs(b.treat.centerX - nose)).toBeLessThan(6);
        expect((b.treat.centerX - nose) * b.dir).toBeGreaterThan(0);
      }
    });

    it('begs for a treat held in the hand and takes it from there', () => {
      const b = new Behavior(fixed(0.5));
      b.setWorldSize(300, 60);
      b.restore(20, 1);
      b.giveTreat(200);
      simulate(b, 3000, () => b.treat.landed);
      b.grabTreat(200, 40);
      expect(b.state).toBe('beg');
      simulate(b, 8000, () => b.current().anim === 'beg');
      expect(b.current().anim).toBe('beg');
      expect(b.treat.state).toBe('held');
      const mouth = b.x + (b.dir === 1 ? 26.5 : 5.5);
      b.moveHeldTreat(mouth, 14.5);
      b.update(16);
      expect(b.treat.state).toBe('eating');
      const { eatMs } = eatTrace(b);
      expect(eatMs).toBeGreaterThan(6000);
      expect(b.treat.active).toBe(false);
    });

    it('goes after a treat dropped from the hand', () => {
      const b = new Behavior(fixed(0.5));
      b.setWorldSize(300, 60);
      b.giveTreat(150);
      simulate(b, 3000, () => b.treat.landed);
      b.grabTreat(250, 40);
      b.releaseTreat();
      b.update(16);
      expect(b.state).toBe('snack');
      eatTrace(b);
      expect(b.treat.active).toBe(false);
    });

    it('wakes up for a treat', () => {
      const b = new Behavior(fixed(0.5));
      b.setWorldSize(300, 60);
      b.react('sleep');
      b.giveTreat(150);
      expect(b.state).toBe('snack');
    });

    it('picks a half-eaten treat back up where it left off after being interrupted', () => {
      const b = new Behavior(fixed(0.5));
      b.setWorldSize(300, 60);
      b.giveTreat(150);
      simulate(b, 10_000, () => b.treat.state === 'eating');
      simulate(b, 4000);
      b.react('panic');
      expect(b.treat.state).toBe('free');
      const stage = b.treat.stage;
      expect(stage).toBeGreaterThan(0);
      simulate(b, 30_000, () => b.treat.state === 'eating');
      const shown = new Set<number | undefined>();
      let eatMs = 0;
      simulate(b, 30_000, () => {
        if (b.current().anim === 'eat') {
          shown.add(frameAt(ANIMATIONS.eat, b.current().elapsed).treat);
          eatMs += 16;
        }
        return !b.treat.active;
      });
      expect(b.treat.active).toBe(false);
      expect(Math.min(...[...shown].filter((s) => s !== undefined))).toBe(stage);
      expect(eatMs).toBeLessThan(totalDuration(ANIMATIONS.eat) - 3000);
    });

    it('finishes for good if interrupted while licking its lips', () => {
      const b = new Behavior(fixed(0.5));
      b.setWorldSize(300, 60);
      b.giveTreat(150);
      simulate(b, 10_000, () => b.treat.state === 'eating');
      simulate(b, totalDuration(ANIMATIONS.eat) - 500);
      b.react('panic');
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
