import type { BuddySettings } from '../shared/protocol';
import type { Buddy } from './sim/buddy';
import type { World } from './sim/world';

/** What the view is showing right now; the renderer and the input handlers both work from it. */
export interface Session {
  readonly world: World;
  readonly buddy: Buddy;
  settings: BuddySettings;
  /** The time of day everything goes by, which a scene or the debug setting may force. */
  clock: Date;
  /** Whenever the view appears, the fox peeks in from an edge instead of just being there. */
  introPending: boolean;
  /** Whether the editor's theme is a light one: pale things are drawn darker on it. */
  light: boolean;
}

/** The fox is not on stage while it is away or still waiting for its entrance. */
export function foxShown(session: Session): boolean {
  return session.buddy.visible && !session.introPending;
}
