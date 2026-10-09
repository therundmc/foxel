import { DOODLE, FINDS, MOUND, type FindKind } from '../../sprites/props';
import type { Box } from '../math';

/** A little bird that brings it something: how fast it flies, how high, and how fast what it lets go of falls. */
const BIRD_SPEED = 46;
const BIRD_HEIGHT = 30;
const FLAP_MS = 130;
const GRAVITY = 150;

/**
 * What it is bringing you: in its mouth, set down in front of you, or still on its way to it: falling from the
 * claws of a little bird. Once you have accepted it, it goes into the box of keepsakes.
 */
export class Finds {
  offered: { kind: FindKind; x: number; y: number; state: 'carried' | 'down' | 'falling' | 'flown' } | undefined;
  /** The bird that brings one: where it is, which way it flies, its wings. */
  bird: { x: number; y: number; dir: 1 | -1; wingsUp: boolean } | undefined;
  private dropAt = 0;
  private vy = 0;
  private flownMs = 0;

  get moving(): boolean {
    return this.bird !== undefined || (this.offered !== undefined && this.offered.state !== 'down');
  }

  /** Where the one being offered is. */
  get box(): Box | undefined {
    const o = this.offered;
    return o && { x: o.x, y: o.y, w: FINDS[o.kind][0].length, h: FINDS[o.kind].length };
  }

  /** In its mouth, its middle at this point. */
  carry(kind: FindKind, centerX: number, centerY: number): void {
    const glyph = FINDS[kind];
    this.offered = { kind, x: centerX - glyph[0].length / 2, y: Math.max(0, centerY - glyph.length / 2), state: 'carried' };
  }

  /** Set down on the ground where it is. */
  setDown(): void {
    if (this.offered) {
      this.offered.state = 'down';
      this.offered.y = 0;
    }
  }

  /** A bird flies in from the left with one in its claws, to let it go over `x`. */
  flyIn(kind: FindKind, x: number): void {
    this.bird = { x: -12, y: BIRD_HEIGHT, dir: 1, wingsUp: true };
    this.dropAt = x;
    this.vy = 0;
    this.flownMs = 0;
    this.offered = { kind, x: this.bird.x, y: BIRD_HEIGHT - FINDS[kind].length, state: 'flown' };
  }

  /** It is gone: taken away again, or into the box of keepsakes. */
  gone(): void {
    this.offered = undefined;
  }

  update(dtMs: number, worldWidth: number): void {
    const dt = dtMs / 1000;
    const o = this.offered;
    const bird = this.bird;
    if (bird) {
      this.flownMs += dtMs;
      bird.x += bird.dir * BIRD_SPEED * dt;
      bird.wingsUp = Math.floor(this.flownMs / FLAP_MS) % 2 === 0;
      if (o?.state === 'flown') {
        // In its claws, until it is over the spot.
        o.x = bird.x + 1;
        o.y = bird.y - FINDS[o.kind].length + 1;
        if (bird.x >= this.dropAt) {
          o.state = 'falling';
        }
      }
      if (bird.x > worldWidth + 12) {
        this.bird = undefined;
      }
    }
    if (o?.state === 'falling') {
      this.vy -= GRAVITY * dt;
      o.y = Math.max(0, o.y + this.vy * dt);
      if (o.y === 0) {
        o.state = 'down';
      }
    }
  }
}

/**
 * A mark on the ground that comes little by little, stays a while and goes the same way: the heart it scratches in
 * the earth for you, the mound it leaves where it dug. `stage` says how much of it shows, as an index into its glyphs.
 */
export class Mark {
  x: number | undefined;
  private ageMs = 0;

  constructor(
    private readonly glyphs: readonly (readonly string[])[],
    private readonly comesMs: number,
    private readonly staysMs: number,
    private readonly goesMs: number,
  ) {}

  get there(): boolean {
    return this.x !== undefined;
  }

  /** Still coming, or going: it changes from frame to frame. */
  get moving(): boolean {
    return this.there && (this.ageMs < this.comesMs || this.ageMs > this.comesMs + this.staysMs);
  }

  /** Which of its glyphs shows, or undefined when nothing does yet. */
  get stage(): number | undefined {
    if (this.x === undefined) {
      return undefined;
    }
    const going = this.ageMs - this.comesMs - this.staysMs;
    const share = going > 0 ? 1 - going / this.goesMs : Math.min(1, this.ageMs / this.comesMs);
    const stage = Math.ceil(share * this.glyphs.length) - 1;
    return stage < 0 ? undefined : Math.min(this.glyphs.length - 1, stage);
  }

  get box(): Box | undefined {
    const stage = this.stage;
    if (this.x === undefined || stage === undefined) {
      return undefined;
    }
    const glyph = this.glyphs[stage];
    return { x: this.x - glyph[0].length / 2, y: 0, w: glyph[0].length, h: glyph.length };
  }

  /** Starts to appear, its middle at `x`. */
  begin(x: number): void {
    this.x = x;
    this.ageMs = 0;
  }

  /** There already, as it was left, with all its time ahead of it. */
  restore(x: number): void {
    this.x = x;
    this.ageMs = this.comesMs;
  }

  update(dtMs: number): void {
    if (this.x === undefined) {
      return;
    }
    this.ageMs += dtMs;
    if (this.ageMs >= this.comesMs + this.staysMs + this.goesMs) {
      this.x = undefined;
    }
  }
}

/** The heart it scratches in the earth: a couple of seconds to draw, a few minutes there, then the wind takes it. */
export const newDoodle = (): Mark => new Mark(DOODLE, 1800, 4 * 60_000, 8000);
/** The mound where it dug: it rises as it digs, stays twenty minutes, then settles. */
export const newMound = (): Mark => new Mark(MOUND, 1600, 20 * 60_000, 6000);
