import * as vscode from 'vscode';
import type { Coat } from '../shared/protocol';

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
  };
}
