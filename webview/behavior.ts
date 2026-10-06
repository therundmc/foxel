import type { Reaction } from '../shared/protocol';
import { Ball, clamp } from './ball';
import { Bug } from './bug';
import { Treat } from './treat';
import {
  ANIMATIONS,
  BALL_SIZE,
  EAT_RESUME_MS,
  JUMP_AIR_MS,
  JUMP_CROUCH_MS,
  JUMP_LAND_MS,
  NOSE_X,
  SPRITE_SIZE,
  STARTLE_AIR_MS,
  STARTLE_CROUCH_MS,
  PEEK_DUCK_MS,
  PEEK_HAPPY_MS,
  PEEK_LOOK_MS,
  PEEK_RETURN_MS,
  TOSS_CATCH_MS,
  TOSS_FLICK_MS,
  TREAT_PAWS_X,
  TWIRL_AIR_MS,
  TWIRL_CROUCH_MS,
  frameAt,
  totalDuration,
  type AnimName,
  type TouchZone,
} from './sprites';

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
  | 'panic';

type HuntPhase = 'spot' | 'stalk' | 'wiggle' | 'leap' | 'catch' | 'miss';
type TimedReaction = 'alert' | 'wave' | 'love' | 'happy' | 'celebrate' | 'sad' | 'panic';

export interface WorldPoint {
  x: number;
  y: number;
}

/** Where the pupils sit in their socket: x forward (+) or back (-), y up (-) or down (+). */
export interface Gaze {
  x: -1 | 0 | 1;
  y: -1 | 0 | 1;
}

interface Intercept {
  x: number;
  dir: 1 | -1;
  t: number;
  lift: number;
}

const PRIORITY: Partial<Record<BuddyState, number>> = {
  sleep: 1,
  typing: 2,
  alert: 2,
  watch: 2,
  fetch: 2,
  bring: 2,
  await: 2,
  wave: 3,
  love: 3,
  happy: 3,
  celebrate: 3,
  sad: 3,
  petted: 3,
  touched: 3,
  zoomies: 3,
  intro: 3,
  trick: 2,
  beg: 3,
  snack: 3,
  panic: 4,
};

const REACTION_MS: Record<TimedReaction, number> = {
  alert: 1500,
  wave: 1800,
  love: 1800,
  happy: 1600,
  celebrate: 2000,
  sad: 2600,
  panic: 2400,
};

type Weights = readonly (readonly [BuddyState, number])[];

// What a real pet tends to do next: calm down after effort, settle when resting.
const NEXT: Partial<Record<BuddyState, Weights>> = {
  idle: [['walk', 30], ['sit', 25], ['sniff', 12], ['play', 12], ['lookAround', 10], ['hunt', 7], ['leave', 4], ['stretch', 4], ['jump', 3], ['run', 2], ['chaseTail', 1]],
  walk: [['idle', 30], ['sit', 20], ['sniff', 20], ['play', 10], ['lookAround', 10], ['hunt', 7], ['leave', 4], ['jump', 3], ['run', 3]],
  run: [['idle', 50], ['sit', 30], ['walk', 20]],
  sit: [['lie', 30], ['walk', 20], ['groom', 15], ['idle', 15], ['yawn', 10], ['lookAround', 10], ['play', 8]],
  lie: [['stretch', 30], ['sit', 25], ['idle', 20], ['groom', 10], ['walk', 10]],
  sniff: [['walk', 40], ['idle', 20], ['sit', 20], ['play', 10], ['hunt', 10], ['lookAround', 10]],
  groom: [['sit', 40], ['lie', 30], ['idle', 30]],
  yawn: [['lie', 50], ['sit', 30], ['idle', 20]],
  stretch: [['walk', 50], ['idle', 30], ['sit', 20]],
  lookAround: [['walk', 40], ['idle', 30], ['sit', 20], ['play', 12], ['hunt', 10]],
  jump: [['idle', 50], ['walk', 50]],
  chaseTail: [['dizzy', 30], ['idle', 40], ['sit', 30]],
  dizzy: [['sit', 60], ['idle', 40]],
  hunt: [['sit', 40], ['idle', 30], ['walk', 30]],
  await: [['play', 40], ['lie', 30], ['sit', 30]],
  petted: [['lie', 60], ['sit', 40]],
};
const DEFAULT_NEXT: Weights = [['idle', 40], ['sit', 40], ['walk', 20]];

const CALM_STATES: ReadonlySet<BuddyState> = new Set([
  'idle',
  'sit',
  'lie',
  'typing',
  'lookAround',
  'sniff',
  'groom',
]);
const FACE_TARGET_STATES: ReadonlySet<BuddyState> = new Set(['idle', 'sit', 'lie', 'await', 'watch']);
const GAZE_STATES: ReadonlySet<BuddyState> = new Set([...FACE_TARGET_STATES, 'walk', 'beg', 'alert']);
const BALL_FOCUS_STATES: ReadonlySet<BuddyState> = new Set(['watch', 'fetch', 'play', 'trick']);

type Trick = 'balance' | 'toss' | 'pawPlay';
// What it does with the ball once brought back; undefined just drops it and waits.
const TRICKS: readonly (Trick | undefined)[] = ['balance', 'toss', 'pawPlay', undefined];
const TOSS_VY = 75;
const TOSS_THROWS = 2;
const TOSS_MAX_MS = 12_000;
const OFFSCREEN_STATES: ReadonlySet<BuddyState> = new Set(['leave', 'away', 'arrive', 'intro']);

// Only the head shows past the edge while peeking.
const PEEK_HIDDEN = 15;
const PEEK_DUCK = 5;
const PEEK_SLIDE_MS = 150;
const PEEK_MS = PEEK_LOOK_MS + PEEK_DUCK_MS + PEEK_RETURN_MS + PEEK_HAPPY_MS;
const INTRO_SPEED = 26;
// Looking around while peeking: up, back, down.
const PEEK_GLANCES: readonly (readonly [number, Gaze])[] = [
  [500, { x: 0, y: -1 }],
  [800, { x: -1, y: 0 }],
  [PEEK_LOOK_MS, { x: 0, y: 1 }],
];
const RESTFUL_STATES: ReadonlySet<BuddyState> = new Set([
  'idle',
  'sit',
  'lie',
  'sleep',
  'groom',
  'yawn',
  'typing',
  'await',
]);

