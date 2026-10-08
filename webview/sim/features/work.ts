import { ANIMATIONS, type AnimName } from '../../sprites/fox/animations';
import { totalDuration } from '../../sprites/frames';
import type { Buddy } from '../buddy';
import type { BuddyState, Feature } from '../state';
import { REACTION_MS } from './reactions';
import { asleep } from './rest';

/** What it is doing about your work, as far as ending it properly goes: each has its accessory to put away. */
type Scene = 'wait' | 'tower' | 'box' | 'cloud' | 'yarn' | 'debug' | 'point' | 'zone' | 'lantern' | 'helper';

/** One animation of a little script: played once, or over and over for a while when it is a loop. */
interface Step {
  readonly anim: AnimName;
  /** A loop: for how long at most. */
  readonly forMs?: number;
  /** A little jump while it plays: when it leaves the ground, for how long, how high. */
  readonly hop?: { readonly at: number; readonly air: number; readonly height: number };
  readonly scene?: Scene;
}

const once = (anim: AnimName, scene?: Scene): Step => ({ anim, scene });
const loop = (anim: AnimName, forMs: number, scene: Scene): Step => ({ anim, forMs, scene });

const MINUTE = 60_000;
/** It watches the hourglass for this long before it starts on a tower of pebbles, and waits this long in all. */
const HOURGLASS_MS = 40_000;
const WAIT_MAX_MS = 10 * MINUTE;
/** After this many failures in a row it hides under its box, for this long at most. */
const HIDES_AFTER = 3;
const HIDES_MS = 40_000;
/** How long it stays tangled, investigates, points or keeps its headband on if nothing tells it to stop. */
const LASTS_MS = 10 * MINUTE;
/** Under its cloud for this long, then the cloud drifts off; it is back after a pause while errors remain. */
const CLOUD_MS = 14_000;
const CLOUD_GAP_MS = [30_000, 60_000] as const;
const LANTERN_MS = [20_000, 40_000] as const;
/** From this hour on, a commit is followed by a yawn. */
const LATE_HOUR = 21;
const TADA: Step = { anim: 'tada', hop: { at: 250, air: 400, height: 5 } };

/** How each scene is brought to a close when something else comes up: the accessory goes away, it does not vanish. */
const CLOSING: Record<Scene, readonly Step[]> = {
  wait: [once('hourglassOut')],
  tower: [once('towerDone')],
  box: [once('boxLeave')],
  cloud: [once('cloudOut')],
  yarn: [once('untangle')],
  debug: [once('detectiveOut')],
  point: [],
  zone: [once('zoneOut')],
  lantern: [once('lanternOut')],
  helper: [once('glassesOff')],
};

export class WorkMemory {
  /** Errors or conflicts remain: it cannot quite settle. A great many, and its cloud is a heavy one. */
  worried = false;
  heavy = false;
  /** A merge is in conflict: it is the yarn it is caught in, not a cloud. */
  conflict = false;
  debugging = false;
  /** Time left before its cloud comes back. */
  cloudInMs = 0;
  /** Failures in a row. */
  failures = 0;
  /** What it does once its script is over, when not just whatever comes next. */
  after: BuddyState | undefined;
  /** What it is playing: the steps, which one, and for how long. */
  steps: readonly Step[] = [];
  at = 0;
  stepMs = 0;
}

const lengthOf = (step: Step): number => {
  const one = totalDuration(ANIMATIONS[step.anim]);
  return step.forMs === undefined ? one : Math.ceil(step.forMs / one) * one;
};

/** The scene it is in the middle of, if any. */
const sceneOf = (b: Buddy): Scene | undefined => (b.state === 'acting' ? b.work.steps[b.work.at]?.scene : undefined);

/** Plays these steps from now on, dropping what it was playing. */
function play(b: Buddy, steps: readonly Step[]): void {
  if (steps.length === 0) {
    if (b.state === 'acting') {
      b.enterNext(b.pickNext());
    }
    return;
  }
  const m = b.work;
  m.steps = steps;
  m.at = 0;
  m.stepMs = 0;
  if (b.state !== 'acting') {
    b.tryEnter('acting', Infinity);
  }
}

/** Does this next: whatever scene it was in is closed first, properly. Asleep, it does nothing. */
function then(b: Buddy, steps: readonly Step[], closing?: readonly Step[]): void {
  if (asleep(b)) {
    return;
  }
  const scene = sceneOf(b);
  play(b, [...(closing ?? (scene ? CLOSING[scene] : [])), ...steps]);
}

