import { DOODLE, FINDS, MOUND, type FindKind } from '../../sprites/props';
import type { Box } from '../math';

/** Where the things you accepted are kept, in its corner on the left: the first one's place, and the room each takes. */
const KEPT_X = 2;
const KEPT_STEP = 7;
/** How many it keeps there for the day. */
export const KEPT_MOST = 4;
/** Accepted, a find hops to its corner: how long it is in the air, and how high it goes. */
const HOP_MS = 700;
const HOP_HEIGHT = 16;

/** What it brings you: the one it is carrying or has set down, and the ones you accepted today. */
export class Finds {
  /** In its mouth, set down in front of you, or on its way to the corner once accepted. */
  offered: { kind: FindKind; x: number; y: number; state: 'carried' | 'down' | 'hopping' } | undefined;
  readonly kept: FindKind[] = [];
  private hop = { from: 0, ms: 0 };

  get moving(): boolean {
    return this.offered !== undefined && this.offered.state !== 'down';
  }

  get room(): boolean {
    return this.kept.length < KEPT_MOST && !this.offered;
  }

  /** Where the one being offered is. */
  get box(): Box | undefined {
    const o = this.offered;
    return o && { x: o.x, y: o.y, w: FINDS[o.kind][0].length, h: FINDS[o.kind].length };
  }

  /** Where a kept one sits, by its place in the row. */
  keptBox(index: number): Box {
    const glyph = FINDS[this.kept[index]];
    return { x: KEPT_X + index * KEPT_STEP, y: 0, w: glyph[0].length, h: glyph.length };
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

  /** You accepted it: it hops over to its place in the corner. */
  accept(): void {
    if (this.offered?.state === 'down') {
      this.offered.state = 'hopping';
      this.hop = { from: this.offered.x, ms: 0 };
    }
  }

  /** It takes it away again, out of the view. */
  gone(): void {
    this.offered = undefined;
  }

  update(dtMs: number): void {
    const o = this.offered;
    if (o?.state !== 'hopping') {
      return;
    }
    this.hop.ms += dtMs;
    const p = Math.min(1, this.hop.ms / HOP_MS);
    const to = KEPT_X + this.kept.length * KEPT_STEP;
    o.x = this.hop.from + (to - this.hop.from) * p;
    o.y = 4 * HOP_HEIGHT * p * (1 - p);
    if (p === 1) {
      this.kept.push(o.kind);
      this.offered = undefined;
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
