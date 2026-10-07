import { clamp01, gradient, mix, prerender, px, type VistaView } from './paint';
import { lightOn, type Plan } from './rain-plan';

// The air of a wet afternoon: an even pearl sky, the warm light that comes through at the end, and the banks
// of mist lying between the rows of trees. The mist is all that drifts here, slowly, with the wind.

/** Sky colours from the top down: under the rain, and once the light comes through. */
const SKY_RAINY = ['#b5b6b9', '#cdcdc8', '#e7dfc8'] as const;
const SKY_WARM = ['#c4ccd0', '#ece5cc', '#f9e2ac'] as const;
const MIST = ['#dfe1de', '#f8ecd2'] as const;
const LIGHT_RGB = '255,236,170';

export function paintSky(view: VistaView, plan: Plan): void {
  const stops = SKY_RAINY.map((rainy, i) => mix(rainy, SKY_WARM[i], plan.clear));
  gradient(view, 0, view.h, [[0, stops[0]], [0.4, stops[1]], [0.8, stops[2]], [1, stops[2]]]);
}

/** The warm light, a soft glow high on the side the fox looks to: `strength` of it, for what it is painted over. */
export function paintLight({ ctx, w, h, moment, foxX, dir }: VistaView, strength: number): void {
  const alpha = strength * lightOn(moment, -1);
  if (alpha < 0.01) {
    return;
  }
  const room = dir > 0 ? w - foxX : foxX;
  const rx = Math.max(40, w * 0.32);
  ctx.save();
  ctx.translate(Math.round(foxX + dir * room * 0.55), Math.round(h * 0.15));
  ctx.scale(1, Math.max(24, h * 0.6) / rx);
  const light = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  light.addColorStop(0, `rgba(${LIGHT_RGB},${alpha})`);
  light.addColorStop(0.5, `rgba(${LIGHT_RGB},${alpha * 0.4})`);
  light.addColorStop(1, `rgba(${LIGHT_RGB},0)`);
  ctx.fillStyle = light;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

/** The mist is one long strip that repeats, painted once: banks of it with clear air between. */
const PERIOD = 256;
let strip: { readonly tall: number; readonly image: HTMLCanvasElement } | undefined;

// Each bank is a soft outer body and a denser heart, flat under and swelling above; cool on the upper half of
// the picture, warm on the lower one, for the two lights.
function stripOf(tall: number): HTMLCanvasElement {
  if (strip?.tall !== tall) {
    const image = prerender(PERIOD, tall * 2, (ctx) => {
      for (let x = 0; x < PERIOD; x++) {
        const a = (x / PERIOD) * Math.PI * 2;
        const thick = clamp01(0.4 + 0.34 * Math.sin(a * 2 + 0.6) + 0.22 * Math.sin(a * 5 + 2.1) + 0.1 * Math.sin(a * 9 + 4));
        const body = Math.round(thick * tall);
        if (body < 1) {
          continue;
        }
        const top = Math.round((tall - body) * 0.7);
        const heart = Math.round(body * 0.5);
        MIST.forEach((color, light) => {
          px(ctx, x, light * tall + top, color, 0.6, 1, body);
          px(ctx, x, light * tall + top + Math.round((body - heart) * 0.6), color, heart > 0 ? 0.7 : 0, 1, heart);
        });
      }
    });
    strip = { tall, image };
  }
  return strip.image;
}

/** Where each bank starts along the strip, how fast it drifts, and how thick it shows. Far ones are slower. */
const BANKS = [
  { at: 0.1, speed: 1, strength: 0.9 },
  { at: 0.55, speed: 1.7, strength: 0.85 },
  { at: 0.32, speed: 2.6, strength: 0.6 },
] as const;

/** One bank of mist `tall` pixels thick lying on `row`, 0 the farthest. It drifts toward the side the fox looks to. */
export function paintMist({ ctx, w, t, moment, dir }: VistaView, plan: Plan, index: number, row: number, tall: number): void {
  const bank = BANKS[index];
  const image = stripOf(tall);
  const warm = lightOn(moment, index);
  const y = row - Math.round(tall * 0.7);
  const slid = Math.round(bank.at * PERIOD + dir * bank.speed * t);
  const alpha = bank.strength * plan.mist;
  for (let x = (((slid % PERIOD) + PERIOD) % PERIOD) - PERIOD; x < w; x += PERIOD) {
    ctx.globalAlpha = alpha * (1 - warm);
    ctx.drawImage(image, 0, 0, PERIOD, tall, x, y, PERIOD, tall);
    ctx.globalAlpha = alpha * warm;
    ctx.drawImage(image, 0, tall, PERIOD, tall, x, y, PERIOD, tall);
  }
  ctx.globalAlpha = 1;
}
