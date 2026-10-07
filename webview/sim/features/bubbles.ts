import { NOSE_HEIGHT } from '../../sprites/fox/anchors';
import { ANIMATIONS, type AnimName } from '../../sprites/fox/animations';
import { SPRITE_SIZE, totalDuration } from '../../sprites/frames';
import type { Buddy } from '../buddy';
import { clamp } from '../math';
import type { Bubble } from '../props/bubbles';
import { urge, type Feature } from '../state';
import { FETCH_RUN_SPEED } from '../tuning';
import { STRIKES, type Strike, type StrikeName } from './bubbleStrikes';
import { asleep, tookBreak } from './rest';

/**
 * What it is doing with the bubbles: it has just seen them, watches for one to go for, gets into place under it,
 * gathers itself, strikes; then sneezes at the soap, pulls a face at its taste, wonders how it missed, shakes
 * itself dry; holds the last one on its nose, and is pleased with itself when they are all gone.
 */
type Phase = 'spot' | 'watch' | 'chase' | 'wiggle' | 'strike' | 'sneeze' | 'bleh' | 'puzzled' | 'offer' | 'shake' | 'cheer';

const PLAY_MAX_MS = 120_000;
const SPOT_MS = 500;
/** How long it wonders about a bubble it missed. */
const PUZZLED_MS = 800;
/** A breath between two strikes; none when it is on a run of them. */
const WATCH_MS = 220;
const WIGGLE_MS = 260;
/** It trots the last few pixels, and runs when the bubble is any farther. */
const TROT_SPEED = 20;
const TROT_WITHIN = 8;
/** Once in place, a bubble that has drifted this far has to be followed again. */
const DRIFTED = 4;
/** How often a bubble bobs out of the way just as it jumps. */
const MISS_CHANCE = 0.12;
const DODGE = [20, 30] as const;
/** After this many bursts in one game it is wet enough to shake itself at the end. */
const SOAKED = 6;
/** How long the last bubble sits on its nose before it bursts, and how high above it. */
const HOLD_MS = 1700;
const ON_NOSE = 3;
/** A bubble this close to its nose bursts, whatever it is doing. */
const NOSE_REACH = 2.5;
/** Bubbles this close to one another are a cluster: worth a spin. */
const CLUSTER = 13;
/** The same way of bursting them twice running is this much less likely. */
const AGAIN = 0.15;

/** What the phases that are a single animation show, and for how long. */
const SHOWS: Partial<Record<Phase, AnimName>> = { spot: 'alert', sneeze: 'sneeze', bleh: 'bleh', puzzled: 'puzzled', shake: 'shakeDry', cheer: 'proud' };
const lastsOf = (phase: Phase): number => (phase === 'spot' ? SPOT_MS : phase === 'puzzled' ? PUZZLED_MS : totalDuration(ANIMATIONS[SHOWS[phase] ?? 'alert']));

export class BubblesMemory {
  phase: Phase = 'spot';
  phaseMs = 0;
  /** The bubble it is after, and how it means to burst it. */
  target: Bubble | undefined;
  strike: StrikeName = 'nose';
  /** Where it stands for that, and facing which way. */
  stance = 0;
  facing: 1 | -1 = 1;
  from = 0;
  height = 0;
  /** Whether it burst one with this strike, how many strikes in a row did, and how many bubbles it burst this game. */
  hit = false;
  run = 0;
  burst = 0;
  /** How long the last bubble has been sitting on its nose. */
  heldMs = 0;
}

function setPhase(b: Buddy, phase: Phase): void {
  b.bubbles.phase = phase;
  b.bubbles.phaseMs = 0;
  b.running = false;
}

/** You blow bubbles: a stream of them rises from the bottom of the view, and it goes after them if it is up to it. */
export function blowBubbles(b: Buddy): void {
  const { bubbles, width, height, random } = b.world;
  bubbles.blow(width, height, random);
  if (b.state !== 'bubbles' && !asleep(b)) {
    startBubbles(b);
  }
}

