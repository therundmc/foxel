import * as vscode from 'vscode';
import { randomBytes } from 'crypto';
import type { HostMessage, WebviewMessage } from '../shared/protocol';

export class BuddyViewProvider implements vscode.WebviewViewProvider {
  /** True while its webview is loaded and listening. */
  live = false;
  private view?: vscode.WebviewView;
  private title: string | undefined;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly onMessage: (msg: WebviewMessage, provider: BuddyViewProvider) => void,
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
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'dist')],
    };
    view.webview.html = this.html(view.webview);
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

  private html(webview: vscode.Webview): string {
    const nonce = randomBytes(16).toString('hex');
    const script = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.js'),
    );
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style nonce="${nonce}">
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: transparent; }
    #stage { display: block; width: 100%; height: 100%; }
  </style>
</head>
<body>
  <canvas id="stage"></canvas>
  <script nonce="${nonce}" src="${script}"></script>
</body>
</html>`;
  }
}
