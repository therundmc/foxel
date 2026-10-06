import type { Reaction } from '../shared/protocol';
import { Ball, clamp } from './ball';
import { Bug } from './bug';
import {
  ANIMATIONS,
  BALL_SIZE,
  JUMP_AIR_MS,
  JUMP_CROUCH_MS,
  JUMP_LAND_MS,
  NOSE_X,
  SPRITE_SIZE,
  totalDuration,
  type AnimName,
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
  | 'panic';

type HuntPhase = 'spot' | 'stalk' | 'wiggle' | 'leap' | 'catch' | 'miss';
type TimedReaction = 'alert' | 'wave' | 'love' | 'happy' | 'celebrate' | 'sad' | 'panic';

export interface WorldPoint {
  x: number;
  y: number;
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
  idle: [['walk', 30], ['sit', 25], ['sniff', 12], ['lookAround', 10], ['hunt', 7], ['leave', 4], ['stretch', 4], ['jump', 3], ['run', 2], ['chaseTail', 1]],
  walk: [['idle', 30], ['sit', 20], ['sniff', 20], ['lookAround', 10], ['hunt', 7], ['leave', 4], ['jump', 3], ['run', 3]],
  run: [['idle', 50], ['sit', 30], ['walk', 20]],
  sit: [['lie', 30], ['walk', 20], ['groom', 15], ['idle', 15], ['yawn', 10], ['lookAround', 10]],
  lie: [['stretch', 30], ['sit', 25], ['idle', 20], ['groom', 10], ['walk', 10]],
  sniff: [['walk', 40], ['idle', 20], ['sit', 20], ['hunt', 10], ['lookAround', 10]],
  groom: [['sit', 40], ['lie', 30], ['idle', 30]],
  yawn: [['lie', 50], ['sit', 30], ['idle', 20]],
  stretch: [['walk', 50], ['idle', 30], ['sit', 20]],
  lookAround: [['walk', 40], ['idle', 30], ['sit', 20], ['hunt', 10]],
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
const BALL_FOCUS_STATES: ReadonlySet<BuddyState> = new Set(['watch', 'fetch', 'play']);
const OFFSCREEN_STATES: ReadonlySet<BuddyState> = new Set(['leave', 'away', 'arrive']);
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
const SPEED: Partial<Record<BuddyState, number>> = { walk: WALK_SPEED, run: 35, sniff: 3, panic: 45 };
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
const FETCH_FAR = 20;
const BODY_LEFT = 6;
const BODY_RIGHT = 26;
const BODY_HEIGHT = 22;
const BUMP_DAMPING = 0.5;

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

const HUNT_ANIM: Record<HuntPhase, AnimName> = {
  spot: 'alert',
  stalk: 'stalk',
  wiggle: 'wiggle',
  leap: 'leap',
  catch: 'proud',
  miss: 'puzzled',
};

export class Behavior {
  x = 0;
  y = 0;
  dir: 1 | -1 = 1;
  state: BuddyState = 'idle';
  elapsed = 0;
  readonly ball = new Ball();
  readonly bug = new Bug();
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
    return RESTFUL_STATES.has(this.state) && !ballMoving && !this.bug.active && this.y === 0;
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
    const ballInPlay =
      this.ball.state === 'held' || (this.ball.state === 'free' && BALL_FOCUS_STATES.has(this.state));
    if (ballInPlay) {
      return { x: this.ball.center, y: this.ball.y + BALL_SIZE / 2 };
    }
    return this.pointer;
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

  startErrand(): void {
    if (this.ball.state === 'free') {
      this.startPlay();
    } else if (this.ball.state === 'none') {
      this.startLeave('fetch');
    }
  }

  update(dtMs: number): void {
    this.elapsed += dtMs;
    const dt = dtMs / 1000;

    this.ball.update(dt, this.worldWidth, this.worldHeight);
    this.bumpBall();
    this.bug.update(dt, this.worldWidth, this.worldHeight, this.random);
    this.sinceTurnMs += dtMs;

    const speed = SPEED[this.state];
    if (speed !== undefined) {
      this.move(speed * dt);
    }

    if (FACE_TARGET_STATES.has(this.state) && this.sinceTurnMs >= TURN_COOLDOWN_MS) {
      const target = this.focusTarget();
      if (target) {
        this.faceX(target.x, FACE_DEADZONE);
      }
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
      case 'bring':
        this.updateBring(dt);
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
      case 'play':
        if (this.pounceMs > 0) {
          return { anim: 'pounce', elapsed: POUNCE_MS - this.pounceMs };
        }
        return { anim: this.moving ? 'run' : 'idle', elapsed: this.elapsed };
      case 'fetch':
        if (!this.moving) {
          return { anim: 'watch', elapsed: this.elapsed };
        }
        return { anim: this.running ? 'run' : 'walk', elapsed: this.elapsed };
      case 'hunt':
        return { anim: HUNT_ANIM[this.huntPhase], elapsed: this.phaseMs };
      case 'petted':
        if (this.petMs >= CUDDLE_AFTER_MS) {
          return { anim: 'cuddle', elapsed: this.petMs - CUDDLE_AFTER_MS };
        }
        return { anim: 'petted', elapsed: this.petMs };
      default:
        return { anim: this.state, elapsed: this.elapsed };
    }
  }

  private finishState(): void {
    switch (this.state) {
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
      default:
        this.enterNext(this.pickNext());
    }
  }

  private pickNext(): BuddyState {
    const weights = NEXT[this.state] ?? DEFAULT_NEXT;
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
    if (this.approach(this.noseTargetFor(this.ball.center), PLAY_SPEED * dt)) {
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
    if (this.ball.state !== 'free') {
      this.enterNext('sit');
      return;
    }
    const target = this.noseTargetFor(this.ball.center);
    this.running = Math.abs(target - this.x) > FETCH_FAR || Math.abs(this.ball.vx) > FETCH_FAR;
    const speed = this.running ? FETCH_RUN_SPEED : FETCH_WALK_SPEED;
    if (this.approach(target, speed * dt)) {
      this.moving = true;
      return;
    }
    if (this.ball.resting) {
      this.ball.state = 'mouth';
      this.playerX ??= this.pointer?.x ?? this.worldWidth / 2;
      this.enter('bring', BRING_MAX_MS);
    }
  }

  private updateBring(dt: number): void {
    const playerX = this.playerX ?? this.worldWidth / 2;
    if (!this.approach(this.noseTargetFor(playerX), BRING_SPEED * dt)) {
      this.dropBall();
      this.ball.vx = 0;
      this.enter('await', AWAIT_MS);
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

  private noseOffset(): number {
    return this.dir === 1 ? NOSE_X : SPRITE_SIZE - 1 - NOSE_X;
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

  private flipped(): 1 | -1 {
    return this.startDir === 1 ? -1 : 1;
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
