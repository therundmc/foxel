import { clamp01, ramp, type VistaView } from './paint';

// The air of a spring day, which everything here answers to: a breeze that comes and goes, and the one breath of
// wind of the great moment.

export const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));

export const hash = (a: number, b: number): number => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** How much breeze there is at `time`, from 0 to 1: never quite still, never the same for long. */
export const breezeAt = (time: number): number => clamp01(0.35 + 0.3 * Math.sin(time * 0.43 + 1) + 0.2 * Math.sin(time * 1.1));

/** How long the breath of wind takes to rise, and between when and when it dies down. */
const RISES_S = 0.5;
const DROPS_S = [1.6, 7] as const;
/** What is left of it afterwards: the afternoon stays a little windier. */
const LINGERS = 0.12;

/** The breath of wind of the great moment, from 0 to 1. */
export function gustOf({ moment }: VistaView): number {
  return moment === undefined ? 0 : ramp(moment, 0, RISES_S) * (1 - (1 - LINGERS) * ramp(moment, DROPS_S[0], DROPS_S[1]));
}
