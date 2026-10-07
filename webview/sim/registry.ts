import { ambientFeature } from './features/ambient';
import { fetchFeature } from './features/fetch';
import { huntFeature } from './features/hunt';
import { introFeature } from './features/intro';
import { mealsFeature } from './features/meals';
import { playFeature } from './features/play';
import { reactionsFeature } from './features/reactions';
import { restFeature } from './features/rest';
import { touchFeature } from './features/touch';
import { treatFeature } from './features/treat';
import { tricksFeature } from './features/tricks';
import type { Feature, StateDefs, Urge } from './state';

// The order matters where features share a hook: earlier urges win, earlier ticks run first.
export const FEATURES: readonly Feature[] = [
  ambientFeature,
  reactionsFeature,
  huntFeature,
  fetchFeature,
  tricksFeature,
  playFeature,
  touchFeature,
  treatFeature,
  mealsFeature,
  restFeature,
  introFeature,
];

/** Every state, gathered from the features. The compiler complains here when a `BuddyState` has no definition. */
export const STATES: StateDefs = {
  ...ambientFeature.states,
  ...reactionsFeature.states,
  ...huntFeature.states,
  ...fetchFeature.states,
  ...tricksFeature.states,
  ...playFeature.states,
  ...touchFeature.states,
  ...treatFeature.states,
  ...mealsFeature.states,
  ...restFeature.states,
  ...introFeature.states,
};

export const URGES: readonly Urge[] = FEATURES.flatMap((f) => f.urges ?? []);
