import type { AnimName } from '../sprites/fox/animations';
import type { Emote, Hat } from '../sprites/props';
import type { Buddy } from './buddy';
import type { WorldPoint } from './world';

export type Dir = 1 | -1;

/** Everything a buddy can be doing. Each one is described by a `StateDef` in one of the `features/` files. */
export type BuddyState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'sit'
  | 'lie'
  | 'groom'
  | 'stretch'
  | 'yawn'
  | 'sniff'
  | 'chaseTail'
  | 'lookAround'
  | 'dizzy'
  | 'hunt'
  | 'leave'
  | 'away'
  | 'arrive'
  | 'play'
  | 'sleep'
  | 'typing'
  | 'alert'
  | 'watch'
  | 'fetch'
  | 'bring'
  | 'await'
  | 'wave'
  | 'love'
  | 'happy'
  | 'celebrate'
  | 'sad'
  | 'petted'
  | 'touched'
  | 'zoomies'
  | 'intro'
  | 'trick'
  | 'beg'
  | 'snack'
  | 'doze'
  | 'drowsy'
  | 'toBed'
  | 'tidyBed'
  | 'hungry'
  | 'feast'
  | 'drink'
  | 'askBreak'
  | 'roll'
  | 'dig'
  | 'glass'
  | 'contemplate'
  | 'come'
  | 'nudge'
  | 'mousing'
  | 'mouseHello'
  | 'panic';

/** Likely next states, each with its odds. */
export type Weights = readonly (readonly [BuddyState, number])[];

export interface AnimRef {
  anim: AnimName;
  elapsed: number;
}

/** Where the pupils sit in their socket: x forward (+) or back (-), y up (-) or down (+). */
export interface Gaze {
  x: -1 | 0 | 1;
  y: -1 | 0 | 1;
}

/** All there is to know about one state. Everything is optional: a bare `{}` plays the animation of the same name. */
export interface StateDef {
  /** A state only gives way to one of the same or a higher priority (default 0). */
  priority?: number;
  /** Wanders at this speed, in sprite pixels per second, turning back at the edges. */
  speed?: number;
  /** Settled: it acts on its urges and reacts to typing. */
  calm?: true;
  /** Not calm, but its needs may still interrupt it. */
  free?: true;
  /** Nothing moves fast, so the view can be redrawn less often. */
  restful?: true;
  /** Turns its body and eyes toward what it is watching. */
  facesTarget?: true;
  /** Follows what it is watching with its eyes only. */
  gazes?: true;
  /** It is busy with the ball: it watches it, and the ball does not bounce off its body. */
  ballFocus?: true;
  /** May be outside the view, so its position is not kept inside. */
  offscreen?: true;
  /** Not drawn at all. */
  hidden?: true;
  /** Much less likely at night. */
  nightDamped?: true;
  /** What it tends to do afterwards; a common default applies when left out. */
  next?: Weights;
  /** How long it lasts when it comes up on its own (a few seconds when left out). */
  duration?(b: Buddy): number;
  /** Whether it can come up on its own right now. */
  available?(b: Buddy): boolean;
  /** Replaces the plain way of entering it when it comes up on its own. */
  begin?(b: Buddy): void;
  /** Runs every frame instead of just dropping back to the ground; return true once it has moved on to another state. */
  update?(b: Buddy, dt: number, dtMs: number): boolean | void;
  /** Runs when its time is up, instead of picking a next state. */
  finish?(b: Buddy): void;
  /** Animation to show, when it is not simply the one named like the state. */
  anim?(b: Buddy): AnimRef;
  /** Picture bubble above its head. */
  emote?(b: Buddy): Emote | undefined;
  /** Hat of its own; 'none' also keeps the party hat off. */
  hat?(b: Buddy): Hat | 'none' | undefined;
  /** Something of its own to watch, before the ball, a treat or the pointer. */
  focus?(b: Buddy): WorldPoint | undefined;
  /** Eyes following a script rather than a target. */
  scriptedGaze?(b: Buddy): Gaze | undefined;
}

/** One entry per state. A state that is not itself the name of an animation has to say which one it shows. */
export type StateDefs = {
  [S in BuddyState]: S extends AnimName ? StateDef : StateDef & Required<Pick<StateDef, 'anim'>>;
};

/** Something it wants to do as soon as it is calm; returns true when the urge was there. */
export type Urge = (b: Buddy) => boolean;

export function urge(wants: (b: Buddy) => boolean, act: (b: Buddy) => void): Urge {
  return (b) => {
    if (!wants(b)) {
      return false;
    }
    act(b);
    return true;
  };
}

/** A group of states that belong together, with what they need from the engine. */
export interface Feature {
  states: Partial<StateDefs>;
  /** Runs every frame, whatever the state. */
  tick?(b: Buddy, dtMs: number): void;
  /** Checked in order whenever it is calm; the first urge that is there wins. */
  urges?: readonly Urge[];
  /** Runs whenever a state is entered, to tidy up what the previous one left behind. */
  entered?(b: Buddy, state: BuddyState): void;
  /** Runs when a state is about to be cut short by another one. */
  interrupted?(b: Buddy): void;
}
