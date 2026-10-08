import * as vscode from 'vscode';
import { dayPhase } from '../shared/day';
import type { Reaction } from '../shared/protocol';
import type { BuddyConfig } from './config';

const TYPING_THROTTLE_MS = 300;
const SLEEP_CHECK_MS = 1000;
const WELCOME_BACK_AFTER_MS = 60_000;
// A pause at least this long counts as a real break.
const BREAK_GAP_MS = 5 * 60_000;
const NIGHT_SLEEP_FACTOR = 0.5;

// Keeps frequent editor events from making the companion twitchy.
const COOLDOWN_MS: Partial<Record<Reaction, number>> = {
  panic: 15_000,
  notice: 6000,
  celebrate: 3000,
  alert: 4000,
  sad: 4000,
  wave: 10_000,
};

export class ActivityWatcher implements vscode.Disposable {
  asleep = false;
  /** Start of the current stretch of work without a real break. */
  workingSince = Date.now();
  /** Last sign that you are there, and last sign that you are working: time spent with the fox is only the first. */
  private lastActivity = Date.now();
  private lastWork = Date.now();
  private lastTyping = 0;
  private lastBlur = 0;
  private errorCount = countErrors();
  private readonly lastEmitted = new Map<Reaction, number>();
  private readonly disposables: vscode.Disposable[];
  private readonly timer: ReturnType<typeof setInterval>;

  constructor(
    private readonly react: (reaction: Reaction) => void,
    private readonly config: () => BuddyConfig,
    private readonly clock: () => Date,
    /** Errors remain in your files, or none do any more. */
    private readonly troubled: (errors: boolean) => void = () => undefined,
  ) {
    this.troubled(this.config().reactToErrors && this.errorCount > 0);
    this.disposables = [
      vscode.workspace.onWillSaveTextDocument((e) => this.onSave(e)),
      vscode.workspace.onDidChangeTextDocument((e) => this.onEdit(e)),
      vscode.window.onDidChangeTextEditorSelection(() => this.touch()),
      vscode.window.onDidChangeActiveTextEditor((editor) => this.onEditorSwitch(editor)),
      vscode.window.onDidChangeWindowState((s) => this.onWindowState(s)),
      vscode.debug.onDidStartDebugSession(() => this.activity('alert')),
      vscode.languages.onDidChangeDiagnostics(() => this.onDiagnostics()),
    ];
    this.timer = setInterval(() => this.checkSleep(), SLEEP_CHECK_MS);
  }

  /** Doing something with the fox is being there too, even with the editor left alone. */
  interacted(): void {
    this.present();
  }

  /** Work done outside the editor (a command, a commit) is work all the same. */
  worked(): void {
    this.touch();
  }

  /** Playing with the fox is a break from work. */
  tookBreak(): void {
    this.workingSince = Date.now();
  }

  dispose(): void {
    clearInterval(this.timer);
    this.disposables.forEach((d) => d.dispose());
  }

  private onSave(e: vscode.TextDocumentWillSaveEvent): void {
    // Auto-save would otherwise trigger a celebration every few seconds.
    if (e.reason !== vscode.TextDocumentSaveReason.Manual) {
      return;
    }
    this.activity('celebrate');
  }

  private onEdit(e: vscode.TextDocumentChangeEvent): void {
    if (e.contentChanges.length === 0 || e.document !== vscode.window.activeTextEditor?.document) {
      return;
    }
    this.touch();
    const now = Date.now();
    if (this.config().reactToTyping && now - this.lastTyping >= TYPING_THROTTLE_MS) {
      this.lastTyping = now;
      this.react('typing');
    }
  }

  private onDiagnostics(): void {
    const previous = this.errorCount;
    this.errorCount = countErrors();
    this.troubled(this.config().reactToErrors && this.errorCount > 0);
    if (!this.config().reactToErrors) {
      return;
    }
    if (this.errorCount > previous) {
      this.activity('panic');
    } else if (this.errorCount === 0 && previous > 0) {
      this.activity('happy');
    }
  }

  private onEditorSwitch(editor: vscode.TextEditor | undefined): void {
    this.touch();
    if (editor) {
      this.emit('notice');
    }
  }

  private onWindowState(state: vscode.WindowState): void {
    if (!state.focused) {
      this.lastBlur = Date.now();
      return;
    }
    const awayMs = Date.now() - this.lastBlur;
    if (this.lastBlur > 0 && awayMs >= BREAK_GAP_MS) {
      this.workingSince = Date.now();
    }
    this.touch();
    if (this.lastBlur > 0 && awayMs >= WELCOME_BACK_AFTER_MS) {
      this.emit('wave');
    }
  }

  private activity(reaction: Reaction): void {
    this.touch();
    this.emit(reaction);
  }

  private emit(reaction: Reaction): void {
    const now = Date.now();
    const cooldown = COOLDOWN_MS[reaction] ?? 0;
    if (now - (this.lastEmitted.get(reaction) ?? -Infinity) < cooldown) {
      return;
    }
    this.lastEmitted.set(reaction, now);
    this.react(reaction);
  }

  private touch(): void {
    const now = Date.now();
    if (now - this.lastWork >= BREAK_GAP_MS) {
      this.workingSince = now;
    }
    this.lastWork = now;
    this.present();
  }

  // You are there, whatever you are doing: the fox does not fall asleep, or wakes up.
  private present(): void {
    this.lastActivity = Date.now();
    if (this.asleep) {
      this.asleep = false;
      this.react('wake');
    }
  }

  private checkSleep(): void {
    const idleMs = Date.now() - this.lastActivity;
    const night = dayPhase(this.clock()) === 'night';
    const sleepAfterMs = this.config().sleepAfterSeconds * 1000 * (night ? NIGHT_SLEEP_FACTOR : 1);
    if (!this.asleep && idleMs >= sleepAfterMs) {
      this.asleep = true;
      this.react('sleep');
    }
  }
}

function countErrors(): number {
  let count = 0;
  for (const [, diagnostics] of vscode.languages.getDiagnostics()) {
    for (const d of diagnostics) {
      if (d.severity === vscode.DiagnosticSeverity.Error) {
        count++;
      }
    }
  }
  return count;
}
