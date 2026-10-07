export type Reaction =
  | 'wave'
  | 'love'
  | 'celebrate'
  | 'happy'
  | 'sad'
  | 'panic'
  | 'alert'
  | 'notice'
  | 'typing'
  | 'sleep'
  | 'wake'
  | 'hungry'
  | 'breakTime'
  | 'drink';

export type Coat = 'red' | 'arctic' | 'silver' | 'fennec';

export interface BuddySettings {
  scale: number;
  speed: number;
  coat: Coat;
  dayNight: boolean;
  /** Local date (YYYY-MM-DD) Foxel was first installed, for its anniversary. */
  installedOn: string;
  /** Hidden `foxel.debugHour` setting: forces the hour of the day for testing. */
  debugHour?: number;
}

export const SCENES = [
  'morning',
  'breakfast',
  'drink',
  'askBreak',
  'sigh',
  'starving',
  'doze',
  'party',
  'typing',
  'drowsy',
  'goodNight',
  'bedtime',
] as const;
export type Scene = (typeof SCENES)[number];

export type HostMessage =
  | { type: 'reaction'; reaction: Reaction }
  | { type: 'settings'; settings: BuddySettings }
  | { type: 'spawnBall' }
  | { type: 'giveTreat' }
  | { type: 'fillBowl' }
  | { type: 'play'; scenes: readonly Scene[] }
  | { type: 'shown' };

export type WebviewMessage = { type: 'ready' } | { type: 'fed' };
