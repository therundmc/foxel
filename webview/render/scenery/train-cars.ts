import { prerender, type VistaView } from './paint';
import type { Plain } from './train-land';

// The little train that crosses the plain at the great moment: dark carriages with lit windows, what the water gives
// back of them, and the wake that spreads behind and dies away.

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));

const BODY = '#2b2440';
const ROOF = '#43395e';
const UNDER = '#1b1730';
const WINDOW = ['#ffe9ae', '#ffc56c'] as const;
const HEADLAMP = '#fff6d8';
const TAIL_LAMP = '#ff7c6c';
const WAKE = '#fff0d0';

/** One carriage: its length and height, and where its windows (two pixels wide) begin. */
const CAR = 15;
const TALL = 6;
const WINDOWS = [2, 5, 8, 11] as const;
/** The water gives back its body, not its wheels: they stand in it. */
const MIRRORED = TALL - 1;
/** Seconds to cross a view of ordinary width; narrow and very wide views bound its speed, in pixels a second. */
const CROSS_S = 12;
const SLOWEST = 11;
const FASTEST = 30;
/** How long the water takes to settle behind it, in seconds, and the two lines of its wake (how far each spreads, how strong). */
const WAKE_S = 6.5;
const WAKE_LINES = [[1, 0.4], [0.45, 0.55]] as const;
const WAKE_DASH = 3;

interface Sprite {
  readonly key: string;
  readonly image: HTMLCanvasElement;
  /** Where each lit window begins, from the left of the picture. */
  readonly windows: readonly number[];
}

let drawn: Sprite | undefined;

function sprite(cars: number, dir: number): Sprite {
  const key = `${cars}:${dir}`;
  if (drawn?.key === key) {
    return drawn;
  }
  const len = cars * CAR + cars - 1;
  const windows: number[] = [];
  // Drawn heading right, and turned round when it goes the other way.
  const turned = (x: number, wide: number): number => (dir > 0 ? x : len - x - wide);
  const image = prerender(len, TALL, (ctx) => {
    const bar = (x: number, y: number, wide: number, tall: number, color: string): void => {
      ctx.fillStyle = color;
      ctx.fillRect(turned(x, wide), y, wide, tall);
    };
    for (let car = 0; car < cars; car++) {
      const at = car * (CAR + 1);
      bar(at + 1, 0, CAR - 2, 1, ROOF);
      bar(at, 1, CAR, TALL - 2, BODY);
      bar(at + 1, TALL - 1, 4, 1, UNDER);
      bar(at + CAR - 5, TALL - 1, 4, 1, UNDER);
      for (const x of WINDOWS) {
        bar(at + x, 2, 2, 1, WINDOW[0]);
        bar(at + x, 3, 2, 1, WINDOW[1]);
        windows.push(turned(at + x, 2));
      }
      if (car > 0) {
        bar(at - 1, TALL - 2, 1, 1, UNDER);
      }
    }
    bar(len - 1, TALL - 2, 1, 1, HEADLAMP);
    bar(0, TALL - 2, 1, 1, TAIL_LAMP);
  });
  drawn = { key, image, windows };
  return drawn;
}

// The water it has passed over is left trembling: two broken lines that spread toward us and fade.
function paintWake({ ctx, w, h, t, dir }: VistaView, { rail }: Plain, tail: number, speed: number): void {
  const reach = clamp(Math.round((h - rail) * 0.3), 3, 11);
  ctx.fillStyle = WAKE;
  // Counted along its way, on a grid that stays where it is: the dashes do not slide after the train.
  const from = Math.max(0, Math.floor((tail - speed * WAKE_S) / WAKE_DASH) * WAKE_DASH);
  for (let s = from; s < Math.min(w, tail); s += WAKE_DASH) {
    // The grid may start a dash before the oldest ripple: it has faded by then, never less than nothing.
    const fade = Math.max(0, 1 - (tail - s) / speed / WAKE_S);
    const x = dir > 0 ? s : w - s - WAKE_DASH;
    WAKE_LINES.forEach(([spread, strength], line) => {
      if (Math.sin(s * 0.7 + t * 1.7 + line * 2.3) > -0.15) {
        ctx.globalAlpha = strength * fade ** 1.6;
        ctx.fillRect(x, rail + 2 + Math.round(reach * spread * Math.sqrt(1 - fade)), WAKE_DASH - 1, 1);
      }
    });
  }
  ctx.globalAlpha = 1;
}

/** The train, from the moment on: it comes in from the side the fox has its back to and goes steadily out by the other. */
export function paintTrain(view: VistaView, plain: Plain): void {
  const { ctx, w, h, t, moment, dir } = view;
  if (moment === undefined) {
    return;
  }
  const { image, windows } = sprite(w < 150 ? 2 : 3, dir);
  const len = image.width;
  const speed = clamp(w / CROSS_S, SLOWEST, FASTEST);
  const run = speed * moment;
  paintWake(view, plain, run - len, speed);
  if (run - len > w) {
    return;
  }
  const left = Math.round(dir > 0 ? run - len : w - run);
  const { rail } = plain;
  // Upside down in the water, each row trembling on its own and fainter the further from the rail.
  for (let k = 0; k < MIRRORED; k++) {
    ctx.globalAlpha = 0.75 - 0.08 * k;
    ctx.drawImage(image, 0, MIRRORED - 1 - k, len, 1, left + Math.round(0.7 * Math.sin(t * 5 + k * 1.9)), rail + 1 + k, len, 1);
  }
  // Under it the light of the windows runs on toward us in short trembling strokes.
  const gleam = clamp(Math.round((h - rail) * 0.22), 3, 9);
  ctx.fillStyle = WINDOW[1];
  for (let k = 0; k < gleam; k++) {
    const sway = Math.round(1.2 * Math.sin(t * 4.3 + k * 2.3));
    ctx.globalAlpha = 0.36 * (1 - k / gleam);
    for (const x of windows) {
      if (Math.sin(t * 3.1 + x * 1.7 + k * 2.1) > -0.3) {
        ctx.fillRect(left + x + sway, rail + 1 + MIRRORED + k, 2, 1);
      }
    }
  }
  ctx.globalAlpha = 1;
  ctx.drawImage(image, left, rail - TALL);
}
