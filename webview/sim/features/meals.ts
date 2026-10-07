import { mealAt } from '../../../shared/day';
import { BOWL_EAT_X, BOWL_SIT_X } from '../../sprites/fox/anchors';
import { ANIMATIONS, KIBBLE_MS } from '../../sprites/fox/animations';
import { SPRITE_SIZE, totalDuration } from '../../sprites/frames';
import { BOWL_CAPACITY } from '../../sprites/props';
import type { Buddy } from '../buddy';
import { urge, type Feature } from '../state';
import { FETCH_RUN_SPEED, FETCH_WALK_SPEED, WALK_SPEED } from '../tuning';
import { REACTION_MS } from './reactions';
import { YUM, perform, type TouchReaction } from './touch';

/** It licks its chops, then sees to its bowl. */
const FULL: TouchReaction = { ...YUM, then: 'sendOff' };

const SNACK_PORTION = 3;
const SIPS = 3;
const SIP_MS = 900;
const WATER_WALK = 24;
/** Once it is empty the fox sends its bowl off; if it has not after this long, the bird comes back for it. */
const BOWL_LEFT_MS = 9000;
/** When, as it bats its bowl, its paw meets it. */
const BAT_AT_MS = 460;
const BAT_MS = totalDuration(ANIMATIONS.bat);
/** Hungry for this long, it looks miserable. */
export const HUNGRY_SAD_MS = 3 * 60_000;

export class MealsMemory {
  hungry = false;
  hungerMs = 0;
  thirsty = false;
  feastMs = 0;
  drinkMs = 0;
  /** The bowl it is done with and sends off, and for how long it has been at it. */
  done: 'foodBowl' | 'waterBowl' = 'foodBowl';
  batMs = 0;
}

/** Fills the food bowl (bringing it out if needed); it then eats, kibble by kibble. */
export function fillBowl(b: Buddy): void {
  const bowl = b.world.foodBowl;
  if (!bowl.active) {
    bowl.show(b.x + b.offsetFor(BOWL_SIT_X), b.world.width, b.world.height, b.x + SPRITE_SIZE / 2);
  }
  if (bowl.amount === 0) {
    bowl.fill(mealAt(b.world.now) === 'snack' ? SNACK_PORTION : BOWL_CAPACITY);
  }
  startFeast(b);
}

export function startHungry(b: Buddy): void {
  if (!b.world.foodBowl.active) {
    b.world.foodBowl.show(b.x + b.offsetFor(BOWL_SIT_X), b.world.width, b.world.height, b.x + SPRITE_SIZE / 2);
  }
  if (b.world.foodBowl.amount > 0) {
    startFeast(b);
    return;
  }
  b.moving = false;
  b.tryEnter('hungry', Infinity);
}

// Sits by the empty bowl, rumbling, until someone fills it.
function updateHungry(b: Buddy, dt: number): void {
  b.moving = false;
  b.fall(dt);
  if (!b.meals.hungry) {
    b.enterNext('sit');
    return;
  }
  const bowl = b.world.foodBowl;
  const dir = bowl.centerX >= b.x + SPRITE_SIZE / 2 ? 1 : -1;
  if (b.walkTo(bowl.centerX - b.offsetFor(BOWL_SIT_X, dir), dir, FETCH_WALK_SPEED * dt)) {
    b.moving = true;
  }
}

function startFeast(b: Buddy): void {
  b.moving = false;
  b.meals.feastMs = 0;
  b.tryEnter('feast', Infinity);
}

function updateFeast(b: Buddy, dt: number): void {
  b.moving = false;
  b.fall(dt);
  const bowl = b.world.foodBowl;
  if (!bowl.active || bowl.amount === 0) {
    b.enterNext('sit');
    return;
  }
  const dir = bowl.centerX >= b.x + SPRITE_SIZE / 2 ? 1 : -1;
  if (b.walkTo(bowl.centerX - b.offsetFor(BOWL_EAT_X, dir), dir, FETCH_RUN_SPEED * dt)) {
    b.moving = true;
    return;
  }
  // The bird is still setting it down.
  if (!bowl.ready) {
    return;
  }
  b.meals.feastMs += dt * 1000;
  if (b.meals.feastMs < KIBBLE_MS) {
    return;
  }
  b.meals.feastMs -= KIBBLE_MS;
  bowl.amount--;
  if (bowl.amount === 0) {
    bowl.finish(BOWL_LEFT_MS);
    b.meals.hungry = false;
    b.meals.hungerMs = 0;
    b.meals.done = 'foodBowl';
    b.world.effects.push('fed');
    perform(b, FULL);
  }
}

