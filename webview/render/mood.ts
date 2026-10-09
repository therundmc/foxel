import type { Session } from '../session';
import { asleep } from '../sim/features/rest';
import { moodLevel, type MoodLevel } from '../sim/tuning';
import { SPRITE_SIZE, type Frame, type Glyph } from '../sprites/frames';
import { BOLT, GLOOM, NOTE, TEMPER, TWINKLE } from '../sprites/moods';
import type { Rect, Stage } from '../stage';
import type { Bitmaps } from './bitmaps';

/** How far above the middle of its head the tips of its ears are: what floats over it stays clear of them. */
const OVER_HEAD = 12;
/** A mark that has just come, or changed, is small for this long first: nothing pops. */
const GROWS_MS = 260;
/** The cloud sways a pixel from side to side this often. */
const SWAY_MS = 520;
/** Annoyed: a wisp comes over its head this often, for this long. */
const WISP_EVERY_MS = 3800;
const WISP_MS = 1600;
/** Angry: its temple throbs this often, for this long; furious, it throbs all the time and the cloud flashes now and then. */
const THROB_EVERY_MS = 1500;
const THROB_MS = 850;
const PULSE_MS = 330;
const FLASH_EVERY_MS = 1900;
const FLASH_MS = 150;
/** Cheerful: a twinkle this often, for this long. Delighted: a note rises this often, for this long, this high. */
const TWINKLE_EVERY_MS = 4600;
const TWINKLE_MS = 700;
const NOTE_EVERY_MS = 2400;
const NOTE_MS = 1500;
const NOTE_RISES = 7;

/**
 * What shows by its head for the mood it is in, by degrees: nothing on an even day; a wisp of cloud, then a cloud
 * and a throbbing temple, then a storm, as its day gets worse; a twinkle, then a tune, as it gets better.
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
    if (level === 0) {
      return;
    }
    const t = now - this.since;
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
    const grown = t >= GROWS_MS;
    switch (level) {
      case -1: {
        const phase = t % WISP_EVERY_MS;
        if (phase < WISP_MS) {
          put(GLOOM[0], -3 + sway, phase < GROWS_MS || phase > WISP_MS - GROWS_MS ? 0 : 1);
        }
        break;
      }
      case -2:
        put(GLOOM[grown ? 1 : 0], -3 + sway, 1);
        if (grown && t % THROB_EVERY_MS < THROB_MS) {
          put(TEMPER[0], 6, -5);
        }
        break;
      case -3:
        put(GLOOM[grown ? 2 : 1], -3 + sway, 1);
        if (grown && t % FLASH_EVERY_MS < FLASH_MS) {
          put(BOLT, -4 + sway, -3);
        }
        if (grown) {
          put(TEMPER[Math.floor(t / PULSE_MS) % 2], 6, -5);
        }
        break;
      case 1: {
        const phase = t % TWINKLE_EVERY_MS;
        if (phase < TWINKLE_MS) {
          put(TWINKLE[phase < 160 || phase > TWINKLE_MS - 160 ? 0 : 1], 6, 0);
        }
        break;
      }
      case 2: {
        const phase = t % NOTE_EVERY_MS;
        if (phase < NOTE_MS) {
          // One note after another, now on one side, now on the other, rising as it goes.
          const side = Math.floor(t / NOTE_EVERY_MS) % 2 === 0 ? 7 : -6;
          put(NOTE, side, Math.round((phase / NOTE_MS) * NOTE_RISES) - 2);
        }
        if ((t + NOTE_EVERY_MS / 2) % TWINKLE_EVERY_MS < TWINKLE_MS) {
          put(TWINKLE[1], -8, 1);
        }
        break;
      }
    }
  }
}
