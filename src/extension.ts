import * as vscode from 'vscode';
import type { HostMessage, Reaction } from '../shared/protocol';
import { BuddyViewProvider } from './buddyViewProvider';
import { readConfig, SECTION, type Position } from './config';
import { ActivityWatcher } from './events';

const VIEW_IDS: Record<Position, string> = {
  panel: 'foxel.panelView',
  explorer: 'foxel.explorerView',
};

export function activate(context: vscode.ExtensionContext): void {
  const providers: BuddyViewProvider[] = [];
  const broadcast = (msg: HostMessage): void => providers.forEach((p) => p.post(msg));
  const react = (reaction: Reaction): void => broadcast({ type: 'reaction', reaction });
  const settingsMessage = (): HostMessage => {
    const { scale, speed } = readConfig();
    return { type: 'settings', settings: { scale, speed } };
  };

  const watcher = new ActivityWatcher(react, readConfig);

  const onReady = (provider: BuddyViewProvider): void => {
    provider.post(settingsMessage());
    if (watcher.asleep) {
      provider.post({ type: 'reaction', reaction: 'sleep' });
    }
  };

  for (const id of Object.values(VIEW_IDS)) {
    const provider = new BuddyViewProvider(context.extensionUri, onReady);
    providers.push(provider);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(id, provider));
  }

  const setEnabled = async (enabled: boolean): Promise<void> => {
    await vscode.workspace
      .getConfiguration(SECTION)
      .update('enabled', enabled, vscode.ConfigurationTarget.Global);
    if (enabled) {
      await vscode.commands.executeCommand(`${VIEW_IDS[readConfig().position]}.focus`);
    }
  };

  context.subscriptions.push(
    watcher,
    vscode.commands.registerCommand('foxel.enable', () => setEnabled(true)),
    vscode.commands.registerCommand('foxel.disable', () => setEnabled(false)),
    vscode.commands.registerCommand('foxel.toggle', () => setEnabled(!readConfig().enabled)),
    vscode.commands.registerCommand('foxel.wave', () => react('wave')),
    vscode.commands.registerCommand('foxel.throwBall', () => broadcast({ type: 'spawnBall' })),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration(`${SECTION}.scale`) ||
        e.affectsConfiguration(`${SECTION}.speed`)
      ) {
        broadcast(settingsMessage());
      }
    }),
  );
}

export function deactivate(): void {}
