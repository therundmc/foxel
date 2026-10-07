import { MOUTH_X, NOSE_X } from '../sprites/fox/anchors';
import type { AnimName } from '../sprites/fox/animations';
import { SPRITE_SIZE } from '../sprites/frames';
import { BALL_SIZE, type Emote, type Hat } from '../sprites/props';
import { DEFAULT_NEXT, NIGHT_DAMPING, PHASE_NEXT } from './features/ambient';
import { ContemplateMemory } from './features/contemplate';
import { FetchMemory } from './features/fetch';
import { HuntMemory } from './features/hunt';
import { IntroMemory } from './features/intro';
import { MealsMemory } from './features/meals';
import { MousingMemory } from './features/mousing';
import { PlayMemory } from './features/play';
import { PointerMemory } from './features/pointer';
import { RestMemory } from './features/rest';
import { TouchMemory } from './features/touch';
import { SnackMemory } from './features/treat';
import { TricksMemory } from './features/tricks';
import { clamp } from './math';
import { FEATURES, STATES, URGES } from './registry';
import type { AnimRef, BuddyState, Dir, Gaze, StateDef } from './state';
import type { World, WorldPoint } from './world';

const FALL_SPEED = 60;
const FACE_DEADZONE = 8;
const TURN_COOLDOWN_MS = 700;
const TURN_DELAY_MS = 450;
const GAZE_BEHIND = 6;
const GAZE_MIN_RISE = 10;
const GAZE_SLOPE = 0.6;
const EMOTE_CYCLE_MS = 6000;
const EMOTE_SHOW_MS = 1500;

/**
 * One pet: where it is, what it is doing, and the engine that takes it from one state to the next.
 * It knows no state by name: what each state does is in `features/`, looked up through `STATES`.
 */
export class Buddy {
  x = 0;
  y = 0;
  dir: Dir = 1;
  state: BuddyState = 'idle';
  /** Time spent in the current state, and how long it lasts. */
  elapsed = 0;
  duration: number;
  /** Way it faced when the current state began. */
  startDir: Dir = 1;
  /** On its way somewhere, and running rather than walking there: picks the frames some states show. */
  moving = false;
  running = false;
  /** False until it has been given a spot in the view. */
  placed = false;
  // What each feature remembers from one frame to the next.
  readonly hunt = new HuntMemory();
  readonly mousing = new MousingMemory();
  readonly fetch = new FetchMemory();
  readonly tricks = new TricksMemory();
  readonly play = new PlayMemory();
  readonly touch = new TouchMemory();
  readonly pointer = new PointerMemory();
  readonly snack = new SnackMemory();
  readonly meals = new MealsMemory();
  readonly rest = new RestMemory();
  readonly contemplate = new ContemplateMemory();
  readonly intro = new IntroMemory();
  private sinceTurnMs = 0;
  private behindMs = 0;

  constructor(readonly world: World) {
    this.duration = this.ambientDuration('idle');
    world.buddies.push(this);
  }

  get def(): StateDef {
    return STATES[this.state];
  }

  get maxX(): number {
    return this.world.width - SPRITE_SIZE;
  }

  get maxY(): number {
    return this.world.height - SPRITE_SIZE;
  }

  get visible(): boolean {
    return !this.def.hidden;
  }

  /** Needs wait until it is not busy with something else. */
  get free(): boolean {
    return Boolean(this.def.calm || this.def.free);
  }

  get restful(): boolean {
    return Boolean(this.def.restful) && this.y === 0;
  }

  /** On for a moment every few seconds: how long-lasting states flash their emote. */
  get pulse(): boolean {
    return this.elapsed % EMOTE_CYCLE_MS < EMOTE_SHOW_MS;
  }

  worldResized(): void {
    if (!this.placed && this.maxX > 0) {
      this.placed = true;
      this.x = Math.floor(this.world.random() * this.maxX);
    }
    if (!this.def.offscreen) {
      this.clampX();
    }
  }

  restore(x: number, dir: 1 | -1): void {
    this.x = x;
    this.dir = dir;
    this.placed = true;
    this.clampX();
  }

  /** What the buddy is paying attention to, and turns toward when resting. */
  focusTarget(): WorldPoint | undefined {
    const own = this.def.focus?.(this);
    if (own) {
      return own;
    }
    const { ball, treat, pointer } = this.world;
    if (treat.state === 'held') {
      return { x: treat.centerX, y: treat.centerY };
    }
    const ballInPlay = ball.state === 'held' || (ball.state === 'free' && this.def.ballFocus);
    if (ballInPlay) {
      return { x: ball.center, y: ball.y + BALL_SIZE / 2 };
    }
    return pointer;
  }