/** You burst the bubble at this point yourself. Returns whether there was one. */
export function popBubbleAt(b: Buddy, x: number, y: number): boolean {
  const { bubbles, random } = b.world;
  const bubble = bubbles.at(x, y, 3);
  if (!bubble) {
    return false;
  }
  const m = b.bubbles;
  // It was just about to get that one.
  if (b.state === 'bubbles' && bubble === m.target && (m.phase === 'chase' || m.phase === 'wiggle')) {
    setPhase(b, 'puzzled');
  }
  bubbles.pop(bubble, random);
  return true;
}

function startBubbles(b: Buddy): void {
  const m = b.bubbles;
  m.target = undefined;
  m.run = 0;
  m.burst = 0;
  setPhase(b, 'spot');
  b.tryEnter('bubbles', PLAY_MAX_MS);
  if (b.state === 'bubbles') {
    tookBreak(b);
  }
}

/** The bubble nearest to the middle of the fox, among those that have left the wand. */
function nearest(b: Buddy): Bubble | undefined {
  const middle = b.x + SPRITE_SIZE / 2;
  return b.world.bubbles.floating.reduce<Bubble | undefined>((best, bubble) => (!best || Math.abs(bubble.x - middle) < Math.abs(best.x - middle) ? bubble : best), undefined);
}

/** Bursts the bubbles within `reach` of a point; returns how many. */
function burstAround(b: Buddy, x: number, y: number, reach: number, spare?: Bubble): number {
  const { bubbles, random } = b.world;
  const touched = bubbles.floating.filter((bubble) => bubble !== spare && Math.hypot(bubble.x - x, bubble.y - y) <= bubble.r * bubble.grown + reach);
  touched.forEach((bubble) => bubbles.pop(bubble, random));
  b.bubbles.burst += touched.length;
  return touched.length;
}

/** Whether a strike can get at a bubble where it floats. */
function reaches(b: Buddy, strike: Strike, bubble: Bubble): boolean {
  const top = strike.jump ? Math.max(strike.heights[1] === Infinity ? 0 : strike.heights[1], strike.jump.part + Math.max(0, b.maxY) + 2) : strike.heights[1];
  if (bubble.y < strike.heights[0] || bubble.y > top) {
    return false;
  }
  return !strike.cluster || b.world.bubbles.floating.filter((other) => other !== bubble && Math.hypot(other.x - bubble.x, other.y - bubble.y) <= CLUSTER).length >= 2;
}

/** Where it has to stand to strike at a bubble: the nearer of the two ways round. */
function stanceFor(b: Buddy, strike: Strike, bubble: Bubble): { at: number; facing: 1 | -1 } {
  const forward = strike.jump?.forward ?? 0;
  const ways = ([1, -1] as const).map((facing) => ({ at: clamp(bubble.x - b.offsetFor(strike.under, facing) - facing * forward, 0, b.maxX), facing }));
  return Math.abs(ways[0].at - b.x) <= Math.abs(ways[1].at - b.x) ? ways[0] : ways[1];
}

// Picks a bubble and a way of bursting it: near ones rather than far ones, and not the same way twice running.
function choose(b: Buddy): boolean {
  const m = b.bubbles;
  const middle = b.x + SPRITE_SIZE / 2;
  const options: { bubble: Bubble; name: StrikeName; odds: number }[] = [];
  for (const bubble of b.world.bubbles.floating) {
    if (bubble.grown < 1) {
      continue;
    }
    for (const name of Object.keys(STRIKES) as StrikeName[]) {
      const strike: Strike = STRIKES[name];
      if (reaches(b, strike, bubble)) {
        options.push({ bubble, name, odds: (strike.odds * (name === m.strike ? AGAIN : 1)) / (1 + Math.abs(bubble.x - middle) / 30) });
      }
    }
  }
  if (options.length === 0) {
    return false;
  }
  let roll = b.world.random() * options.reduce((sum, option) => sum + option.odds, 0);
  const picked = options.find((option) => (roll -= option.odds) < 0) ?? options[options.length - 1];
  m.target = picked.bubble;
  m.strike = picked.name;
  return true;
}

