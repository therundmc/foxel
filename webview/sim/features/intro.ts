import type { Greeting } from '../../../shared/protocol';
import { PEEK_DUCK_MS, PEEK_HAPPY_MS, PEEK_LOOK_MS, PEEK_RETURN_MS } from '../../sprites/fox/animations';
import { SPRITE_SIZE } from '../../sprites/frames';
import type { Buddy } from '../buddy';
import type { Feature, Gaze } from '../state';
import { REACTION_MS } from './reactions';
import { GOOD_NIGHT, MORNING, perform } from './touch';

// Only the head shows past the edge while peeking.
const PEEK_HIDDEN = 15;
const PEEK_DUCK = 5;
const PEEK_SLIDE_MS = 150;
const PEEK_MS = PEEK_LOOK_MS + PEEK_DUCK_MS + PEEK_RETURN_MS + PEEK_HAPPY_MS;
const INTRO_SPEED = 26;
const GREET_AGAIN_MS = 12 * 60 * 60_000;
// Looking around while peeking: up, back, down.
const PEEK_GLANCES: readonly (readonly [number, Gaze])[] = [
  [500, { x: 0, y: -1 }],
  [800, { x: -1, y: 0 }],
  [PEEK_LOOK_MS, { x: 0, y: 1 }],
];

export class IntroMemory {
  phase: 'peek' | 'enter' = 'peek';
  peekX = 0;
  targetX = 0;
  /** When it last gave each welcome, by the world's clock. */
  greeted: Partial<Record<Greeting, number>> = {};
}

/** First appearance: pokes its head in from an edge, looks around, then trots in to say hello. */
export function startIntro(b: Buddy): void {
  const fromLeft = b.world.random() < 0.5;
  b.dir = fromLeft ? 1 : -1;
  b.intro.peekX = fromLeft ? -PEEK_HIDDEN : b.world.width - SPRITE_SIZE + PEEK_HIDDEN;
  b.x = b.intro.peekX;
  b.intro.targetX = b.maxX * (0.25 + 0.5 * b.world.random());
  b.placed = true;
  b.intro.phase = 'peek';
  b.enter('intro', Infinity);
}

function updateIntro(b: Buddy, dt: number): void {
  if (b.intro.phase === 'enter') {
    b.running = true;
    if (!b.walkTo(b.intro.targetX, b.dir, INTRO_SPEED * dt)) {
      greet(b);
    }
    return;
  }
  const duckAt = PEEK_LOOK_MS;
  const backAt = duckAt + PEEK_DUCK_MS;
  const t = b.elapsed;
  let out = 0;
  if (t >= duckAt && t < backAt) {
    out = Math.min(1, (t - duckAt) / PEEK_SLIDE_MS);
  } else if (t >= backAt && t < backAt + PEEK_RETURN_MS) {
    out = 1 - (t - backAt) / PEEK_RETURN_MS;
  }
  b.x = b.intro.peekX - b.dir * PEEK_DUCK * out;
  if (t >= PEEK_MS) {
    b.x = b.intro.peekX;
    b.intro.phase = 'enter';
    b.elapsed = 0;
  }
}

// Says hello the way the moment calls for: party, good morning, good night, or a plain wave.
function greet(b: Buddy): void {
  const welcome = welcomeDue(b);
  switch (welcome) {
    case 'party':
      b.world.effects.push('confetti');
      b.enter('celebrate', REACTION_MS.celebrate);
      break;
    case 'morning':
      perform(b, MORNING);
      break;
    case 'night':
      perform(b, GOOD_NIGHT);
      break;
    default:
      welcome satisfies undefined;
      b.enter('wave', REACTION_MS.wave);
  }
}

// The big welcome is for the first time it sees you; coming back in a moment later, a wave will do.
function welcomeDue(b: Buddy): Greeting | undefined {
  const phase = b.world.phase;
  const welcome: Greeting | undefined = b.world.party
    ? 'party'
    : phase === 'dawn' || phase === 'morning'
      ? 'morning'
      : phase === 'evening' || phase === 'night'
        ? 'night'
        : undefined;
  if (!welcome) {
    return undefined;
  }
  const now = b.world.now.getTime();
  const last = b.intro.greeted[welcome];
  if (last !== undefined && Math.abs(now - last) < GREET_AGAIN_MS) {
    return undefined;
  }
  b.intro.greeted[welcome] = now;
  return welcome;
}

export const introFeature = {
  states: {
    intro: {
      priority: 3,
      offscreen: true,
      update(b, dt) {
        updateIntro(b, dt);
        return true;
      },
      anim: (b) => ({ anim: b.intro.phase === 'peek' ? 'peek' : 'run', elapsed: b.elapsed }),
      scriptedGaze: (b) =>
        b.intro.phase === 'peek' ? PEEK_GLANCES.find(([until]) => b.elapsed < until)?.[1] : undefined,
    },
  },
} satisfies Feature;