/** A short reaction it already has, unless it is asleep or in the middle of a scene. */
function briefly(b: Buddy, state: BuddyState, ms?: number): void {
  if (!asleep(b) && b.state !== 'acting') {
    b.tryEnter(state, ms ?? b.ambientDuration(state));
  }
}

const underCloud = (b: Buddy): readonly Step[] => [once('cloudIn', 'cloud'), loop(b.work.heavy ? 'cloudHeavy' : 'cloudy', CLOUD_MS, 'cloud'), once('cloudOut')];
const investigating: readonly Step[] = [once('detectiveIn', 'debug'), loop('detective', LASTS_MS, 'debug'), once('detectiveOut')];

/** At night, now and then, it sets a little lantern down and sits by it for a while. */
function startLantern(b: Buddy): void {
  play(b, [once('lanternIn', 'lantern'), loop('lantern', b.between(LANTERN_MS[0], LANTERN_MS[1]), 'lantern'), once('lanternOut')]);
}

/** What each piece of news about your work does to it. */
export const WORK = {
  commit(b: Buddy): void {
    b.work.failures = 0;
    then(b, [once('plantFlag')]);
    // Late in the evening, that was enough for today.
    b.work.after = b.world.now.getHours() >= LATE_HOUR ? 'yawn' : undefined;
  },
  firstCommit(b: Buddy): void {
    b.work.failures = 0;
    then(b, [once('plantFlag'), TADA]);
  },
  // Work put aside is a bone buried; taken out again, a bone dug up and something to be proud of.
  stash: (b: Buddy): void => then(b, [once('dig')]),
  unstash: (b: Buddy): void => then(b, [once('dig'), once('proud'), once('proud')]),
  scrollUp: (b: Buddy): void => b.world.scrolled(-1),
  scrollDown: (b: Buddy): void => b.world.scrolled(1),
  scrollSpree: (b: Buddy): void => briefly(b, 'dizzy'),
  // A breakpoint is a spot marked with a paw; when they are all gone, it tidies up.
  breakpoint: (b: Buddy): void => then(b, [once('bat')]),
  breakpointsGone: (b: Buddy): void => then(b, [once('shove')]),
  paste: (b: Buddy): void => then(b, [once('catchParcel')]),
  push: (b: Buddy): void => then(b, [once('sendLetter')]),
  conflict(b: Buddy): void {
    b.work.conflict = true;
    then(b, [once('tangleIn', 'yarn'), loop('tangled', LASTS_MS, 'yarn'), once('untangle')]);
  },
  resolved(b: Buddy): void {
    b.work.conflict = false;
    if (sceneOf(b) === 'yarn') {
      play(b, [once('untangle')]);
    } else if (!asleep(b)) {
      b.tryEnter('happy', REACTION_MS.happy);
    }
  },
  failed(b: Buddy): void {
    const m = b.work;
    m.failures++;
    if (sceneOf(b) === 'tower') {
      // The tower it built while waiting comes down with the build.
      play(b, [once('towerFalls')]);
    } else if (m.failures >= HIDES_AFTER) {
      then(b, [once('boxHide', 'box'), loop('boxPeek', HIDES_MS, 'box'), once('boxLeave')]);
    } else {
      then(b, [once('flinch')]);
    }
  },
  done(b: Buddy): void {
    b.work.failures = 0;
    then(b, [TADA]);
  },
  stopped(b: Buddy): void {
    const scene = sceneOf(b);
    if (scene === 'wait' || scene === 'tower') {
      play(b, CLOSING[scene]);
    }
  },
  waiting(b: Buddy): void {
    then(b, [
      once('hourglassIn', 'wait'),
      loop('hourglassWait', HOURGLASS_MS, 'wait'),
      once('hourglassOut'),
      once('stackPebbles', 'tower'),
      loop('towerAdmire', WAIT_MAX_MS, 'tower'),
      once('towerDone'),
    ]);
  },
  worry(b: Buddy): void {
    b.work.worried = true;
    b.work.heavy = false;
  },
  overwhelmed(b: Buddy): void {
    b.work.worried = true;
    b.work.heavy = true;
  },
  atEase(b: Buddy): void {
    b.work.worried = false;
    b.work.heavy = false;
    if (sceneOf(b) === 'cloud') {
      play(b, [once('cloudClears')]);
    } else if (!asleep(b)) {
      b.tryEnter('happy', REACTION_MS.happy);
    }
  },
  progress(b: Buddy): void {
    if (b.def.calm) {
      play(b, [once('encouraged')]);
    }
  },
  debugging(b: Buddy): void {
    b.work.debugging = true;
    then(b, investigating);
  },
  paused: (b: Buddy): void => then(b, [loop('pointing', LASTS_MS, 'point')], sceneOf(b) === 'debug' ? [] : undefined),
  resumed(b: Buddy): void {
    if (sceneOf(b) === 'point') {
      play(b, b.work.debugging ? investigating : []);
    }
  },
  debugDone(b: Buddy): void {
    b.work.debugging = false;
    const scene = sceneOf(b);
    if (scene === 'debug' || scene === 'point') {
      play(b, CLOSING[scene]);
    }
  },
  focused(b: Buddy): void {
    if (b.def.calm) {
      play(b, [once('zoneIn', 'zone'), loop('inTheZone', LASTS_MS, 'zone'), once('zoneOut')]);
    }
  },
  unfocused(b: Buddy): void {
    if (sceneOf(b) === 'zone') {
      play(b, CLOSING.zone);
    }
  },
  // Someone else writes your code for a while: it puts its glasses on and supervises.
  helper: (b: Buddy): void => then(b, [once('glassesOn', 'helper'), loop('supervise', LASTS_MS, 'helper'), once('glassesOff')]),
  helperDone(b: Buddy): void {
    if (sceneOf(b) === 'helper') {
      play(b, CLOSING.helper);
    }
  },
  // Smaller news, told with what it already knows how to do.
  pulled: (b: Buddy): void => briefly(b, 'happy', REACTION_MS.happy),
  branch: (b: Buddy): void => briefly(b, 'jump'),
  undoSpree: (b: Buddy): void => briefly(b, 'dizzy'),
  newFile: (b: Buddy): void => briefly(b, 'sniff'),
  goneFile: (b: Buddy): void => briefly(b, 'wave', REACTION_MS.wave),
  reunion: (b: Buddy): void => briefly(b, 'love', REACTION_MS.love),
};

