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
import type { BuddyHost } from './buddyHost';
import { BuddyPanel, PANEL_TYPE } from './buddyPanel';
import { BuddyViewProvider } from './buddyViewProvider';
import { readConfig, SECTION, WEBVIEW_SETTINGS, webviewSettings, type Position } from './config';
import { ActivityWatcher } from './events';
import { Routine } from './routine';
import { gitApi, WorkWatcher } from './work';

/** The views it can live in; its third place, a strip of the editor area, is a panel of its own. */
const VIEW_IDS: Record<Exclude<Position, 'editor'>, string> = {
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
  commit: 'A commit: it plants a flag',
  push: 'A push: a bird takes the letter',
  conflict: 'A merge conflict: tangled in yarn, then free',
  failing: 'Commands that keep failing: a flinch, then under the box',
  build: 'A long build: the hourglass, then a tower of pebbles',
  errors: 'Errors that remain: its own rain cloud',
  debugging: 'Debugging: the detective, and a breakpoint',
  zone: 'A long stretch of typing: the headband',
  lantern: 'Working late: the lantern',
  assistant: 'An assistant writes for you: it supervises, glasses on',
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
  const providers: BuddyHost[] = [];
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

  // What it frets about for as long as it lasts: errors in your files (some, or a great many), a merge that conflicts.
  const MOODS = ['atEase', 'worry', 'overwhelmed'] as const;
  const troubles = { errors: 0, conflicts: 0 };
  const mood = (): Reaction => MOODS[Math.max(troubles.errors, troubles.conflicts)];
  const trouble = (what: keyof typeof troubles) => (level: number): void => {
    const before = mood();
    troubles[what] = level;
    if (mood() !== before) {
      react(mood());
    }
  };

  const watcher = new ActivityWatcher(react, readConfig, clock, trouble('errors'));
  const work = new WorkWatcher(react, readConfig, () => watcher.worked(), (conflicts) => trouble('conflicts')(conflicts ? 1 : 0), () => watcher.typedAt);
  void gitApi().then((git) => git && work.watchGit(git));
  const viewLive = (): boolean => providers.some((p) => p.live);
  const routine = new Routine(watcher, context.globalState, readConfig, clock, react, viewLive);
  // A view forgets everything when it is closed, so the fox's needs are kept here for the next one.
  let memory: BuddyMemory | undefined;

  // Opening its view is coming to see it: it is awake for that.
  const onReady = (provider: BuddyHost): void => {
    watcher.interacted();
    provider.post(settingsMessage());
    if (memory) {
      provider.post({ type: 'memory', memory });
    }
    routine.viewReady();
    // A view that has just opened does not know what the fox is fretting about.
    if (mood() !== 'atEase') {
      provider.post({ type: 'reaction', reaction: mood() });
    }
  };
  const onMessage = (msg: WebviewMessage, provider: BuddyHost): void => {
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

  const strip = new BuddyPanel(context.extensionUri, onMessage);
  strip.setTitle(title());
  providers.push(strip);
  // The editor brings its strip back with the rest of the window: it only needs taking charge of again.
  context.subscriptions.push(vscode.window.registerWebviewPanelSerializer(PANEL_TYPE, { deserializeWebviewPanel: async (panel) => strip.adopt(panel) }));
  /** Opens its strip when that is where it lives, and closes it when it is not. */
  const syncStrip = async (): Promise<void> => {
    const { enabled, position } = readConfig();
    if (enabled && position === 'editor') {
      await strip.show();
    } else {
      strip.close();
    }
  };
  // At start-up the editor may be about to bring the strip back by itself: only make one if there is none coming.
  const stripComing = vscode.window.tabGroups.all.some((group) => group.tabs.some((tab) => tab.input instanceof vscode.TabInputWebview && tab.input.viewType.endsWith(PANEL_TYPE)));
  if (!stripComing) {
    void syncStrip();
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
    const { position } = readConfig();
    if (position === 'editor') {
      await syncStrip();
    } else if (enabled) {
      await vscode.commands.executeCommand(`${VIEW_IDS[position]}.focus`);
    }
  };

  context.subscriptions.push(
    watcher,
    work,
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
      if (e.affectsConfiguration(`${SECTION}.position`) || e.affectsConfiguration(`${SECTION}.enabled`)) {
        void syncStrip();
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