const JUMP_MS = JUMP_CROUCH_MS + JUMP_AIR_MS + JUMP_LAND_MS;
const WALK_SPEED = 9;
const SPEED: Partial<Record<BuddyState, number>> = { walk: WALK_SPEED, run: 35, sniff: 3, panic: 45, zoomies: 55 };
const ERRAND_SPEED = 14;
const PLAY_SPEED = 28;
const FETCH_RUN_SPEED = 38;
const FETCH_WALK_SPEED = 12;
const BRING_SPEED = 14;
const STALK_SPEED = 4;
const JUMP_HEIGHT = 10;
const HOP_HEIGHT = 3;
const HOP_PERIOD_MS = 360;
const FALL_SPEED = 60;
const CHASE_FLIP_MS = 280;
const LOOK_FLIP_MS = 1600;
const POUNCE_MS = 400;
const PLAY_MAX_MS = 25_000;
const FETCH_MAX_MS = 20_000;
const BRING_MAX_MS = 15_000;
const AWAIT_MS = 9000;
const TYPING_MS = 2500;
const NOTICE_MS = 900;
const FACE_DEADZONE = 8;
const TURN_COOLDOWN_MS = 700;
const TURN_DELAY_MS = 450;
const GAZE_BEHIND = 6;
const GAZE_MIN_RISE = 10;
const GAZE_SLOPE = 0.6;
const FETCH_FAR = 20;
const BODY_LEFT = 6;
const BODY_RIGHT = 26;
const BODY_HEIGHT = 22;
const BUMP_DAMPING = 0.5;

const MOUTH_X = 28;
const MOUTH_HEIGHT = 13;
const CATCH_RADIUS = 4;
const NOSE_REACH = 3;
const STAND_LIFT = 1.5;
const CATCH_LEAP_MAX = 16;
const LEAP_GRAVITY = 300;
const PREDICT_S = 3;
const PREDICT_STEP = 1 / 60;

const HUNT_MAX_MS = 30_000;
const SPOT_MS = 900;
const STALK_MAX_MS = 8000;
const STALK_GAP = 14;
const WIGGLE_MS = 900;
const LEAP_MS = 600;
const CATCH_MS = 1800;
const MISS_MS = 2200;
const CATCH_CHANCE = 0.45;
const NOSE_HEIGHT = 16;

const PET_LINGER_MS = 1500;
const CUDDLE_AFTER_MS = 2500;

const SNACK_MAX_MS = 15_000;
const BALL_NEARBY = 80;
const BEG_MOUTH_X = 26.5;
const BEG_MOUTH_HEIGHT = 14.5;
const TAKE_RADIUS = 6;

interface TouchReaction {
  anim: AnimName;
  /** Variant played when it is already lying down; it then stays lying. */
  lying?: AnimName;
  hop?: { at: number; air: number; height: number };
  /** Turns around every `spinMs`, during the hop if there is one. */
  spinMs?: number;
  ms?: number;
  then?: BuddyState;
}

// Several cute reactions per body part, picked at random so touching the same spot stays surprising.
const TOUCH_REACTIONS: Record<TouchZone, readonly TouchReaction[]> = {
  nose: [{ anim: 'boop' }, { anim: 'blep' }, { anim: 'lick' }],
  head: [
    { anim: 'pat', lying: 'patLie', then: 'sit' },
    { anim: 'nuzzle', lying: 'nuzzleLie' },
    { anim: 'tilt' },
  ],
  back: [{ anim: 'scratch' }, { anim: 'playBow', then: 'zoomies' }, { anim: 'flop', then: 'lie' }],
  paw: [
    { anim: 'shake', then: 'sit' },
    { anim: 'highFive', then: 'sit' },
    { anim: 'twirl', hop: { at: TWIRL_CROUCH_MS, air: TWIRL_AIR_MS, height: 6 }, spinMs: TWIRL_AIR_MS / 4 },
  ],
  tail: [
    { anim: 'chaseTail', spinMs: CHASE_FLIP_MS, ms: CHASE_FLIP_MS * 6, then: 'dizzy' },
    { anim: 'startle', hop: { at: STARTLE_CROUCH_MS, air: STARTLE_AIR_MS, height: 8 } },
    { anim: 'tailPoof' },
  ],
};
const FLOP: TouchReaction = { anim: 'flop', then: 'lie' };
const ZOOMIES_COMBO = 3;
const ZOOMIES_MS = 3200;
const ZOOMIES_FLIP_MIN_MS = 600;
const ZOOMIES_FLIP_SPREAD_MS = 500;

const HUNT_ANIM: Record<HuntPhase, AnimName> = {
  spot: 'alert',
  stalk: 'stalk',
  wiggle: 'wiggle',
  leap: 'leap',
  catch: 'proud',
  miss: 'puzzled',
};

function riseTime(lift: number): number {
  return Math.sqrt((2 * Math.max(lift, 0)) / LEAP_GRAVITY);
}

export class Behavior {
  x = 0;
  y = 0;
  dir: 1 | -1 = 1;
  state: BuddyState = 'idle';
  elapsed = 0;
  readonly ball = new Ball();
  readonly bug = new Bug();
  readonly treat = new Treat();
  private startDir: 1 | -1 = 1;
  private duration: number;
  private worldWidth = SPRITE_SIZE;
  private worldHeight = SPRITE_SIZE;
  private placed = false;
  private pointer: WorldPoint | undefined;
  private errand: 'fetch' | 'return' = 'fetch';
  private targetX = 0;
  private kicks = 0;
  private kicksWanted = 0;
  private pounceMs = 0;
  private moving = false;
  private running = false;
  private playerX: number | undefined;
  private huntPhase: HuntPhase = 'spot';
  private phaseMs = 0;
  private leapFrom = 0;
  private leapTo = 0;
  private leapHeight = 0;
  private willCatch = false;
  private petMs = 0;
  private petIdleMs = 0;
  private sinceTurnMs = 0;
  private behindMs = 0;
  private patLying = false;
  private reaction: TouchReaction = TOUCH_REACTIONS.head[0];
  private reactionAnim: AnimName = 'pat';
  private touchCombo = 0;
  private readonly lastVariant: Partial<Record<TouchZone, number>> = {};
  private nextZoomFlipMs = 0;
  private introPhase: 'peek' | 'enter' = 'peek';
  private peekX = 0;
  private trick: Trick = 'balance';
  private lastTrick = -1;
  private tossPhase: 'flick' | 'air' | 'catch' = 'flick';
  private trickMs = 0;
  private tosses = 0;
  private airMs = 0;
  private airTotalMs = 0;
  private eatMs = 0;

  constructor(private readonly random: () => number = Math.random) {
    this.duration = this.ambientDuration('idle');
  }

