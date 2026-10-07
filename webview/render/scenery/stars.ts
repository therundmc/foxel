import { clamp01, gradient, px, ramp, seeded, type VistaPainter, type VistaView } from './paint';

// First draft of the night sky: to be painted properly.
const STAR_AREA = 70;

function drawStars({ ctx, w, h, t }: VistaView): void {
  const random = seeded(0x5eed);
  const count = Math.round((1024 * h) / STAR_AREA);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(random() * 1024);
    const y = 1 + random() ** 1.35 * (h - 7);
    const order = random();
    const alpha = 0.3 + random() * 0.7;
    const period = 0.35 + random() * 0.9;
    const phase = random() * Math.PI * 2;
    if (x < w) {
      const lit = clamp01((t / 14) * 1.2 - order) / 0.2;
      px(ctx, x, y, '#fff6c4', alpha * Math.min(1, lit) * (0.72 + 0.28 * Math.sin(t / period + phase)));
    }
  }
}

export const stars: VistaPainter = {
  back(view) {
    const { ctx, w, h, t, moment, foxX, dir } = view;
    gradient(view, 0, h, [[0, '#101538'], [0.6, '#1c2452'], [1, '#2b2f5e']]);
    drawStars(view);
    px(ctx, foxX + dir * 30, Math.max(2, h - 46) - ramp(t, 0, 10) * 3, '#fff6c4', ramp(t, 2, 8), 5, 5);
    if (moment !== undefined && moment < 1.5) {
      const p = moment / 1.5;
      for (let i = 0; i < 22; i++) {
        px(ctx, foxX + dir * (6 + p * 78 - i), Math.max(1, h - 60) + p * 15 - i * 0.2, '#ffffff', Math.sin(Math.PI * p) * (1 - i / 23));
      }
    }
    void w;
  },
};
