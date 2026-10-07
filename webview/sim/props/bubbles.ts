import { clamp } from '../math';

/** However often you blow, there are never more than this many in the air. */
const MOST = 48;
/** One breath: this many bubbles at least and at most, one leaving the wand every so often. */
const BLOWN = [9, 13] as const;
const EVERY_S = 0.11;
/** A bubble swells to its size as it leaves the wand. */
const INFLATE_S = 0.4;
/** How fast they leave the wand, upward and to the sides. */
const PUFF_UP = 34;
const PUFF_ASIDE = 70;
/** Each floats up to a height of its own and hovers there: how strongly it is drawn to it, and how the air holds it back. */
const BUOYANCY = 1.6;
const DRAG = 1.3;
/** It bobs and sways as it hovers. */
const BOB = 5;
const SWAY = 7;
/** Two bubbles that touch push each other gently apart, and so do the edges of the view. */
const NUDGE = 40;
/** It lasts this long at least and at most, then bursts by itself. */
const LIFE_S = [11, 20] as const;
/** A bubble this big splits into little ones when it bursts, which fly out at this speed. */
const SPLITS_FROM = 5;
const SPLIT_SPEED = 26;
/** A bubble held somewhere (on a nose) glides there at this rate. */
const GLIDE = 5;

/** How long the burst shows; and its droplets: how fast they fly at most, how they fall, how long they last. */
export const POP_S = 0.42;
const SPRAY = 44;
const GRAVITY = 70;
const DROPLET_S = [0.4, 0.85] as const;

export interface Bubble {
  /** Its centre; `y` is the height above the ground. */
  x: number;
  y: number;
  /** Its full radius, and how much of it it has swollen to yet (0 to 1). */
  readonly r: number;
  grown: number;
  vx: number;
  vy: number;
  /** Time since it left the wand: negative while it waits its turn. */
  age: number;
  readonly life: number;
  /** The height it floats up to. */
  readonly cruise: number;
  /** Sets its bobbing, its swaying and its shimmer apart from the others'. */
  readonly phase: number;
  /** Where it is held, when it is. */
  held?: { x: number; y: number };
  /** Born of a bigger one that burst: it will not split again. */
  readonly small?: true;
}

/** A bubble that has just burst: where, how big it was, how long ago, and the turn of its fragments. */
export interface Burst {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly turn: number;
  age: number;
}

export interface Droplet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  readonly life: number;
  /** Which of the bubble's colours it took. */
  readonly tint: number;
}

/** Soap bubbles: blown in a stream, they float up, hover, drift, and burst in a spray of droplets. */
export class Bubbles {
  readonly list: Bubble[] = [];
  readonly bursts: Burst[] = [];
  readonly droplets: Droplet[] = [];

  /** There are bubbles in the air, or about to be. */
  get around(): boolean {
    return this.list.length > 0;
  }

  /** Something of them still moves: bubbles, or what is left of one. */
  get active(): boolean {
    return this.list.length > 0 || this.bursts.length > 0 || this.droplets.length > 0;
  }

  /** Those that have left the wand. */
  get floating(): Bubble[] {
    return this.list.filter((b) => b.age >= 0);
  }

  /** One breath through the wand, somewhere along the bottom of the view. */
  blow(width: number, height: number, random: () => number): void {
    const from = width * (0.15 + 0.7 * random());
    const count = Math.round(BLOWN[0] + (BLOWN[1] - BLOWN[0]) * random());
    for (let i = 0; i < count && this.list.length < MOST; i++) {
      // Mostly small ones, and a big one now and then.
      const r = 2 + Math.floor(random() * random() * 5);
      this.list.push({
        x: clamp(from + (random() - 0.5) * 6, r + 1, Math.max(r + 1, width - r - 1)),
        y: r,
        r,
        grown: 0,
        vx: (random() - 0.5) * PUFF_ASIDE * 2,
        vy: PUFF_UP * (0.6 + 0.8 * random()),
        age: -i * EVERY_S * (0.7 + 0.6 * random()),
        life: LIFE_S[0] + (LIFE_S[1] - LIFE_S[0]) * random(),
        cruise: clamp(height * (0.18 + 0.62 * random()), r + 6, Math.max(r + 6, height - r - 3)),
        phase: random() * Math.PI * 2,
      });
    }
  }