  get maxX(): number {
    return this.worldWidth - SPRITE_SIZE;
  }

  get maxY(): number {
    return this.worldHeight - SPRITE_SIZE;
  }

  get visible(): boolean {
    return this.state !== 'away';
  }

  /** True when nothing moves fast, so the view can be redrawn less often. */
  get restful(): boolean {
    const ballMoving = this.ball.state === 'held' || (this.ball.state === 'free' && !this.ball.resting);
    const treatMoving = this.treat.state === 'held' || (this.treat.state === 'free' && !this.treat.landed);
    return RESTFUL_STATES.has(this.state) && !ballMoving && !treatMoving && !this.bug.active && this.y === 0;
  }

  setWorldSize(width: number, height: number): void {
    this.worldWidth = Math.max(width, SPRITE_SIZE);
    this.worldHeight = Math.max(height, SPRITE_SIZE);
    if (!this.placed && this.maxX > 0) {
      this.placed = true;
      this.x = Math.floor(this.random() * this.maxX);
    }
    if (!OFFSCREEN_STATES.has(this.state)) {
      this.clampX();
    }
    this.ball.place(this.ball.x, this.ball.y, this.worldWidth, this.worldHeight);
  }

  setPointer(pointer: WorldPoint | undefined): void {
    this.pointer = pointer;
  }

  restore(x: number, dir: 1 | -1): void {
    this.x = x;
    this.dir = dir;
    this.placed = true;
    this.clampX();
  }

  /** What the buddy is paying attention to, and turns toward when resting. */
  focusTarget(): WorldPoint | undefined {
    if (this.state === 'hunt' && this.bug.active) {
      return { x: this.bug.centerX, y: this.bug.centerY };
    }
    if (this.treat.state === 'held') {
      return { x: this.treat.centerX, y: this.treat.centerY };
    }
    const ballInPlay =
      this.ball.state === 'held' || (this.ball.state === 'free' && BALL_FOCUS_STATES.has(this.state));
    if (ballInPlay) {
      return { x: this.ball.center, y: this.ball.y + BALL_SIZE / 2 };
    }
    return this.pointer;
  }

  /** Which way the eyes look from `eye` (world position) toward what the buddy is watching. */
  gaze(eye: WorldPoint): Gaze | undefined {
    if (this.state === 'intro' && this.introPhase === 'peek') {
      return PEEK_GLANCES.find(([until]) => this.elapsed < until)?.[1];
    }
    const target = GAZE_STATES.has(this.state) ? this.focusTarget() : undefined;
    if (!target) {
      return undefined;
    }
    const ahead = (target.x - eye.x) * this.dir;
    const rise = target.y - eye.y;
    const steep = Math.max(GAZE_MIN_RISE, Math.abs(ahead) * GAZE_SLOPE);
    // The resting eye already looks ahead, so it only ever glances back, up or down.
    return {
      x: ahead < -GAZE_BEHIND ? -1 : 0,
      y: rise > steep ? -1 : rise < -steep ? 1 : 0,
    };
  }

  react(reaction: Reaction): void {
    switch (reaction) {
      case 'wake':
        if (this.state === 'sleep') {
          this.enter('stretch', this.ambientDuration('stretch'));
        }
        return;
      case 'sleep':
        this.tryEnter('sleep', Infinity);
        return;
      case 'typing':
        if (this.state === 'typing') {
          this.elapsed = 0;
        } else if (CALM_STATES.has(this.state)) {
          this.tryEnter('typing', TYPING_MS);
        }
        return;
      case 'notice':
        if (CALM_STATES.has(this.state) && this.state !== 'typing') {
          this.tryEnter('alert', NOTICE_MS);
        }
        return;
      default:
        this.tryEnter(reaction, REACTION_MS[reaction]);
    }
  }

  pet(): void {
    if (this.state === 'petted') {
      this.petIdleMs = 0;
      return;
    }
    this.petMs = 0;
    this.petIdleMs = 0;
    this.tryEnter('petted', Infinity);
  }

  grabBall(x: number, y: number): void {
    if (this.ball.state === 'mouth') {
      return;
    }
    this.ball.state = 'held';
    this.moveHeldBall(x, y);
    this.tryEnter('watch', Infinity);
  }

  moveHeldBall(x: number, y: number): void {
    if (this.ball.state === 'held') {
      this.ball.place(x - BALL_SIZE / 2, y - BALL_SIZE / 2, this.worldWidth, this.worldHeight);
    }
  }

  throwBall(vx: number, vy: number, playerX: number | undefined): void {
    if (this.ball.state !== 'held') {
      return;
    }
    this.ball.launch(vx, vy);
    this.playerX = playerX;
    this.tryEnter('fetch', FETCH_MAX_MS);
  }

  spawnBall(x: number, y: number, vx: number): void {
    if (this.ball.state === 'mouth' || this.ball.state === 'held') {
      return;
    }
    this.ball.place(x - BALL_SIZE / 2, y, this.worldWidth, this.worldHeight);
    this.ball.launch(vx, 0);
    this.playerX = undefined;
    this.tryEnter('fetch', FETCH_MAX_MS);
  }

  startHunt(): void {
    this.bug.spawn(this.worldWidth, this.worldHeight, this.random);
    this.setPhase('spot');
    this.faceX(this.bug.centerX, 0);
    this.enter('hunt', HUNT_MAX_MS);
  }

  /** First appearance: pokes its head in from an edge, looks around, then trots in to say hello. */
  startIntro(): void {
    const fromLeft = this.random() < 0.5;
    this.dir = fromLeft ? 1 : -1;
    this.peekX = fromLeft ? -PEEK_HIDDEN : this.worldWidth - SPRITE_SIZE + PEEK_HIDDEN;
    this.x = this.peekX;
    this.targetX = this.maxX * (0.25 + 0.5 * this.random());
    this.placed = true;
    this.introPhase = 'peek';
    this.enter('intro', Infinity);
  }

  private updateIntro(dt: number): void {
    if (this.introPhase === 'enter') {
      this.running = true;
      if (!this.walkTo(this.targetX, this.dir, INTRO_SPEED * dt)) {
        this.enter('wave', REACTION_MS.wave);
      }
      return;
    }
    const duckAt = PEEK_LOOK_MS;
    const backAt = duckAt + PEEK_DUCK_MS;
    const t = this.elapsed;
    let out = 0;
    if (t >= duckAt && t < backAt) {
      out = Math.min(1, (t - duckAt) / PEEK_SLIDE_MS);
    } else if (t >= backAt && t < backAt + PEEK_RETURN_MS) {
      out = 1 - (t - backAt) / PEEK_RETURN_MS;
    }
    this.x = this.peekX - this.dir * PEEK_DUCK * out;
    if (t >= PEEK_MS) {
      this.x = this.peekX;
      this.introPhase = 'enter';
      this.elapsed = 0;
    }
  }

