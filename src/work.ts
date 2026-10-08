import * as vscode from 'vscode';
import type { Reaction } from '../shared/protocol';
import type { BuddyConfig } from './config';

/** Something that runs this long is worth waiting for: the fox sits down and watches. */
const WAIT_AFTER_MS = 20_000;
const CHECK_MS = 2000;
/** A command stopped by hand (Ctrl+C) did not fail. */
const INTERRUPTED = 130;
/** Keeps a burst of the same news from making it twitchy. */
const COOLDOWN_MS: Partial<Record<Reaction, number>> = { commit: 3000, push: 3000, failed: 4000, done: 3000, pulled: 3000, branch: 3000 };
/** A command that starts one of these is an assistant at work in the terminal, not something to wait for. */
const ASSISTANTS = /(^|[\s/])(claude|aider|codex|copilot|gemini|opencode|goose|cursor-agent)(\s|$)/;
/** Files that change by themselves all the time: builds, dependencies, Git's own. */
const NOT_YOUR_CODE = /(^|\/)(\.git|node_modules|dist|out|build|target|coverage|\.next|\.venv|__pycache__)(\/|$)/;
/**
 * Someone else is writing your code when this many files have changed within the window, over at least the
 * spread (a checkout changes them all at once), and you were not typing just before. It is over after the quiet.
 */
const HELPER_FILES = 3;
const HELPER_WINDOW_MS = 20_000;
const HELPER_SPREAD_MS = 3000;
const HELPER_QUIET_MS = 25_000;
const YOU_TYPED_MS = 8000;

/** What the fox needs of the editor's built-in Git extension: just enough to tell a commit, a push and a conflict. */
export interface GitRepository {
  readonly state: {
    readonly HEAD?: { readonly name?: string; readonly commit?: string; readonly ahead?: number; readonly behind?: number; readonly upstream?: unknown };
    readonly mergeChanges: readonly unknown[];
    readonly onDidChange: vscode.Event<void>;
  };
}
export interface GitApi {
  readonly repositories: readonly GitRepository[];
  readonly onDidOpenRepository: vscode.Event<GitRepository>;
}

/** Where a repository stands, as far as the fox cares. */
interface Standing {
  readonly branch: string | undefined;
  readonly commit: string | undefined;
  readonly ahead: number | undefined;
  readonly behind?: number;
  readonly tracked: boolean;
  readonly conflicts: number;
}

const standingOf = ({ state }: GitRepository): Standing => ({
  branch: state.HEAD?.name,
  commit: state.HEAD?.commit,
  ahead: state.HEAD?.ahead,
  behind: state.HEAD?.behind,
  tracked: state.HEAD?.upstream !== undefined,
  conflicts: state.mergeChanges.length,
});

/** What happened between two standings of a repository, if it is something the fox reacts to. */
export function gitNews(before: Standing, after: Standing): Reaction | undefined {
  if (after.conflicts > 0 && before.conflicts === 0) {
    return 'conflict';
  }
  if (after.conflicts === 0 && before.conflicts > 0) {
    return 'resolved';
  }
  if (after.branch !== before.branch) {
    return after.branch !== undefined && before.branch !== undefined ? 'branch' : undefined;
  }
  if (after.commit === before.commit) {
    // Nothing new here, and nothing left to send: it has gone to the remote.
    return after.tracked && (before.ahead ?? 0) > 0 && after.ahead === 0 ? 'push' : undefined;
  }
  // A new commit on the same branch: yours if the branch is now one more ahead, or has no remote to compare with.
  const oneMore = after.ahead !== undefined && after.ahead === (before.ahead ?? 0) + 1;
  if (oneMore || (!after.tracked && before.commit !== undefined)) {
    return 'commit';
  }
  // New commits that are not yours to send: they came in from the remote.
  return after.tracked && (before.behind ?? 0) > (after.behind ?? 0) ? 'pulled' : undefined;
}

/** A terminal that reports when a command starts and ends: newer editors only. */
interface ShellEvents {
  onDidStartTerminalShellExecution?: vscode.Event<{ readonly execution: { readonly commandLine?: { readonly value?: string } } }>;
  onDidEndTerminalShellExecution?: vscode.Event<{ readonly execution: object; readonly exitCode: number | undefined }>;
}

/**
 * Follows the work that is not typing: commits, pushes and merge conflicts, commands and tasks that fail,
 * and those that take long enough to be waited for.
 */