  /** The bubble that is at this point, if any: the one in front when several are. */
  at(x: number, y: number, slack = 1.5): Bubble | undefined {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i];
      if (b.age >= 0 && Math.hypot(b.x - x, b.y - y) <= b.r * b.grown + slack) {
        return b;
      }
    }
    return undefined;
  }

  /** Bursts it: a ring that breaks apart, and a spray of droplets. */
  pop(bubble: Bubble, random: () => number): void {
    const i = this.list.indexOf(bubble);
    if (i < 0) {
      return;
    }
    this.list.splice(i, 1);
    const r = Math.max(1, bubble.r * bubble.grown);
    if (bubble.r >= SPLITS_FROM && !bubble.small && bubble.grown >= 1) {
      // A big one does not just burst: little ones fly out of it.
      const born = 2 + Math.floor(random() * 2);
      for (let n = 0; n < born && this.list.length < MOST; n++) {
        const angle = ((n + random()) / born) * Math.PI * 2;
        this.list.push({
          x: bubble.x + Math.cos(angle) * 2,
          y: bubble.y + Math.sin(angle) * 2,
          r: 2,
          grown: 0,
          vx: Math.cos(angle) * SPLIT_SPEED + bubble.vx,
          vy: Math.sin(angle) * SPLIT_SPEED + 8,
          age: 0,
          life: LIFE_S[0] * (0.5 + 0.5 * random()),
          cruise: bubble.y + (random() - 0.3) * 14,
          phase: random() * Math.PI * 2,
          small: true,
        });
      }
    }
    this.bursts.push({ x: bubble.x, y: bubble.y, r, turn: random() * Math.PI, age: 0 });
    const count = 6 + Math.round(r * 2);
    for (let n = 0; n < count; n++) {
      const angle = ((n + random() * 0.8) / count) * Math.PI * 2;
      const speed = SPRAY * (0.45 + 0.55 * random());
      this.droplets.push({
        x: bubble.x + Math.cos(angle) * r,
        y: bubble.y + Math.sin(angle) * r,
        vx: Math.cos(angle) * speed + bubble.vx * 0.5,
        vy: Math.sin(angle) * speed + 10,
        age: 0,
        life: DROPLET_S[0] + (DROPLET_S[1] - DROPLET_S[0]) * random(),
        tint: n % 4,
      });
    }
  }

  update(dt: number, width: number, height: number, random: () => number): void {
    for (const b of this.list) {
      b.age += dt;
      if (b.age < 0) {
        continue;
      }
      b.grown = Math.min(1, b.age / INFLATE_S);
      if (b.held) {
        const glide = Math.min(1, GLIDE * dt);
        b.x += (b.held.x - b.x) * glide;
        b.y += (b.held.y - b.y) * glide;
        b.vx = 0;
        b.vy = 0;
        continue;
      }
      b.vy += (BUOYANCY * (b.cruise - b.y) + BOB * Math.cos(b.age * 1.3 + b.phase) - DRAG * b.vy) * dt;
      b.vx += (SWAY * Math.sin(b.age * 0.7 + b.phase) - DRAG * b.vx) * dt;
      // The edges of the view, the ground and the ceiling turn it back softly.
      b.vx += NUDGE * (Math.max(0, b.r + 2 - b.x) - Math.max(0, b.x - (width - b.r - 2))) * dt;
      b.vy += NUDGE * (Math.max(0, b.r + 1 - b.y) - Math.max(0, b.y - (height - b.r - 2))) * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    this.separate(dt);
    for (const b of this.list.filter((bubble) => bubble.age >= bubble.life)) {
      this.pop(b, random);
    }
    this.settle(this.bursts, (burst) => (burst.age += dt) < POP_S);
    this.settle(this.droplets, (d) => {
      d.vy -= GRAVITY * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.age += dt;
      return d.age < d.life && d.y > 0;
    });
  }

  // Bubbles that touch drift apart rather than overlap.
  private separate(dt: number): void {
    for (let i = 0; i < this.list.length; i++) {
      const a = this.list[i];
      for (let j = i + 1; j < this.list.length; j++) {
        const b = this.list[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const apart = Math.hypot(dx, dy) || 1;
        const overlap = a.r + b.r + 1 - apart;
        if (a.age < 0 || b.age < 0 || overlap <= 0) {
          continue;
        }
        const push = (NUDGE * overlap * dt) / apart;
        a.vx -= dx * push;
        a.vy -= dy * push;
        b.vx += dx * push;
        b.vy += dy * push;
      }
    }
  }

  /** Lets each of `things` live on, and drops those that are over. */
  private settle<T>(things: T[], lives: (thing: T) => boolean): void {
    for (let i = things.length - 1; i >= 0; i--) {
      if (!lives(things[i])) {
        things.splice(i, 1);
      }
    }
  }
}
