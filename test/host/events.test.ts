import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Reaction } from '../../shared/protocol';
import type { BuddyConfig } from '../../src/config';
import { ActivityWatcher } from '../../src/events';

// Just enough of the editor: each `onX` keeps its listener so a test can fire the event.
const editor = vi.hoisted(() => {
  const listeners: Record<string, (e?: unknown) => void> = {};
  const on = (name: string) => (listener: (e?: unknown) => void) => {
    listeners[name] = listener;
    return { dispose: () => undefined };
  };
  const doc = { uri: 'active' };
  const state = { errors: 0 };
  return {
    doc,
    state,
    fire: (name: string, e?: unknown) => listeners[name](e),
    module: {
      TextDocumentSaveReason: { Manual: 1, AfterDelay: 2 },
      DiagnosticSeverity: { Error: 0, Warning: 1 },
      workspace: { onWillSaveTextDocument: on('save'), onDidChangeTextDocument: on('edit') },
      window: {
        activeTextEditor: { document: doc },
        onDidChangeTextEditorSelection: on('selection'),
        onDidChangeActiveTextEditor: on('editor'),
        onDidChangeWindowState: on('window'),
      },
      debug: { onDidStartDebugSession: on('debug') },
      tasks: { onDidEndTaskProcess: on('task') },
      languages: {
        onDidChangeDiagnostics: on('diagnostics'),
        getDiagnostics: () => [['file', Array.from({ length: state.errors }, () => ({ severity: 0 }))]],
      },
    },
  };
});
vi.mock('vscode', () => editor.module);

const SECOND = 1000;
const MINUTE = 60 * SECOND;

describe('ActivityWatcher', () => {
  let reactions: Reaction[];
  let config: BuddyConfig;
  let watcher: ActivityWatcher;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 7, 10));
    reactions = [];
    editor.state.errors = 0;
    config = { reactToTyping: true, reactToErrors: true, sleepAfterSeconds: 30 } as BuddyConfig;
    watcher = new ActivityWatcher((r) => reactions.push(r), () => config, () => new Date());
  });

  afterEach(() => {
    watcher.dispose();
    vi.useRealTimers();
  });

  const pass = (ms: number): void => void vi.advanceTimersByTime(ms);
  const type = (document = editor.doc): void => editor.fire('edit', { document, contentChanges: [{}] });
  const errors = (n: number): void => {
    editor.state.errors = n;
    editor.fire('diagnostics');
  };

  it('celebrates a manual save and ignores auto-save', () => {
    editor.fire('save', { reason: 2 });
    expect(reactions).toEqual([]);
    editor.fire('save', { reason: 1 });
    expect(reactions).toEqual(['celebrate']);
  });

  it('taps along with typing in the active editor, a few times a second at most', () => {
    type();
    type();
    type({ uri: 'another file' });
    expect(reactions).toEqual(['typing']);
    pass(300);
    type();
    expect(reactions).toEqual(['typing', 'typing']);
    config.reactToTyping = false;
    pass(300);
    type();
    expect(reactions).toHaveLength(2);
  });

  it('panics at new errors, not at each one, and is happy once they are all fixed', () => {
    errors(1);
    errors(3);
    expect(reactions).toEqual(['panic']);
    errors(2);
    errors(0);
    expect(reactions).toEqual(['panic', 'happy']);
    config.reactToErrors = false;
    errors(4);
    expect(reactions).toHaveLength(2);
  });

  it('reacts to tasks, debugging and switching files', () => {
    editor.fire('task', { exitCode: 0 });
    editor.fire('task', { exitCode: 1 });
    editor.fire('task', { exitCode: undefined });
    editor.fire('debug');
    editor.fire('editor', {});
    editor.fire('editor', undefined);
    expect(reactions).toEqual(['celebrate', 'sad', 'alert', 'notice']);
  });

  it('falls asleep when nothing happens and wakes up at the first sign of life', () => {
    pass(29 * SECOND);
    expect(watcher.asleep).toBe(false);
    pass(2 * SECOND);
    expect(watcher.asleep).toBe(true);
    expect(reactions).toEqual(['sleep']);
    editor.fire('selection');
    expect(watcher.asleep).toBe(false);
    expect(reactions).toEqual(['sleep', 'wake']);
  });

  it('falls asleep twice as fast at night', () => {
    vi.setSystemTime(new Date(2026, 9, 7, 23));
    editor.fire('selection');
    pass(16 * SECOND);
    expect(watcher.asleep).toBe(true);
  });

  it('waves when you come back to the window after a while', () => {
    editor.fire('window', { focused: false });
    pass(10 * SECOND);
    editor.fire('window', { focused: true });
    expect(reactions).toEqual([]);
    editor.fire('window', { focused: false });
    pass(MINUTE);
    editor.fire('window', { focused: true });
    expect(reactions).toEqual(['sleep', 'wake', 'wave']);
  });

  it('counts doing something with the fox as being there, and playing with it as a break', () => {
    pass(31 * SECOND);
    expect(watcher.asleep).toBe(true);
    watcher.interacted();
    expect(watcher.asleep).toBe(false);
    expect(reactions).toEqual(['sleep', 'wake']);

    const start = watcher.workingSince;
    pass(20 * SECOND);
    watcher.tookBreak();
    expect(watcher.workingSince).toBe(start + 51 * SECOND);
  });

  it('starts a new stretch of work after a real break only', () => {
    const start = watcher.workingSince;
    pass(4 * MINUTE);
    editor.fire('selection');
    expect(watcher.workingSince).toBe(start);
    pass(5 * MINUTE);
    editor.fire('selection');
    expect(watcher.workingSince).toBe(Date.now());
  });
});
