import type { Session } from '../session';
import { asleep } from '../sim/features/rest';
import { moodLevel, type MoodLevel } from '../sim/tuning';
import { SPRITE_SIZE, type Frame, type Glyph } from '../sprites/frames';
import { DROP, NOTE, SAD_CLOUD, TWINKLE } from '../sprites/moods';
import type { Rect, Stage } from '../stage';
import type { Bitmaps } from './bitmaps';

/** How far above the middle of its head the tips of its ears are: what floats over it stays clear of them. */
const OVER_HEAD = 12;
/** A mark shows for this long: when its mood changes, and then only once in a long while. It comes and goes small. */
const SHOWN_MS = 2200;
const AGAIN_EVERY_MS = 75_000;
const GROWS_MS = 260;
/** A drop slides down this far while it shows; under the cloud, one falls now on one side, now on the other, this often. */
const DROP_SLIDES = 4;
const DRIP_MS = 700;
/** A note rises this high while it shows. */
const NOTE_RISES = 7;

/**
 * What says, by its head, that its mood has changed: a drop, a bigger one that slides down, then a little sad
 * cloud as its day gets worse; a twinkle, a note of a tune as it gets better. It shows once when the mood sets in, and then only once in a long
 * while: the rest of the time its mood is on its face.
 */
export class MoodMarks {
  private level: MoodLevel = 0;
  private since = 0;

  draw(stage: Stage, bitmaps: Bitmaps, session: Session, frame: Frame, rect: Rect, now: number): void {
    const { buddy, world } = session;
    // Not in its sleep, nor while a picture bubble has the place, nor when it is busy making up or coming in.
    const quiet = asleep(buddy) || buddy.emote() !== undefined || buddy.def.offscreen || buddy.state === 'makeUp';
    const level = quiet ? 0 : moodLevel(world.mood);
    if (level !== this.level) {
      this.level = level;
      this.since = now;
    }
    // How long this showing has been going on, if one is.
    const t = (now - this.since) % AGAIN_EVERY_MS;
    if (level === 0 || t >= SHOWN_MS) {
      return;
    }
    const [hx, hy] = frame.head;
    const flip = buddy.dir === -1;
    // Puts a mark with its middle `dx` ahead of the middle of its head and its foot `above` the tips of its ears.
    const put = (glyph: Glyph, dx: number, above: number): void => {
      const w = glyph[0].length;
      const left = (flip ? SPRITE_SIZE - hx - dx : hx + dx) - w / 2;
      const top = hy - OVER_HEAD - above - glyph.length;
      const x = Math.max(0, Math.min(rect.x + Math.round(left) * stage.scale, stage.width - w * stage.scale));
      const y = Math.max(0, rect.y + Math.round(top) * stage.scale);
      stage.ctx.drawImage(bitmaps.get(glyph), x, y, w * stage.scale, glyph.length * stage.scale);
    };
    const grown = t >= GROWS_MS && t < SHOWN_MS - GROWS_MS;
    // How far a drop has slid down since it showed.
    const slid = Math.round((t / SHOWN_MS) * DROP_SLIDES);
    switch (level) {
      case -1:
        // A little down: one small drop by its head.
        put(DROP[0], 7, -3 - (grown ? 1 : 0));
        break;
      case -2:
        // Sad: a full drop that slides down beside it.
        put(DROP[grown ? 1 : 0], 7, -2 - slid);
        break;
      case -3:
        // At its saddest: a little cloud over it, that lets a drop fall.
        put(SAD_CLOUD, -2, grown ? 2 : 1);
        if (grown) {
          put(DROP[0], -2 + (Math.floor(t / DRIP_MS) % 2), -slid);
        }
        break;
      case 1:
        put(TWINKLE[grown ? 1 : 0], 6, 0);
        break;
      case 2:
        put(NOTE, 7, Math.round((t / SHOWN_MS) * NOTE_RISES) - 2);
        break;
    }
  }
}
