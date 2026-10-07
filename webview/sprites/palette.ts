import type { Coat } from '../../shared/protocol';

export const TRANSPARENT = '.';

export const PALETTE: Readonly<Record<string, string>> = {
  K: '#3a2418',
  O: '#f39a3d',
  o: '#c8702a',
  c: '#fff1d6',
  d: '#5a3420',
  p: '#f6a6b2',
  r: '#ff7f8f',
  E: '#1e1a2e',
  W: '#ffffff',
  M: '#7a2a2a',
  C: '#6fc3ff',
  Z: '#cfd8ff',
  H: '#fff3a8',
  L: '#ff4f7a',
  S: '#ffd84a',
  Q: '#e8e8e8',
  V: '#b07cf0',
  B: '#cde83a',
  b: '#93ad24',
  Y: '#f8f8ec',
  y: '#c8d0a4',
  g: '#efff9e',
  T: '#d99a52',
  t: '#a8672f',
  h: '#f6cf94',
  A: '#e0525c',
  a: '#a8353f',
  k: '#8a5a2e',
  U: '#4fb3c9',
  u: '#2f7f94',
  w: '#8ee3ff',
  I: '#5a6fd6',
  i: '#3c4ea8',
  X: '#ffd23f',
  x: '#ffae2b',
  G: '#f6f0c8',
  q: '#d6cc98',
  J: '#fff6c4',
};

// Fur letters only; everything else keeps the base palette.
export const COATS: Readonly<Record<Coat, Readonly<Record<string, string>>>> = {
  red: {},
  arctic: { O: '#f2f5fb', o: '#c3cde0', c: '#ffffff', d: '#8e9ab3' },
  silver: { O: '#8f95a6', o: '#62687a', c: '#e6e8ef', d: '#2c2f3b' },
  fennec: { O: '#e6c08a', o: '#c0955a', c: '#fff5e0', d: '#9c6a36' },
};

/** Emote and sky letters keep their colour whatever the light, the fox does not. */
export const UNTINTED = new Set(['X', 'x', 'G', 'q', 'J', 'Z', 'W', 'Q']);