  startErrand(): void {
    if (this.ball.state === 'free') {
      this.startPlay();
    } else if (this.ball.state === 'none') {
      this.startLeave('fetch');
    }
  }

  touch(zone: TouchZone): void {
    // Clicking again mid-reaction builds excitement instead of restarting the animation.
    if (this.state === 'touched' || this.state === 'zoomies') {
      this.touchCombo++;
      return;
    }
    const options = TOUCH_REACTIONS[zone];
    let pick = Math.floor(this.random() * options.length) % options.length;
    if (pick === this.lastVariant[zone] && options.length > 1) {
      pick = (pick + 1) % options.length;
    }
    this.lastVariant[zone] = pick;
    this.perform(options[pick]);
  }

  private perform(reaction: TouchReaction): void {
    this.patLying = this.state === 'lie' || this.state === 'sleep' || this.state === 'petted';
    this.reaction = reaction;
    this.reactionAnim = (this.patLying && reaction.lying) || reaction.anim;
    this.touchCombo = 0;
    this.tryEnter('touched', reaction.ms ?? totalDuration(ANIMATIONS[this.reactionAnim]));
  }

  private updateTouched(dt: number): void {
    const { hop, spinMs } = this.reaction;
    const t = this.elapsed;
    if (hop) {
      const p = (t - hop.at) / hop.air;
      this.y = p > 0 && p < 1 ? 4 * Math.min(hop.height, this.maxY) * p * (1 - p) : 0;
    } else {
      this.fall(dt);
    }
    if (spinMs) {
      const from = hop?.at ?? 0;
      const to = hop ? hop.at + hop.air : Infinity;
      const flips = t >= from && t < to ? Math.floor((t - from) / spinMs) : 0;
      this.dir = flips % 2 === 0 ? this.startDir : this.flipped();
    }
  }

  private startZoomies(): void {
    this.touchCombo = 0;
    this.nextZoomFlipMs = ZOOMIES_FLIP_MIN_MS;
    this.enter('zoomies', ZOOMIES_MS);
  }

  private updateZoomies(): void {
    if (this.elapsed >= this.nextZoomFlipMs) {
      this.dir = this.flipped(this.dir);
      this.nextZoomFlipMs = this.elapsed + ZOOMIES_FLIP_MIN_MS + this.random() * ZOOMIES_FLIP_SPREAD_MS;
    }
  }

  giveTreat(x: number): void {
    if (this.treat.active) {
      return;
    }
    this.treat.drop(x, this.worldWidth, this.worldHeight);
    if (!OFFSCREEN_STATES.has(this.state)) {
      this.startSnack();
    }
  }

  grabTreat(x: number, y: number): void {
    if (this.treat.state !== 'free') {
      return;
    }
    this.treat.hold(x, y, this.worldWidth, this.worldHeight);
    this.startBeg();
  }

  moveHeldTreat(x: number, y: number): void {
    if (this.treat.state === 'held') {
      this.treat.place(x, y, this.worldWidth, this.worldHeight);
    }
  }

  releaseTreat(): void {
    this.treat.release();
  }

  update(dtMs: number): void {
    this.elapsed += dtMs;
    const dt = dtMs / 1000;

    this.ball.update(dt, this.worldWidth, this.worldHeight);
    this.bumpBall();
    this.bug.update(dt, this.worldWidth, this.worldHeight, this.random);
    this.treat.update(dt, this.worldWidth);
    this.sinceTurnMs += dtMs;

    if (CALM_STATES.has(this.state)) {
      if (this.treat.state === 'held') {
        this.startBeg();
      } else if (this.treat.landed) {
        this.startSnack();
      }
    }

    const speed = SPEED[this.state];
    if (speed !== undefined) {
      this.move(speed * dt);
    }

    // Glance back first; only turn around if the target stays behind.
    const target = FACE_TARGET_STATES.has(this.state) ? this.focusTarget() : undefined;
    const behind = target !== undefined && (target.x - (this.x + SPRITE_SIZE / 2)) * this.dir < -FACE_DEADZONE;
    this.behindMs = behind ? this.behindMs + dtMs : 0;
    if (target && this.sinceTurnMs >= TURN_COOLDOWN_MS && this.behindMs >= TURN_DELAY_MS) {
      this.faceX(target.x, FACE_DEADZONE);
    }

    switch (this.state) {
      case 'jump': {
        const air = (this.elapsed - JUMP_CROUCH_MS) / JUMP_AIR_MS;
        if (air > 0 && air < 1) {
          this.y = 4 * Math.min(JUMP_HEIGHT, this.maxY) * air * (1 - air);
          this.move(WALK_SPEED * dt);
        } else {
          this.y = 0;
        }
        break;
      }
      case 'celebrate':
      case 'happy': {
        const hop = Math.abs(Math.sin((Math.PI * this.elapsed) / HOP_PERIOD_MS));
        this.y = Math.min(HOP_HEIGHT, this.maxY) * hop;
        break;
      }
      case 'chaseTail':
        this.dir = Math.floor(this.elapsed / CHASE_FLIP_MS) % 2 === 0 ? this.startDir : this.flipped();
        break;
      case 'lookAround':
        this.dir = Math.floor(this.elapsed / LOOK_FLIP_MS) % 2 === 0 ? this.startDir : this.flipped();
        break;
      case 'leave':
        this.x += this.dir * ERRAND_SPEED * dt;
        if (this.x <= -SPRITE_SIZE || this.x >= this.worldWidth) {
          this.enter('away', 1500 + this.random() * 2000);
        }
        return;
      case 'arrive':
        this.x += this.dir * ERRAND_SPEED * dt;
        if ((this.x - this.targetX) * this.dir >= 0) {
          this.x = this.targetX;
          this.arrived();
        }
        return;
      case 'play':
        this.updatePlay(dt);
        break;
      case 'hunt':
        this.updateHunt(dtMs);
        break;
      case 'fetch':
        this.updateFetch(dt);
        break;
      case 'trick':
        this.fall(dt);
        if (this.trick === 'toss') {
          this.updateToss(dt);
        }
        break;
      case 'bring':
        this.updateBring(dt);
        break;
      case 'touched':
        this.updateTouched(dt);
        break;
      case 'zoomies':
        this.updateZoomies();
        break;
      case 'intro':
        this.updateIntro(dt);
        return;
      case 'beg':
        this.updateBeg(dt);
        break;
      case 'snack':
        this.updateSnack(dt);
        break;
      case 'petted':
        this.petMs += dtMs;
        this.petIdleMs += dtMs;
        if (this.petIdleMs >= PET_LINGER_MS) {
          this.enterNext(this.petMs >= CUDDLE_AFTER_MS ? 'lie' : 'sit');
          return;
        }
        this.fall(dt);
        break;
      default:
        this.fall(dt);
    }

    if (this.elapsed >= this.duration) {
      this.finishState();
    }
  }

