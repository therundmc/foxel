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
  it('wears a scarf for as long as it has its back to us', () => {
    const b = fox(20, at(23));
    startContemplate(b, 'snow');
    expect(b.hat()).toBeUndefined();
    simulate(b, 12_000);
    expect(b.current().anim).toBe('gaze');
    expect(b.hat()).toBe('scarf');
    simulate(b, 120_000, () => b.current().anim === 'gazeSettle');
    expect(b.hat()).toBeUndefined();
  });
});

describe('when it contemplates', () => {
  function skyAfter(clock: Date, ms: number, random = 0.5): Vista | undefined {
    const b = fox(20, clock, random);
    let seen: Vista | undefined;
    simulate(b, ms, () => {
      seen ??= b.world.scenery.vista;
      return seen !== undefined;
    });
    return seen;
  }

  it('waits a while after its view opens, then stops for the sky of the hour', () => {
    expect(skyAfter(at(14), 10 * 60_000)).toBeUndefined();
    expect(skyAfter(at(14), 20 * 60_000)).toBe('clouds');
    expect(skyAfter(at(6, 30), 20 * 60_000)).toBe('sunrise');
    expect(skyAfter(at(19, 30), 20 * 60_000)).toBe('sunset');
    expect(skyAfter(at(23), 20 * 60_000)).toBe('stars');
  });

  it('gets rain instead of clouds some days and snow instead of stars some nights, never instead of a sunset', () => {
    expect(skyAfter(at(14), 20 * 60_000, 0.1)).toBe('rain');
    expect(skyAfter(at(23), 20 * 60_000, 0.1)).toBe('snow');
    expect(skyAfter(at(19, 30), 20 * 60_000, 0.1)).toBe('sunset');
  });

  it('keeps it rare: hours go by before the next one', () => {
    const b = fox(20, at(14));
    let count = 0;
    let was = false;
    simulate(b, 5 * HOUR, () => {
      const now = b.state === 'contemplate';
      count += now && !was ? 1 : 0;
      was = now;
    });
    expect(count).toBe(2);
  });

  it('does not when day and night are turned off, nor where there is no room for a sky', () => {
    const off = fox(20, at(14));
    off.world.setClock(at(14), false);
    simulate(off, 30 * 60_000, () => off.state === 'contemplate');
    expect(off.state).not.toBe('contemplate');
    const narrow = spawn(fixed(0.5));
    narrow.world.resize(48, 60);
    narrow.world.setClock(at(14), true);
    simulate(narrow, 30 * 60_000, () => narrow.state === 'contemplate');
    expect(narrow.state).not.toBe('contemplate');
  });
});
