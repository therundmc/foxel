import * as vscode from 'vscode';
import { randomBytes } from 'crypto';
import type { HostMessage } from '../shared/protocol';

/** A place the fox is shown in: one of its views, or its strip in the editor area. */
export interface BuddyHost {
  /** True while its webview is loaded and listening. */
  live: boolean;
  post(msg: HostMessage): void;
  setTitle(title: string | undefined): void;
}

export function webviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
  return { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist')] };
}

/** The page the fox lives in: a canvas and its script. */
export function buddyPage(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const nonce = randomBytes(16).toString('hex');
  const script = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview.js'));
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
