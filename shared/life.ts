// The fox's life with you, as it is saved: the facts of each day (how you looked after it, how long you were
// there), from which what it feels is worked out. Feelings are never saved: two machines that both wrote the
// facts can always be merged, and a new way of feeling can be tried on an old life. Everything here is pure.

/** Raised whenever the saved shape changes; `readLife` brings older ones up to date. */
export const LIFE_VERSION = 1;

/** A way of looking after it. */
export type Care = 'fed' | 'played' | 'petted' | 'treated';
/** Something it had to put up with. */
export type Slight = 'unfed' | 'unheard';

/** What happened between you on one day. */
export interface DayRecord {
  /** How many times you did each thing. */
  readonly cares: Partial<Record<Care, number>>;
  readonly slights: Partial<Record<Slight, number>>;
  /** Minutes you were there with its view open. */
  readonly presentMin: number;
  /** Cares that were switched off in the settings that day: they are not held against you. */
  readonly off: readonly Care[];
}

export interface Life {
  readonly version: number;
  /** The local date (YYYY-MM-DD) it came to live with you. */
  readonly born: string;
  /** The days kept one by one, by local date. */
  readonly days: Readonly<Record<string, DayRecord>>;
  /** What the days no longer kept had built up: its attachment at the end of `until`, and the most it ever was. */
  readonly past: { readonly attachment: number; readonly peak: number; readonly until?: string };
}

/** Days kept one by one; older ones are folded into `past`. */
const KEEP_DAYS = 90;
const DAY_MS = 86_400_000;

/** How much each thing counts in a day well spent together (they add up to 1). Being there is one of them. */
const WORTH: Record<Care | 'present', number> = { fed: 0.25, played: 0.25, petted: 0.2, treated: 0.05, present: 0.25 };
/** Being there counts in full from this many minutes. */
const PRESENT_FULL_MIN = 45;
/** A perfect day closes this share of the gap to full attachment: about a month of them to get there. */
const GAIN = 0.08;
/** Days away that cost nothing; then each one loses this share of what is above the floor. */
const GRACE_DAYS = 3;
const LOSS = 0.04;
/** It never forgets you: its attachment does not fall under this share of the most it ever was. */
const FLOOR = 0.3;
/** How much of yesterday's mood is still there in the morning, and what each slight takes from today's. */
const CARRIED = 1 / 3;
const SLIGHT_COST = 0.25;
const IGNORED_COST = 0.5;
/** How much of a slight each further care of a kind already given that day makes up for. */
const AMENDS = 0.5;

const CARES: readonly Care[] = ['fed', 'played', 'petted', 'treated'];
const SLIGHTS: readonly Slight[] = ['unfed', 'unheard'];
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

const EMPTY_DAY: DayRecord = { cares: {}, slights: {}, presentMin: 0, off: [] };
const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));
const dayNumber = (key: string): number => Math.round(Date.parse(`${key}T00:00:00Z`) / DAY_MS);
const keyOf = (day: number): string => new Date(day * DAY_MS).toISOString().slice(0, 10);

