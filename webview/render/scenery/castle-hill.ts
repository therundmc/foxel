import { prerender, seeded } from './paint';
import { cumulus, paintCloud } from './castle-clouds';
import { rgb } from './clouds-pixels';

// Below everything, a sea of clouds, and the fox's hilltop rising out of it: a soft green round with a few wild
// flowers, painted once for a size. It stays calm and plain, so that the sky reads.

const HILL = { rim: '#c2e286', lit: '#9ccf6a', body: '#84bf5e', shade: '#6aa65a', tuft: '#76b25a' } as const;
const FLOWERS = ['#fffaf2', '#ffd76a', '#ffa8c6'] as const;
const SEA_AIR = rgb('#cfe2f4');

export interface Hill {
  readonly key: string;
  /** The sea of clouds, and the hill in front of it. */
  readonly sea: HTMLCanvasElement;
  readonly hill: HTMLCanvasElement;
  /** The row the tops of the sea of clouds come up to, more or less. */
  readonly seaY: number;
}

let made: Hill | undefined;

export function hillOf(w: number, h: number, foxX: number, dir: 1 | -1): Hill {
  const key = `${w}x${h}:${Math.round(foxX)}:${dir}`;
  if (made?.key === key) {
    return made;
  }
  const seaY = Math.round(h - Math.max(6, h * 0.1));
  const random = seeded(0x5ea + w);
  // Round heads of cloud shoulder to shoulder, their bellies far below the view.
  const heads: [HTMLCanvasElement, number, number][] = [];
  const unit = Math.max(18, h * 0.42);
  for (let x = -unit * random(); x < w + unit; x += unit * (0.55 + random() * 0.4)) {
    const wide = unit * (0.7 + random() * 0.6);
    const tall = wide * (0.32 + random() * 0.18);
    const cloud = paintCloud(cumulus(0x5e0 + Math.round(x), wide, tall, -dir), -dir, 0.26, SEA_AIR);
    heads.push([cloud.canvas, Math.round(x) - cloud.ox, Math.round(seaY + tall * (0.75 + random() * 0.4)) - cloud.oy]);
  }
  const sea = prerender(w, h, (ctx) => {
    ctx.fillStyle = '#d6e4f4';
    ctx.fillRect(0, seaY + Math.round(h * 0.06), w, h);
    heads.forEach(([canvas, x, y]) => ctx.drawImage(canvas, x, y));
  });
  // The hill: a broad round under the fox, its flanks going down into the clouds.
  const high = Math.max(8, Math.round(h * 0.16));
  const reach = Math.max(30, w * 0.15);
  const top = new Int16Array(w);
  for (let x = 0; x < w; x++) {
    const u = (x - foxX) / reach;
    top[x] = Math.round(h - (high + 3) / (1 + u * u) ** 0.9 + 3 - 0.6 * Math.sin(x * 0.09));
  }
  const hill = prerender(w, h, (ctx) => {
    for (let x = 0; x < w; x++) {
      if (top[x] >= h) {
        continue;
      }
      // The side away from the sun, past the fox, is a shade darker.
      const shaded = (x - foxX) * dir > reach * 0.5;
      ctx.fillStyle = shaded ? HILL.shade : HILL.body;
      ctx.fillRect(x, top[x], 1, h - top[x]);
      ctx.fillStyle = shaded ? HILL.body : HILL.lit;
      ctx.fillRect(x, top[x], 1, Math.min(2, h - top[x]));
      ctx.fillStyle = HILL.rim;
      ctx.fillRect(x, top[x], 1, 1);
    }
    // A few soft tufts and a handful of wild flowers, no more.
    for (let n = Math.round(w / 22); n > 0; n--) {
      const x = Math.floor(random() * w);
      const y = top[x] + 3 + Math.floor(random() * Math.max(1, h - top[x] - 4));
      if (y < h - 1) {
        ctx.fillStyle = HILL.tuft;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    for (let n = Math.max(3, Math.round(w / 45)); n > 0; n--) {
      const x = Math.round(foxX + (random() * 2 - 1) * reach * 1.3);
      if (x < 0 || x >= w || Math.abs(x - foxX) < 12 || top[x] >= h - 2) {
        continue;
      }
      const y = top[x] + 1 + Math.floor(random() * 3);
      ctx.fillStyle = FLOWERS[n % FLOWERS.length];
      ctx.fillRect(x, y, 1, 1);
    }
  });
  made = { key, sea, hill, seaY };
  return made;
}
