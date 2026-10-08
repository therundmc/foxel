import type { Buddy } from '../buddy';
import type { Feature } from '../state';
import { REACTION_MS } from './reactions';
import { asleep } from './rest';

/** It watches what is running for this long, then nods off; and after this long it gives up waiting. */
const WATCHES_MS = 60_000;
const WAIT_MAX_MS = 10 * 60_000;
/** While something worries it, it frets every so often, for a moment. */
const FRET_GAP_MS = [25_000, 45_000] as const;
const FRET_MS = 2000;

export class WorkMemory {
  /** Errors or conflicts remain: it cannot quite settle. */
  worried = false;
  /** Time left before it frets again. */
  fretInMs: number = FRET_GAP_MS[0];
}

/** Something of yours has been running for a while: it sits down and waits for it with you. */
export function startWaiting(b: Buddy): void {
  if (!asleep(b)) {
    b.tryEnter('waiting', WAIT_MAX_MS);
  }
}

/** What it was waiting for is over, however it went. */
export function stopWaiting(b: Buddy): void {
  if (b.state === 'waiting') {
    b.enterNext('sit');
  }
}

// Your work beyond typing: it waits with you for what takes long, and frets while something is wrong.
export const workFeature = {
  states: {
    waiting: {
      priority: 1,
      restful: true,
      gazes: true,
      next: [['lie', 60], ['sit', 40]],
      anim: (b) => ({ anim: b.elapsed < WATCHES_MS ? 'watch' : 'doze', elapsed: b.elapsed }),
    },
  },
  tick(b, dtMs) {
    const m = b.work;
    if (!m.worried || !b.def.calm) {
      return;
    }
    m.fretInMs -= dtMs;
    if (m.fretInMs <= 0) {
      m.fretInMs = b.between(FRET_GAP_MS[0], FRET_GAP_MS[1]);
      b.tryEnter('sad', Math.min(FRET_MS, REACTION_MS.sad));
    }
  },
} satisfies Feature;
