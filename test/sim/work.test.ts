import { describe, expect, it } from 'vitest';
import type { Buddy } from '../../webview/sim/buddy';
import { react } from '../../webview/sim/features/reactions';
import type { AnimName } from '../../webview/sprites/fox/animations';
import { fixed, simulate, spawn } from './helpers';

function fox(): Buddy {
  const b = spawn(fixed(0.5));
  b.world.resize(200, 60);
  b.restore(40, 1);
  b.enter('sit', 60_000);
  return b;
}

describe('following your work', () => {
  it('cheers a commit, waves off a push, takes fright at a conflict and is relieved when it is sorted out', () => {
    const shown = (reaction: 'commit' | 'push' | 'conflict' | 'resolved'): string => {
      const b = fox();
      react(b, reaction);
      return b.state;
    };
    expect(shown('commit')).toBe('celebrate');
    expect(shown('push')).toBe('wave');
    expect(shown('conflict')).toBe('panic');
    expect(shown('resolved')).toBe('happy');
  });

  it('sits and watches what takes long, nods off after a while, and cheers when it ends well', () => {
    const b = fox();
    react(b, 'waiting');
    expect(b.state).toBe('waiting');
    expect(b.current().anim).toBe('watch');
    simulate(b, 70_000);
    expect(b.state).toBe('waiting');
    expect(b.current().anim).toBe('doze');
    react(b, 'done');
    expect(b.state).toBe('celebrate');
  });

  it('is sorry when what it waited for fails, and just gets on with it when you stop it', () => {
    const failed = fox();
    react(failed, 'waiting');
    react(failed, 'failed');
    expect(failed.state).toBe('sad');
    const stopped = fox();
    react(stopped, 'waiting');
    react(stopped, 'stopped');
    expect(stopped.state).toBe('sit');
  });

  it('gives up waiting in the end', () => {
    const b = fox();
    react(b, 'waiting');
    simulate(b, 11 * 60_000, () => b.state !== 'waiting');
    expect(b.state).not.toBe('waiting');
  });

  it('frets now and then for as long as something is wrong, and no longer', () => {
    const b = fox();
    react(b, 'worry');
    const anims = new Set<AnimName>();
    simulate(b, 60_000, () => {
      anims.add(b.current().anim);
    });
    expect(anims).toContain('sad');
    react(b, 'atEase');
    simulate(b, 5000);
    b.enter('sit', 120_000);
    anims.clear();
    simulate(b, 100_000, () => {
      anims.add(b.current().anim);
    });
    expect(anims).not.toContain('sad');
  });
});
