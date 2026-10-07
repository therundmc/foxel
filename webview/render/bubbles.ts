import { POP_S, type Bubble, type Bubbles, type Burst } from '../sim/props/bubbles';
import type { Stage } from '../stage';

// Soap bubbles, drawn pixel by pixel: a thin film whose colours travel round it, a glint where the light catches
// it, and when one bursts a flash, the film flying apart in fragments, and its droplets.

const TURN = Math.PI * 2;
/**
 * What a bubble is painted with: the colours its film takes round it, the light it catches, the air inside it and
 * how much that shows. On a light background everything is deeper, or the bubble would not be seen at all.
 */
interface Soap {
  readonly film: readonly string[];
  readonly glint: string;
  readonly inside: string;
  readonly insideAlpha: number;
}
const ON_DARK: Soap = { film: ['#c9f4ff', '#8ee3ff', '#b9a4f5', '#f6a6d8'], glint: '#ffffff', inside: '#bfeaff', insideAlpha: 0.13 };
/** The glint inside a bubble is always white: on a light background it shows against the air inside it. */
const SHINE = '#ffffff';
const ON_LIGHT: Soap = { film: ['#5cc1e6', '#3a9bd8', '#8670dc', '#dc68b0'], glint: '#2d86c8', inside: '#7cc6ea', insideAlpha: 0.22 };
/** The arc of the film that catches the light, up and to the left (in turns, from the right, going up). */
const LIT_ARC = [0.27, 0.46] as const;
/** How fast the colours travel round the film, in turns a second. */
const SHIMMER = 0.07;
/** The biggest bubbles wobble as they float: by a pixel at most, now and then. */
const WOBBLES_FROM = 5;
const WOBBLE = 0.5;
/** In its last moments the film thins: it flickers. */
const THINS_S = 0.7;
/** A burst starts with a flash; then the film flies apart in this many fragments, this much farther than it was wide. */
const FLASH = 0.18;
const FRAGMENTS = 8;
const FLIES = 3.5;

/** The pixels of a bubble this wide and high, from its centre: those of its film (with where they are round it) and those inside. */
interface Shape {
  readonly film: readonly (readonly [dx: number, dy: number, round: number])[];
  readonly inside: readonly (readonly [dx: number, dy: number, wide: number])[];
}

const shapes = new Map<string, Shape>();

function shapeOf(rx: number, ry: number): Shape {
  const key = `${rx}:${ry}`;
  let shape = shapes.get(key);
  if (!shape) {
    const within = (dx: number, dy: number): boolean => (dx * dx) / ((rx + 0.25) * (rx + 0.25)) + (dy * dy) / ((ry + 0.25) * (ry + 0.25)) <= 1;
    const film: [number, number, number][] = [];
    const inside: [number, number, number][] = [];
    for (let dy = -Math.ceil(ry); dy <= ry; dy++) {
      let from: number | undefined;
      for (let dx = -Math.ceil(rx); dx <= rx + 1; dx++) {
        const filled = within(dx, dy);
        const edge = filled && !(within(dx - 1, dy) && within(dx + 1, dy) && within(dx, dy - 1) && within(dx, dy + 1));
        if (edge) {
          film.push([dx, dy, (Math.atan2(dy, dx) / TURN + 1) % 1]);
        }
        if (filled && !edge) {
          from ??= dx;
        } else if (from !== undefined) {
          inside.push([from, dy, dx - from]);
          from = undefined;
        }
      }
    }
    shape = { film, inside };
    shapes.set(key, shape);
  }
  return shape;
}

/** Draws the bubbles, what is left of those that burst, and their droplets. */
export function drawBubbles(stage: Stage, bubbles: Bubbles, light: boolean): void {
  const { ctx, scale: s } = stage;
  const soap = light ? ON_LIGHT : ON_DARK;
  /** One sprite pixel, at a place of the world. */
  const px = (x: number, y: number, wide = 1): void => ctx.fillRect(Math.round(x) * s, stage.screenY(Math.round(y)), wide * s, s);

  const bubble = (b: Bubble): void => {
    const r = b.r * b.grown;
    if (b.age < 0 || r < 0.6) {
      return;
    }
    // Whole pixels only: a bubble a fraction of a pixel wide comes out square.
    const wobble = b.r >= WOBBLES_FROM ? WOBBLE * Math.sin(b.age * 4 + b.phase) : 0;
    const shape = shapeOf(Math.max(1, Math.round(r + wobble)), Math.max(1, Math.round(r - wobble)));
    const left = b.life - b.age;
    const thin = left < THINS_S && Math.floor(left / 0.09) % 2 === 0 ? 0.45 : 1;
    ctx.globalAlpha = soap.insideAlpha;
    ctx.fillStyle = soap.inside;
    shape.inside.forEach(([dx, dy, wide]) => px(b.x + dx, b.y + dy, wide));
    const shimmer = b.age * SHIMMER + b.phase;
    ctx.globalAlpha = 0.92 * thin;
    for (const [dx, dy, round] of shape.film) {
      const lit = round >= LIT_ARC[0] && round <= LIT_ARC[1];
      ctx.fillStyle = lit ? soap.glint : soap.film[Math.floor((((round + shimmer) % 1) + 1) * soap.film.length) % soap.film.length];
      px(b.x + dx, b.y + dy);
    }
    if (r >= 3) {
      // The glint inside it, up and to the left; a big one has a second, fainter, down and to the right.
      const at = Math.round(r * 0.42);
      ctx.fillStyle = SHINE;
      ctx.globalAlpha = thin;
      px(b.x - at, b.y + at);
      if (r >= 5) {
        px(b.x - at + 1, b.y + at);
        ctx.globalAlpha = 0.5 * thin;
        px(b.x + at, b.y - at);
      }
    }
  };

  const burst = ({ x, y, r, turn, age }: Burst): void => {
    const p = age / POP_S;
    if (p < FLASH) {
      // The flash: the whole film goes white, a pixel wider, with a spark in its middle.
      ctx.globalAlpha = 1;
      ctx.fillStyle = soap.glint;
      shapeOf(Math.round(r) + 1, Math.round(r) + 1).film.forEach(([dx, dy]) => px(x + dx, y + dy));
      px(x - 1, y, 3);
      px(x, y + 1);
      px(x, y - 1);
      return;
    }
    // Then it flies apart: fragments of film, each a short stroke along where the bubble was, slowing as they go.
    const gone = (p - FLASH) / (1 - FLASH);
    const out = r + 1 + (FLIES + r * 0.5) * (1 - (1 - gone) * (1 - gone));
    for (let k = 0; k < FRAGMENTS; k++) {
      const angle = turn + (k / FRAGMENTS) * TURN;
      const fx = x + Math.cos(angle) * out;
      const fy = y + Math.sin(angle) * out;
      ctx.globalAlpha = (1 - gone) ** 1.3;
      ctx.fillStyle = gone < 0.35 ? soap.glint : soap.film[k % soap.film.length];
      px(fx, fy);
      if (gone < 0.7) {
        px(fx - Math.sin(angle) * 1.2, fy + Math.cos(angle) * 1.2);
      }
    }
  };

  bubbles.list.forEach(bubble);
  bubbles.bursts.forEach(burst);
  for (const d of bubbles.droplets) {
    // Droplets catch the light as they tumble.
    const twinkles = Math.floor(d.age / 0.07 + d.tint) % 3 === 0;
    ctx.globalAlpha = 1 - (d.age / d.life) ** 2;
    ctx.fillStyle = twinkles ? soap.glint : soap.film[d.tint % soap.film.length];
    px(d.x, d.y);
  }
  ctx.globalAlpha = 1;
}
