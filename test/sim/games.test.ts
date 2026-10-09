import { describe, expect, it } from 'vitest';
import { grabBall, moveHeldBall, throwBall } from '../../webview/sim/features/fetch';
import { KNOWN, best, signed } from '../../webview/sim/features/lessons';
import { mouthPoint } from '../../webview/sim/features/mouth';
import { holdPlush, tossPlush, tuggable } from '../../webview/sim/features/plush';
import { giveTreat } from '../../webview/sim/features/treat';
import { recall, remember } from '../../webview/sim/memory';
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

describe('tug of war', () => {
  /** A fox that has just picked the teddy up and is shaking it. */
  const holding = () => {
    const b = fox(0.2);
    const { teddy } = b.world.plushes;
    holdPlush(b, 'teddy', 150, 30);
    tossPlush(b, 'teddy', 0, 0);
    simulate(b, 30_000, () => teddy.state === 'carried' && b.plush.phase === 'trick');
    expect(tuggable(b, 'teddy')).toBe(true);
    return { b, teddy };
  };
  /** Keeps hold of the toy, the hand this far ahead of its mouth (less while it yanks, if `eases`). */
  const pull = (b: ReturnType<typeof fox>, ahead: number, eases: number, ms: number, until: () => boolean): void => {
    simulate(b, ms, () => {
      const mouth = mouthPoint(b);
      holdPlush(b, 'teddy', mouth.x + b.dir * (b.plush.tug.yankMs > 0 ? eases : ahead), mouth.y);
      return until();
    });
  };

  it('starts when you take hold of the toy it has in its mouth: it braces, and is dragged along a little', () => {
    const { b, teddy } = holding();
    const mouth = mouthPoint(b);
    holdPlush(b, 'teddy', mouth.x + 4, mouth.y);
    expect(b.plush.phase).toBe('tug');
    expect(teddy.state).toBe('carried');
    const from = b.x;
    const anims = new Set<AnimName>();
    simulate(b, 450, () => {
      holdPlush(b, 'teddy', mouth.x + 16, mouth.y);
      anims.add(b.current().anim);
    });
    expect(anims).toContain('haul');
    expect(b.x).toBeGreaterThan(from + 2);
    expect(teddy.state).toBe('carried');
  });

  it('yanks back now and then with a shake of its head, and the toy slips from a hand that holds on too tight', () => {
    const { b, teddy } = holding();
    const mouth = mouthPoint(b);
    const hand = mouth.x + 12;
    holdPlush(b, 'teddy', hand, mouth.y);
    const anims = new Set<AnimName>();
    let backed = false;
    let before = b.x;
    simulate(b, 5000, () => {
      holdPlush(b, 'teddy', hand, mouth.y);
      anims.add(b.current().anim);
      backed ||= b.x < before - 0.1;
      before = b.x;
      return b.plush.tug.over !== undefined;
    });
    expect(backed).toBe(true);
    expect(anims).toContain('toyShake');
    expect(b.plush.tug.over).toBe('won');
    expect(teddy.state).toBe('carried');
    // Still in your closed hand, there is nothing to take hold of: you have to let go first.
    simulate(b, 1500, () => {
      holdPlush(b, 'teddy', hand, mouth.y);
    });
    expect(b.plush.phase).not.toBe('tug');
    expect(b.world.effects).toContain('played');
    tossPlush(b, 'teddy', 0, 0);
    expect(b.plush.tug.slipped).toBe(false);
  });

  it('gives the toy up to a hand that pulls steadily and eases off when it yanks', () => {
    const { b, teddy } = holding();
    pull(b, 18, 6, 20_000, () => b.plush.tug.over !== undefined);
    expect(b.plush.tug.over).toBe('lost');
    expect(teddy.state).toBe('held');
    const anims = new Set<AnimName>();
    pull(b, 18, 6, 3000, () => {
      anims.add(b.current().anim);
      return b.plush.phase === 'ready';
    });
    expect(anims).toContain('puzzled');
    expect(b.plush.phase).toBe('ready');
    expect(b.world.effects).toContain('played');
  });

  it('keeps the toy when you let go, and goes on with the game', () => {
    const { b, teddy } = holding();
    const mouth = mouthPoint(b);
    holdPlush(b, 'teddy', mouth.x + 8, mouth.y);
    simulate(b, 200);
    tossPlush(b, 'teddy', 0, 0);
    expect(teddy.state).toBe('carried');
    simulate(b, 30_000, () => b.plush.phase === 'gaze');
    expect(b.plush.phase).toBe('gaze');
  });
});

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

