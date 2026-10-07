import type { Reaction } from '../../../shared/protocol';
import type { Buddy } from '../buddy';
import type { Feature } from '../state';
import { startDrink, startHungry } from './meals';
import { goToSleep, startBreak, wakeUp } from './rest';

type TimedReaction = 'alert' | 'wave' | 'love' | 'happy' | 'celebrate' | 'sad' | 'panic';

export const REACTION_MS: Record<TimedReaction, number> = {
  alert: 1500,
  wave: 1800,
  love: 1800,
  happy: 1600,
  celebrate: 2000,
  sad: 2600,
  panic: 2400,
};
const TYPING_MS = 2500;
const NOTICE_MS = 900;
const HOP_HEIGHT = 3;
const HOP_PERIOD_MS = 360;

const timed = (state: TimedReaction) => (b: Buddy): void => b.tryEnter(state, REACTION_MS[state]);

// What each message from the editor does to it. The compiler asks for an entry here when the protocol gains a `Reaction`.
const HANDLERS: Record<Reaction, (b: Buddy) => void> = {
  wake(b) {
    b.rest.sleepy = false;
    b.rest.breakAsks = 0;
    wakeUp(b);
  },
  sleep(b) {
    b.rest.sleepy = true;
    goToSleep(b);
  },
  hungry(b) {
    if (!b.meals.hungry) {
      b.meals.hungry = true;
      b.meals.hungerMs = 0;
      if (b.free) {
        startHungry(b);
      }
    }
  },
  drink(b) {
    b.meals.thirsty = true;
    if (b.free) {
      startDrink(b);
    }
  },
  breakTime(b) {
    b.rest.breakWanted = true;
    startBreak(b);
  },
  typing(b) {
    if (b.state === 'typing') {
      b.elapsed = 0;
    } else if (b.def.calm) {
      b.tryEnter('typing', TYPING_MS);
    }
  },
  notice(b) {
    if (b.def.calm && b.state !== 'typing') {
      b.tryEnter('alert', NOTICE_MS);
    }
  },
  alert: timed('alert'),
  wave: timed('wave'),
  love: timed('love'),
  happy: timed('happy'),
  celebrate: timed('celebrate'),
  sad: timed('sad'),
  panic: timed('panic'),
};

export function react(b: Buddy, reaction: Reaction): void {
  HANDLERS[reaction](b);
}

// Little hops on the spot.
function hop(b: Buddy): void {
  const hop = Math.abs(Math.sin((Math.PI * b.elapsed) / HOP_PERIOD_MS));
  b.y = Math.min(HOP_HEIGHT, b.maxY) * hop;
}

export const reactionsFeature = {
  states: {
    typing: {
      priority: 2,
      calm: true,
      restful: true,
      anim: (b) => ({ anim: b.world.phase === 'night' ? 'typingSleepy' : 'typing', elapsed: b.elapsed }),
      emote: (b) => (b.world.phase === 'night' && b.pulse ? 'moon' : undefined),
    },
    alert: { priority: 2, gazes: true },
    wave: { priority: 3 },
    love: { priority: 3 },
    happy: { priority: 3, update: hop, anim: (b) => ({ anim: 'celebrate', elapsed: b.elapsed }) },
    celebrate: { priority: 3, update: hop },
    sad: { priority: 3 },
    panic: { priority: 4, speed: 45, finish: (b) => b.enterNext('dizzy') },
  },
} satisfies Feature;