function startStrike(b: Buddy, target: Bubble): void {
  const m = b.bubbles;
  const strike: Strike = STRIKES[m.strike];
  m.from = b.x;
  m.hit = false;
  b.dir = m.facing;
  b.startDir = m.facing;
  if (strike.jump) {
    // It jumps at where the bubble will be when it gets up there.
    const ahead = (strike.jump.at + strike.jump.air / 2) / 1000;
    m.height = clamp(target.y + target.vy * ahead - strike.jump.part, 0, Math.max(0, b.maxY));
    if (b.world.random() < MISS_CHANCE) {
      // And now and then the bubble bobs out of the way just then.
      target.vy += DODGE[1];
      target.vx += m.facing * DODGE[0];
    }
  }
  setPhase(b, 'strike');
}

/** Free of what was holding it, the last bubble floats on. */
function letGo(b: Buddy): void {
  b.world.bubbles.list.forEach((bubble) => (bubble.held = undefined));
  b.bubbles.heldMs = 0;
}

function updateStrike(b: Buddy): void {
  const m = b.bubbles;
  const strike: Strike = STRIKES[m.strike];
  const ms = m.phaseMs;
  if (strike.jump) {
    const p = clamp((ms - strike.jump.at) / strike.jump.air, 0, 1);
    b.x = clamp(m.from + m.facing * strike.jump.forward * p, 0, b.maxX);
    b.y = 4 * m.height * p * (1 - p);
    if (strike.spinMs && p > 0 && p < 1) {
      b.dir = Math.floor((ms - strike.jump.at) / strike.spinMs) % 2 === 0 ? m.facing : b.flipped(m.facing);
    } else {
      b.dir = m.facing;
    }
  }
  for (const hit of strike.hits) {
    if (ms >= hit.from && ms < hit.to && burstAround(b, b.x + b.offsetFor(hit.col, m.facing), b.y + hit.height, hit.r) > 0) {
      m.hit = true;
    }
  }
  if (ms < totalDuration(ANIMATIONS[strike.anim])) {
    return;
  }
  b.y = 0;
  b.dir = m.facing;
  m.target = undefined;
  if (!m.hit) {
    m.run = 0;
    setPhase(b, 'puzzled');
  } else {
    m.run++;
    setPhase(b, strike.after && b.world.random() < strike.after.chance ? strike.after.does : 'watch');
  }
}

