/** How far past its place it waits, out of view. */
const OUT = 36;
/** How quickly it slides to where it is sent: the share of the way left that it covers in a second. */
const SLIDE = 9;
const CLOSE_ENOUGH = 0.4;

/**
 * The basket it sleeps in at night. It lives just outside the view, at one edge: the fox pulls it in to go to bed
 * and pushes it back out when it gets up. It only knows where it is and where it is sliding to.
 */
export class Basket {
  /** Where the fox lies when it is curled up in it (the left edge of its sprite); undefined when no basket is out. */
  x: number | undefined;
  /** Its place at the edge of the view, and the side that edge is on. */
  home = 0;
  outward: 1 | -1 = -1;
  /** The nightcap waits in it while the fox is not wearing it. */
  cap = false;
  private target = 0;
  private leaving = false;

  get active(): boolean {
    return this.x !== undefined;
  }

  /** Still out and staying: not on its way out of the view. */
  get staying(): boolean {
    return this.x !== undefined && !this.leaving;
  }

  get moving(): boolean {
    return this.x !== undefined && this.x !== this.target;
  }

  /** Puts it just out of view beyond `home`, the nightcap in it, ready to be pulled in. */
  bring(home: number, outward: 1 | -1): void {
    this.home = home;
    this.outward = outward;
    this.x = home + outward * OUT;
    this.target = this.x;
    this.cap = true;
    this.leaving = false;
  }

  /** Slides to `share` of the way in: 1 is its place, 0 just out of view. */
  slide(share: number): void {
    this.target = this.home + this.outward * OUT * (1 - share);
  }

  /** Slides out of the view, and is gone. */
  leave(): void {
    this.slide(0);
    this.leaving = true;
  }

  update(dt: number): void {
    if (this.x === undefined) {
      return;
    }
    const left = this.target - this.x;
    this.x = Math.abs(left) < CLOSE_ENOUGH ? this.target : this.x + left * Math.min(1, SLIDE * dt);
    if (this.leaving && this.x === this.target) {
      this.x = undefined;
      this.cap = false;
      this.leaving = false;
    }
  }
}
