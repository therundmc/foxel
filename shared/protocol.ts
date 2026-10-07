import type { Vista } from './day';

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

/** The welcomes it keeps for the first time it sees you. */
export type Greeting = 'morning' | 'night' | 'party';

/** What the fox carries over when its view is closed and opened again. */
export interface BuddyMemory {
  /** When this was noted, in ms since the epoch: time goes on while the view is closed. */
  savedAt: number;
  /** How long it had been hungry by then; undefined when it was not. */
  hungryForMs?: number;
  thirsty: boolean;
  breakWanted: boolean;
  /** Break requests it made in vain so far. */
  breakAsks: number;
  /** When it last gave each welcome, in ms since the epoch. */
  greeted: Partial<Record<Greeting, number>>;
  /** Time left, when this was noted, before it feels like contemplating the sky again. */
  vistaInMs: number;
  /** The sky it watched and has not dreamt of yet. */
  dream?: Vista;
  /** Whether a mouse has made friends with it. */
  mouseFriend: boolean;
}

export const SCENES = [
  'morning',
  'breakfast',
  'drink',
  'askBreak',
  'sigh',
  'starving',
  'doze',
  'dig',
  'roll',
  'glass',
  'party',
  'mouse',
  'bird',
  'typing',
  'drowsy',
  'sunrise',
  'rain',
  'daydream',
  'sunset',
  'stargaze',
  'snow',
  'goodNight',
  'bedtime',
] as const;
export type Scene = (typeof SCENES)[number];

export type HostMessage =
  | { type: 'reaction'; reaction: Reaction }
  | { type: 'settings'; settings: BuddySettings }
  | { type: 'memory'; memory: BuddyMemory }
  | { type: 'spawnBall' }
  | { type: 'giveTreat' }
  | { type: 'fillBowl' }
  | { type: 'play'; scenes: readonly Scene[] }
  | { type: 'shown' };

export type WebviewMessage =
  | { type: 'ready' }
  | { type: 'fed' }
  /** The user did something in the view: they are there, even without touching the editor. */
  | { type: 'interaction' }
  /** The user played with the fox, which is a break from work. */
  | { type: 'played' }
  | { type: 'memory'; memory: BuddyMemory };
