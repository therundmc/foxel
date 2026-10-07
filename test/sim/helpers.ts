import { Buddy } from '../../webview/sim/buddy';
import { World } from '../../webview/sim/world';

export const fixed = (value: number) => () => value;

/** A buddy alone in a world of its own. */
export function spawn(random: () => number): Buddy {
  return new Buddy(new World(random));
}

export function simulate(b: Buddy, ms: number, each?: () => boolean | void): void {
  for (let t = 0; t < ms; t += 16) {
    b.world.update(16);
    if (each?.() === true) {
      return;
    }
  }
}