  /** Which way the eyes look from `eye` (world position) toward what the buddy is watching. */
  gaze(eye: WorldPoint): Gaze | undefined {
    const def = this.def;
    if (def.scriptedGaze) {
      return def.scriptedGaze(this);
    }
    const target = def.gazes || def.facesTarget ? this.focusTarget() : undefined;
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

  hat(): Hat | undefined {
    const own = this.def.hat?.(this);
    if (own) {
      return own === 'none' ? undefined : own;
    }
    return this.world.party && !this.def.offscreen ? 'party' : undefined;
  }

  /** A little picture bubble above its head: what it feels or wants, without a word. */
  emote(): Emote | undefined {
    return this.def.emote?.(this);
  }

  current(): AnimRef {
    return this.def.anim?.(this) ?? { anim: this.state as AnimName, elapsed: this.elapsed };
  }

  update(dtMs: number): void {
    this.elapsed += dtMs;
    const dt = dtMs / 1000;
    this.sinceTurnMs += dtMs;
    for (const feature of FEATURES) {
      feature.tick?.(this, dtMs);
    }
    if (this.def.calm) {
      URGES.some((urge) => urge(this));
    }

    const speed = this.def.speed;
    if (speed !== undefined) {
      this.move(speed * dt);
    }

    // Glance back first; only turn around if the target stays behind.
    const target = this.def.facesTarget ? this.focusTarget() : undefined;
    const behind = target !== undefined && (target.x - (this.x + SPRITE_SIZE / 2)) * this.dir < -FACE_DEADZONE;
    this.behindMs = behind ? this.behindMs + dtMs : 0;
    if (target && this.sinceTurnMs >= TURN_COOLDOWN_MS && this.behindMs >= TURN_DELAY_MS) {
      this.faceX(target.x, FACE_DEADZONE);
    }

    const update = this.def.update;
    if (!update) {
      this.fall(dt);
    } else if (update(this, dt, dtMs)) {
      return;
    }
    if (this.elapsed >= this.duration) {
      this.finishState();
    }
  }

  /** Switches to `state` unless what it is doing matters more. */
  tryEnter(state: BuddyState, duration: number): void {
    if ((STATES[state].priority ?? 0) < (this.def.priority ?? 0)) {
      return;
    }
    this.interrupt();
    this.enter(state, duration);
  }

  enter(state: BuddyState, duration: number): void {
    if (STATES[state].speed !== undefined) {
      this.dir = this.world.random() < 0.5 ? -1 : 1;
    }
    if (!STATES[state].offscreen) {
      this.clampX();
    }
    this.startDir = this.dir;
    this.state = state;
    this.elapsed = 0;
    this.duration = duration;
    for (const feature of FEATURES) {
      feature.entered?.(this, state);
    }
  }

  /** Enters `state` the way it comes up on its own, for as long as it usually lasts. */
  enterNext(state: BuddyState): void {
    const begin = STATES[state].begin;
    if (begin) {
      begin(this);
    } else {
      this.enter(state, this.ambientDuration(state));
    }
  }

  /** Lets go of whatever the current state was holding on to, before another one cuts in. */
  interrupt(): void {
    for (const feature of FEATURES) {
      feature.interrupted?.(this);
    }
  }

  finishState(): void {
    const finish = this.def.finish;
    if (finish) {
      finish(this);
    } else {
      this.enterNext(this.pickNext());
    }
  }

  pickNext(): BuddyState {
    const phase = this.world.phase;
    const extra = this.free && phase ? (PHASE_NEXT[phase] ?? []) : [];
    const weights = [...(this.def.next ?? DEFAULT_NEXT), ...extra]
      .filter(([s]) => STATES[s].available?.(this) ?? true)
      .map(([s, w]) => [s, phase === 'night' && STATES[s].nightDamped ? w * NIGHT_DAMPING : w] as const);
    const total = weights.reduce((sum, [, w]) => sum + w, 0);
    let r = this.world.random() * total;
    for (const [state, weight] of weights) {
      if (r < weight) {
        return state === this.state ? 'idle' : state;
      }
      r -= weight;
    }
    return 'idle';
  }

  ambientDuration(state: BuddyState): number {
    return STATES[state].duration?.(this) ?? this.between(3000, 7000);
  }

  between(min: number, max: number): number {
    return min + this.world.random() * (max - min);
  }

  noseOffset(dir = this.dir): number {
    return dir === 1 ? NOSE_X : SPRITE_SIZE - 1 - NOSE_X;
  }

  mouthOffset(dir = this.dir): number {
    return dir === 1 ? MOUTH_X : SPRITE_SIZE - MOUTH_X;
  }

  offsetFor(spriteX: number, dir = this.dir): number {
    return dir === 1 ? spriteX : SPRITE_SIZE - spriteX;
  }

  /** Walks facing its way to `targetX`, then turns to `arrivalDir`; returns false once there. */
  walkTo(targetX: number, arrivalDir: 1 | -1, step: number): boolean {
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

  /** Faces `targetX` and returns the buddy x that puts its nose on it. */
  noseTargetFor(targetX: number): number {
    this.faceX(targetX, 3);
    return clamp(targetX - this.noseOffset(), 0, this.maxX);
  }

  /** Moves toward `target`; returns false once it is reached. */
  approach(target: number, step: number): boolean {
    if (Math.abs(target - this.x) <= step) {
      this.x = target;
      return false;
    }
    this.x += Math.sign(target - this.x) * step;
    return true;
  }

  faceX(targetX: number, deadzone: number): void {
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

  fall(dt: number): void {
    this.y = Math.max(0, this.y - FALL_SPEED * dt);
  }

  flipped(from = this.startDir): 1 | -1 {
    return from === 1 ? -1 : 1;
  }

  clampX(): void {
    this.x = clamp(this.x, 0, this.maxX);
  }

  move(distance: number): void {
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
}
