import type { Session } from '../session';
import { asleep } from '../sim/features/rest';
import { moodLevel, type MoodLevel } from '../sim/tuning';
import { SPRITE_SIZE, type Frame, type Glyph } from '../sprites/frames';
import { BOLT, GLOOM, NOTE, TEMPER, TWINKLE } from '../sprites/moods';
import type { Rect, Stage } from '../stage';
import type { Bitmaps } from './bitmaps';

/** How far above the middle of its head the tips of its ears are: what floats over it stays clear of them. */
const OVER_HEAD = 12;
/** A mark shows for this long: when its mood changes, and then only once in a long while. It comes and goes small. */
const SHOWN_MS = 2200;
const AGAIN_EVERY_MS = 75_000;
const GROWS_MS = 260;
/** The cloud sways a pixel from side to side this often; in the worst of them, its temple throbs and the cloud flashes once. */
const SWAY_MS = 520;
const PULSE_MS = 330;
const FLASH_AT_MS = 900;
const FLASH_MS = 150;
/** A note rises this high while it shows. */
const NOTE_RISES = 7;

/**
 * What says, by its head, that its mood has changed: a wisp of cloud, a cloud, a storm as its day gets worse; a
 * twinkle, a note of a tune as it gets better. It shows once when the mood sets in, and then only once in a long
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
    const sway = Math.floor(t / SWAY_MS) % 2;
    const grown = t >= GROWS_MS && t < SHOWN_MS - GROWS_MS;
    switch (level) {
      case -1:
        put(GLOOM[0], -3 + sway, grown ? 1 : 0);
        break;
      case -2:
        put(GLOOM[grown ? 1 : 0], -3 + sway, 1);
        break;
      case -3:
        put(GLOOM[grown ? 2 : 1], -3 + sway, 1);
        if (t >= FLASH_AT_MS && t < FLASH_AT_MS + FLASH_MS) {
          put(BOLT, -4 + sway, -3);
        }
        if (grown) {
          put(TEMPER[Math.floor(t / PULSE_MS) % 2], 6, -5);
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
