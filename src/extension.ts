import * as vscode from 'vscode';
import { clockAt, dateKey } from '../shared/day';
import { SCENES, type HostMessage, type Reaction, type Scene } from '../shared/protocol';
import { BuddyViewProvider } from './buddyViewProvider';
import { readConfig, SECTION, type Position } from './config';
import { ActivityWatcher } from './events';
import { Routine } from './routine';

const VIEW_IDS: Record<Position, string> = {
  panel: 'foxel.panelView',
  explorer: 'foxel.explorerView',
};
const INSTALLED_KEY = 'foxel.installedOn';
const SCENE_LABELS: Record<Scene, string> = {
  morning: 'Good morning',
  breakfast: 'Breakfast',
  drink: 'Drink of water',
  askBreak: 'Asking for a break',
  sigh: 'Sigh, break ignored',
  starving: 'Starving',
  doze: 'Afternoon nap',
  party: 'Party',
  typing: 'Sleepy typing',
  drowsy: 'Drowsy',
  goodNight: 'Good night',
  bedtime: 'Bedtime in the basket',
};

export function activate(context: vscode.ExtensionContext): void {
  const providers: BuddyViewProvider[] = [];
  const broadcast = (msg: HostMessage): void => providers.forEach((p) => p.post(msg));
  const react = (reaction: Reaction): void => broadcast({ type: 'reaction', reaction });
  const clock = (): Date => clockAt(readConfig().debugHour);
  let installedOn = context.globalState.get<string>(INSTALLED_KEY);
  if (!installedOn) {
    installedOn = dateKey(new Date());
    void context.globalState.update(INSTALLED_KEY, installedOn);
  }
  const settingsMessage = (): HostMessage => {
    const { scale, speed, coat, dayNight, debugHour } = readConfig();
    return { type: 'settings', settings: { scale, speed, coat, dayNight, debugHour, installedOn } };
  };
  const title = (): string | undefined => readConfig().name.trim() || undefined;
  const setDebugContext = (): Thenable<unknown> =>
    vscode.commands.executeCommand('setContext', 'foxel.debug', readConfig().debug);
  void setDebugContext();

  const watcher = new ActivityWatcher(react, readConfig, clock);
  const routine = new Routine(watcher, context.globalState, readConfig, clock, react);

  const onReady = (provider: BuddyViewProvider): void => {
    provider.post(settingsMessage());
    if (watcher.asleep) {
      provider.post({ type: 'reaction', reaction: 'sleep' });
    }
    routine.viewReady();
  };

  for (const id of Object.values(VIEW_IDS)) {
    const provider = new BuddyViewProvider(context.extensionUri, onReady, () => routine.fed());
    provider.setTitle(title());
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
    routine,
    vscode.commands.registerCommand('foxel.enable', () => setEnabled(true)),
    vscode.commands.registerCommand('foxel.disable', () => setEnabled(false)),
    vscode.commands.registerCommand('foxel.toggle', () => setEnabled(!readConfig().enabled)),
    vscode.commands.registerCommand('foxel.wave', () => react('wave')),
    vscode.commands.registerCommand('foxel.throwBall', () => broadcast({ type: 'spawnBall' })),
    vscode.commands.registerCommand('foxel.giveTreat', () => broadcast({ type: 'giveTreat' })),
    vscode.commands.registerCommand('foxel.fillBowl', () => broadcast({ type: 'fillBowl' })),
    vscode.commands.registerCommand('foxel.playScene', async () => {
      const picks = [
        { label: 'A day in the life', scenes: SCENES },
        ...SCENES.map((scene) => ({ label: SCENE_LABELS[scene], scenes: [scene] })),
      ];
      const pick = await vscode.window.showQuickPick(picks, { placeHolder: 'Scene to play' });
      if (pick) {
        broadcast({ type: 'play', scenes: pick.scenes });
      }
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(`${SECTION}.name`)) {
        providers.forEach((p) => p.setTitle(title()));
      }
      if (e.affectsConfiguration(`${SECTION}.debug`)) {
        void setDebugContext();
      }
      const settingKeys = ['scale', 'speed', 'coat', 'dayNight', 'debugHour'];
      if (settingKeys.some((key) => e.affectsConfiguration(`${SECTION}.${key}`))) {
        broadcast(settingsMessage());
      }
    }),
  );
}

export function deactivate(): void {}
