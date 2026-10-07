import { ambientFeature } from './features/ambient';
import { contemplateFeature } from './features/contemplate';
import { fetchFeature } from './features/fetch';
import { huntFeature } from './features/hunt';
import { introFeature } from './features/intro';
import { mealsFeature } from './features/meals';
import { mousingFeature } from './features/mousing';
import { playFeature } from './features/play';
import { pointerFeature } from './features/pointer';
import { reactionsFeature } from './features/reactions';
import { restFeature } from './features/rest';
import { touchFeature } from './features/touch';
import { treatFeature } from './features/treat';
import { tricksFeature } from './features/tricks';
import { visitorsFeature } from './features/visitors';
import type { Feature, StateDefs, Urge } from './state';

// The order matters where features share a hook: earlier urges win, earlier ticks run first.
export const FEATURES: readonly Feature[] = [
  ambientFeature,
  reactionsFeature,
  huntFeature,
  visitorsFeature,
  mousingFeature,
  fetchFeature,
  tricksFeature,
  playFeature,
  touchFeature,
  pointerFeature,
  treatFeature,
  mealsFeature,
  restFeature,
  contemplateFeature,
  introFeature,
];

/** Every state, gathered from the features. The compiler complains here when a `BuddyState` has no definition. */
export const STATES: StateDefs = {
  ...ambientFeature.states,
  ...reactionsFeature.states,
  ...huntFeature.states,
  ...visitorsFeature.states,
  ...mousingFeature.states,
  ...fetchFeature.states,
  ...tricksFeature.states,
  ...playFeature.states,
  ...touchFeature.states,
  ...pointerFeature.states,
  ...treatFeature.states,
  ...mealsFeature.states,
  ...restFeature.states,
  ...contemplateFeature.states,
  ...introFeature.states,
};

export const URGES: readonly Urge[] = FEATURES.flatMap((f) => f.urges ?? []);
