import { BIRD_W, BOWL_H, BOWL_W } from '../../sprites/props';
import { clamp, type Box } from '../math';

/** How fast the bird flies with it, how long its flight lasts at least, and how high it comes in. */
const FLY_SPEED = 62;
const FLIGHT_MIN_S = 1.1;
const FLY_HIGH = 30;
/** How fast the bird climbs away once its claws are free, or with the bowl in them. */
const CLIMB = 34;
const FLAP_S = 0.13;
/** Batted by the fox, it slides off along the ground at this speed. */
const SLIDE_SPEED = 150;

/** Where it is in its little life: not there, flown in, set down, batted away, about to be picked up, flown away. */
type Stage = 'none' | 'coming' | 'down' | 'sliding' | 'fetched' | 'going';

/** The bird that carries a bowl: where it is, which way it flies, and its wings. */
export interface Courier {
  x: number;
  y: number;
  dir: 1 | -1;
  wingsUp: boolean;
}

/**
 * A food or water bowl that is only there when the fox needs it. A little bird flies it in and sets it down;
 * the fox bats it away when it is done with it, and if it does not, the bird comes back for it.
 */
export class Bowl {
  x = 0;
  /** How high above the ground it is, while the bird has it. */
  y = 0;
  /** Kibble or sips left. */
  amount = 0;
  /** The bird, while it is around. */
  courier: Courier | undefined;
  private stage: Stage = 'none';
  private spot = 0;
  private from = 0;
  private high = 0;
  private flown = 0;
  private flightS = 1;
  private vx = 0;
  private width = 0;
  private height = 0;
  private vanishMs = 0;
  private t = 0;

  /** There for the fox, or on its way to it: not one that is leaving. */
  get active(): boolean {
    return this.stage === 'coming' || this.stage === 'down' || this.stage === 'fetched';
  }

  /** On the ground, to eat or drink from. */
  get ready(): boolean {
    return this.stage === 'down' || this.stage === 'fetched';
  }

  get visible(): boolean {
    return this.stage !== 'none';
  }

  get moving(): boolean {
    return this.courier !== undefined || this.stage === 'sliding';
  }

  get box(): Box {
    return { x: this.x, y: this.y, w: BOWL_W, h: BOWL_H };
  }

  /** Where it stands, or will once it is set down. */
  get centerX(): number {
    return this.spot + BOWL_W / 2;
  }

  get empty(): boolean {
    return this.active && this.amount === 0;
  }

  /** Has it flown in and set down around `centerX`, from the side away from the fox standing at `foxX`. */
  show(centerX: number, worldWidth: number, worldHeight: number, foxX: number): void {
    this.width = worldWidth;
    this.height = worldHeight;
    this.amount = 0;
    this.vanishMs = 0;
    this.spot = clamp(centerX - BOWL_W / 2, 0, Math.max(0, worldWidth - BOWL_W));
    this.fly('coming', this.spot + BOWL_W / 2 <= foxX ? 1 : -1);
    this.x = this.from;
    this.y = this.high;
  }

  fill(amount: number): void {
    this.amount = amount;
    this.vanishMs = 0;
  }

  /** If the fox has not sent it off after this long, the bird comes back for it. */
  finish(afterMs: number): void {
    this.vanishMs = afterMs;
  }

  /** The fox bats it: it slides off the way it was pushed. */
  push(dir: 1 | -1): void {
    if (this.stage === 'down' || this.stage === 'fetched') {
      this.stage = 'sliding';
      this.vx = dir * SLIDE_SPEED;
      this.vanishMs = 0;
      this.courier = undefined;
    }
  }

  /** The bird takes it away. */
  hide(): void {
    this.vanishMs = 0;
    if (this.stage === 'down') {
      this.fly('fetched', this.spot + BOWL_W / 2 < this.width / 2 ? 1 : -1);
    } else if (this.stage === 'coming' && this.courier) {
      // Not needed after all: it turns round with it.
      this.stage = 'going';
      this.courier.dir = -this.courier.dir as 1 | -1;
    }
  }

  update(dtMs: number): void {
    if (this.stage === 'none') {
      return;
    }
    const dt = dtMs / 1000;
    this.t += dt;
    const bird = this.courier;
    if (bird) {
      bird.wingsUp = Math.floor(this.t / FLAP_S) % 2 === 0;
    }
    if (this.stage === 'coming' || this.stage === 'fetched') {
      this.approach(dt);
    } else if (this.stage === 'going' && bird) {
      // Up and away with it, back the way it came.
      bird.x += bird.dir * FLY_SPEED * dt;
      bird.y += CLIMB * dt;
      this.x = bird.x + (BIRD_W - BOWL_W) / 2;
      this.y = bird.y - BOWL_H;
      if (this.gone(bird.x, bird.y)) {
        this.stage = 'none';
        this.courier = undefined;
      }
    } else if (this.stage === 'sliding') {
      this.x += this.vx * dt;
      if (this.x < -BOWL_W || this.x > this.width) {
        this.stage = 'none';
      }
    } else if (bird) {
      // The bowl is down: the bird flies off with empty claws.
      bird.x += bird.dir * FLY_SPEED * dt;
      bird.y += CLIMB * 1.6 * dt;
      if (this.gone(bird.x, bird.y)) {
        this.courier = undefined;
      }
    }
    if (this.vanishMs > 0) {
      this.vanishMs -= dtMs;
      if (this.vanishMs <= 0) {
        this.hide();
      }
    }
  }

  private gone(x: number, y: number): boolean {
    return y > this.height || x < -BIRD_W || x > this.width;
  }

  /** Sends the bird in from the edge it flies `dir` from, down to the bowl's spot. */
  private fly(stage: 'coming' | 'fetched', dir: 1 | -1): void {
    this.stage = stage;
    this.from = dir > 0 ? -BIRD_W : this.width;
    this.high = clamp(this.height - BOWL_H - 8, 6, FLY_HIGH);
    this.flown = 0;
    this.flightS = Math.max(FLIGHT_MIN_S, Math.abs(this.spot - this.from) / FLY_SPEED);
    this.courier = { x: this.from, y: this.high + BOWL_H, dir, wingsUp: true };
  }

  // The bird slows as it nears the spot and comes down onto it in a curve.
  private approach(dt: number): void {
    const bird = this.courier;
    if (!bird) {
      return;
    }
    this.flown = Math.min(1, this.flown + dt / this.flightS);
    const p = this.flown;
    const x = this.from + (this.spot - this.from) * (1 - (1 - p) * (1 - p));
    const y = this.high * (1 - p * p);
    bird.x = x - (BIRD_W - BOWL_W) / 2;
    bird.y = y + BOWL_H;
    if (this.stage === 'coming') {
      this.x = x;
      this.y = y;
    }
    if (p < 1) {
      return;
    }
    // There: it lets go of the bowl, or takes hold of it, and leaves the way it came.
    bird.dir = -bird.dir as 1 | -1;
    this.stage = this.stage === 'coming' ? 'down' : 'going';
    this.x = this.spot;
    this.y = 0;
  }
}
