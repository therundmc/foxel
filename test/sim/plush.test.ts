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

describe('toys that knock into each other', () => {
  it('sends off a soft toy, or the ball, that another one is thrown at', () => {
    const b = spawn(fixed(0.5));
    b.world.resize(300, 60);
    b.restore(10, 1);
    b.enter('sleep', 3_600_000);
    const { teddy, duck } = b.world.plushes;
    const { ball } = b.world;
    duck.rest(150, 300);
    ball.place(220, 0, 300, 60);
    ball.launch(0, 0);
    simulate(b, 100);
    expect(duck.landed).toBe(true);
    teddy.hold(138, 5, 300, 60);
    teddy.toss(90, 8);
    simulate(b, 600, () => !duck.landed);
    // The duck is knocked on, the teddy loses what it gave.
    expect(duck.landed).toBe(false);
    expect(duck.velocity.x).toBeGreaterThan(20);
    expect(teddy.velocity.x).toBeLessThan(60);
    simulate(b, 6000);
    expect(duck.x).toBeGreaterThan(155);
    expect(duck.landed).toBe(true);
    expect(teddy.landed).toBe(true);

    duck.hold(208, 5, 300, 60);
    duck.toss(100, 6);
    simulate(b, 600, () => !ball.resting);
    expect(ball.resting).toBe(false);
    expect(ball.vx).toBeGreaterThan(20);
  });

  it('does nothing to toys that only lie against each other', () => {
    const b = spawn(fixed(0.5));
    b.world.resize(300, 60);
    b.enter('sleep', 3_600_000);
    const { teddy, duck } = b.world.plushes;
    teddy.rest(100, 300);
    duck.rest(104, 300);
    simulate(b, 2000);
    expect(teddy.x).toBe(100);
    expect(duck.x).toBe(104);
    expect(b.world.restful).toBe(true);
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

  /** Throws the teddy for a fox whose next pick is decided by `random`, and watches until it has thrown it back up. */
  const round = (random: number) => {
    const b = fox(random);
    const { teddy } = b.world.plushes;
    holdPlush(b, 'teddy', 150, 30);
    tossPlush(b, 'teddy', 30, 20);
    const anims = new Set<AnimName>();
    const seen = new Set<string>();
    const speeds: number[] = [];
    const dirs = new Set<number>();
    const offsets = new Set<number>();
    let highest = 0;
    let from: number | undefined;
    let travelled = 0;
    let ups = 0;
    let rising = false;
    let last = b.x;
    simulate(b, 40_000, () => {
      anims.add(b.current().anim);
      seen.add(b.plush.phase);
      if (b.plush.phase === 'trick') {
        from ??= b.x;
        travelled = Math.abs(b.x - from);
        if (b.current().anim === 'bellySlide') {
          speeds.push(Math.abs(b.x - last));
        }
        dirs.add(b.dir);
        offsets.add(Math.round(teddy.center - b.x));
        highest = Math.max(highest, b.y);
        const up = teddy.state === 'free' && teddy.velocity.y > 0;
        ups += up && !rising ? 1 : 0;
        rising = up;
      }
      last = b.x;
      return phase(b, 'gaze');
    });
    return { b, teddy, anims, seen, speeds, dirs, offsets, highest, travelled, ups };
  };

  it('runs after a toy you throw, picks it up and throws it back up in the air', () => {
    const { b, teddy, seen, anims } = round(0.1);
    expect([...seen]).toEqual(expect.arrayContaining(['chase', 'toss', 'gaze']));
    expect(seen.has('trick')).toBe(false);
    expect([...anims]).toEqual(expect.arrayContaining(['run', 'toyToss']));
    expect(teddy.state).toBe('free');
    expect(b.plush.inPlay).toBe(true);
    let top = 0;
    simulate(b, 3000, () => {
      top = Math.max(top, teddy.y);
      return teddy.landed;
    });
    expect(top).toBeGreaterThan(18);
    expect(b.current().anim).not.toBe('toyToss');
  });

  it('shakes it from side to side before it throws', () => {
    const { b, anims, offsets } = round(0.2);
    expect(b.plush.trick.last).toBe('shake');
    expect(anims).toContain('toyShake');
    // The toy goes with its head.
    expect(offsets.size).toBeGreaterThan(1);
  });

  it('leaps with it in its mouth, lands flat on its belly and slides to a stop, then gets up proud of itself', () => {
    const { b, teddy, anims, speeds, highest, travelled } = round(0.3);
    expect(b.plush.trick.last).toBe('frolic');
    expect([...anims]).toEqual(expect.arrayContaining(['leap', 'bellySlide', 'proud']));
    expect(highest).toBeGreaterThan(8);
    expect(travelled).toBeGreaterThan(25);
    // Fast as it lands, slower and slower, then still while it lies there.
    expect(speeds[0]).toBeGreaterThan(1);
    expect(speeds[10]).toBeLessThan(speeds[0]);
    expect(speeds[20]).toBeLessThan(speeds[10]);
    expect(speeds[speeds.length - 1]).toBe(0);
    expect(b.y).toBe(0);
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x).toBeLessThanOrEqual(b.maxX);
    expect(teddy.state).toBe('free');
  });

  it('bounces it on its nose a few times, standing still, then catches it', () => {
    const { b, anims, ups } = round(0.5);
    expect(b.plush.trick.last).toBe('juggle');
    expect(anims).toContain('toyBoop');
    expect(anims).toContain('bubbleWatch');
    // Up from its mouth, then three times off its nose.
    expect(ups).toBe(4);
    expect(b.plush.trick.bounces).toBe(4);
  });

  it('spins round with it on little hops, and ends up facing the way it was', () => {
    const { b, dirs, highest } = round(0.8);
    expect(b.plush.trick.last).toBe('spin');
    expect(dirs.size).toBe(2);
    expect(highest).toBeGreaterThan(1);
    expect(b.y).toBe(0);
  });

  it('never does the same trick twice running, and never throws the same way twice', () => {
    const b = fox();
    let seed = 5;
    (b.world as { random: () => number }).random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const { teddy } = b.world.plushes;
    holdPlush(b, 'teddy', 150, 30);
    tossPlush(b, 'teddy', 0, 0);
    const tricks: string[] = [];
    const throws: string[] = [];
    let backwards = 0;
    let before = b.x;
    let wasInPlay = false;
    let wasTrick = false;
    let facing = b.dir;
    let sinceTurn = 1000;
    let quickTurns = 0;
    let spun = false;
    simulate(b, 600_000, () => {
      const tricking = b.plush.phase === 'trick';
      if (tricking && !wasTrick) {
        tricks.push(b.plush.trick.now);
      }
      wasTrick = tricking;
      if (b.plush.inPlay && !wasInPlay) {
        throws.push(`${teddy.velocity.x.toFixed(1)},${teddy.velocity.y.toFixed(1)}`);
        // Somebody always catches it, so the game goes on.
        holdPlush(b, 'teddy', teddy.center, teddy.y);
        tossPlush(b, 'teddy', 40 * (throws.length % 2 === 0 ? 1 : -1), 30);
      }
      wasInPlay = b.plush.inPlay;
      // Spinning round with the toy aside, it does not dither.
      sinceTurn += 16;
      if (b.dir !== facing) {
        quickTurns += sinceTurn < 250 && !(tricking && b.plush.trick.now === 'spin') && !spun ? 1 : 0;
        sinceTurn = 0;
        facing = b.dir;
      }
      spun = tricking && b.plush.trick.now === 'spin';
      // Whenever it walks or runs, it is facing the way it goes.
      const moved = b.x - before;
      backwards += b.moving && Math.abs(moved) > 0.01 && Math.sign(moved) !== b.dir ? 1 : 0;
      before = b.x;
      return throws.length >= 12;
    });
    expect(throws.length).toBe(12);
    expect(new Set(throws).size).toBe(12);
    expect(new Set(tricks).size).toBeGreaterThanOrEqual(3);
    tricks.forEach((trick, i) => expect(i > 0 && trick !== 'slide' && trick === tricks[i - 1]).toBe(false));
    expect(backwards).toBe(0);
    // And it never turns this way and that: two turns are never less than a quarter of a second apart.
    expect(quickTurns).toBe(0);
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
    // It comes down flat on its belly and slides.
    expect(phase(b, 'trick')).toBe(true);
    expect(b.plush.trick.now).toBe('slide');
    const from = b.x;
    const anims = new Set<AnimName>();
    simulate(b, 3000, () => {
      anims.add(b.current().anim);
      return !phase(b, 'trick');
    });
    expect(anims).toContain('bellySlide');
    expect(Math.abs(b.x - from)).toBeGreaterThan(6);
    expect(phase(b, 'toss')).toBe(true);
    expect(b.y).toBe(0);
  });

  it('pulls out with a paw a toy that lies right under it, rather than backing away from it', () => {
    const b = fox(0.1);
    const { teddy } = b.world.plushes;
    b.enter('sleep', 3_600_000);
    teddy.rest(b.x + 12, 300);
    simulate(b, 100);
    b.enterNext('plush');
    const x = b.x;
    const anims = new Set<AnimName>();
    simulate(b, 5000, () => {
      anims.add(b.current().anim);
      expect(b.x).toBe(x);
      return teddy.state === 'carried';
    });
    expect(anims).toContain('toyPaw');
    expect(teddy.state).toBe('carried');
    expect(b.dir).toBe(1);
  });

  it('turns round once for a toy that is behind it, then goes to it', () => {
    const b = fox(0.1);
    const { teddy } = b.world.plushes;
    b.restore(200, 1);
    b.enter('sleep', 3_600_000);
    teddy.rest(60, 300);
    simulate(b, 100);
    b.enterNext('plush');
    let turns = 0;
    let facing = b.dir;
    simulate(b, 10_000, () => {
      turns += b.dir !== facing ? 1 : 0;
      facing = b.dir;
      return teddy.state === 'carried';
    });
    expect(turns).toBe(1);
    expect(b.dir).toBe(-1);
    expect(teddy.state).toBe('carried');
  });

  it('is knocked silly for a moment by a toy that lands on its head, then goes after it', () => {
    const b = fox();
    const { teddy } = b.world.plushes;
    const headX = b.x + 22;
    teddy.hold(headX, 55, 300, 60);
    teddy.toss(0, 0);
    const anims = new Set<AnimName>();
    simulate(b, 3000, () => {
      anims.add(b.current().anim);
      return phase(b, 'dazed');
    });
    expect(phase(b, 'dazed')).toBe(true);
    expect(b.current().anim).toBe('dizzy');
    // It bounced off its head.
    expect(teddy.velocity.y).toBeGreaterThan(0);
    simulate(b, 1000);
    expect(phase(b, 'dazed')).toBe(true);
    simulate(b, 3000, () => !phase(b, 'dazed'));
    expect(phase(b, 'chase')).toBe(true);
  });

  it('is not bothered by a toy that only drops gently beside it, nor in its sleep', () => {
    const b = fox();
    const { duck } = b.world.plushes;
    duck.hold(b.x + 46, 40, 300, 60);
    duck.toss(0, 0);
    simulate(b, 2000);
    expect(b.state).toBe('sit');

    const asleep = fox();
    asleep.enter('sleep', 3_600_000);
    asleep.world.plushes.teddy.hold(asleep.x + 22, 55, 300, 60);
    asleep.world.plushes.teddy.toss(0, 0);
    simulate(asleep, 3000);
    expect(asleep.state).toBe('sleep');
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

  it('drops the toy it had in its mouth when you throw it the other one', () => {
    const b = fox(0.2);
    const { teddy } = b.world.plushes;
    holdPlush(b, 'teddy', 150, 30);
    tossPlush(b, 'teddy', 0, 0);
    simulate(b, 30_000, () => teddy.state === 'carried');
    expect(teddy.state).toBe('carried');
    holdPlush(b, 'duck', 220, 30);
    tossPlush(b, 'duck', 0, 0);
    expect(b.plush.toy).toBe('duck');
    expect(teddy.state).toBe('free');
    simulate(b, 3000);
    expect(teddy.landed).toBe(true);
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
