import { SPRITE_SIZE } from '../../sprites/frames';
import type { PlushKind } from '../../sprites/props';
import type { Buddy } from '../buddy';
import type { AnimRef, Feature } from '../state';
import { urge } from '../state';
import { stageFor } from '../unlocks';
import { carrying, dropBall } from './fetch';
import { carryInMouth } from './mouth';
import { asleep } from './rest';

/** What it brings in its mouth to mark each stage: its ball, then its soft toys; later, only the picture. */
const BRINGS: readonly (PlushKind | 'ball' | undefined)[] = ['ball', 'duck', 'teddy'];
const TROT = 16;
const OUT_MS = 1800;
const SHOW_MS = 1500;
const HOP_MS = 320;
const HOP = 5;
const PROUD_MS = 1300;
/** Wary of you: how near your pointer it dares come, how slowly, how long it sniffs toward it, and how far it then backs off. */
const WARY_GAP = 30;
const WARY_SPEED = 6;
const SNIFF_MS = 1800;
const WARY_REST_MS = 9000;

type Step = 'leave' | 'out' | 'bring' | 'show' | 'proud';

export class GrowthMemory {
  /** The stage it is marking, and where it is with that. */
  marking = 0;
  step: Step = 'leave';
  stepMs = 0;
  targetX = 0;
  /** Wary: where it is heading, whether it has got there, and how long since it last dared. */
  waryX = 0;
  sniffing = false;
  sinceWaryMs = WARY_REST_MS;
}

function step(b: Buddy, to: Step): void {
  b.growth.step = to;
  b.growth.stepMs = 0;
}

const toy = (b: Buddy): PlushKind | 'ball' | undefined => BRINGS[b.growth.marking];

// What it brings is in its mouth.
function takeUp(b: Buddy): void {
  const what = toy(b);
  if (what === 'ball') {
    b.world.ball.state = 'mouth';
  } else if (what) {
    carryInMouth(b, b.world.plushes[what]);
  }
}

/** Marks the next stage: it goes and gets what comes with it, shows it to you, and a picture of the day goes into its box of keepsakes. */
export function startMilestone(b: Buddy, stage: number, at: Step = 'leave'): void {
  b.growth.marking = stage;
  b.growth.targetX = Math.min(b.maxX, b.world.width * (0.3 + 0.25 * b.world.random()));
  step(b, at);
  b.enter('milestone', Infinity);
  if (at !== 'leave') {
    // Already here with it: this is where it shows it.
    b.growth.targetX = b.x;
    takeUp(b);
  }
}

function updateMilestone(b: Buddy, dt: number, dtMs: number): boolean {
  const m = b.growth;
  const what = toy(b);
  const walk = (to: number, arrival: 1 | -1): boolean => {
    const pace = TROT * dt;
    b.moving = Math.abs(to - b.x) > pace;
    b.dir = b.moving ? (to > b.x ? 1 : -1) : arrival;
    b.x = b.moving ? b.x + b.dir * pace : to;
    return !b.moving;
  };
  b.moving = false;
  m.stepMs += dtMs;
  if (what && what !== 'ball' && b.world.plushes[what].state === 'carried') {
    carryInMouth(b, b.world.plushes[what]);
  }
  switch (m.step) {
    case 'leave':
      if (walk(-SPRITE_SIZE, -1)) {
        step(b, 'out');
      }
      break;
    case 'out':
      if (m.stepMs >= OUT_MS) {
        b.dir = 1;
        takeUp(b);
        step(b, 'bring');
      }
      break;
    case 'bring':
      if (walk(m.targetX, 1)) {
        step(b, 'show');
        // It puts it down in front of you, and from now on it is part of its life.
        if (what === 'ball') {
          dropBall(b);
        } else if (what) {
          b.world.plushes[what].toss(b.dir * 8, 12);
        }
        b.world.stage = Math.max(b.world.stage, m.marking);
        b.world.effects.push('confetti');
      }
      break;
    case 'show':
      b.y = Math.min(HOP, b.maxY) * Math.abs(Math.sin((m.stepMs / HOP_MS) * Math.PI));
      if (m.stepMs >= SHOW_MS) {
        b.y = 0;
        // And a picture of the day goes into the box of keepsakes.
        b.world.album.keep({ picture: m.marking }, b.x + SPRITE_SIZE / 2, 20);
        step(b, 'proud');
      }
      break;
    case 'proud':
      if (m.stepMs >= PROUD_MS) {
        b.enterNext('sit');
      }
      break;
  }
  return true;
}

function milestoneAnim(b: Buddy): AnimRef {
  const m = b.growth;
  if (m.step === 'show') {
    return { anim: 'celebrate', elapsed: m.stepMs };
  }
  if (m.step === 'proud') {
    return { anim: 'proud', elapsed: m.stepMs };
  }
  return b.moving ? carrying(b) : { anim: 'idle', elapsed: b.elapsed };
}

/** Wary of you still, it dares come and sniff toward your pointer, from a distance. Returns whether it set off. */
export function approachWarily(b: Buddy, x: number): boolean {
  const m = b.growth;
  if (m.sinceWaryMs < WARY_REST_MS) {
    return false;
  }
  const side = x >= b.x + SPRITE_SIZE / 2 ? 1 : -1;
  m.waryX = Math.min(b.maxX, Math.max(0, x - side * WARY_GAP - b.noseOffset(side)));
  m.sniffing = false;
  m.sinceWaryMs = 0;
  b.dir = side;
  b.tryEnter('wary', Infinity);
  return b.state === 'wary';
}

function updateWary(b: Buddy, dt: number): boolean {
  const m = b.growth;
  b.fall(dt);
  b.moving = false;
  if (!m.sniffing) {
    const left = m.waryX - b.x;
    const pace = WARY_SPEED * dt;
    // Already nearer than it dares: it stays where it is, it does not back away.
    if (left * b.dir <= pace) {
      m.sniffing = true;
      b.elapsed = 0;
    } else {
      b.x += b.dir * pace;
      b.moving = true;
    }
    return true;
  }
  if (b.elapsed >= SNIFF_MS) {
    b.enterNext('sit');
  }
  return true;
}

// The stages of your life together: what marks each one, and how wary it is of you before the first.
export const growthFeature = {
  states: {
    milestone: { priority: 3, offscreen: true, update: updateMilestone, anim: milestoneAnim },
    wary: {
      priority: 1,
      update: updateWary,
      anim: (b) => (b.growth.sniffing ? { anim: 'sniff', elapsed: b.elapsed } : { anim: 'walk', elapsed: b.elapsed }),
    },
  },
  tick(b, dtMs) {
    b.growth.sinceWaryMs += dtMs;
  },
  urges: [
    // One stage at a time, as soon as it has a quiet moment.
    urge(
      (b) => !asleep(b) && b.world.stage < stageFor(b.world.peak),
      (b) => startMilestone(b, b.world.stage + 1),
    ),
  ],
  // Called away on its way back with something: it drops it there, and will mark the stage another time.
  interrupted(b) {
    if (b.state === 'milestone') {
      b.y = 0;
      Object.values(b.world.plushes).forEach((plush) => plush.state === 'carried' && plush.toss(0, 0));
    }
  },
} satisfies Feature;
