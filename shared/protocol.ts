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
  | 'wake';

export interface BuddySettings {
  scale: number;
  speed: number;
}

export type HostMessage =
  | { type: 'reaction'; reaction: Reaction }
  | { type: 'settings'; settings: BuddySettings }
  | { type: 'spawnBall' };

export interface WebviewMessage {
  type: 'ready';
}
