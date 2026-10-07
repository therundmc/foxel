import * as vscode from 'vscode';
import type { BuddySettings, Coat } from '../shared/protocol';

export const SECTION = 'foxel';

export type Position = 'panel' | 'explorer';

export interface BuddyConfig {
  enabled: boolean;
  position: Position;
  scale: number;
  speed: number;
  coat: Coat;
  reactToTyping: boolean;
  reactToErrors: boolean;
  sleepAfterSeconds: number;
  name: string;
  dayNight: boolean;
  meals: boolean;
  breakReminderMinutes: number;
  hydrationReminderMinutes: number;
  debugHour: number | undefined;
  debug: boolean;
}

// The settings the webview draws with. Listing one here is all it takes for it, and its changes, to be sent over.
const SENT: Record<keyof Omit<BuddySettings, 'installedOn'>, true> = {
  scale: true,
  speed: true,
  coat: true,
  dayNight: true,
  debugHour: true,
};
export const WEBVIEW_SETTINGS = Object.keys(SENT) as (keyof typeof SENT)[];

export function webviewSettings(config: BuddyConfig): Pick<BuddyConfig, keyof typeof SENT> {
  return Object.fromEntries(WEBVIEW_SETTINGS.map((key) => [key, config[key]])) as Pick<BuddyConfig, keyof typeof SENT>;
}

export function readConfig(): BuddyConfig {
  const c = vscode.workspace.getConfiguration(SECTION);
  return {
    enabled: c.get('enabled', true),
    position: c.get<Position>('position', 'panel'),
    scale: c.get('scale', 4),
    speed: c.get('speed', 1),
    coat: c.get<Coat>('coat', 'red'),
    reactToTyping: c.get('reactToTyping', true),
    reactToErrors: c.get('reactToErrors', true),
    sleepAfterSeconds: c.get('sleepAfterSeconds', 30),
    name: c.get('name', ''),
    dayNight: c.get('dayNight', true),
    meals: c.get('meals', true),
    breakReminderMinutes: c.get('breakReminderMinutes', 50),
    hydrationReminderMinutes: c.get('hydrationReminderMinutes', 60),
    // Deliberately not declared in package.json: only for trying out times of day and scenes.
    debugHour: c.get<number>('debugHour'),
    debug: c.get('debug', false),
  };
}
