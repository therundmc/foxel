import type { Session } from './session';
import { grabBall, moveHeldBall, stowBall, throwBall } from './sim/features/fetch';
import { holdPlush, stowPlush, tossPlush, tuggable } from './sim/features/plush';
import { grabTreat, moveHeldTreat, releaseTreat, stowTreat, takeTreat } from './sim/features/treat';
import type { Box } from './sim/math';
import type { WorldPoint } from './sim/world';
import type { ChestItem, PlushKind } from './sprites/props';

// What the hand can hold: each toy, and what picking it up, moving it and letting go of it does.

/** Something lying in the view that the user can pick up and drag around. */
export interface Draggable {
  /** Lying there, ready to be picked up. */
  free(): boolean;
  box(): Box;
  grab(p: WorldPoint): void;
  /** Taken new out of the chest, straight into the hand. */
  take(p: WorldPoint): void;
  /** Put back in the chest. */
  stow(): void;
  move(p: WorldPoint): void;
  /** Let go at `p`, the hand moving at velocity `v`. */
  release(p: WorldPoint, v: WorldPoint): void;
}

// Everything in the chest can be held. Checked in this order when two of them overlap; a new toy only needs an entry here.
export function draggables({ world, buddy }: Session): Record<ChestItem, Draggable> {
  const { ball, treat } = world;
  const plush = (kind: PlushKind): Draggable => ({
    // Lying about or flying, it can be picked up; in its mouth, it can be pulled at.
    free: () => world.plushes[kind].state === 'free' || tuggable(buddy, kind),
    box: () => world.plushes[kind].box,
    grab: (p) => holdPlush(buddy, kind, p.x, p.y),
    take: (p) => holdPlush(buddy, kind, p.x, p.y),
    move: (p) => holdPlush(buddy, kind, p.x, p.y),
    release: (_, v) => tossPlush(buddy, kind, v.x, v.y),
    stow: () => stowPlush(buddy, kind),
  });
  return {
    ball: {
      free: () => ball.state === 'free',
      box: () => ball.box,
      grab: (p) => grabBall(buddy, p.x, p.y),
      take: (p) => grabBall(buddy, p.x, p.y),
      stow: () => stowBall(buddy),
      move: (p) => moveHeldBall(buddy, p.x, p.y),
      release: (p, v) => throwBall(buddy, v.x, v.y, p.x),
    },
    treat: {
      free: () => treat.state === 'free',
      box: () => treat.box,
      grab: (p) => grabTreat(buddy, p.x, p.y),
      take: (p) => takeTreat(buddy, p.x, p.y),
      stow: () => stowTreat(buddy),
      move: (p) => moveHeldTreat(buddy, p.x, p.y),
      release: () => releaseTreat(buddy),
    },
    teddy: plush('teddy'),
    duck: plush('duck'),
  };
}
