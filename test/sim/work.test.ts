import { describe, expect, it } from 'vitest';
import type { Reaction } from '../../shared/protocol';
import type { Buddy } from '../../webview/sim/buddy';
import { react } from '../../webview/sim/features/reactions';
import type { AnimName } from '../../webview/sprites/fox/animations';
import { fixed, simulate, spawn } from './helpers';

function fox(hour = 10): Buddy {
  const b = spawn(fixed(0.5));
  b.world.resize(200, 60);
  b.world.setClock(new Date(2026, 9, 8, hour), true);
  b.restore(40, 1);
  b.enter('sit', 60_000);
  return b;
}

/** The animations it goes through, in order, until `done` says so or the time is up. */
function watch(b: Buddy, ms: number, done: () => boolean = () => false): AnimName[] {
  const anims: AnimName[] = [];
  simulate(b, ms, () => {
    const { anim } = b.current();
    if (anims[anims.length - 1] !== anim) {
      anims.push(anim);
    }
    expect(b.y).toBeGreaterThanOrEqual(0);
    return done();
  });
  return anims;
}

const after = (reaction: Reaction, ms: number): AnimName[] => {
  const b = fox();
  react(b, reaction);
  return watch(b, ms, () => b.state !== 'acting');
};

describe('following your work', () => {
  it('plants a flag for a commit and sends a letter off for a push', () => {
    expect(after('commit', 6000)[0]).toBe('plantFlag');
    expect(after('push', 6000)[0]).toBe('sendLetter');
  });

  it('flinches at a failure, and hides under its box when they keep coming', () => {
    const b = fox();
    react(b, 'failed');
    expect(watch(b, 5000, () => b.state !== 'acting')[0]).toBe('flinch');
    react(b, 'failed');
    simulate(b, 4000, () => b.state !== 'acting');
    react(b, 'failed');
    const hiding = watch(b, 6000);
    expect(hiding.slice(0, 2)).toEqual(['boxHide', 'boxPeek']);
    // A success brings it out, properly: the box goes away before it cheers.
    react(b, 'done');
    expect(watch(b, 8000, () => b.state !== 'acting').slice(0, 2)).toEqual(['boxLeave', 'tada']);
  });

  it('waits by an hourglass, then builds a tower of pebbles, and finishes it when all ends well', () => {
    const b = fox();
    react(b, 'waiting');
    const waited = watch(b, 55_000);
    expect(waited).toEqual(['hourglassIn', 'hourglassWait', 'hourglassOut', 'stackPebbles', 'towerAdmire']);
    react(b, 'done');
    expect(watch(b, 8000, () => b.state !== 'acting')).toEqual(['towerDone', 'tada', expect.anything()]);
  });

  it('puts the hourglass away before it cheers, and sees its tower fall with the build', () => {
    const early = fox();
    react(early, 'waiting');
    simulate(early, 5000);
    react(early, 'done');
    expect(watch(early, 6000, () => early.state !== 'acting').slice(0, 2)).toEqual(['hourglassOut', 'tada']);

    const late = fox();
    react(late, 'waiting');
    simulate(late, 55_000);
    react(late, 'failed');
    expect(watch(late, 6000, () => late.state !== 'acting')[0]).toBe('towerFalls');

    const stopped = fox();
    react(stopped, 'waiting');
    simulate(stopped, 5000);
    react(stopped, 'stopped');
    expect(watch(stopped, 4000, () => stopped.state !== 'acting')[0]).toBe('hourglassOut');
  });

  it('jumps for joy when a long run ends well', () => {
    const b = fox();
    react(b, 'done');
    let highest = 0;
    simulate(b, 3000, () => {
      highest = Math.max(highest, b.y);
      return b.state !== 'acting';
    });
    expect(highest).toBeGreaterThan(2);
    expect(b.y).toBe(0);
  });

  it('is caught in yarn while a merge conflicts, and gets free when it is sorted out', () => {
    const b = fox();
    react(b, 'conflict');
    expect(watch(b, 8000)).toEqual(['tangleIn', 'tangled']);
    react(b, 'resolved');
    expect(watch(b, 5000, () => b.state !== 'acting')[0]).toBe('untangle');
  });

  it('sits under a cloud of its own while errors remain, a heavy one when there are many, and shakes dry when none are left', () => {
    const b = fox();
    react(b, 'worry');
    expect(watch(b, 8000)).toEqual(['cloudIn', 'cloudy']);
    // The cloud drifts off after a while, and comes back.
    const later = watch(b, 100_000);
    expect(later).toContain('cloudOut');
    expect(later.filter((anim) => anim === 'cloudIn').length).toBeGreaterThanOrEqual(1);
    react(b, 'overwhelmed');
    b.enter('sit', 200_000);
    expect(watch(b, 80_000, () => b.current().anim === 'cloudHeavy')).toContain('cloudHeavy');
    react(b, 'atEase');
    expect(watch(b, 5000, () => b.state !== 'acting')[0]).toBe('cloudClears');
    b.enter('sit', 200_000);
    expect(watch(b, 120_000)).not.toContain('cloudIn');
  });

  it('nods when you are getting there', () => {
    expect(after('progress', 3000)[0]).toBe('encouraged');
  });

  it('investigates while you debug, points when the debugger stops, and puts its glass away at the end', () => {
    const b = fox();
    react(b, 'debugging');
    expect(watch(b, 4000)).toEqual(['detectiveIn', 'detective']);
    react(b, 'paused');
    expect(watch(b, 2000)).toEqual(['pointing']);
    react(b, 'resumed');
    expect(watch(b, 3000)).toEqual(['detectiveIn', 'detective']);
    react(b, 'debugDone');
    expect(watch(b, 3000, () => b.state !== 'acting')[0]).toBe('detectiveOut');
  });

  it('puts on its headband for a long stretch of typing, and takes it off when you stop', () => {
    const b = fox();
    react(b, 'focused');
    expect(watch(b, 4000)).toEqual(['zoneIn', 'inTheZone']);
    react(b, 'typing');
    expect(b.current().anim).toBe('inTheZone');
    react(b, 'unfocused');
    expect(watch(b, 3000, () => b.state !== 'acting')[0]).toBe('zoneOut');
  });

  it('sets a lantern down at night, sits by it, and blows it out', () => {
    const b = fox(23);
    b.enterNext('lantern');
    expect(watch(b, 60_000, () => b.state !== 'acting')).toEqual(['lanternIn', 'lantern', 'lanternOut', expect.anything()]);
  });

  it('leaves a sleeping fox alone', () => {
    const b = fox();
    react(b, 'sleep');
    react(b, 'commit');
    react(b, 'failed');
    expect(b.state).toBe('sleep');
  });
});
