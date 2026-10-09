import { describe, expect, it } from 'vitest';
import { holdPlush, stowPlush, tossPlush } from '../../webview/sim/features/plush';
import { react } from '../../webview/sim/features/reactions';
import { Plush } from '../../webview/sim/props/plush';
import { STATES } from '../../webview/sim/registry';
import type { AnimName } from '../../webview/sprites/fox/animations';
import { fixed, simulate, spawn } from './helpers';

describe('a soft toy thrown about', () => {
  const fly = (toy: Plush, ms: number, each?: () => void): void => {
    for (let t = 0; t < ms; t += 16) {
      toy.update(0.016, 200, 60);
      each?.();
    }
  };

  it('falls, bounces lower each time and comes to rest', () => {
    const toy = new Plush('teddy');
    toy.hold(100, 40, 200, 60);
    toy.toss(0, 0);
    const tops: number[] = [];
    let last = toy.y;
    let rising = false;
    fly(toy, 6000, () => {
      if (rising && toy.y < last) {
        tops.push(last);
      }
      rising = toy.y > last;
      last = toy.y;
    });
    expect(tops.length).toBeGreaterThanOrEqual(2);
    expect(tops[1]).toBeLessThan(tops[0]);
    expect(toy.landed).toBe(true);
    // Dropped straight, it lands the right way up.
    expect(toy.quarter).toBe(0);
  });

  it('tumbles when thrown hard, bounces off the walls and the top of the view, and lies however it lands', () => {
    const toy = new Plush('duck');
    toy.hold(100, 30, 200, 60);
    toy.toss(140, 120);
    const quarters = new Set<number>();
    let hitRight = false;
    let highest = 0;
    let squashed = false;
    fly(toy, 10_000, () => {
      quarters.add(toy.quarter);
      hitRight ||= toy.x >= 200 - toy.w - 0.5;
      highest = Math.max(highest, toy.y + toy.h);
      squashed ||= toy.squashed;
    });
    expect(quarters.size).toBe(4);
    expect(hitRight).toBe(true);
    expect(highest).toBeLessThanOrEqual(60);
    expect(squashed).toBe(true);
    expect(toy.landed).toBe(true);
    expect(toy.x).toBeLessThan(200 - toy.w - 5);
    expect(toy.squashed).toBe(false);
    // Picked up, it is the right way up again.
    toy.hold(50, 30, 200, 60);
    expect(toy.quarter).toBe(0);
  });
});

