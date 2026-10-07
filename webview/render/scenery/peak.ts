import type { VistaView } from './paint';

// The great peak of the fox's valley: one mountain every sky shares, so that it is the same place at dawn, at noon
// and under the stars. A sharp, lopsided pyramid in the manner of the Matterhorn: one long steady ridge, one
// steeper side broken by a shoulder, and a summit that hooks over.

/** Its outline, from the summit down, as [how far aside, how high], both as shares of its height. */
const LEFT: readonly (readonly [number, number])[] = [[0, 1], [0.05, 0.82], [0.16, 0.62], [0.34, 0.38], [0.58, 0.18], [1, 0]];
const RIGHT: readonly (readonly [number, number])[] = [[0, 1], [0.12, 0.8], [0.25, 0.6], [0.36, 0.565], [0.52, 0.27], [0.78, 0.1], [1.2, 0]];

/** Where the great peak stands in a view and how tall it is, in pixels. */
export interface Peak {
  /** Column of its summit. */
  readonly x: number;
  readonly tall: number;
}

/** It stands on the side the fox looks to, never behind it, and takes a good part of the height. */
export function peakOf({ w, h, foxX, dir }: Pick<VistaView, 'w' | 'h' | 'foxX' | 'dir'>): Peak {
  const room = dir > 0 ? w - foxX : foxX;
  return {
    x: Math.round(foxX + dir * Math.min(150, Math.max(44, room * 0.46))),
    tall: Math.round(Math.min(72, Math.max(16, h * 0.52))),
  };
}

/** How high the peak rises above its foot at `dx` pixels from its summit (0 beyond its slopes). */
export function peakHeight(dx: number, tall: number): number {
  const side = dx < 0 ? LEFT : RIGHT;
  const aside = Math.abs(dx) / tall;
  for (let i = 1; i < side.length; i++) {
    const [x0, y0] = side[i - 1];
    const [x1, y1] = side[i];
    if (aside <= x1) {
      return tall * (y0 + ((y1 - y0) * (aside - x0)) / (x1 - x0));
    }
  }
  return 0;
}

/** How far down from the summit the snow reaches at `dx`: a ragged line, lower on the long ridge. */
export function peakSnow(dx: number, tall: number): number {
  const ragged = Math.abs(((dx * 0.37) % 2) - 1);
  return tall * (dx < 0 ? 0.3 : 0.38) + ragged * tall * 0.08;
}
