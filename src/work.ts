import * as vscode from 'vscode';
import type { Reaction } from '../shared/protocol';
import type { BuddyConfig } from './config';

/** Something that runs this long is worth waiting for: the fox sits down and watches. */
const WAIT_AFTER_MS = 20_000;
const CHECK_MS = 2000;
/** A command stopped by hand (Ctrl+C) did not fail. */
const INTERRUPTED = 130;
/** Keeps a burst of the same news from making it twitchy. */
const COOLDOWN_MS: Partial<Record<Reaction, number>> = { commit: 3000, push: 3000, failed: 4000, done: 3000 };

/** What the fox needs of the editor's built-in Git extension: just enough to tell a commit, a push and a conflict. */
export interface GitRepository {
  readonly state: {
    readonly HEAD?: { readonly name?: string; readonly commit?: string; readonly ahead?: number; readonly upstream?: unknown };
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
  readonly tracked: boolean;
  readonly conflicts: number;
}

const standingOf = ({ state }: GitRepository): Standing => ({
  branch: state.HEAD?.name,
  commit: state.HEAD?.commit,
  ahead: state.HEAD?.ahead,
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
    return undefined;
  }
  if (after.commit === before.commit) {
    // Nothing new here, and nothing left to send: it has gone to the remote.
    return after.tracked && (before.ahead ?? 0) > 0 && after.ahead === 0 ? 'push' : undefined;
  }
  // A new commit on the same branch: yours if the branch is now one more ahead, or has no remote to compare with.
  const oneMore = after.ahead !== undefined && after.ahead === (before.ahead ?? 0) + 1;
  return oneMore || (!after.tracked && before.commit !== undefined) ? 'commit' : undefined;
}

/** A terminal that reports when a command starts and ends: newer editors only. */
interface ShellEvents {
  onDidStartTerminalShellExecution?: vscode.Event<{ readonly execution: object }>;
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

  constructor(
    private readonly react: (reaction: Reaction) => void,
    private readonly config: () => BuddyConfig,
    /** You are working, even with the editor left alone. */
    private readonly worked: () => void,
    /** A merge with conflicts is in progress, or no longer. */
    private readonly troubled: (conflicts: boolean) => void,
  ) {
    const shell = vscode.window as typeof vscode.window & ShellEvents;
    this.disposables.push(
      vscode.tasks.onDidStartTaskProcess((e) => !e.execution.task.isBackground && this.started(e.execution)),
      vscode.tasks.onDidEndTaskProcess((e) => this.ended(e.execution, e.exitCode, true)),
    );
    if (shell.onDidStartTerminalShellExecution && shell.onDidEndTerminalShellExecution) {
      this.disposables.push(
        shell.onDidStartTerminalShellExecution((e) => this.started(e.execution)),
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

  private started(run: object): void {
    this.running.set(run, { since: Date.now(), awaited: false });
    this.worked();
  }

  private ended(run: object, exitCode: number | undefined, task: boolean): void {
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
