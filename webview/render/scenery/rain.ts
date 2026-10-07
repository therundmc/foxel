import { gradient, px, seeded, type VistaPainter } from './paint';

// First draft of the rain: to be painted properly.
export const rain: VistaPainter = {
  back(view) {
    gradient(view, 0, view.h, [[0, '#4b5a73'], [1, '#8fa0b3']]);
  },
  front({ ctx, w, h, t, moment }) {
    const random = seeded(7);
    const left = moment === undefined ? 1 : Math.max(0, 1 - moment / 6);
    for (let i = 0; i < w * left; i++) {
      const x = random() * w;
      const y = (random() * h + t * 90) % h;
      px(ctx, x, y, '#d6e4f5', 0.6, 1, 3);
    }
  },
};
