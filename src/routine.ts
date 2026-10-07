import type * as vscode from 'vscode';
import { dateKey, mealAt, type Meal } from '../shared/day';
import type { Reaction } from '../shared/protocol';
import type { BuddyConfig } from './config';
import type { ActivityWatcher } from './events';

const CHECK_MS = 15_000;
const BREAK_REPEAT_MS = 15 * 60_000;
const FED_KEY = 'foxel.fed';

interface FedToday {
  date: string;
  meals: Meal[];
}

/** The fox's daily needs: meals at set times, a break after long work, a drink now and then. */
export class Routine implements vscode.Disposable {
  private readonly timer: ReturnType<typeof setInterval>;
  private hungerSentFor: string | undefined;
  private lastBreakNudge = 0;
  private lastDrink = Date.now();

  constructor(
    private readonly watcher: ActivityWatcher,
    private readonly state: vscode.Memento,
    private readonly config: () => BuddyConfig,
    private readonly clock: () => Date,
    private readonly react: (reaction: Reaction) => void,
  ) {
    this.timer = setInterval(() => this.check(), CHECK_MS);
  }

  dispose(): void {
    clearInterval(this.timer);
  }

  /** A freshly shown view does not know yet that the fox is hungry. */
  viewReady(): void {
    this.hungerSentFor = undefined;
    this.check();
  }

  fed(): void {
    const now = this.clock();
    const meal = mealAt(now);
    if (meal && !this.fedMeals(now).includes(meal)) {
      void this.state.update(FED_KEY, { date: dateKey(now), meals: [...this.fedMeals(now), meal] } satisfies FedToday);
    }
  }

  private check(): void {
    if (this.watcher.asleep) {
      return;
    }
    const config = this.config();
    this.checkMeal(config);
    this.checkBreak(config);
    this.checkDrink(config);
  }

  private checkMeal(config: BuddyConfig): void {
    const now = this.clock();
    const meal = mealAt(now);
    if (!config.meals || !meal || this.fedMeals(now).includes(meal)) {
      return;
    }
    const key = `${dateKey(now)}:${meal}`;
    if (this.hungerSentFor !== key) {
      this.hungerSentFor = key;
      this.react('hungry');
    }
  }

  private checkBreak(config: BuddyConfig): void {
    const now = Date.now();
    const limitMs = config.breakReminderMinutes * 60_000;
    if (limitMs <= 0 || now - this.watcher.workingSince < limitMs) {
      return;
    }
    if (now - this.lastBreakNudge >= BREAK_REPEAT_MS || this.lastBreakNudge < this.watcher.workingSince) {
      this.lastBreakNudge = now;
      this.react('breakTime');
    }
  }

  private checkDrink(config: BuddyConfig): void {
    const now = Date.now();
    const everyMs = config.hydrationReminderMinutes * 60_000;
    if (everyMs > 0 && now - this.lastDrink >= everyMs) {
      this.lastDrink = now;
      this.react('drink');
    }
  }

  private fedMeals(now: Date): Meal[] {
    const fed = this.state.get<FedToday>(FED_KEY);
    return fed?.date === dateKey(now) ? fed.meals : [];
  }
}