function updateActing(b: Buddy, dt: number, dtMs: number): void {
  const m = b.work;
  let step = m.steps[m.at];
  m.stepMs += dtMs;
  if (step && m.stepMs >= lengthOf(step)) {
    m.at++;
    m.stepMs = 0;
    step = m.steps[m.at];
  }
  if (!step) {
    b.y = 0;
    const after = m.after;
    m.after = undefined;
    b.enterNext(after ?? b.pickNext());
    return;
  }
  const hop = step.hop;
  const p = hop ? (m.stepMs - hop.at) / hop.air : -1;
  if (hop && p > 0 && p < 1) {
    b.y = 4 * Math.min(hop.height, Math.max(0, b.maxY)) * p * (1 - p);
  } else {
    b.fall(dt);
  }
}

// Your work beyond typing: it marks your commits, waits with you for what takes long, hides when things keep
// failing, frets under a cloud of its own while errors remain, and investigates with you when you debug.
export const workFeature = {
  states: {
    acting: {
      priority: 3,
      free: true,
      next: [['sit', 60], ['idle', 40]],
      update: updateActing,
      anim(b) {
        const step = b.work.steps[b.work.at] ?? b.work.steps[b.work.steps.length - 1];
        return { anim: step?.anim ?? 'sit', elapsed: b.work.stepMs };
      },
    },
    lantern: {
      // Not straight after another scene: it has just put one accessory away.
      available: (b) => b.world.phase === 'night' && b.state !== 'acting',
      begin: startLantern,
      anim: (b) => ({ anim: 'lantern', elapsed: b.elapsed }),
    },
  },
  tick(b, dtMs) {
    const m = b.work;
    // While errors remain, and no yarn has it already, its cloud comes back every so often.
    if (!m.worried || m.conflict || !b.def.calm) {
      return;
    }
    m.cloudInMs -= dtMs;
    if (m.cloudInMs <= 0) {
      m.cloudInMs = CLOUD_MS + b.between(CLOUD_GAP_MS[0], CLOUD_GAP_MS[1]);
      play(b, underCloud(b));
    }
  },
} satisfies Feature;