describe('what you teach it', () => {
  /** Makes the sign, lets it answer, and gives it a treat if `reward` says its trick is the one wanted. */
  const lesson = (b: ReturnType<typeof fox>, reward: (stunt: string) => boolean): string | undefined => {
    b.enter('sit', 60_000);
    expect(signed(b, 'circle')).toBe(true);
    simulate(b, 8000, () => b.lessons.tried !== undefined);
    const stunt = b.lessons.tried?.stunt;
    simulate(b, 2500);
    if (stunt && reward(stunt)) {
      giveTreat(b, b.x + 60);
      simulate(b, 60_000, () => !b.world.treat.active && b.def.calm === true);
      simulate(b, 3000);
    } else {
      simulate(b, 10_000);
    }
    return stunt;
  };

  it('wonders at a sign it does not know, then has a go at something', () => {
    const b = fox(0.5);
    signed(b, 'circle');
    const anims = new Set<AnimName>();
    simulate(b, 6000, () => {
      anims.add(b.current().anim);
      return b.lessons.tried !== undefined;
    });
    expect(anims).toContain('tilt');
    expect(b.lessons.tried?.sign).toBe('circle');
    expect(best(b, 'circle')).toBeUndefined();
  });

  it('does again what earned it a treat, and after a few times knows it: no more wondering, and proud of itself', () => {
    const b = fox(0.5);
    let seed = 9;
    (b.world as { random: () => number }).random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    // You want a jump for a circle: only a jump gets the treat.
    let lessons = 0;
    while ((best(b, 'circle')?.times ?? 0) < KNOWN && lessons < 60) {
      lesson(b, (stunt) => stunt === 'jump');
      lessons++;
    }
    expect(best(b, 'circle')).toEqual({ stunt: 'jump', times: KNOWN });
    expect(Object.keys(b.lessons.learned.circle ?? {})).toEqual(['jump']);
    expect(lessons).toBeGreaterThanOrEqual(KNOWN);

    // Now it knows: every time, straight away, with a jump.
    for (let i = 0; i < 5; i++) {
      b.enter('sit', 60_000);
      const anims = new Set<AnimName>();
      signed(b, 'circle');
      expect(b.lessons.tried?.stunt).toBe('jump');
      let highest = 0;
      simulate(b, 2000, () => {
        anims.add(b.current().anim);
        highest = Math.max(highest, b.y);
      });
      expect(anims).toContain('jump');
      expect(anims.has('tilt')).toBe(false);
      expect(highest).toBeGreaterThan(5);
    }
    // Another sign is another lesson.
    expect(best(b, 'wave')).toBeUndefined();
  });

  it('does not take a treat that comes too late, or out of the blue, for a reward', () => {
    const b = fox(0.5);
    signed(b, 'nod');
    simulate(b, 8000, () => b.lessons.tried !== undefined);
    simulate(b, 12_000);
    giveTreat(b, b.x + 60);
    simulate(b, 60_000, () => !b.world.treat.active && b.def.calm === true);
    expect(best(b, 'nod')).toBeUndefined();
  });

  it('pays no attention in its sleep, and never forgets what it has learnt', () => {
    const asleep = fox();
    asleep.enter('sleep', 3_600_000);
    expect(signed(asleep, 'circle')).toBe(false);
    expect(asleep.state).toBe('sleep');

    const b = fox();
    b.lessons.learned = { wave: { paw: 3 }, circle: { twirl: 1 } };
    const memory = remember(b, 1000);
    const later = fox();
    recall(later, memory, 1000 + 30 * 24 * 3_600_000);
    expect(later.lessons.learned).toEqual({ wave: { paw: 3 }, circle: { twirl: 1 } });
    expect(best(later, 'wave')).toEqual({ stunt: 'paw', times: 3 });
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