  current(): { anim: AnimName; elapsed: number } {
    switch (this.state) {
      case 'happy':
        return { anim: 'celebrate', elapsed: this.elapsed };
      case 'leave':
      case 'arrive':
      case 'bring':
        return { anim: this.ball.state === 'mouth' ? 'carry' : 'walk', elapsed: this.elapsed };
      case 'away':
        return { anim: 'idle', elapsed: this.elapsed };
      case 'await':
        return { anim: 'watch', elapsed: this.elapsed };
      case 'watch':
        return { anim: 'ready', elapsed: this.elapsed };
      case 'play':
        if (this.pounceMs > 0) {
          return { anim: 'pounce', elapsed: POUNCE_MS - this.pounceMs };
        }
        return { anim: this.moving ? 'run' : 'idle', elapsed: this.elapsed };
      case 'fetch':
        if (this.airTotalMs > 0) {
          return { anim: this.ball.state === 'mouth' ? 'snatch' : 'leap', elapsed: this.airMs };
        }
        if (!this.moving) {
          return { anim: this.ball.y > 0 ? 'idle' : 'watch', elapsed: this.elapsed };
        }
        return { anim: this.running ? 'run' : 'walk', elapsed: this.elapsed };
      case 'hunt':
        return { anim: HUNT_ANIM[this.huntPhase], elapsed: this.phaseMs };
      case 'beg':
        if (this.moving) {
          return { anim: this.running ? 'run' : 'walk', elapsed: this.elapsed };
        }
        return { anim: 'beg', elapsed: this.elapsed };
      case 'snack':
        if (this.treat.state === 'eating') {
          return { anim: 'eat', elapsed: this.eatMs };
        }
        return { anim: this.moving ? 'run' : 'ready', elapsed: this.elapsed };
      case 'petted':
        if (this.petMs >= CUDDLE_AFTER_MS) {
          return { anim: 'cuddle', elapsed: this.petMs - CUDDLE_AFTER_MS };
        }
        return { anim: 'petted', elapsed: this.petMs };
      case 'touched':
        return { anim: this.reactionAnim, elapsed: this.elapsed };
      case 'zoomies':
        return { anim: 'run', elapsed: this.elapsed };
      case 'intro':
        return this.introPhase === 'peek'
          ? { anim: 'peek', elapsed: this.elapsed }
          : { anim: 'run', elapsed: this.elapsed };
      case 'trick':
        if (this.trick !== 'toss') {
          return { anim: this.trick, elapsed: this.elapsed };
        }
        return {
          anim: this.tossPhase === 'flick' ? 'tossFlick' : this.tossPhase === 'air' ? 'tossWait' : 'tossCatch',
          elapsed: this.trickMs,
        };
      default:
        return { anim: this.state, elapsed: this.elapsed };
    }
  }

  private finishState(): void {
    switch (this.state) {
      case 'touched':
        if (this.touchCombo >= ZOOMIES_COMBO) {
          this.startZoomies();
        } else if (this.patLying && this.reaction.lying) {
          this.enterNext('lie');
        } else if (this.reaction.then === 'zoomies') {
          this.startZoomies();
        } else {
          this.enterNext(this.reaction.then ?? this.pickNext());
        }
        return;
      case 'zoomies':
        this.perform(FLOP);
        return;
      case 'panic':
        this.enterNext('dizzy');
        return;
      case 'away':
        this.startArrive();
        return;
      case 'play':
        if (this.random() < 0.5) {
          this.ball.state = 'mouth';
          this.startLeave('return');
        } else {
          this.enterNext('lie');
        }
        return;
      case 'hunt':
        this.bug.flee(this.dir);
        this.enterNext(this.pickNext());
        return;
      case 'bring':
        this.dropBall();
        this.enter('await', AWAIT_MS);
        return;
      case 'trick':
        if (this.ball.state === 'mouth') {
          this.dropBall();
          this.ball.vx = 0;
          this.enter('await', AWAIT_MS);
        } else {
          this.enter('fetch', FETCH_MAX_MS);
        }
        return;
      default:
        this.enterNext(this.pickNext());
    }
  }

  private pickNext(): BuddyState {
    const weights = (NEXT[this.state] ?? DEFAULT_NEXT).filter(([s]) => s !== 'play' || this.ballNearby());
    const total = weights.reduce((sum, [, w]) => sum + w, 0);
    let r = this.random() * total;
    for (const [state, weight] of weights) {
      if (r < weight) {
        return state === this.state ? 'idle' : state;
      }
      r -= weight;
    }
    return 'idle';
  }

  private ballNearby(): boolean {
    const ball = this.ball;
    return ball.state === 'free' && ball.resting && Math.abs(ball.center - (this.x + SPRITE_SIZE / 2)) <= BALL_NEARBY;
  }

  private enterNext(state: BuddyState): void {
    switch (state) {
      case 'hunt':
        this.startHunt();
        return;
      case 'leave':
        this.startErrand();
        if (this.state !== 'leave' && this.state !== 'play') {
          this.enter('idle', this.ambientDuration('idle'));
        }
        return;
      case 'play':
        if (this.ball.state === 'free') {
          this.startPlay();
        } else {
          this.enter('sit', this.ambientDuration('sit'));
        }
        return;
      default:
        this.enter(state, this.ambientDuration(state));
    }
  }

  private startLeave(errand: 'fetch' | 'return'): void {
    this.errand = errand;
    this.dir = this.x + SPRITE_SIZE / 2 < this.worldWidth / 2 ? -1 : 1;
    this.enter('leave', Infinity);
  }

