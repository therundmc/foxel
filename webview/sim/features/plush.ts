import type { PlushKind } from '../../sprites/props';
import type { Buddy } from '../buddy';
import type { Plush } from '../props/plush';
import type { AnimRef, Feature } from '../state';
import { FETCH_FAR, FETCH_RUN_SPEED, FETCH_WALK_SPEED } from '../tuning';
import { tookBreak } from './rest';

/** How long it lies against its teddy. */
const CUDDLE_MS = 4500;
/** The duck: how many times it boops it, how long a boop lasts, and how the duck hops away from its nose. */
const BOOPS = 3;
const BOOP_MS = 400;
const HOP_SPEED = 16;
const HOP_HEIGHT = 30;
const PLUSH_MAX_MS = 40_000;

export class PlushMemory {
  /** The soft toy it is busy with. */
  toy: PlushKind = 'teddy';
  /** Got to it, and for how long it has been at it. */
  with = false;
  withMs = 0;
  boops = 0;
}

const plush = (b: Buddy, kind: PlushKind): Plush => b.world.plushes[kind];

/** You hold a soft toy: out of the chest, or picked up from where it lay. */
export function holdPlush(b: Buddy, kind: PlushKind, x: number, y: number): void {
  plush(b, kind).hold(x, y, b.world.width, b.world.height);
}

/** You let go of it, your hand moving at this speed: it goes to it as soon as it can. */
export function tossPlush(b: Buddy, kind: PlushKind, vx: number, vy: number): void {
  if (plush(b, kind).state !== 'held') {
    return;
  }
  plush(b, kind).toss(vx, vy);
  goTo(b, kind);
  b.tryEnter('plush', PLUSH_MAX_MS);
}

/** You put it back in the chest. */
export function stowPlush(b: Buddy, kind: PlushKind): void {
  plush(b, kind).state = 'none';
}

function goTo(b: Buddy, kind: PlushKind): void {
  const m = b.plush;
  m.toy = kind;
  m.with = false;
  m.withMs = 0;
  m.boops = 0;
}

/** The soft toy lying nearest to it, if any. */
function lying(b: Buddy): Plush | undefined {
  return Object.values(b.world.plushes)
    .filter((toy) => toy.landed)
    .sort((one, other) => Math.abs(one.center - b.x) - Math.abs(other.center - b.x))[0];
}

function updatePlush(b: Buddy, dt: number, dtMs: number): void {
  const m = b.plush;
  const toy = plush(b, m.toy);
  b.moving = false;
  b.fall(dt);
  if (toy.state !== 'free') {
    // You took it back.
    b.enterNext('sit');
    return;
  }
  if (!toy.landed) {
    b.faceX(toy.center, 3);
    return;
  }
  if (!m.with) {
    const target = b.noseTargetFor(toy.center);
    b.running = Math.abs(target - b.x) > FETCH_FAR;
    b.moving = b.approach(target, (b.running ? FETCH_RUN_SPEED : FETCH_WALK_SPEED) * dt);
    m.with = !b.moving;
    return;
  }
  m.withMs += dtMs;
  if (m.toy === 'teddy') {
    if (m.withMs >= CUDDLE_MS) {
      tookBreak(b);
      b.enterNext('lie');
    }
  } else if (m.withMs >= BOOP_MS) {
    // A boop with its nose, and the duck hops off: it goes after it again.
    if (++m.boops >= BOOPS) {
      tookBreak(b);
      b.enterNext('sit');
      return;
    }
    const away = toy.center < b.world.width / 2 ? 1 : -1;
    toy.toss(away * HOP_SPEED, HOP_HEIGHT);
    m.with = false;
    m.withMs = 0;
  }
}

function plushAnim(b: Buddy): AnimRef {
  const m = b.plush;
  if (!m.with) {
    return { anim: b.moving ? (b.running ? 'run' : 'walk') : 'watch', elapsed: b.elapsed };
  }
  return m.toy === 'teddy' ? { anim: 'cuddle', elapsed: m.withMs } : { anim: 'pounce', elapsed: m.withMs };
}

// Its soft toys: it lies down against its teddy, and boops its duck along with its nose.
export const plushFeature = {
  states: {
    plush: {
      priority: 2,
      nightDamped: true,
      available: (b) => lying(b) !== undefined,
      begin(b) {
        const toy = lying(b);
        if (toy) {
          goTo(b, toy.kind);
          b.enter('plush', PLUSH_MAX_MS);
        } else {
          b.enter('sit', b.ambientDuration('sit'));
        }
      },
      update: updatePlush,
      anim: plushAnim,
    },
  },
} satisfies Feature;
