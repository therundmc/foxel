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

export type Coat = 'red' | 'arctic' | 'silver' | 'fennec';

export interface BuddySettings {
  scale: number;
  speed: number;
  coat: Coat;
}

export type HostMessage =
  | { type: 'reaction'; reaction: Reaction }
  | { type: 'settings'; settings: BuddySettings }
  | { type: 'spawnBall' }
  | { type: 'giveTreat' };

export interface WebviewMessage {
  type: 'ready';
}
