import * as vscode from 'vscode';
import type { HostMessage, WebviewMessage } from '../shared/protocol';
import { buddyPage, webviewOptions, type BuddyHost } from './buddyHost';

/** The fox in a view of the panel or of the side bar. */
export class BuddyViewProvider implements vscode.WebviewViewProvider, BuddyHost {
  live = false;
  private view?: vscode.WebviewView;
  private title: string | undefined;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly onMessage: (msg: WebviewMessage, host: BuddyHost) => void,
  ) {}

  setTitle(title: string | undefined): void {
    this.title = title;
    if (this.view) {
      this.view.title = title;
    }
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.title = this.title;
    view.webview.options = webviewOptions(this.extensionUri);
    view.webview.html = buddyPage(view.webview, this.extensionUri);
    view.webview.onDidReceiveMessage((msg: WebviewMessage) => {
      if (msg?.type === 'ready') {
        this.live = true;
      }
      this.onMessage(msg, this);
    });
    // Hidden, its webview is kept but hears nothing from us; it says 'ready' again once it is back.
    view.onDidChangeVisibility(() => {
      this.live = false;
      if (view.visible) {
        this.post({ type: 'shown' });
      }
    });
    view.onDidDispose(() => {
      this.view = undefined;
      this.live = false;
    });
  }

  post(msg: HostMessage): void {
    void this.view?.webview.postMessage(msg);
  }
}