describe('the game with its soft toys', () => {
  function fox(random = 0.5) {
    const b = spawn(fixed(random));
    b.world.resize(300, 60);
    b.restore(40, 1);
    b.enter('sit', 60_000);
    return b;
  }
  const phase = (b: ReturnType<typeof fox>, name: string): boolean => b.state === 'plush' && b.plush.phase === name;

  it('watches the toy in your hand, wagging, ready for the throw', () => {
    const b = fox();
    holdPlush(b, 'teddy', 150, 30);
    expect(phase(b, 'ready')).toBe(true);
    simulate(b, 2000, () => {
      holdPlush(b, 'teddy', 150, 30);
    });
    expect(phase(b, 'ready')).toBe(true);
    expect(b.current().anim).toBe('ready');
    expect(b.world.plushes.teddy.state).toBe('held');
  });

  it('runs after a toy you throw, picks it up, shakes it and throws it back up in the air', () => {
    const b = fox();
    const { teddy } = b.world.plushes;
    holdPlush(b, 'teddy', 150, 30);
    tossPlush(b, 'teddy', 30, 20);
    expect(phase(b, 'chase')).toBe(true);
    const anims = new Set<AnimName>();
    const seen = new Set<string>();
    let wiggle = new Set<number>();
    simulate(b, 30_000, () => {
      anims.add(b.current().anim);
      seen.add(b.plush.phase);
      if (b.plush.phase === 'shake') {
        wiggle = wiggle.add(Math.round(teddy.center - b.x));
      }
      return phase(b, 'gaze');
    });
    expect([...seen]).toEqual(expect.arrayContaining(['chase', 'shake', 'toss', 'gaze']));
    expect([...anims]).toEqual(expect.arrayContaining(['run', 'toyShake', 'toyToss']));
    // The toy goes from side to side with its head as it shakes it.
    expect(wiggle.size).toBeGreaterThan(1);
    expect(teddy.state).toBe('free');
    expect(b.plush.inPlay).toBe(true);
    let top = 0;
    simulate(b, 3000, () => {
      top = Math.max(top, teddy.y);
      return teddy.landed;
    });
    expect(top).toBeGreaterThan(25);
    expect(b.current().anim).not.toBe('toyToss');
  });

  it('keeps the game going when you catch its throw, and cheers every third catch', () => {
    const b = fox();
    const { teddy } = b.world.plushes;
    holdPlush(b, 'teddy', 150, 30);
    for (let round = 1; round <= 3; round++) {
      tossPlush(b, 'teddy', 0, 0);
      simulate(b, 30_000, () => phase(b, 'gaze') && teddy.y > 18);
      expect(phase(b, 'gaze')).toBe(true);
      // Caught as it flies.
      holdPlush(b, 'teddy', teddy.center, teddy.y);
      expect(b.plush.rally).toBe(round);
      expect(phase(b, round === 3 ? 'cheer' : 'ready')).toBe(true);
    }
    expect(b.world.effects.filter((e) => e === 'confetti')).toHaveLength(1);
    expect(b.world.effects.filter((e) => e === 'played')).toHaveLength(3);
    expect(b.current().anim).toBe('celebrate');
    simulate(b, 1500, () => {
      holdPlush(b, 'teddy', 150, 30);
    });
    expect(phase(b, 'ready')).toBe(true);
  });

  it('jumps and catches a toy that comes down within its reach', () => {
    const b = fox();
    const { duck } = b.world.plushes;
    holdPlush(b, 'duck', b.x + b.noseOffset() + 2, 50);
    tossPlush(b, 'duck', 0, 0);
    let leapt = false;
    let highest = 0;
    simulate(b, 5000, () => {
      leapt ||= phase(b, 'leap');
      highest = Math.max(highest, b.y);
      return duck.state === 'carried' && !phase(b, 'leap');
    });
    expect(leapt).toBe(true);
    expect(highest).toBeGreaterThan(5);
    expect(duck.state).toBe('carried');
    expect(b.y).toBe(0);
  });

  it('settles down with the toy when nobody catches: it lies against its teddy, and boops its duck along', () => {
    const b = fox();
    const { teddy } = b.world.plushes;
    holdPlush(b, 'teddy', 150, 30);
    tossPlush(b, 'teddy', 0, 0);
    let throws = 0;
    let before = false;
    const anims = new Set<AnimName>();
    simulate(b, 90_000, () => {
      throws += b.plush.inPlay && !before ? 1 : 0;
      before = b.plush.inPlay;
      anims.add(b.current().anim);
      return b.state !== 'plush';
    });
    expect(throws).toBe(2);
    expect(anims).toContain('cuddle');
    expect(b.state).toBe('lie');
    expect(b.world.effects).toContain('played');
    // The teddy stays where it played with it.
    expect(teddy.landed).toBe(true);

    const other = fox();
    const { duck } = other.world.plushes;
    holdPlush(other, 'duck', 100, 30);
    tossPlush(other, 'duck', 0, 0);
    let hops = 0;
    let up = false;
    simulate(other, 90_000, () => {
      hops += other.plush.phase === 'settle' && duck.y > 2 && !up ? 1 : 0;
      up = duck.y > 2;
      return other.state !== 'plush';
    });
    expect(hops).toBe(2);
    expect(other.state).toBe('sit');
    expect(duck.landed).toBe(true);
  });

  it('drops the toy when called away, and stops when you put it back in the chest', () => {
    const b = fox();
    const { teddy } = b.world.plushes;
    holdPlush(b, 'teddy', 150, 30);
    tossPlush(b, 'teddy', 0, 0);
    simulate(b, 30_000, () => teddy.state === 'carried');
    react(b, 'love');
    expect(b.state).toBe('love');
    expect(teddy.state).toBe('free');

    const other = fox();
    holdPlush(other, 'duck', 200, 30);
    stowPlush(other, 'duck');
    simulate(other, 100);
    expect(other.state).toBe('sit');
    expect(other.world.plushes.duck.state).toBe('none');
  });

  it('plays by itself with a soft toy that is lying about', () => {
    const b = fox();
    expect(STATES.plush.available?.(b)).toBe(false);
    b.world.plushes.teddy.rest(200, 300);
    simulate(b, 100);
    expect(STATES.plush.available?.(b)).toBe(true);
    b.enterNext('plush');
    expect(phase(b, 'chase')).toBe(true);
    expect(b.plush.toy).toBe('teddy');
    simulate(b, 30_000, () => phase(b, 'gaze'));
    expect(phase(b, 'gaze')).toBe(true);
  });
});
