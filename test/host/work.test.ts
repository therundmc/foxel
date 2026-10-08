import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Reaction } from '../../shared/protocol';
import type { BuddyConfig } from '../../src/config';
import { WorkWatcher, gitNews, type GitApi, type GitRepository } from '../../src/work';

// Just enough of the editor: each `onX` keeps its listener so a test can fire the event.
const editor = vi.hoisted(() => {
  const listeners: Record<string, (e?: unknown) => void> = {};
  const on = (name: string) => (listener: (e?: unknown) => void) => {
    listeners[name] = listener;
    return { dispose: () => undefined };
  };
  return {
    fire: (name: string, e?: unknown) => listeners[name](e),
    module: {
      tasks: { onDidStartTaskProcess: on('taskStart'), onDidEndTaskProcess: on('taskEnd') },
      window: { onDidStartTerminalShellExecution: on('commandStart'), onDidEndTerminalShellExecution: on('commandEnd') },
    },
  };
});
vi.mock('vscode', () => editor.module);

const SECOND = 1000;

/** A repository whose standing a test can change. */
function repository(head: { name?: string; commit?: string; ahead?: number; upstream?: unknown }, conflicts = 0) {
  let changed: () => void = () => undefined;
  const state = {
    HEAD: head,
    mergeChanges: Array.from({ length: conflicts }),
    onDidChange: (listener: () => void) => {
      changed = listener;
      return { dispose: () => undefined };
    },
  };
  return {
    repo: { state } as unknown as GitRepository,
    set(next: Partial<typeof head>, nextConflicts = 0): void {
      state.HEAD = { ...state.HEAD, ...next };
      state.mergeChanges = Array.from({ length: nextConflicts });
      changed();
    },
  };
}

describe('following your work', () => {
  let reactions: Reaction[];
  let troubled: boolean[];
  let worked: number;
  let config: BuddyConfig;
  let watcher: WorkWatcher;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 8, 10));
    reactions = [];
    troubled = [];
    worked = 0;
    config = { reactToWork: true } as BuddyConfig;
    watcher = new WorkWatcher((r) => reactions.push(r), () => config, () => worked++, (there) => troubled.push(there));
  });

  afterEach(() => {
    watcher.dispose();
    vi.useRealTimers();
  });

  const git = (...repositories: GitRepository[]): GitApi => ({ repositories, onDidOpenRepository: () => ({ dispose: () => undefined }) });

  it('cheers a commit and waves off a push', () => {
    const main = repository({ name: 'main', commit: 'a', ahead: 0, upstream: {} });
    watcher.watchGit(git(main.repo));
    main.set({ commit: 'b', ahead: 1 });
    vi.advanceTimersByTime(5 * SECOND);
    main.set({ ahead: 0 });
    expect(reactions).toEqual(['commit', 'push']);
    expect(worked).toBe(2);
  });

  it('tells a commit of yours from a pull, a checkout or a branch with no remote', () => {
    const at = (branch: string, commit: string, ahead: number | undefined, tracked = true) => ({ branch, commit, ahead, tracked, conflicts: 0 });
    expect(gitNews(at('main', 'a', 0), at('main', 'b', 1))).toBe('commit');
    // Pulled: new commits, but nothing more of yours to send.
    expect(gitNews(at('main', 'a', 0), at('main', 'c', 0))).toBeUndefined();
    expect(gitNews(at('main', 'a', 0), at('other', 'z', 3))).toBeUndefined();
    expect(gitNews(at('local', 'a', undefined, false), at('local', 'b', undefined, false))).toBe('commit');
    expect(gitNews(at('main', 'a', 2), at('main', 'a', 2))).toBeUndefined();
  });

  it('frets for as long as a merge conflicts, and is relieved when it is sorted out', () => {
    const main = repository({ name: 'main', commit: 'a', ahead: 0, upstream: {} });
    watcher.watchGit(git(main.repo));
    main.set({}, 2);
    main.set({}, 1);
    main.set({ commit: 'm', ahead: 1 }, 0);
    expect(reactions).toEqual(['conflict', 'resolved']);
    expect(troubled).toEqual([false, true, true, false]);
  });

  it('is sorry for a command that fails, and says nothing of a quick one that works or one you stopped', () => {
    const run = {};
    editor.fire('commandStart', { execution: run });
    editor.fire('commandEnd', { execution: run, exitCode: 0 });
    editor.fire('commandStart', { execution: run });
    editor.fire('commandEnd', { execution: run, exitCode: 130 });
    editor.fire('commandStart', { execution: run });
    editor.fire('commandEnd', { execution: run, exitCode: 2 });
    expect(reactions).toEqual(['failed']);
  });

  it('sits down to wait for what takes long, and cheers or is sorry when it ends', () => {
    const build = {};
    editor.fire('commandStart', { execution: build });
    vi.advanceTimersByTime(10 * SECOND);
    expect(reactions).toEqual([]);
    vi.advanceTimersByTime(15 * SECOND);
    expect(reactions).toEqual(['waiting']);
    vi.advanceTimersByTime(60 * SECOND);
    editor.fire('commandEnd', { execution: build, exitCode: 0 });
    expect(reactions).toEqual(['waiting', 'done']);

    const server = {};
    editor.fire('commandStart', { execution: server });
    vi.advanceTimersByTime(30 * SECOND);
    editor.fire('commandEnd', { execution: server, exitCode: undefined });
    expect(reactions).toEqual(['waiting', 'done', 'waiting', 'stopped']);
  });

  it('cheers a task that went well, and does not wait for one that runs in the background', () => {
    const task = { task: { isBackground: false } };
    editor.fire('taskStart', { execution: task });
    editor.fire('taskEnd', { execution: task, exitCode: 0 });
    const watch = { task: { isBackground: true } };
    editor.fire('taskStart', { execution: watch });
    vi.advanceTimersByTime(60 * SECOND);
    expect(reactions).toEqual(['celebrate']);
  });

  it('keeps quiet when asked to', () => {
    config.reactToWork = false;
    const main = repository({ name: 'main', commit: 'a', ahead: 0, upstream: {} });
    watcher.watchGit(git(main.repo));
    main.set({ commit: 'b', ahead: 1 });
    main.set({}, 3);
    const run = {};
    editor.fire('commandStart', { execution: run });
    vi.advanceTimersByTime(30 * SECOND);
    editor.fire('commandEnd', { execution: run, exitCode: 1 });
    expect(reactions).toEqual([]);
    expect(troubled.every((there) => !there)).toBe(true);
  });
});
