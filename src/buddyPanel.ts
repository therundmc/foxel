import * as vscode from 'vscode';
import type { HostMessage, WebviewMessage } from '../shared/protocol';
import { buddyPage, webviewOptions, type BuddyHost } from './buddyHost';
import { withStripBelow, type EditorLayout } from './editorStrip';

export const PANEL_TYPE = 'foxel.editor';
const DEFAULT_TITLE = 'Foxel';

/**
 * The fox in a strip of its own across the bottom of the editor area: an editor group that takes no files, which
 * stays in sight whatever the panel below is showing.
 */
export class BuddyPanel implements BuddyHost {
  live = false;
  private panel?: vscode.WebviewPanel;
  private title = DEFAULT_TITLE;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly onMessage: (msg: WebviewMessage, host: BuddyHost) => void,
  ) {}

  get open(): boolean {
    return this.panel !== undefined;
  }

  setTitle(title: string | undefined): void {
    this.title = title ?? DEFAULT_TITLE;
    if (this.panel) {
      this.panel.title = this.title;
    }
  }

  post(msg: HostMessage): void {
    void this.panel?.webview.postMessage(msg);
  }

  /** Makes its strip and opens it there, or shows the one that is already open. */
  async show(): Promise<void> {
    if (this.panel) {
      this.panel.reveal(undefined, true);
      return;
    }
    const layout = await vscode.commands.executeCommand<EditorLayout>('vscode.getEditorLayout');
    await vscode.commands.executeCommand('vscode.setEditorLayout', withStripBelow(layout));
    // The strip is the last group of the new layout.
    const strip = vscode.window.tabGroups.all.length;
    this.adopt(
      vscode.window.createWebviewPanel(PANEL_TYPE, this.title, { viewColumn: strip, preserveFocus: false }, { ...webviewOptions(this.extensionUri), retainContextWhenHidden: true }),
    );
    // Its group takes no files: one opened while the fox has the focus goes to your editors, not over it.
    await vscode.commands.executeCommand('workbench.action.lockEditorGroup');
    await vscode.commands.executeCommand('workbench.action.focusPreviousGroup');
  }

  /** Takes charge of a panel: the one just made, or one the editor brought back from the last session. */
  adopt(panel: vscode.WebviewPanel): void {
    // One fox is enough: a second strip turning up, say one brought back after a new one was made, is closed.
    if (this.panel && this.panel !== panel) {
      panel.dispose();
      return;
    }
    this.panel = panel;
    panel.title = this.title;
    panel.webview.options = webviewOptions(this.extensionUri);
    panel.webview.html = buddyPage(panel.webview, this.extensionUri);
    panel.webview.onDidReceiveMessage((msg: WebviewMessage) => {
      if (msg?.type === 'ready') {
        this.live = true;
      }
      this.onMessage(msg, this);
    });
    // Behind another tab of its group, it hears nothing from us; it says 'ready' again once it is back.
    let visible = panel.visible;
    panel.onDidChangeViewState(() => {
      if (panel.visible !== visible) {
        visible = panel.visible;
        this.live = false;
        if (visible) {
          this.post({ type: 'shown' });
        }
      }
    });
    panel.onDidDispose(() => {
      this.panel = undefined;
      this.live = false;
    });
  }

  close(): void {
    this.panel?.dispose();
  }
}