  private startArrive(): void {
    const fromLeft = this.random() < 0.5;
    this.x = fromLeft ? -SPRITE_SIZE : this.worldWidth;
    this.dir = fromLeft ? 1 : -1;
    this.targetX = this.maxX * (0.2 + 0.6 * this.random());
    this.ball.state = this.errand === 'fetch' ? 'mouth' : 'none';
    this.enter('arrive', Infinity);
  }

  private arrived(): void {
    if (this.ball.state === 'mouth') {
      this.dropBall();
      this.startPlay();
    } else {
      this.enterNext(this.pickNext());
    }
  }

  private startPlay(): void {
    this.kicks = 0;
    this.kicksWanted = 2 + Math.floor(this.random() * 3);
    this.pounceMs = 0;
    this.moving = false;
    this.enter('play', PLAY_MAX_MS);
  }

  private startBeg(): void {
    this.moving = false;
    this.tryEnter('beg', Infinity);
  }

  // Sits under the treat in your hand and takes it once it is held to its mouth.
  private updateBeg(dt: number): void {
    this.moving = false;
    this.fall(dt);
    const treat = this.treat;
    if (treat.state !== 'held') {
      this.startSnack();
      return;
    }
    const dir = treat.centerX >= this.x + SPRITE_SIZE / 2 ? 1 : -1;
    const target = treat.centerX - this.offsetFor(BEG_MOUTH_X, dir);
    this.running = Math.abs(target - this.x) > FETCH_FAR;
    if (this.walkTo(target, dir, (this.running ? FETCH_RUN_SPEED : FETCH_WALK_SPEED) * dt)) {
      this.moving = true;
      return;
    }
    const mouthX = this.x + this.offsetFor(BEG_MOUTH_X);
    if (Math.hypot(treat.centerX - mouthX, treat.centerY - BEG_MOUTH_HEIGHT) <= TAKE_RADIUS) {
      this.startEating();
    }
  }

  private startSnack(): void {
    this.moving = false;
    this.tryEnter('snack', SNACK_MAX_MS);
  }

  private updateSnack(dt: number): void {
    this.moving = false;
    this.fall(dt);
    const treat = this.treat;
    if (treat.state === 'eating') {
      this.eatMs += dt * 1000;
      if (this.eatMs >= totalDuration(ANIMATIONS.eat)) {
        treat.state = 'none';
        this.enter('lie', this.ambientDuration('lie'));
      }
      return;
    }
    if (treat.state === 'held') {
      this.startBeg();
      return;
    }
    if (treat.state !== 'free') {
      this.enterNext('sit');
      return;
    }
    const dir = this.eatingSide();
    if (this.walkTo(treat.centerX - this.offsetFor(TREAT_PAWS_X, dir), dir, FETCH_RUN_SPEED * dt)) {
      this.moving = true;
      return;
    }
    if (treat.landed) {
      this.startEating();
    }
  }

  // From here the eat frames draw the treat, so it snaps just past the nose.
  private startEating(): void {
    const treat = this.treat;
    treat.state = 'eating';
    treat.place(this.x + this.offsetFor(TREAT_PAWS_X), 0, this.worldWidth, this.worldHeight);
    treat.vy = 0;
    this.eatMs = EAT_RESUME_MS[treat.stage] ?? 0;
    this.enter('snack', totalDuration(ANIMATIONS.eat) + 1000);
  }

  private updatePlay(dt: number): void {
    this.moving = false;
    if (this.pounceMs > 0) {
      this.pounceMs -= dt * 1000;
      return;
    }
    if (this.ball.state !== 'free') {
      this.enterNext('sit');
      return;
    }
    const target = this.noseTargetFor(this.ball.center);
    const toNose = this.x + this.noseOffset() - this.ball.center;
    if (this.ball.y < 1 && Math.abs(toNose) <= NOSE_REACH) {
      this.touchBall();
      return;
    }
    if (this.ball.vx !== 0 && Math.sign(this.ball.vx) === Math.sign(toNose)) {
      return;
    }
    if (this.approach(target, PLAY_SPEED * dt)) {
      this.moving = true;
      return;
    }
    if (this.ball.resting) {
      this.touchBall();
    }
  }

  private touchBall(): void {
    if (this.kicks >= this.kicksWanted) {
      this.finishState();
      return;
    }
    const kickDir = this.ball.center < this.worldWidth / 2 ? 1 : -1;
    this.dir = kickDir;
    this.ball.launch(kickDir * (35 + this.random() * 25), 18 + this.random() * 17);
    this.kicks++;
    this.pounceMs = POUNCE_MS;
  }

  private updateFetch(dt: number): void {
    this.moving = false;
    if (this.airTotalMs > 0) {
      this.updateCatchLeap(dt);
      return;
    }
    this.fall(dt);
    if (this.ball.state !== 'free') {
      this.enterNext('sit');
      return;
    }
    if (this.tryCatch()) {
      this.enter('bring', BRING_MAX_MS);
      return;
    }
    const plan = this.planIntercept();
    if (!plan) {
      this.running = true;
      this.moving = this.approach(this.noseTargetFor(this.ball.center), FETCH_RUN_SPEED * dt);
      return;
    }
    this.dir = plan.dir;
    if (plan.lift > STAND_LIFT && plan.t - riseTime(plan.lift) <= dt) {
      this.leapFrom = this.x;
      this.leapTo = plan.x;
      this.leapHeight = plan.lift;
      this.airMs = 0;
      this.airTotalMs = 2000 * riseTime(plan.lift);
      return;
    }
    this.running = Math.abs(plan.x - this.x) > FETCH_FAR || !this.ball.resting;
    const speed = this.running ? FETCH_RUN_SPEED : FETCH_WALK_SPEED;
    this.moving = this.approach(plan.x, speed * dt);
  }

  private updateCatchLeap(dt: number): void {
    this.airMs += dt * 1000;
    const p = Math.min(this.airMs / this.airTotalMs, 1);
    this.x = this.leapFrom + (this.leapTo - this.leapFrom) * Math.min(1, 2 * p);
    this.y = 4 * this.leapHeight * p * (1 - p);
    if (this.ball.state === 'free') {
      this.tryCatch();
    }
    if (p < 1) {
      return;
    }
    this.y = 0;
    this.airTotalMs = 0;
    if (this.ball.state === 'mouth') {
      this.enter('bring', BRING_MAX_MS);
    }
  }

