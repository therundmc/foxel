import * as vscode from 'vscode';
import { clockAt, dateKey } from '../shared/day';
import {
  SCENES,
  type BuddyMemory,
  type HostMessage,
  type Reaction,
  type Scene,
  type WebviewMessage,
} from '../shared/protocol';
import { BuddyViewProvider } from './buddyViewProvider';
import { readConfig, SECTION, WEBVIEW_SETTINGS, webviewSettings, type Position } from './config';
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
  dig: 'Digging',
  glass: 'Rubbing and licking the glass',
  party: 'Party',
  mouse: 'Mouse hunt in the tall grass',
  bird: 'A bird lands, it pounces and misses',
  bubbles: 'Soap bubbles to jump at and burst',
  typing: 'Sleepy typing',
  drowsy: 'Drowsy',
  stargaze: 'Contemplating the stars',
  snow: 'Contemplating the snow and the northern lights',
  dunes: 'Contemplating the dunes, where a great worm leaps',
  blossom: 'Contemplating the cherry blossoms',
  wheat: 'Contemplating the wheat in the wind',
  train: 'Contemplating the train on the water',
  fireflies: 'Contemplating the fireflies',
  sunrise: 'Contemplating the sunrise',
  daydream: 'Contemplating mountains and clouds',
  sunset: 'Contemplating the sunset',
  rain: 'Contemplating the rain',
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
  const settingsMessage = (): HostMessage => ({
    type: 'settings',
    settings: { ...webviewSettings(readConfig()), installedOn },
  });
  const title = (): string | undefined => readConfig().name.trim() || undefined;
  const setDebugContext = (): Thenable<unknown> =>
    vscode.commands.executeCommand('setContext', 'foxel.debug', readConfig().debug);
  void setDebugContext();

  const watcher = new ActivityWatcher(react, readConfig, clock);
  const viewLive = (): boolean => providers.some((p) => p.live);
  const routine = new Routine(watcher, context.globalState, readConfig, clock, react, viewLive);
  // A view forgets everything when it is closed, so the fox's needs are kept here for the next one.
  let memory: BuddyMemory | undefined;

  // Opening its view is coming to see it: it is awake for that.
  const onReady = (provider: BuddyViewProvider): void => {
    watcher.interacted();
    provider.post(settingsMessage());
    if (memory) {
      provider.post({ type: 'memory', memory });
    }
    routine.viewReady();
  };
  const onMessage = (msg: WebviewMessage, provider: BuddyViewProvider): void => {
    switch (msg?.type) {
      case 'ready':
        onReady(provider);
        break;
      case 'fed':
        routine.fed();
        break;
      case 'interaction':
        watcher.interacted();
        break;
      case 'played':
        watcher.tookBreak();
        break;
      case 'memory':
        memory = msg.memory;
        break;
      default:
        // Anything else is ignored; the compiler flags a message of ours left unhandled.
        msg satisfies never;
    }
  };

  for (const id of Object.values(VIEW_IDS)) {
    const provider = new BuddyViewProvider(context.extensionUri, onMessage);
    provider.setTitle(title());
    providers.push(provider);
    // Its view is kept alive while another tab hides it: the fox is still where it was when you come back to it.
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(id, provider, { webviewOptions: { retainContextWhenHidden: true } }));
  }

  // A command that does something with the fox: the user is there for it.
  const withFox = (run: () => void) => (): void => {
    watcher.interacted();
    run();
  };

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
    vscode.commands.registerCommand('foxel.wave', withFox(() => react('wave'))),
    vscode.commands.registerCommand('foxel.throwBall', withFox(() => broadcast({ type: 'spawnBall' }))),
    vscode.commands.registerCommand('foxel.giveTreat', withFox(() => broadcast({ type: 'giveTreat' }))),
    vscode.commands.registerCommand('foxel.blowBubbles', withFox(() => broadcast({ type: 'blowBubbles' }))),
    vscode.commands.registerCommand('foxel.fillBowl', withFox(() => broadcast({ type: 'fillBowl' }))),
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
      if (WEBVIEW_SETTINGS.some((key) => e.affectsConfiguration(`${SECTION}.${key}`))) {
        broadcast(settingsMessage());
      }
    }),
  );
}

export function deactivate(): void {}