export class WorkWatcher implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly standings = new Map<GitRepository, Standing>();
  /** What is running, since when, and whether the fox has sat down to wait for it. */
  private readonly running = new Map<object, { since: number; awaited: boolean }>();
  private readonly lastEmitted = new Map<Reaction, number>();
  private readonly timer: ReturnType<typeof setInterval>;
  /** Assistants running in a terminal; the files of yours that changed lately; whether someone is helping. */
  private readonly assistants = new Set<object>();
  private changes: { path: string; at: number }[] = [];
  private helping = false;

  constructor(
    private readonly react: (reaction: Reaction) => void,
    private readonly config: () => BuddyConfig,
    /** You are working, even with the editor left alone. */
    private readonly worked: () => void,
    /** A merge with conflicts is in progress, or no longer. */
    private readonly troubled: (conflicts: boolean) => void,
    /** When you last typed. */
    private readonly typedAt: () => number = () => 0,
  ) {
    const files = vscode.workspace.createFileSystemWatcher('**/*');
    this.disposables.push(
      files,
      files.onDidChange((uri) => this.fileChanged(uri.path)),
      files.onDidCreate((uri) => this.fileChanged(uri.path)),
    );
    const shell = vscode.window as typeof vscode.window & ShellEvents;
    this.disposables.push(
      vscode.tasks.onDidStartTaskProcess((e) => !e.execution.task.isBackground && this.started(e.execution)),
      vscode.tasks.onDidEndTaskProcess((e) => this.ended(e.execution, e.exitCode, true)),
    );
    if (shell.onDidStartTerminalShellExecution && shell.onDidEndTerminalShellExecution) {
      this.disposables.push(
        shell.onDidStartTerminalShellExecution((e) => this.started(e.execution, e.execution.commandLine?.value)),
        shell.onDidEndTerminalShellExecution((e) => this.ended(e.execution, e.exitCode, false)),
      );
    }
    this.timer = setInterval(() => this.checkWaiting(), CHECK_MS);
  }

  /** Follows the repositories of the editor's Git extension, those open now and those to come. */
  watchGit(git: GitApi): void {
    const watch = (repository: GitRepository): void => {
      this.standings.set(repository, standingOf(repository));
      this.conflictsChanged();
      this.disposables.push(repository.state.onDidChange(() => this.gitChanged(repository)));
    };
    git.repositories.forEach(watch);
    this.disposables.push(git.onDidOpenRepository(watch));
  }

  dispose(): void {
    clearInterval(this.timer);
    this.disposables.forEach((d) => d.dispose());
  }

  private get on(): boolean {
    return this.config().reactToWork;
  }

  private gitChanged(repository: GitRepository): void {
    const before = this.standings.get(repository);
    const after = standingOf(repository);
    this.standings.set(repository, after);
    this.conflictsChanged();
    const news = before && gitNews(before, after);
    if (news && this.on) {
      this.worked();
      this.emit(news);
    }
  }

  private conflictsChanged(): void {
    this.troubled(this.on && [...this.standings.values()].some((standing) => standing.conflicts > 0));
  }

  private started(run: object, commandLine = ''): void {
    this.worked();
    if (ASSISTANTS.test(commandLine)) {
      // It will write in your files for as long as it likes: that is watched for, not waited for.
      this.assistants.add(run);
    } else {
      this.running.set(run, { since: Date.now(), awaited: false });
    }
  }

  // A file of yours changed on disk. If you were not typing, and it goes on, someone is writing for you.
  private fileChanged(path: string): void {
    const now = Date.now();
    if (!this.on || NOT_YOUR_CODE.test(path) || now - this.typedAt() < YOU_TYPED_MS) {
      return;
    }
    this.changes = [...this.changes.filter((change) => now - change.at < HELPER_WINDOW_MS && change.path !== path), { path, at: now }];
    const spread = now - this.changes[0].at;
    const atWork = this.assistants.size > 0 || (this.changes.length >= HELPER_FILES && spread >= HELPER_SPREAD_MS);
    if (atWork && !this.helping) {
      this.helping = true;
      this.react('helper');
    }
  }

  private ended(run: object, exitCode: number | undefined, task: boolean): void {
    if (this.assistants.delete(run)) {
      return;
    }
    const was = this.running.get(run);
    this.running.delete(run);
    if (!this.on) {
      return;
    }
    this.worked();
    const awaited = was?.awaited === true;
    if (exitCode === undefined || exitCode === INTERRUPTED) {
      // No verdict: if it was waiting for this, it can stop.
      if (awaited) {
        this.react('stopped');
      }
    } else if (exitCode !== 0) {
      this.emit('failed');
    } else if (awaited) {
      this.emit('done');
    } else if (task) {
      // A task that went well is worth a cheer even when it was quick; a quick command is just a command.
      this.emit('celebrate');
    }
  }

  private checkWaiting(): void {
    const now = Date.now();
    const lastChange = this.changes[this.changes.length - 1]?.at ?? 0;
    if (this.helping && now - lastChange >= HELPER_QUIET_MS) {
      this.helping = false;
      this.changes = [];
      this.react('helperDone');
    }
    for (const run of this.running.values()) {
      if (!run.awaited && now - run.since >= WAIT_AFTER_MS) {
        run.awaited = true;
        if (this.on) {
          this.react('waiting');
        }
      }
    }
  }

  private emit(reaction: Reaction): void {
    const now = Date.now();
    if (now - (this.lastEmitted.get(reaction) ?? -Infinity) < (COOLDOWN_MS[reaction] ?? 0)) {
      return;
    }
    this.lastEmitted.set(reaction, now);
    this.react(reaction);
  }
}

/** The editor's own Git extension, when there is one. */
export async function gitApi(): Promise<GitApi | undefined> {
  const extension = vscode.extensions.getExtension<{ getAPI(version: 1): GitApi }>('vscode.git');
  if (!extension) {
    return undefined;
  }
  try {
    return (extension.isActive ? extension.exports : await extension.activate()).getAPI(1);
  } catch {
    // Git is turned off in this window.
    return undefined;
  }
}