export function startDrink(b: Buddy): void {
  const water = b.world.waterBowl;
  if (!water.active) {
    water.show(b.x + b.offsetFor(BOWL_EAT_X) + b.dir * WATER_WALK, b.world.width, b.world.height, b.x + SPRITE_SIZE / 2);
    water.fill(SIPS);
  }
  b.moving = false;
  b.meals.drinkMs = 0;
  b.tryEnter('drink', Infinity);
}

// Laps at the water bowl a few times: a little nudge for you to drink too.
function updateDrink(b: Buddy, dt: number): void {
  b.moving = false;
  b.fall(dt);
  const water = b.world.waterBowl;
  if (!water.active || water.amount === 0) {
    b.meals.thirsty = false;
    b.enterNext('sit');
    return;
  }
  const dir = water.centerX >= b.x + SPRITE_SIZE / 2 ? 1 : -1;
  if (b.walkTo(water.centerX - b.offsetFor(BOWL_EAT_X, dir), dir, FETCH_WALK_SPEED * dt)) {
    b.moving = true;
    return;
  }
  if (!water.ready) {
    return;
  }
  b.meals.drinkMs += dt * 1000;
  if (b.meals.drinkMs >= SIP_MS * (SIPS - water.amount + 1)) {
    water.amount--;
    if (water.amount === 0) {
      water.finish(BOWL_LEFT_MS);
      b.meals.thirsty = false;
      b.meals.done = 'waterBowl';
      perform(b, FULL);
    }
  }
}

// Done with its bowl, it sits down by it and bats it away with a paw: it slides off out of the view.
function updateSendOff(b: Buddy, dt: number, dtMs: number): void {
  const m = b.meals;
  const bowl = b.world[m.done];
  b.fall(dt);
  if (!bowl.visible) {
    b.enterNext(b.pickNext());
    return;
  }
  if (m.batMs === 0) {
    const dir = bowl.centerX >= b.x + SPRITE_SIZE / 2 ? 1 : -1;
    b.moving = b.walkTo(bowl.centerX - b.offsetFor(BOWL_SIT_X, dir), dir, WALK_SPEED * dt);
    if (b.moving) {
      return;
    }
  }
  m.batMs += dtMs;
  if (m.batMs >= BAT_AT_MS && m.batMs - dtMs < BAT_AT_MS) {
    bowl.push(b.dir);
  }
  if (m.batMs >= BAT_MS) {
    b.enterNext(b.pickNext());
  }
}

// Meals at set times and a drink now and then, each at its bowl.
export const mealsFeature = {
  states: {
    hungry: {
      priority: 2,
      restful: true,
      gazes: true,
      update: updateHungry,
      anim(b) {
        if (b.moving) {
          return { anim: 'walk', elapsed: b.elapsed };
        }
        return { anim: b.meals.hungerMs >= HUNGRY_SAD_MS ? 'hungrySad' : 'hungry', elapsed: b.elapsed };
      },
      emote: (b) => (b.pulse ? 'bowl' : undefined),
    },
    feast: {
      priority: 3,
      update: updateFeast,
      anim: (b) => (b.moving ? { anim: 'run', elapsed: b.elapsed } : { anim: 'eatBowl', elapsed: b.meals.feastMs }),
    },
    sendOff: {
      priority: 2,
      next: [['sit', 50], ['idle', 25], ['groom', 25]],
      begin(b) {
        b.meals.batMs = 0;
        b.moving = false;
        b.enter('sendOff', Infinity);
      },
      update: updateSendOff,
      anim: (b) => (b.moving ? { anim: 'walk', elapsed: b.elapsed } : { anim: 'bat', elapsed: b.meals.batMs }),
    },
    drink: {
      priority: 2,
      update: updateDrink,
      anim: (b) => ({ anim: b.moving ? 'walk' : 'drink', elapsed: b.elapsed }),
      emote: (b) => (b.moving || b.meals.drinkMs === 0 ? 'drop' : undefined),
    },
  },
  // Hunger passes, sadly, when the meal time ends with the bowl still empty.
  tick(b, dtMs) {
    const m = b.meals;
    if (!m.hungry) {
      return;
    }
    m.hungerMs += dtMs;
    const bowl = b.world.foodBowl;
    if (!mealAt(b.world.now) && !(bowl.amount > 0)) {
      m.hungry = false;
      bowl.hide();
      if (b.state === 'hungry') {
        b.tryEnter('sad', REACTION_MS.sad);
      }
    }
  },
  urges: [
    urge((b) => b.world.foodBowl.active && b.world.foodBowl.amount > 0, startFeast),
    urge((b) => b.meals.hungry, startHungry),
    urge((b) => b.meals.thirsty, startDrink),
  ],
} satisfies Feature;
