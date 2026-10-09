import type * as vscode from 'vscode';
import { dateKey } from '../shared/day';
import { attachmentOn, peakOn, daysAway, mergeLives, moodOn, readLife, trimmed, withCare, withPresence, withSlight, type Care, type Life, type Slight } from '../shared/life';
import type { BuddyMemory } from '../shared/protocol';

/** Its life: follows you from one machine to another. */
export const LIFE_KEY = 'foxel.life';
/** What it needs right now: changes often and only means something here, so it stays on this machine. */
export const NEEDS_KEY = 'foxel.needs';
/** A life that could not be read is set aside here rather than thrown away. */
export const UNREADABLE_KEY = 'foxel.life.unreadable';

/** How often it looks whether there is something to write. */
const CHECK_EVERY_MS = 15_000;
/** Time spent together alone is written this seldom: every write of its life is one more thing for the editor to sync. */
const PRESENCE_SAVE_MS = 5 * 60_000;

/** What the editor gives to keep things in; the global one can say which of them follow you to other machines. */
export type Keep = vscode.Memento & { setKeysForSync?(keys: readonly string[]): void };

/**
 * The fox's life, kept for good. Several windows, and several machines, write it at once: every save first reads
 * what is there and merges with it, so nothing one of them noted is lost to another.
 */
export class LifeStore implements vscode.Disposable {
  private current: Life;
  /** Written by a newer Foxel than this one: we read it as far as we can and never write over it. */
  private foreign: boolean;
  /** Since when there has been something to write, and whether it should not wait. */
  private dirtySince: number | undefined;
  private urgent = false;
  private readonly timer: ReturnType<typeof setInterval>;

  constructor(
    private readonly keep: Keep,
    private readonly born: string,
    private readonly clock: () => Date,
  ) {
    keep.setKeysForSync?.([LIFE_KEY]);
    const raw = keep.get<unknown>(LIFE_KEY);
    const { life, foreign, lost } = readLife(raw, born);
    if (lost) {
      void keep.update(UNREADABLE_KEY, raw);
    }
    this.current = life;
    this.foreign = foreign;
    this.timer = setInterval(() => {
      if (this.urgent || (this.dirtySince !== undefined && Date.now() - this.dirtySince >= PRESENCE_SAVE_MS)) {
        void this.save();
      }
    }, CHECK_EVERY_MS);
  }

  /** Its life as far as anyone knows: what this window noted, and what the others have written. */
  get life(): Life {
    this.gather();
    return this.current;
  }

  /** How attached to you it is (0 to 1), its mood today (-1 to 1), and how many days it is since you were last there. */
  get feelings(): { attachment: number; peak: number; mood: number; daysAway: number | undefined } {
    const life = this.life;
    return { attachment: attachmentOn(life, this.today), peak: peakOn(life, this.today), mood: moodOn(life, this.today), daysAway: daysAway(life, this.today) };
  }

  /** What it needed when a view last noted it. */
  get needs(): BuddyMemory | undefined {
    const needs = this.keep.get<Partial<BuddyMemory>>(NEEDS_KEY);
    return typeof needs === 'object' && needs !== null && typeof needs.savedAt === 'number' ? (needs as BuddyMemory) : undefined;
  }

  noteNeeds(needs: BuddyMemory): void {
    void this.keep.update(NEEDS_KEY, needs);
  }

  care(care: Care): void {
    this.change(withCare(this.current, this.today, care), true);
  }

  slight(slight: Slight): void {
    this.change(withSlight(this.current, this.today, slight), true);
  }

  /** You were there with it for `minutes` more; `off` are the cares switched off in the settings. */
  present(minutes: number, off: readonly Care[]): void {
    this.change(withPresence(this.current, this.today, minutes, off), false);
  }

  /** Writes what this window noted, merged with what the others wrote in the meantime. */
  save(): Thenable<void> {
    if (this.dirtySince === undefined) {
      return Promise.resolve();
    }
    this.gather();
    this.dirtySince = undefined;
    this.urgent = false;
    if (this.foreign) {
      return Promise.resolve();
    }
    this.current = trimmed(this.current, this.today);
    return this.keep.update(LIFE_KEY, this.current);
  }

  dispose(): void {
    clearInterval(this.timer);
    void this.save();
  }

  private get today(): string {
    return dateKey(this.clock());
  }

  private gather(): void {
    const raw = this.keep.get<unknown>(LIFE_KEY);
    if (raw === this.current) {
      return;
    }
    const theirs = readLife(raw, this.born);
    // Once a newer Foxel has written it, on this machine or another, it is theirs to write.
    this.foreign ||= theirs.foreign;
    if (!theirs.lost) {
      this.current = mergeLives(this.current, theirs.life);
    }
  }

  private change(life: Life, urgent: boolean): void {
    this.current = life;
    this.dirtySince ??= Date.now();
    this.urgent ||= urgent;
  }
}