  private tryCatch(): boolean {
    const ball = this.ball;
    const mouthGap = Math.hypot(
      ball.center - (this.x + this.mouthOffset()),
      ball.y + BALL_SIZE / 2 - (this.y + MOUTH_HEIGHT),
    );
    const atNose = this.y === 0 && ball.y < 1 && Math.abs(ball.center - (this.x + this.noseOffset())) <= NOSE_REACH;
    if (mouthGap > CATCH_RADIUS && !atNose) {
      return false;
    }
    ball.state = 'mouth';
    ball.vx = 0;
    ball.vy = 0;
    this.playerX ??= this.pointer?.x ?? this.worldWidth / 2;
    return true;
  }

  // Earliest point on the ball's predicted path the buddy can reach in time, by nose on the ground or mouth in the air.
  private planIntercept(): Intercept | undefined {
    const sim = Object.assign(new Ball(), this.ball);
    const body = this.x + SPRITE_SIZE / 2;
    const maxLift = Math.min(CATCH_LEAP_MAX, this.maxY);
    for (let t = 0; t <= PREDICT_S; t += PREDICT_STEP) {
      const cx = sim.center;
      const lift = sim.y + BALL_SIZE / 2 - MOUTH_HEIGHT;
      const grounded = sim.y < 1;
      if (grounded || (lift >= -CATCH_RADIUS && lift <= maxLift)) {
        const dir = cx > body + 2 ? 1 : cx < body - 2 ? -1 : this.dir;
        const offset = grounded ? this.noseOffset(dir) : this.mouthOffset(dir);
        const x = clamp(cx - offset, 0, this.maxX);
        const inTime = grounded || lift <= STAND_LIFT || t >= riseTime(lift) - PREDICT_STEP;
        const reachable =
          Math.abs(x + offset - cx) <= CATCH_RADIUS && Math.abs(x - this.x) <= FETCH_RUN_SPEED * t + 1;
        if (inTime && reachable) {
          return { x, dir, t, lift: grounded ? 0 : lift };
        }
      }
      sim.update(PREDICT_STEP, this.worldWidth, this.worldHeight);
    }
    return undefined;
  }

  private updateBring(dt: number): void {
    const playerX = this.playerX ?? this.worldWidth / 2;
    if (!this.approach(this.noseTargetFor(playerX), BRING_SPEED * dt)) {
      this.showOff();
    }
  }

  private showOff(): void {
    let pick = Math.floor(this.random() * TRICKS.length) % TRICKS.length;
    if (pick === this.lastTrick) {
      pick = (pick + 1) % TRICKS.length;
    }
    this.lastTrick = pick;
    const trick = TRICKS[pick];
    if (!trick) {
      this.dropBall();
      this.ball.vx = 0;
      this.enter('await', AWAIT_MS);
      return;
    }
    this.trick = trick;
    this.trickMs = 0;
    this.tosses = 0;
    this.tossPhase = 'flick';
    this.enter('trick', trick === 'toss' ? TOSS_MAX_MS : totalDuration(ANIMATIONS[trick]));
  }

  // The toss uses the real ball: flick it straight up, watch it, catch it on the way down.
  private updateToss(dt: number): void {
    const ball = this.ball;
    this.trickMs += dt * 1000;
    switch (this.tossPhase) {
      case 'flick':
        if (this.trickMs >= TOSS_FLICK_MS) {
          const mouthX = this.x + this.mouthOffset();
          ball.place(mouthX - BALL_SIZE / 2, MOUTH_HEIGHT - BALL_SIZE / 2, this.worldWidth, this.worldHeight);
          const room = this.worldHeight - BALL_SIZE - MOUTH_HEIGHT - 2;
          ball.launch(0, Math.min(TOSS_VY, Math.sqrt(2 * 140 * Math.max(room, 4))));
          this.tossPhase = 'air';
          this.trickMs = 0;
        }
        return;
      case 'air': {
        if (ball.state !== 'free') {
          return;
        }
        const gap = Math.hypot(ball.center - (this.x + this.mouthOffset()), ball.y + BALL_SIZE / 2 - MOUTH_HEIGHT);
        if (ball.vy < 0 && gap <= CATCH_RADIUS) {
          ball.state = 'mouth';
          ball.vx = 0;
          ball.vy = 0;
          this.tossPhase = 'catch';
          this.trickMs = 0;
        } else if (ball.y === 0) {
          this.finishState();
        }
        return;
      }
      case 'catch':
        if (this.trickMs >= TOSS_CATCH_MS) {
          this.tosses++;
          if (this.tosses >= TOSS_THROWS) {
            this.finishState();
          } else {
            this.tossPhase = 'flick';
            this.trickMs = 0;
          }
        }
        return;
    }
  }

  private updateHunt(dtMs: number): void {
    this.phaseMs += dtMs;
    const bug = this.bug;
    const waiting = this.huntPhase === 'spot' || this.huntPhase === 'stalk' || this.huntPhase === 'wiggle';
    if (waiting && !bug.active) {
      this.setPhase('miss');
      return;
    }
    switch (this.huntPhase) {
      case 'spot':
        this.faceX(bug.centerX, 0);
        if (this.phaseMs >= SPOT_MS) {
          this.setPhase('stalk');
        }
        break;
      case 'stalk': {
        const target = clamp(this.noseTargetFor(bug.centerX) - this.dir * STALK_GAP, 0, this.maxX);
        const step = (STALK_SPEED * dtMs) / 1000;
        if (!this.approach(target, step) || this.phaseMs >= STALK_MAX_MS) {
          bug.freeze();
          this.setPhase('wiggle');
        }
        break;
      }
      case 'wiggle':
        this.faceX(bug.centerX, 0);
        if (this.phaseMs >= WIGGLE_MS) {
          this.startLeap();
        }
        break;
      case 'leap': {
        const p = Math.min(this.phaseMs / LEAP_MS, 1);
        this.x = this.leapFrom + (this.leapTo - this.leapFrom) * p;
        this.y = 4 * this.leapHeight * p * (1 - p);
        if (p >= 1) {
          this.y = 0;
          if (this.willCatch) {
            bug.caught();
            this.setPhase('catch');
          } else {
            this.setPhase('miss');
          }
        }
        break;
      }
      case 'catch':
      case 'miss':
        if (this.phaseMs >= (this.huntPhase === 'catch' ? CATCH_MS : MISS_MS)) {
          this.enterNext(this.pickNext());
        }
        break;
    }
  }

  private startLeap(): void {
    this.willCatch = this.random() < CATCH_CHANCE;
    this.leapFrom = this.x;
    this.leapTo = this.noseTargetFor(this.bug.centerX);
    this.leapHeight = clamp(this.bug.centerY - NOSE_HEIGHT, 3, Math.max(3, this.maxY));
    if (!this.willCatch) {
      this.bug.flee(this.dir);
    }
    this.setPhase('leap');
  }

