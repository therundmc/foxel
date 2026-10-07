import { describe, expect, it } from 'vitest';
import type { Vista } from '../../shared/day';
import type { Buddy } from '../../webview/sim/buddy';
import { startContemplate } from '../../webview/sim/features/contemplate';
import { react } from '../../webview/sim/features/reactions';
import type { AnimName } from '../../webview/sprites/fox/animations';
import { fixed, simulate, spawn } from './helpers';

const HOUR = 3_600_000;
const at = (hours: number, minutes = 0): Date => new Date(2026, 9, 7, hours, minutes);

function fox(x: number, clock: Date, random = 0.5): Buddy {
  const b = spawn(fixed(random));
  b.world.resize(160, 60);
  b.restore(x, 1);
  b.world.setClock(clock, true);
  b.enter('sit', 3000);
  return b;
}

describe('contemplating the sky', () => {
  it('takes its time: a breath, turning its back to us, watching, the great moment, turning back and lying down', () => {
    const b = fox(20, at(23));
    startContemplate(b, 'stars');
    const { scenery } = b.world;
    const anims: AnimName[] = [];
    let momentAt: number | undefined;
    let fadingBy: number | undefined;
    let ms = 0;
    simulate(b, 120_000, () => {
      ms += 16;
      const { anim } = b.current();
      if (anims[anims.length - 1] !== anim) {
        anims.push(anim);
      }
      if (scenery.momentMs !== undefined) {
        momentAt ??= ms;
      }
      if (scenery.glow < 1 && momentAt !== undefined) {
        fadingBy ??= ms;
      }
      return b.state !== 'contemplate';
    });
    expect(anims.slice(0, 7)).toEqual(['gazePrelude', 'gazeTurn', 'gaze', 'gazeAwe', 'gaze', 'gazeReturn', 'gazeSettle']);
    expect(momentAt).toBeGreaterThan(20_000);
    expect(ms).toBeGreaterThan(45_000);
    // The sky starts to go as it turns back to us.
    expect(fadingBy).toBeGreaterThan(ms - 12_000);
    expect(fadingBy).toBeLessThan(ms);
    expect(b.state).toBe('lie');
    simulate(b, 7000);
    expect(scenery.active).toBe(false);
  });

  it('brings the sky out as it sits down, on the side with more room', () => {
    const b = fox(120, at(23));
    startContemplate(b, 'stars');
    const { scenery } = b.world;
    expect(b.dir).toBe(-1);
    expect(scenery.vista).toBe('stars');
    expect(scenery.dir).toBe(-1);
    expect(scenery.x).toBe(136);
    simulate(b, 2000);
    expect(scenery.glow).toBeGreaterThan(0);
    expect(scenery.glow).toBeLessThan(1);
    simulate(b, 4000);
    expect(scenery.glow).toBe(1);
    expect(scenery.ageMs).toBeGreaterThan(5900);
  });

  it('lets the sky fade once it looks away', () => {
    const b = fox(20, at(23));
    startContemplate(b, 'stars');
    simulate(b, 10_000);
    react(b, 'celebrate');
    expect(b.state).toBe('celebrate');
    simulate(b, 7000);
    expect(b.world.scenery.glow).toBe(0);
    expect(b.world.scenery.vista).toBeUndefined();
  });

  it('is not drawn out of it by your typing', () => {
    const b = fox(20, at(23));
    startContemplate(b, 'stars');
    simulate(b, 12_000);
    react(b, 'typing');
    expect(b.state).toBe('contemplate');
  });

  it('holds a leaf over its head while it rains, and puts it down once the sky has cleared', () => {
    const b = fox(20, at(11));
    startContemplate(b, 'rain');
    expect(b.hat()).toBeUndefined();
    simulate(b, 12_000);
    expect(b.current().anim).toBe('gaze');
    expect(b.hat()).toBe('leaf');
    simulate(b, 60_000, () => b.world.scenery.momentMs !== undefined && b.world.scenery.momentMs > 8000);
    expect(b.state).toBe('contemplate');
    expect(b.hat()).toBeUndefined();
  });
});

describe('contemplating the snow', () => {
  it('wears a scarf while its back is to us, gets snow on its head, and shakes it off as it gets up', () => {
    const b = fox(20, at(23));
    startContemplate(b, 'snow');
    expect(b.hat()).toBeUndefined();
    simulate(b, 12_000);
    expect(b.current().anim).toBe('gaze');
    expect(b.hat()).toBe('scarf');
    simulate(b, 12_000);
    expect(b.hat()).toBe('scarfSnow');
    simulate(b, 120_000, () => b.current().anim === 'gazeSettle');
    expect(b.hat()).toBe('snowcap');
    simulate(b, 20_000, () => b.state !== 'contemplate');
    expect(b.current().anim).toBe('shakeSnow');
    expect(b.hat()).toBeUndefined();
    simulate(b, 3000, () => b.state !== 'touched');
    expect(b.state).toBe('sit');
  });

  it('shakes itself dry after the rain', () => {
    const b = fox(20, at(11));
    startContemplate(b, 'rain');
    simulate(b, 120_000, () => b.state !== 'contemplate');
    expect(b.current().anim).toBe('shakeDry');
  });
});

