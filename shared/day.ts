export type DayPhase = 'dawn' | 'morning' | 'lunch' | 'afternoon' | 'evening' | 'night';
export type Meal = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export type LightTint = 'day' | 'golden' | 'night';
export type Party = 'friday' | 'anniversary';

const at = (hours: number, minutes = 0): number => hours * 60 + minutes;
const minuteOfDay = (date: Date): number => date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;

const PHASES: readonly (readonly [DayPhase, number])[] = [
  ['night', at(6)],
  ['dawn', at(9)],
  ['morning', at(11, 30)],
  ['lunch', at(14)],
  ['afternoon', at(17, 30)],
  ['evening', at(21, 30)],
];

export function dayPhase(date: Date): DayPhase {
  const m = minuteOfDay(date);
  return PHASES.find(([, until]) => m < until)?.[0] ?? 'night';
}

/** Meal windows, in minutes of the day. */
const MEALS: readonly (readonly [Meal, number, number])[] = [
  ['breakfast', at(7), at(9, 30)],
  ['lunch', at(11, 30), at(14)],
  ['snack', at(16), at(17)],
  ['dinner', at(18, 30), at(20, 30)],
];

export function mealAt(date: Date): Meal | undefined {
  const m = minuteOfDay(date);
  return MEALS.find(([, from, to]) => m >= from && m < to)?.[0];
}

export function lightTint(date: Date): LightTint {
  const m = minuteOfDay(date);
  if (m < at(6) || m >= at(21)) {
    return 'night';
  }
  return m < at(7, 30) || m >= at(18, 30) ? 'golden' : 'day';
}

/** A sky the fox may sit down and contemplate. */
export type Vista =
  | 'sunrise'
  | 'dunes'
  | 'clouds'
  | 'blossom'
  | 'wheat'
  | 'rain'
  | 'sunset'
  | 'train'
  | 'stars'
  | 'fireflies'
  | 'snow';

/** The skies of each time of day, each with its odds: weather comes less often than a clear sky. */
export type VistaOdds = readonly (readonly [Vista, number])[];
const NIGHT_SKIES: VistaOdds = [['stars', 1], ['fireflies', 1], ['snow', 0.6]];
const VISTAS: readonly (readonly [number, VistaOdds])[] = [
  [at(6), NIGHT_SKIES],
  [at(9), [['sunrise', 1], ['dunes', 1]]],
  [at(17, 30), [['clouds', 1], ['blossom', 1], ['wheat', 1], ['rain', 0.6]]],
  [at(21), [['sunset', 1], ['train', 1]]],
];

/** The skies there are to look at, at this time of day. */
export function vistasAt(date: Date): VistaOdds {
  const m = minuteOfDay(date);
  return VISTAS.find(([until]) => m < until)?.[1] ?? NIGHT_SKIES;
}

export function dateKey(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Friday afternoon, or the yearly anniversary of the day Foxel was installed. */
export function partyKind(date: Date, installedOn: string | undefined): Party | undefined {
  if (installedOn && installedOn.slice(5) === dateKey(date).slice(5) && installedOn.slice(0, 4) < String(date.getFullYear())) {
    return 'anniversary';
  }
  return date.getDay() === 5 && date.getHours() >= 15 ? 'friday' : undefined;
}

/** The current time, with the hour optionally forced for testing (hidden `foxel.debugHour` setting). */
export function clockAt(debugHour: number | undefined, now = new Date()): Date {
  if (debugHour === undefined || !Number.isFinite(debugHour)) {
    return now;
  }
  const forced = new Date(now);
  const hours = ((Math.floor(debugHour) % 24) + 24) % 24;
  const fraction = debugHour - Math.floor(debugHour);
  if (fraction === 0) {
    forced.setHours(hours);
  } else {
    forced.setHours(hours, Math.round(fraction * 60));
  }
  return forced;
}