export function newLife(born: string): Life {
  return { version: LIFE_VERSION, born, days: {}, past: { attachment: 0, peak: 0 } };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isDay = (v: unknown): v is string => typeof v === 'string' && DAY_KEY.test(v);
const counts = <K extends string>(v: unknown, known: readonly K[]): Partial<Record<K, number>> =>
  Object.fromEntries(known.flatMap((kind) => (isRecord(v) && typeof v[kind] === 'number' && v[kind] > 0 ? [[kind, v[kind]]] : []))) as Partial<Record<K, number>>;

/**
 * What was saved, made sense of: brought up to this version, anything unreadable left out. `foreign` says it was
 * written by a newer Foxel (on another machine, say): it can be read as far as we understand it, and must not be
 * written back. `lost` says there was something there that could not be read at all.
 */
export function readLife(raw: unknown, born: string): { life: Life; foreign: boolean; lost: boolean } {
  if (raw === undefined || raw === null) {
    return { life: newLife(born), foreign: false, lost: false };
  }
  if (!isRecord(raw) || typeof raw.version !== 'number') {
    return { life: newLife(born), foreign: false, lost: true };
  }
  const days: Record<string, DayRecord> = {};
  for (const [key, value] of Object.entries(isRecord(raw.days) ? raw.days : {})) {
    if (isDay(key) && isRecord(value)) {
      days[key] = {
        cares: counts(value.cares, CARES),
        slights: counts(value.slights, SLIGHTS),
        presentMin: typeof value.presentMin === 'number' ? Math.max(0, value.presentMin) : 0,
        off: CARES.filter((care) => Array.isArray(value.off) && value.off.includes(care)),
      };
    }
  }
  const past = isRecord(raw.past) ? raw.past : {};
  const attachment = typeof past.attachment === 'number' ? clamp(past.attachment, 0, 1) : 0;
  return {
    life: {
      version: LIFE_VERSION,
      born: isDay(raw.born) && raw.born < born ? raw.born : born,
      days,
      past: { attachment, peak: typeof past.peak === 'number' ? clamp(past.peak, attachment, 1) : attachment, until: isDay(past.until) ? past.until : undefined },
    },
    foreign: raw.version > LIFE_VERSION,
    lost: false,
  };
}

const most = <K extends string>(a: Partial<Record<K, number>>, b: Partial<Record<K, number>>): Partial<Record<K, number>> => {
  const out: Partial<Record<K, number>> = { ...a };
  for (const key of Object.keys(b) as K[]) {
    out[key] = Math.max(a[key] ?? 0, b[key] ?? 0);
  }
  return out;
};

/**
 * Two copies of the same life, written apart (two windows, two machines), made one. Nothing either knows is lost:
 * a day keeps the most of each thing either saw. Merging twice, or in the other order, gives the same life.
 */
export function mergeLives(a: Life, b: Life): Life {
  const days: Record<string, DayRecord> = { ...a.days };
  for (const [key, theirs] of Object.entries(b.days)) {
    const ours = days[key];
    days[key] = ours
      ? { cares: most(ours.cares, theirs.cares), slights: most(ours.slights, theirs.slights), presentMin: Math.max(ours.presentMin, theirs.presentMin), off: ours.off.filter((care) => theirs.off.includes(care)) }
      : theirs;
  }
  // The copy that has folded more days away knows more of the past.
  const past = (b.past.until ?? '') > (a.past.until ?? '') ? b.past : a.past;
  const kept = Object.fromEntries(Object.entries(days).filter(([key]) => key > (past.until ?? '')));
  return { version: LIFE_VERSION, born: a.born < b.born ? a.born : b.born, days: kept, past };
}

const withDay = (life: Life, day: string, change: (record: DayRecord) => DayRecord): Life => ({ ...life, days: { ...life.days, [day]: change(life.days[day] ?? EMPTY_DAY) } });

/** You looked after it, on `day`. */
export const withCare = (life: Life, day: string, care: Care): Life => withDay(life, day, (r) => ({ ...r, cares: { ...r.cares, [care]: (r.cares[care] ?? 0) + 1 } }));
/** It had to put up with something, on `day`. */
export const withSlight = (life: Life, day: string, slight: Slight): Life => withDay(life, day, (r) => ({ ...r, slights: { ...r.slights, [slight]: (r.slights[slight] ?? 0) + 1 } }));
/** You were there for `minutes` more, on `day`; `off` are the cares switched off in the settings right now. */
export const withPresence = (life: Life, day: string, minutes: number, off: readonly Care[]): Life => withDay(life, day, (r) => ({ ...r, presentMin: r.presentMin + minutes, off: [...off] }));

/** How well a day was spent together, from 0 to 1, judged only on what could be done that day. */
export function dayWorth(record: DayRecord): number {
  const cares = CARES.filter((care) => !record.off.includes(care));
  const possible = WORTH.present + cares.reduce((sum, care) => sum + WORTH[care], 0);
  const earned = WORTH.present * Math.min(1, record.presentMin / PRESENT_FULL_MIN) + cares.reduce((sum, care) => sum + ((record.cares[care] ?? 0) > 0 ? WORTH[care] : 0), 0);
  return earned / possible;
}

const wasThere = (record: DayRecord | undefined): boolean => record !== undefined && (record.presentMin > 0 || Object.keys(record.cares).length > 0);

/** Lives through the days from the end of `past` to `today`, one by one: where its attachment ends up, and its peak. */
function lived(life: Life, today: string): { attachment: number; peak: number } {
  let { attachment, peak } = life.past;
  const keys = Object.keys(life.days).sort();
  const first = life.past.until !== undefined ? dayNumber(life.past.until) + 1 : keys.length > 0 ? dayNumber(keys[0]) : dayNumber(today);
  let away = 0;
  for (let day = first; day <= dayNumber(today); day++) {
    const record = life.days[keyOf(day)];
    if (wasThere(record)) {
      away = 0;
      attachment += GAIN * dayWorth(record) * (1 - attachment);
      peak = Math.max(peak, attachment);
    } else if (++away > GRACE_DAYS) {
      const floor = FLOOR * peak;
      attachment = floor + (attachment - floor) * (1 - LOSS);
    }
  }
  return { attachment, peak };
}

/** How attached to you it is on `today`, from 0 (it has just met you) to 1. */
export const attachmentOn = (life: Life, today: string): number => lived(life, today).attachment;

/** The most attached to you it has ever been, up to `today`: what it has reached is never taken back. */
export const peakOn = (life: Life, today: string): number => lived(life, today).peak;

/** Its mood on `day`, from -1 to 1: what the day has brought so far, and a little of the day before. */
export function moodOn(life: Life, day: string, carriedFrom = 3): number {
  const record = life.days[day] ?? EMPTY_DAY;
  const slights = Object.values(record.slights).reduce((sum: number, count) => sum + (count ?? 0), 0);
  const carried = carriedFrom > 0 ? CARRIED * moodOn(life, keyOf(dayNumber(day) - 1), carriedFrom - 1) : 0;
  // There all that time, and not one look at it: that weighs on it, until the first care of the day.
  const ignored = record.presentMin >= PRESENT_FULL_MIN && Object.keys(record.cares).length === 0 ? IGNORED_COST : 0;
  // Looking after it again, a second game, another treat, makes up for part of what it had to put up with.
  const again = Object.values(record.cares).reduce((sum: number, count) => sum + Math.max(0, (count ?? 0) - 1), 0);
  return clamp(carried + dayWorth(record) - SLIGHT_COST * Math.max(0, slights - AMENDS * again) - ignored, -1, 1);
}

/** How many days it is since you were last there, counted on `today`; undefined if you never were. */
export function daysAway(life: Life, today: string): number | undefined {
  const seen = Object.keys(life.days).filter((key) => key < today && wasThere(life.days[key])).sort().pop() ?? life.past.until;
  return seen === undefined ? undefined : dayNumber(today) - dayNumber(seen);
}

/** The same life with the days too old to keep folded into its past: what it holds stays small for ever. */
export function trimmed(life: Life, today: string): Life {
  const oldest = keyOf(dayNumber(today) - KEEP_DAYS);
  if (!Object.keys(life.days).some((key) => key < oldest)) {
    return life;
  }
  const until = keyOf(dayNumber(oldest) - 1);
  return { ...life, past: { ...lived(life, until), until }, days: Object.fromEntries(Object.entries(life.days).filter(([key]) => key >= oldest)) };
}