function updateBubbles(b: Buddy, dt: number, dtMs: number): void {
  const m = b.bubbles;
  const { bubbles, random } = b.world;
  m.phaseMs += dtMs;
  if (m.phase !== 'strike') {
    b.fall(dt);
  }
  if (m.target && !bubbles.list.includes(m.target)) {
    m.target = undefined;
  }
  // Whatever it is doing, a bubble that touches its nose bursts: all but the one it has plans for.
  if (m.phase !== 'cheer' && m.phase !== 'shake') {
    burstAround(b, b.x + b.noseOffset(), b.y + NOSE_HEIGHT, NOSE_REACH, m.phase === 'offer' ? bubbles.list[0] : m.target);
  }
  switch (m.phase) {
    case 'spot':
    case 'sneeze':
    case 'bleh':
    case 'puzzled':
      if (m.phaseMs >= lastsOf(m.phase)) {
        setPhase(b, 'watch');
      }
      break;
    case 'watch': {
      const looksAt = nearest(b);
      if (looksAt) {
        b.faceX(looksAt.x, 3);
      }
      // On a run of bursts it does not stop to breathe.
      if (m.phaseMs < (m.run > 0 ? 0 : WATCH_MS)) {
        break;
      }
      if (!bubbles.around) {
        setPhase(b, m.burst >= SOAKED ? 'shake' : 'cheer');
      } else if (bubbles.list.length === 1 && bubbles.list[0].grown >= 1) {
        // The last one: it does not burst it, it lets it come and sit on its nose.
        m.heldMs = 0;
        setPhase(b, 'offer');
      } else if (choose(b)) {
        setPhase(b, 'chase');
      }
      break;
    }
    case 'chase': {
      const strike: Strike = STRIKES[m.strike];
      if (!m.target || !reaches(b, strike, m.target)) {
        m.target = undefined;
        setPhase(b, 'watch');
        break;
      }
      const { at, facing } = stanceFor(b, strike, m.target);
      m.stance = at;
      m.facing = facing;
      b.running = Math.abs(at - b.x) > TROT_WITHIN;
      if (Math.abs(at - b.x) > 1) {
        b.dir = at > b.x ? 1 : -1;
      }
      if (!b.approach(at, (b.running ? FETCH_RUN_SPEED : TROT_SPEED) * dt)) {
        b.dir = facing;
        if (strike.wiggles && m.run === 0) {
          setPhase(b, 'wiggle');
        } else {
          startStrike(b, m.target);
        }
      }
      break;
    }
    case 'wiggle':
      if (!m.target || Math.abs(stanceFor(b, STRIKES[m.strike], m.target).at - b.x) > DRIFTED) {
        setPhase(b, m.target ? 'chase' : 'watch');
      } else if (m.phaseMs >= WIGGLE_MS) {
        startStrike(b, m.target);
      }
      break;
    case 'strike':
      updateStrike(b);
      break;
    case 'offer': {
      const last = bubbles.list[0];
      if (!last) {
        // It burst, on its nose or under your finger.
        letGo(b);
        setPhase(b, 'sneeze');
      } else if (bubbles.list.length > 1) {
        letGo(b);
        setPhase(b, 'watch');
      } else {
        last.held = { x: b.x + b.noseOffset(), y: NOSE_HEIGHT + ON_NOSE + last.r };
        m.heldMs = Math.hypot(last.x - last.held.x, last.y - last.held.y) < 1.5 ? m.heldMs + dtMs : 0;
        if (m.heldMs >= HOLD_MS) {
          bubbles.pop(last, random);
          m.burst++;
        }
      }
      break;
    }
    case 'shake':
      if (m.phaseMs >= lastsOf('shake')) {
        setPhase(b, 'cheer');
      }
      break;
    case 'cheer':
      if (m.phaseMs >= lastsOf('cheer') * 2) {
        b.enterNext(b.pickNext());
      }
      break;
  }
}

function animOf(b: Buddy): AnimName {
  const { phase, strike } = b.bubbles;
  switch (phase) {
    case 'watch':
      return 'bubbleWatch';
    case 'chase':
      return b.running ? 'run' : 'walk';
    case 'wiggle':
      return 'wiggle';
    case 'strike':
      return STRIKES[strike].anim;
    case 'offer':
      return 'bubbleNose';
    default:
      return SHOWS[phase] ?? 'bubbleWatch';
  }
}

// Soap bubbles: it bursts them every way it knows, nose, paws, teeth and tail, and keeps the last one for itself.
export const bubblesFeature = {
  states: {
    bubbles: {
      priority: 2,
      next: [['sit', 50], ['idle', 30], ['lie', 20]],
      begin: startBubbles,
      update: updateBubbles,
      anim: (b) => ({ anim: animOf(b), elapsed: b.bubbles.phaseMs }),
      focus(b) {
        const bubble = b.bubbles.target ?? nearest(b);
        return bubble && { x: bubble.x, y: bubble.y };
      },
    },
  },
  urges: [urge((b) => b.world.bubbles.around, startBubbles)],
  // A bubble it was holding on its nose floats free when it turns to something else.
  entered(b, state) {
    if (state !== 'bubbles') {
      letGo(b);
    }
  },
} satisfies Feature;
