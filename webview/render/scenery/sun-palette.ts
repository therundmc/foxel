import { clamp01 } from './paint';

// The colours of the sunrise and the sunset. Each tone is keyed on a few stages of the sky and blended in
// between, so the whole picture turns together and never shows a fixed gradient with a disc pasted on it.

export type Rgb = readonly [number, number, number];
export type Mood = 'sunrise' | 'sunset';

export const blend = (a: Rgb, b: Rgb, amount: number): Rgb => {
  const k = clamp01(amount);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
};

export const css = (c: Rgb, alpha = 1): string => {
  const body = `${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])}`;
  return alpha >= 1 ? `rgb(${body})` : `rgba(${body},${Math.max(0, alpha).toFixed(3)})`;
};

/**
 * The stages every row below is keyed on. 0: the sky appears. 1: just before the great moment (never quite
 * reached while waiting). 2: the moment has passed (full light, or the afterglow). 3: the sky it ends on.
 */
const STAGES = [0, 0.5, 1, 1.5, 2, 3] as const;

export type ToneName =
  | 'skyTop' | 'skyHigh' | 'skyMid' | 'skyLow' | 'skyRim'
  | 'sun' | 'sunCore' | 'glow'
  | 'cloud' | 'cloudLit' | 'cloudShade'
  | 'far' | 'mid' | 'near' | 'ground' | 'haze' | 'rim' | 'sea' | 'bird';

export type Tones = Readonly<Record<ToneName, Rgb>>;

// Morning: the cool violet of the end of the night, a band that warms from rose to gold, then a pale, clear blue.
const SUNRISE: Record<ToneName, string> = {
  skyTop: '1a2152 263270 34509a 4168b4 4c82cc 58a0e4',
  skyHigh: '2c2f6e 45478c 6a6fb4 8290cc 93b0e0 8cc4f0',
  skyMid: '4f4488 7a5c9c b488b4 c8a8c8 c6c8e4 b8dcf4',
  skyLow: '86628f c47e96 f0a090 f8bc98 f8d8b0 e4eef0',
  skyRim: 'b89aa6 f0b09a ffc878 ffdc8c ffeeb4 fff6dc',
  sun: 'ff9a5a ffa85a ffc45a ffdc78 ffeea0 fff8d0',
  sunCore: 'ffc88a ffd08a ffe08a fff0a8 fff8cc ffffee',
  glow: 'c890a0 f0a088 ffb868 ffd070 ffe490 fff2c0',
  cloud: '3a3a78 5a5490 8a7cb0 a898c8 c0c0e0 e8f0fa',
  cloudLit: '8a6a9a e08a98 ffa890 ffc890 ffe4a8 ffffff',
  cloudShade: '2a2c66 45457e 6c6aa4 8a8cc0 a0b0d8 c4d8f0',
  far: '4a4a86 6a5e9a 8c7cb0 9a94c0 9cb0d0 98c0d8',
  mid: '34386e 474a84 575e96 5f72a0 5f8a9c 5c9c8a',
  near: '232a58 2d3566 354472 3a5878 3f6e6c 448a5c',
  ground: '161c40 1c2448 223050 284452 2e584c 34703f',
  haze: '8a80b0 b890b0 e0a8b0 f0c4b0 f8e0c8 f0f4f0',
  rim: 'b89aa6 f0b09a ffc878 ffe08c fff0b0 fff8d8',
  sea: '50709c 50709c 50709c 50709c 50709c 50709c',
  bird: '1c2046 242650 2c2e5c 33386a 3a4474 44547c',
};

// Evening: a dusty gold that deepens to orange and rose, flares once the sun is gone, and sinks into night blue.
const SUNSET: Record<ToneName, string> = {
  skyTop: '4c78b8 41609f 33468c 2a3478 202664 0e1436',
  skyHigh: '88a0c8 8684b4 7860a4 5e4c96 46408a 1a2050',
  skyMid: 'dcc0b8 dc9c9c c8648c b85090 9a4a94 3a2c6a',
  skyLow: 'fcd898 fcb070 f8845c f0686a e86080 7c3c74',
  skyRim: 'ffeeb0 ffcc6c ffa844 ff8c48 ff9460 d0685c',
  sun: 'ffe890 ffc85c ff9438 ff7030 ff5c38 ff5c38',
  sunCore: 'fffbe0 fff0a0 ffc860 ffa050 ff8858 ff8858',
  glow: 'ffe6a0 ffc468 ff9448 ff7650 ff6a78 b04c70',
  cloud: 'c8b4c0 b08cac 8c5c98 6c4890 54408a 1c2050',
  cloudLit: 'fff0c0 ffcc80 ff9a5c ff7a70 ff6c94 7a4480',
  cloudShade: '9c98c0 8470a8 5c4488 46387c 343070 121638',
  far: '8088b0 7468a0 5c4488 4a3878 3a2e6c 141838',
  mid: '8088b0 7468a0 5c4488 4a3878 3a2e6c 141838',
  near: '50644a 4c5048 40344e 342a4c 2a2448 10122c',
  ground: '3a4c38 363a3a 2c2640 241e3a 1c1a36 0a0c20',
  haze: 'e8c8a8 e0a088 c87080 a85c88 84508c 2c285c',
  rim: 'fff0b0 ffd070 ffa850 ff8858 ff8080 8a5078',
  sea: '50709c 4a5890 3c4080 303470 282c64 0c1230',
  bird: '3a3040 34283c 2a1c3c 241a3a 1c1634 080a1c',
};

const hex = (text: string): Rgb => [0, 2, 4].map((i) => parseInt(text.slice(i, i + 2), 16)) as unknown as Rgb;
const parse = (table: Record<ToneName, string>): Record<ToneName, Rgb[]> =>
  Object.fromEntries(Object.entries(table).map(([name, row]) => [name, row.split(' ').map(hex)])) as Record<ToneName, Rgb[]>;

const TABLES: Record<Mood, Record<ToneName, Rgb[]>> = { sunrise: parse(SUNRISE), sunset: parse(SUNSET) };
const NAMES = Object.keys(SUNRISE) as ToneName[];

/** Where `stage` falls between two keys: the index of the first one, and how far toward the next. */
function between(stage: number): readonly [number, number] {
  let i = 0;
  while (i < STAGES.length - 2 && stage >= STAGES[i + 1]) {
    i++;
  }
  return [i, clamp01((stage - STAGES[i]) / (STAGES[i + 1] - STAGES[i]))];
}

/** Every tone of the picture at this stage of the sky. */
export function tonesAt(mood: Mood, stage: number): Tones {
  const [i, k] = between(stage);
  const table = TABLES[mood];
  const tones = {} as Record<ToneName, Rgb>;
  for (const name of NAMES) {
    tones[name] = blend(table[name][i], table[name][i + 1], k);
  }
  return tones;
}

/** A number keyed on the same stages as the tones: how strong a glow is, how thick the mist... */
export function curve(values: readonly number[], stage: number): number {
  const [i, k] = between(stage);
  return values[i] + (values[i + 1] - values[i]) * k;
}
