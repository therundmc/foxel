import { describe, expect, it } from 'vitest';
import { welcomeBack } from '../../webview/sim/features/bond';
import { startIntro } from '../../webview/sim/features/intro';
import { react } from '../../webview/sim/features/reactions';
import { callOver } from '../../webview/sim/features/pointer';
import { startGift } from '../../webview/sim/features/gifts';
import { holdPlush, tossPlush } from '../../webview/sim/features/plush';
import { pet, touch } from '../../webview/sim/features/touch';
import { recall, remember } from '../../webview/sim/memory';
import type { BuddyState } from '../../webview/sim/state';
import { LAST_STAGE, STAGES, UNLOCKS, has, owns, stageFor } from '../../webview/sim/unlocks';
import type { AnimName } from '../../webview/sprites/fox/animations';
import { fixed, simulate, spawn } from './helpers';

function fox(stage: number, random = 0.5) {
  const b = spawn(fixed(random));
  b.world.resize(300, 60);
  b.restore(100, 1);
  b.world.setClock(new Date(2026, 9, 7, 15), true);
  b.world.stage = stage;
  b.enter('sit', 5000);
  return b;
}

describe('the stages of a life together', () => {
  it('are reached with attachment, in order, and each brings its own things', () => {
    expect(STAGES.map(stageFor)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(stageFor(0.19)).toBe(1);
    expect(stageFor(1)).toBe(LAST_STAGE);
    const b = fox(0);
    const mine = (): string[] => (Object.keys(UNLOCKS) as (keyof typeof UNLOCKS)[]).filter((what) => owns(b.world, what));
    expect(mine()).toEqual(['ball']);
    b.world.stage = 1;
    expect(mine()).toEqual(['ball', 'trusts', 'duck', 'bubbles']);
    b.world.stage = LAST_STAGE - 1;
    expect(mine()).not.toContain('collar');
    b.world.stage = LAST_STAGE;
    expect(mine()).toContain('collar');
    expect(mine()).toHaveLength(Object.keys(UNLOCKS).length);
    b.world.stage = -1;
    expect(mine()).toEqual([]);
  });

  it('give some things for good, and others only when it is in the mood', () => {
    const b = fox(LAST_STAGE);
    b.world.mood = -0.5;
    expect(has(b.world, 'teddy')).toBe(true);
    expect(has(b.world, 'trusts')).toBe(true);
    expect(has(b.world, 'frolic')).toBe(false);
    expect(has(b.world, 'finds')).toBe(false);
    expect(has(b.world, 'hearts')).toBe(false);
    expect(owns(b.world, 'hearts')).toBe(true);
    b.world.mood = 0;
    expect(has(b.world, 'frolic')).toBe(true);
    expect(has(b.world, 'finds')).toBe(true);
    expect(has(b.world, 'hearts')).toBe(false);
    b.world.mood = 0.3;
    expect(has(b.world, 'hearts')).toBe(true);
  });

  it('does nothing about the first one before it has come in: the box stays shut, and it does not go off for its ball', () => {
    const b = spawn(fixed(0.3));
    b.world.stage = -1;
    expect(b.world.album.tucked).toBe(true);
    b.world.resize(300, 60);
    simulate(b, 5000);
    expect(b.state).not.toBe('milestone');
    expect(b.world.album.tucked).toBe(true);
    expect(b.world.stage).toBe(-1);
  });

  it('start with it coming in with its ball: it puts it down in front of you, and a picture goes into its box', () => {
    const b = spawn(fixed(0.3));
    b.world.resize(300, 60);
    b.world.stage = -1;
    const { ball, album, chest } = b.world;
    expect(chest.items).toEqual(['ball', 'duck', 'teddy']);
    startIntro(b);
    simulate(b, 100);
    expect(chest.items).toEqual([]);
    expect(ball.state).toBe('mouth');
    const anims = new Set<AnimName>();
    const states = new Set<BuddyState>();
    simulate(b, 40_000, () => {
      anims.add(b.current().anim);
      states.add(b.state);
      return b.world.stage === 0 && album.pictures === 1 && album.flying === undefined;
    });
    expect([...anims]).toEqual(expect.arrayContaining(['peek', 'carry', 'celebrate']));
    expect(states).toContain('milestone');
    expect(states.has('wave')).toBe(false);
    expect(b.world.stage).toBe(0);
    expect(ball.state).toBe('free');
    expect(b.world.effects).toContain('confetti');
    // A photograph was taken.
    expect(b.world.effects).toContain('snap');
    expect(album.pictures).toBe(1);
    expect(chest.items).toEqual(['ball']);
  });

  it('are marked one at a time: it goes and gets its duck, shows it to you, and the box takes another picture', () => {
    const b = fox(0);
    const { album, plushes } = b.world;
    album.pictures = 1;
    b.world.peak = 0.5;
    const carried = new Set<string>();
    const marks: number[] = [];
    simulate(b, 60_000, () => {
      if (b.state === 'milestone' && marks[marks.length - 1] !== b.growth.marking) {
        marks.push(b.growth.marking);
      }
      Object.values(plushes).forEach((toy) => toy.state === 'carried' && carried.add(toy.kind));
      return b.world.stage === 1 && b.state !== 'milestone';
    });
    expect(marks).toEqual([1]);
    expect(b.world.stage).toBe(1);
    expect(carried).toEqual(new Set(['duck']));
    expect(plushes.duck.state).toBe('free');
    expect(b.world.chest.items).toEqual(['ball', 'duck']);
    simulate(b, 3000, () => album.flying === undefined);
    expect(album.pictures).toBe(2);

    // Then the next ones, each in its turn, up to where its attachment has taken it.
    simulate(b, 300_000, () => {
      if (b.state === 'milestone' && marks[marks.length - 1] !== b.growth.marking) {
        marks.push(b.growth.marking);
      }
      Object.values(plushes).forEach((toy) => toy.state === 'carried' && carried.add(toy.kind));
      return b.world.stage === 4 && b.state !== 'milestone';
    });
    expect(marks).toEqual([1, 2, 3, 4]);
    expect(carried).toEqual(new Set(['duck', 'teddy']));
    simulate(b, 3000, () => album.flying === undefined);
    expect(album.pictures).toBe(5);
    b.enter('sit', 5000);
    simulate(b, 10_000);
    expect(b.state).not.toBe('milestone');
  });

  it('drops what it was bringing when called away in the middle, and marks the stage another time', () => {
    const b = fox(0);
    b.world.peak = 0.1;
    const { duck } = b.world.plushes;
    simulate(b, 30_000, () => duck.state === 'carried' && b.growth.step === 'bring');
    simulate(b, 600);
    react(b, 'panic');
    expect(b.state).toBe('panic');
    expect(duck.state).toBe('free');
    expect(b.world.stage).toBe(0);
    simulate(b, 120_000, () => b.world.stage === 1 && b.state !== 'milestone');
    expect(b.world.stage).toBe(1);
    expect(duck.state).toBe('free');
  });

  it('only leaves about, while you are away, toys that have come into its life', () => {
    for (const stage of [0, 1]) {
      const b = fox(stage, 0.2);
      welcomeBack(b, 3);
      simulate(b, 10_000);
      expect(b.world.plushes.teddy.state).toBe('none');
      expect(b.world.plushes.duck.state === 'free').toBe(stage === 1);
      expect(b.world.ball.state).toBe('free');
    }
  });

  it('are remembered: what has come into its life is still there when the view is opened again', () => {
    const before = fox(2);
    const memory = remember(before, 1000);
    expect(memory.stage).toBe(2);
    const after = fox(LAST_STAGE);
    recall(after, memory, 1000 + 40 * 24 * 3_600_000);
    expect(after.world.stage).toBe(2);
    expect(after.world.album.pictures).toBe(3);
    // A memory from before there were stages: it starts from the first meeting.
    recall(after, { ...memory, stage: undefined }, 2000);
    expect(after.world.stage).toBe(-1);
  });
});

describe('wary at first, then trusting', () => {
  it('does not come to your pointer before it trusts you: it dares a sniff from a distance, and no nearer', () => {
    const b = fox(0);
    b.enter('sit', 600_000);
    const states = new Set<BuddyState>();
    const anims = new Set<AnimName>();
    let nearest = Infinity;
    simulate(b, 30_000, () => {
      b.world.pointer = { x: 250, y: 20 };
      states.add(b.state);
      anims.add(b.current().anim);
      nearest = Math.min(nearest, 250 - (b.x + b.noseOffset()));
    });
    expect(states).toContain('wary');
    expect(states.has('come')).toBe(false);
    expect(states.has('nudge')).toBe(false);
    expect(anims).toContain('sniff');
    expect(nearest).toBeGreaterThan(25);
    expect(nearest).toBeLessThan(40);
    expect(callOver(b, 250)).toBe(false);
  });

  it('jumps when you pat it, though it is a caress all the same; a stroke it lets itself be given', () => {
    const b = fox(0);
    touch(b, 'head');
    expect(b.current().anim).toBe('startle');
    expect(b.world.effects).toEqual(['petted']);
    const other = fox(0);
    simulate(other, 3000, () => {
      pet(other);
    });
    expect(other.state).toBe('petted');
  });

  it('lies down by your pointer once you are inseparable, where before it only sat', () => {
    const settles = (stage: number): BuddyState => {
      const b = fox(stage);
      b.enter('sit', 600_000);
      const at = { x: 250, y: 20 };
      simulate(b, 60_000, () => {
        b.world.pointer = at;
        return b.state === 'come' && b.pointer.arrived;
      });
      simulate(b, 3000, () => {
        b.world.pointer = at;
        return b.state !== 'come';
      });
      return b.state;
    };
    expect(settles(4)).toBe('sit');
    expect(settles(5)).toBe('lie');
  });

  it('comes to you once it trusts you, and takes a pat gladly', () => {
    const b = fox(1);
    b.enter('sit', 600_000);
    simulate(b, 30_000, () => {
      b.world.pointer = { x: 250, y: 20 };
      return b.state === 'come';
    });
    expect(b.state).toBe('come');
    const patted = fox(1);
    touch(patted, 'head');
    expect(patted.current().anim).not.toBe('startle');
  });
});

describe('its tricks, stage by stage', () => {
  const tricksAt = (stage: number, mood = 0.5): Set<string> => {
    const b = fox(stage, 0.5);
    let seed = 7;
    (b.world as { random: () => number }).random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    b.world.mood = mood;
    const toy = stage >= 2 ? 'teddy' : 'duck';
    const plush = b.world.plushes[toy];
    const tricks = new Set<string>();
    holdPlush(b, toy, 150, 30);
    tossPlush(b, toy, 0, 0);
    let throws = 0;
    let was = false;
    simulate(b, 400_000, () => {
      if (b.plush.phase === 'trick' && b.plush.trick.now !== 'slide') {
        tricks.add(b.plush.trick.now);
      }
      if (b.plush.inPlay && !was) {
        throws++;
        holdPlush(b, toy, plush.center, plush.y);
        tossPlush(b, toy, 20, 20);
      }
      was = b.plush.inPlay;
      return throws >= 14;
    });
    expect(throws).toBe(14);
    return tricks;
  };

  it('just throws the toy back at first, then learns to shake it, to leap and spin with it, and at last to juggle', () => {
    expect(tricksAt(1)).toEqual(new Set());
    expect(tricksAt(2)).toEqual(new Set(['shake']));
    expect(tricksAt(3)).toEqual(new Set(['shake', 'frolic', 'spin']));
    expect(tricksAt(4)).toEqual(new Set(['shake', 'frolic', 'spin', 'juggle']));
  });

  it('still plays when it is out of sorts, but without the tricks', () => {
    expect(tricksAt(4, -0.3)).toEqual(new Set());
  });
});

describe('out of sorts', () => {
  it('will not look at your pointer, and walks off to sit with its back to it when it comes near', () => {
    const b = fox(LAST_STAGE);
    b.world.mood = -0.3;
    b.enter('sit', 600_000);
    const from = b.x;
    const states = new Set<BuddyState>();
    const anims = new Set<AnimName>();
    simulate(b, 12_000, () => {
      b.world.pointer = { x: b.x + 24, y: 12 };
      states.add(b.state);
      anims.add(b.current().anim);
      // It is not there for it.
      return false;
    });
    expect(b.world.shunned).toBeDefined();
    expect(states).toContain('shun');
    expect(states.has('come')).toBe(false);
    expect(states.has('nudge')).toBe(false);
    expect(anims).toContain('sulk');
    expect(Math.abs(b.x - from)).toBeGreaterThan(20);
  });

  it('comes round at a stroke, and is itself again once its mood is back', () => {
    const b = fox(LAST_STAGE);
    b.world.mood = -0.3;
    b.enter('sit', 600_000);
    simulate(b, 8000, () => {
      b.world.pointer = { x: b.x + 24, y: 12 };
      return b.state === 'shun';
    });
    expect(b.state).toBe('shun');
    pet(b);
    expect(b.state).toBe('makeUp');
    b.world.mood = 0.3;
    b.enter('sit', 600_000);
    const at = { x: 250, y: 20 };
    simulate(b, 30_000, () => {
      b.world.pointer = at;
      return b.state === 'come';
    });
    expect(b.state).toBe('come');
  });
});

describe('what it finds, stage by stage', () => {
  const found = (stage: number): Set<string> => {
    const b = fox(stage);
    let seed = 21;
    (b.world as { random: () => number }).random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const kinds = new Set<string>();
    for (let i = 0; i < 400; i++) {
      startGift(b, 'dug');
      kinds.add(b.gift.kind);
      b.world.finds.gone();
    }
    return kinds;
  };

  it('brings common things at first, prettier ones later, and at the last stage something rare once in a long while', () => {
    expect(found(2)).toEqual(new Set(['leaf', 'pebble']));
    expect(found(3)).toEqual(new Set(['leaf', 'pebble', 'flower', 'feather']));
    expect(found(5)).toEqual(new Set(['leaf', 'pebble', 'flower', 'feather', 'clover', 'gem']));
  });
});

describe('the box of keepsakes', () => {
  it('only comes out for a pointer right by its handle, not for one that passes where it would be', () => {
    const b = fox(3);
    b.enter('sleep', 3_600_000);
    const { album } = b.world;
    simulate(b, 2000, () => {
      album.point({ x: 30, y: 50 });
    });
    expect(album.here).toBe(false);
    simulate(b, 300, () => {
      album.point({ x: 4, y: 50 });
    });
    expect(album.asked).toBe(false);
    simulate(b, 1500, () => {
      album.point({ x: 4, y: 50 });
    });
    expect(album.here).toBe(true);
    // Out, it stays for a pointer anywhere on it.
    simulate(b, 2000, () => {
      album.point({ x: 40, y: 50 });
    });
    expect(album.here).toBe(true);
  });

  it('waits at the top left edge and slides out when the pointer comes close, to be looked at', () => {
    const b = fox(3);
    b.enter('sleep', 3_600_000);
    const { album } = b.world;
    album.pictures = 4;
    album.finds.feather = 1;
    expect(album.here).toBe(false);
    expect(album.x).toBeLessThan(0);
    expect(album.x + 50).toBeGreaterThan(0);
    expect(album.y).toBeGreaterThan(35);
    const at = { x: 3, y: 52 };
    simulate(b, 1500, () => {
      album.point(at);
    });
    expect(album.here).toBe(true);
    // A picture for each stage along the top, a find under them.
    const first = album.slot({ picture: 0 });
    const fourth = album.slot({ picture: 3 });
    const feather = album.slot({ find: 'feather' });
    expect(fourth.x).toBeGreaterThan(first.x + 20);
    expect(fourth.y).toBe(first.y);
    expect(feather.y).toBeLessThan(first.y);
    album.point(undefined);
    simulate(b, 1500);
    expect(album.here).toBe(false);
    expect(album.moving).toBe(false);
  });
});
