import type { Buddy } from '../sim/buddy';
import type { Gaze } from '../sim/state';
import { GROUND_ROW } from '../sprites/fox/anchors';
import { SPRITE_SIZE, type Frame } from '../sprites/frames';
import { PALETTE } from '../sprites/palette';
import type { Rect, Stage } from '../stage';
import type { Bitmaps } from './bitmaps';

const BLINK_MS = 140;
const BLINK_GAP_MIN_MS = 2500;
const BLINK_GAP_MAX_MS = 6500;
const GAZE_DELAY_MS = 220;
const GAZE_HOLD_MS = 350;
const CENTER_GAZE: Gaze = { x: 0, y: 0 };

function blinkGap(): number {
  return BLINK_GAP_MIN_MS + Math.random() * (BLINK_GAP_MAX_MS - BLINK_GAP_MIN_MS);
}

/**
 * The eye sits in a 4x4 patch of fur (see `Frame.eye`), so it can be repainted blinking or looking around.
 * Eyes lag behind the target and step one pixel at a time, so they glance rather than twitch.
 */
export class Eyes {
  private shownGaze: Gaze = CENTER_GAZE;
  private wantedGaze: Gaze = CENTER_GAZE;
  private wantedSince = 0;
  private shownSince = 0;
  private nextBlinkAt = performance.now() + blinkGap();

  /** Schedules the next blink once the current one is over. */
  blink(now: number): void {
    if (now >= this.nextBlinkAt + BLINK_MS) {
      this.nextBlinkAt = now + blinkGap();
    }
  }

  draw(stage: Stage, bitmaps: Bitmaps, buddy: Buddy, frame: Frame, rect: Rect, flip: boolean, now: number): void {
    if (!frame.eye) {
      return;
    }
    const { ctx, scale: s } = stage;
    const [ex, ey] = frame.eye;
    const paint = (lx: number, ly: number, w: number, color: string): void => {
      ctx.fillStyle = color;
      for (let x = lx; x < lx + w; x++) {
        const sx = flip ? SPRITE_SIZE - 1 - x : x;
        ctx.fillRect(rect.x + sx * s, rect.y + ly * s, s, s);
      }
    };
    const blinking = now >= this.nextBlinkAt;
    const eyeCenter = {
      x: buddy.x + (flip ? SPRITE_SIZE - ex - 1 : ex + 1),
      y: buddy.y + GROUND_ROW + 1 - (ey + 1.5),
    };
    const gaze = blinking ? undefined : this.settle(buddy.gaze(eyeCenter), now);
    if (!blinking && (!gaze || (gaze.x === 0 && gaze.y === 0))) {
      return;
    }
    for (let y = ey - 1; y <= ey + 2; y++) {
      paint(ex - 1, y, 4, bitmaps.colorOf('O'));
    }
    const pupil = bitmaps.colorOf('E');
    if (blinking || !gaze) {
      paint(ex - 1, ey + 1, 1, pupil);
      paint(ex, ey + 2, 2, pupil);
      paint(ex + 2, ey + 1, 1, pupil);
      return;
    }
    const x = ex + gaze.x;
    if (gaze.y === 1) {
      paint(x, ey + 1, 2, pupil);
      paint(x, ey + 2, 2, pupil);
      paint(x + 1, ey + 1, 1, PALETTE.W);
      return;
    }
    const top = ey + gaze.y;
    for (let y = top; y < top + 3; y++) {
      paint(x, y, 2, pupil);
    }
    paint(x + 1, top, 1, PALETTE.W);
  }

  private settle(target: Gaze | undefined, now: number): Gaze {
    const want = target ?? CENTER_GAZE;
    if (want.x !== this.wantedGaze.x || want.y !== this.wantedGaze.y) {
      this.wantedGaze = want;
      this.wantedSince = now;
    }
    const settled = now - this.wantedSince >= GAZE_DELAY_MS && now - this.shownSince >= GAZE_HOLD_MS;
    if (settled && (this.shownGaze.x !== this.wantedGaze.x || this.shownGaze.y !== this.wantedGaze.y)) {
      const step = (from: -1 | 0 | 1, to: -1 | 0 | 1): -1 | 0 | 1 => (from === to ? from : from === 0 ? to : 0);
      this.shownGaze = { x: step(this.shownGaze.x, this.wantedGaze.x), y: step(this.shownGaze.y, this.wantedGaze.y) };
      this.shownSince = now;
    }
    return this.shownGaze;
  }
}