describe('what it keeps of a contemplation', () => {
  it('dreams of the sky it watched the next time it sleeps, once', () => {
    const b = fox(20, at(23));
    startContemplate(b, 'stars');
    simulate(b, 10_000);
    expect(b.contemplate.dream).toBeUndefined();
    simulate(b, 120_000, () => b.state !== 'contemplate');
    expect(b.contemplate.dream).toBe('stars');
    b.enter('sleep', Infinity);
    expect(b.current().anim).toBe('sleepStars');
    simulate(b, 25_000);
    b.enter('sit', 5000);
    b.world.update(16);
    b.enter('sleep', Infinity);
    expect(b.current().anim).toBe('sleep');
  });

  it('still dreams of it after a nap too short for the dream', () => {
    const b = fox(20, at(23));
    b.contemplate.dream = 'sunset';
    b.enter('sleep', Infinity);
    simulate(b, 5000);
    b.enter('sit', 5000);
    b.world.update(16);
    b.enter('sleep', Infinity);
    expect(b.current().anim).toBe('sleepSunset');
  });
});

describe('company', () => {
  it('on a fine day a bird sometimes comes to sit beside it, looks where it looks, and leaves when it turns back', () => {
    const b = fox(40, at(14), 0.2);
    b.world.resize(240, 60);
    startContemplate(b, 'clouds');
    const { bird } = b.world;
    simulate(b, 8000);
    expect(bird.active).toBe(false);
    simulate(b, 12_000, () => bird.state === 'watching');
    expect(bird.state).toBe('watching');
    expect(bird.dir).toBe(b.dir);
    expect(Math.abs(bird.centerX - (b.x + 16))).toBeLessThan(30);
    expect(b.state).toBe('contemplate');
    simulate(b, 120_000, () => b.current().anim === 'gazeReturn');
    b.world.update(16);
    expect(bird.state).toBe('leaving');
  });

  it('none comes in the rain, and the one that came flies off if the fox is called away', () => {
    const wet = fox(40, at(11), 0.2);
    wet.world.resize(240, 60);
    startContemplate(wet, 'rain');
    simulate(wet, 30_000);
    expect(wet.world.bird.active).toBe(false);

    const b = fox(40, at(14), 0.2);
    b.world.resize(240, 60);
    startContemplate(b, 'clouds');
    simulate(b, 30_000, () => b.world.bird.state === 'watching');
    react(b, 'celebrate');
    expect(b.world.bird.state).toBe('leaving');
  });
});

describe('when it contemplates', () => {
  const MINUTE = 60_000;

  function skyAfter(clock: Date, ms: number, random = 0.5, last?: Vista): Vista | undefined {
    const b = fox(20, clock, random);
    b.contemplate.last = last;
    let seen: Vista | undefined;
    simulate(b, ms, () => {
      seen ??= b.world.scenery.vista;
      return seen !== undefined;
    });
    return seen;
  }

  it('waits a good while after its view opens, then stops for one of the skies of the hour', () => {
    expect(skyAfter(at(14), 40 * MINUTE)).toBeUndefined();
    expect(['clouds', 'blossom', 'wheat', 'rain']).toContain(skyAfter(at(14), 50 * MINUTE));
    expect(['sunrise', 'cloudsea']).toContain(skyAfter(at(6, 30), 50 * MINUTE));
    expect(['sunset', 'train']).toContain(skyAfter(at(19, 30), 50 * MINUTE));
    expect(['stars', 'fireflies', 'snow']).toContain(skyAfter(at(23), 50 * MINUTE));
  });

  it('draws among them, and never the one it stopped for last', () => {
    expect(skyAfter(at(14), 50 * MINUTE, 0.01)).toBe('clouds');
    expect(skyAfter(at(14), 50 * MINUTE, 0.99)).toBe('rain');
    expect(skyAfter(at(23), 50 * MINUTE, 0.99)).toBe('snow');
    expect(skyAfter(at(19, 30), 50 * MINUTE, 0.9)).toBe('train');
    expect(skyAfter(at(14), 50 * MINUTE, 0.01, 'clouds')).toBe('blossom');
    expect(skyAfter(at(19, 30), 50 * MINUTE, 0.01, 'sunset')).toBe('train');
  });

  it('keeps it rare: one or two in a day', () => {
    const b = fox(20, at(14));
    let count = 0;
    let was = false;
    simulate(b, 10 * HOUR, () => {
      const now = b.state === 'contemplate';
      count += now && !was ? 1 : 0;
      was = now;
    });
    expect(count).toBe(2);
  });

  it('does not when day and night are turned off, nor where there is no room for a sky', () => {
    const off = fox(20, at(14));
    off.world.setClock(at(14), false);
    simulate(off, 60 * MINUTE, () => off.state === 'contemplate');
    expect(off.state).not.toBe('contemplate');
    const narrow = spawn(fixed(0.5));
    narrow.world.resize(48, 60);
    narrow.world.setClock(at(14), true);
    simulate(narrow, 60 * MINUTE, () => narrow.state === 'contemplate');
    expect(narrow.state).not.toBe('contemplate');
  });
});
