import type { Box } from '../math';

/** How long the pointer has to be by one of them before it comes: one that only passes does not call it. */
const DWELL_MS = 250;
/** A pointer left lying still this long is no longer asking for anything, unless it lies on the thing itself. */
const IDLE_MS = 4000;

export const within = (box: Box, x: number, y: number, pad: number): boolean => x >= box.x - pad && x < box.x + box.w + pad && y >= box.y - pad && y < box.y + box.h + pad;

/**
 * How what waits at an edge of the view (the chest, the shelf, the box of keepsakes) hears the pointer: the same
 * for all three. Each says where it listens; this says when that is asking for it.
 */
export class Beckon {
  /** The pointer is asking for it. */
  asked = false;
  /** A sky is out: it draws right out of sight and hears nothing, so that there is only the fox and the sky. */
  hidden = false;
  private pointer: { x: number; y: number } | undefined;
  private aroundMs = 0;
  private stillMs = 0;

  /** Where the pointer is, when it is in the view and may be heard. */
  get at(): { x: number; y: number } | undefined {
    return this.hidden ? undefined : this.pointer;
  }

  point(at: { x: number; y: number } | undefined): void {
    if (at?.x !== this.pointer?.x || at?.y !== this.pointer?.y) {
      this.stillMs = 0;
    }
    this.pointer = at;
  }

  /** `near` while the pointer is close to its place, `on` while it lies on the thing itself. */
  heed(dtMs: number, near: boolean, on: boolean): void {
    this.aroundMs = near ? Math.min(DWELL_MS, this.aroundMs + dtMs) : 0;
    this.stillMs += dtMs;
    this.asked = this.aroundMs >= DWELL_MS && (this.stillMs < IDLE_MS || on);
  }
}
