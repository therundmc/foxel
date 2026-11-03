import type { Session } from './session';
import { grabBall, moveHeldBall, throwBall } from './sim/features/fetch';
import { grabTreat, moveHeldTreat, releaseTreat } from './sim/features/treat';
import type { Box } from './sim/math';
import type { WorldPoint } from './sim/world';

// What the hand can hold: each thing lying in the view, and what picking it up, moving it and letting go of it does.

/** Something lying in the view that the user can pick up and drag around. */
export interface Draggable {
  /** Lying there, ready to be picked up. */
  free(): boolean;
  box(): Box;
  grab(p: WorldPoint): void;
  move(p: WorldPoint): void;
  /** Let go at `p`, the hand moving at velocity `v`. */
  release(p: WorldPoint, v: WorldPoint): void;
}

// Checked in this order when two of them overlap; a new toy only needs an entry here.
export function draggables({ world, buddy }: Session): readonly Draggable[] {
  const { ball, treat } = world;
  return [
    {
      free: () => ball.state === 'free',
      box: () => ball.box,
      grab: (p) => grabBall(buddy, p.x, p.y),
      move: (p) => moveHeldBall(buddy, p.x, p.y),
      release: (p, v) => throwBall(buddy, v.x, v.y, p.x),
    },
    {
      free: () => treat.state === 'free',
      box: () => treat.box,
      grab: (p) => grabTreat(buddy, p.x, p.y),
      move: (p) => moveHeldTreat(buddy, p.x, p.y),
      release: () => releaseTreat(buddy),
    },
  ];
}