  private setPhase(phase: HuntPhase): void {
    this.huntPhase = phase;
    this.phaseMs = 0;
  }

  private noseOffset(dir = this.dir): number {
    return dir === 1 ? NOSE_X : SPRITE_SIZE - 1 - NOSE_X;
  }

  private mouthOffset(dir = this.dir): number {
    return dir === 1 ? MOUTH_X : SPRITE_SIZE - MOUTH_X;
  }

  private offsetFor(spriteX: number, dir = this.dir): number {
    return dir === 1 ? spriteX : SPRITE_SIZE - spriteX;
  }

  /** Walks facing its way to `targetX`, then turns to `arrivalDir`; returns false once there. */
  private walkTo(targetX: number, arrivalDir: 1 | -1, step: number): boolean {
    const target = clamp(targetX, 0, this.maxX);
    if (Math.abs(target - this.x) > step) {
      this.dir = target > this.x ? 1 : -1;
      this.x += this.dir * step;
      return true;
    }
    this.x = target;
    this.dir = arrivalDir;
    return false;
  }

  // Eats facing the treat, unless that would put the treat past the edge of the view.
  private eatingSide(): 1 | -1 {
    const centerX = this.treat.centerX;
    const towards = centerX >= this.x + SPRITE_SIZE / 2 ? 1 : -1;
    const fits = (dir: 1 | -1): boolean => {
      const x = centerX - this.offsetFor(TREAT_PAWS_X, dir);
      return x >= 0 && x <= this.maxX;
    };
    return fits(towards) || !fits(towards === 1 ? -1 : 1) ? towards : towards === 1 ? -1 : 1;
  }

  /** Faces `targetX` and returns the buddy x that puts its nose on it. */
  private noseTargetFor(targetX: number): number {
    this.faceX(targetX, 3);
    return clamp(targetX - this.noseOffset(), 0, this.maxX);
  }

  /** Moves toward `target`; returns false once it is reached. */
  private approach(target: number, step: number): boolean {
    if (Math.abs(target - this.x) <= step) {
      this.x = target;
      return false;
    }
    this.x += Math.sign(target - this.x) * step;
    return true;
  }

  private faceX(targetX: number, deadzone: number): void {
    const bodyCenter = this.x + SPRITE_SIZE / 2;
    let dir = this.dir;
    if (targetX > bodyCenter + deadzone) {
      dir = 1;
    } else if (targetX < bodyCenter - deadzone) {
      dir = -1;
    }
    if (dir !== this.dir) {
      this.dir = dir;
      this.sinceTurnMs = 0;
    }
  }

  // A rolling ball bounces off the body unless the buddy is the one playing with it.
  private bumpBall(): void {
    const ball = this.ball;
    if (ball.state !== 'free' || BALL_FOCUS_STATES.has(this.state) || !this.visible) {
      return;
    }
    const left = this.x + BODY_LEFT;
    const right = this.x + BODY_RIGHT;
    const overlapping = ball.x + BALL_SIZE > left && ball.x < right && ball.y < BODY_HEIGHT + this.y;
    if (!overlapping) {
      return;
    }
    const fromLeft = ball.center < (left + right) / 2;
    if ((fromLeft && ball.vx > 0) || (!fromLeft && ball.vx < 0)) {
      ball.vx = -ball.vx * BUMP_DAMPING;
      ball.x = fromLeft ? left - BALL_SIZE : right;
      ball.place(ball.x, ball.y, this.worldWidth, this.worldHeight);
    }
  }

  private dropBall(): void {
    const nose = this.x + this.noseOffset();
    this.ball.place(nose - BALL_SIZE / 2, 4, this.worldWidth, this.worldHeight);
    this.ball.launch(this.dir * 10, 0);
  }

  private fall(dt: number): void {
    this.y = Math.max(0, this.y - FALL_SPEED * dt);
  }

  private flipped(from = this.startDir): 1 | -1 {
    return from === 1 ? -1 : 1;
  }

  private tryEnter(state: BuddyState, duration: number): void {
    if ((PRIORITY[state] ?? 0) < (PRIORITY[this.state] ?? 0)) {
      return;
    }
    if (this.state === 'hunt') {
      this.bug.flee(this.dir);
    }
    if (this.ball.state === 'mouth') {
      this.dropBall();
    }
    this.enter(state, duration);
  }

  private enter(state: BuddyState, duration: number): void {
    if (SPEED[state] !== undefined) {
      this.dir = this.random() < 0.5 ? -1 : 1;
    }
    if (!OFFSCREEN_STATES.has(state)) {
      this.clampX();
    }
    this.startDir = this.dir;
    this.state = state;
    this.elapsed = 0;
    this.duration = duration;
    this.airTotalMs = 0;
    if (state !== 'snack' && this.treat.state === 'eating') {
      this.putTreatDown();
    }
  }

  // Interrupted mid-meal: leave what is left on the ground, ready to be finished later.
  private putTreatDown(): void {
    const left = frameAt(ANIMATIONS.eat, this.eatMs).treat;
    if (left === undefined) {
      this.treat.state = 'none';
      return;
    }
    this.treat.state = 'free';
    this.treat.stage = left;
    this.treat.facing = this.dir;
  }

  private clampX(): void {
    this.x = clamp(this.x, 0, this.maxX);
  }

  private move(distance: number): void {
    if (this.maxX <= 0) {
      return;
    }
    this.x += this.dir * distance;
    if (this.x <= 0) {
      this.x = 0;
      this.dir = 1;
    } else if (this.x >= this.maxX) {
      this.x = this.maxX;
      this.dir = -1;
    }
  }

  private ambientDuration(state: BuddyState): number {
    const between = (min: number, max: number): number => min + this.random() * (max - min);
    switch (state) {
      case 'walk':
        return between(4000, 9000);
      case 'run':
        return between(1500, 2500);
      case 'sit':
        return between(6000, 14_000);
      case 'lie':
        return between(8000, 20_000);
      case 'sniff':
        return between(3000, 6000);
      case 'jump':
        return JUMP_MS;
      case 'groom':
        return totalDuration(ANIMATIONS.groom) * 6;
      case 'chaseTail':
        return CHASE_FLIP_MS * 7;
      case 'lookAround':
        return LOOK_FLIP_MS * 2;
      case 'stretch':
      case 'yawn':
        return totalDuration(ANIMATIONS[state]);
      case 'dizzy':
        return 1600;
      default:
        return between(3000, 7000);
    }
  }
}
