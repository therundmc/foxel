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
  | 'drink'
  /** Your work beyond typing: a commit, a push, a merge that conflicts and its way out. */
  | 'commit'
  | 'push'
  | 'conflict'
  | 'resolved'
  /** A command or a task failed; one it was waiting for went well, or stopped without a verdict. */
  | 'failed'
  | 'done'
  | 'stopped'
  /** Something has been running for a while: it sits down to wait for it. */
  | 'waiting'
  /** Errors or conflicts remain, a few or a great many, and it frets about them; then none are left. Moods, not moments. */
  | 'worry'
  | 'overwhelmed'
  | 'atEase'
  /** Fewer errors than a moment ago: you are getting there. */
  | 'progress'
  /** A debugging session starts and ends; in between, it stops on a breakpoint and goes on. */
  | 'debugging'
  | 'paused'
  | 'resumed'
  | 'debugDone'
  /** You have been typing without a pause for a good while; then you stop. */
  | 'focused'
  | 'unfocused'
  /** Someone else is writing in your files (an assistant, most likely) while you watch; then it stops. */
  | 'helper'
  | 'helperDone'
  /** New commits came in from the remote; you moved to another branch. */
  | 'pulled'
  | 'branch'
  /** You undid a great deal at once; you made a new file; you threw one away. */
  | 'undoSpree'
  | 'newFile'
  | 'goneFile'
  /** You are back after hours away. */
  | 'reunion'
  /** The first commit of your day; work put aside in a stash, and taken out again. */
  | 'firstCommit'
  | 'stash'
  | 'unstash'
  /** You scroll through a file, up or down; and you have been at it, fast, for a while. */
  | 'scrollUp'
  | 'scrollDown'
  | 'scrollSpree'
  /** You set a breakpoint; you have cleared them all. */
  | 'breakpoint'
  | 'breakpointsGone'
  /** A great deal of text arrived at once. */
  | 'paste';

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
  /** The sky it watched and has not dreamt of yet, and the last one it stopped for. */
  dream?: Vista;
  lastVista?: Vista;
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
  'glass',
  'party',
  'mouse',
  'bird',
  'bubbles',
  'commit',
  'push',
  'conflict',
  'failing',
  'build',
  'errors',
  'debugging',
  'zone',
  'lantern',
  'assistant',
  'typing',
  'drowsy',
  'sunrise',
  'dunes',
  'rain',
  'blossom',
  'daydream',
  'wheat',
  'sunset',
  'train',
  'stargaze',
  'fireflies',
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
  | { type: 'blowBubbles' }
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
