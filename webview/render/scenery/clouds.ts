import { gradient, px, type VistaPainter } from './paint';

// First draft of the mountains and clouds: to be painted properly.
export const clouds: VistaPainter = {
  back(view) {
    const { ctx, w, h, t } = view;
    gradient(view, 0, h, [[0, '#4a90d9'], [1, '#bfe3f5']]);
    for (let i = 0; i < 4; i++) {
      px(ctx, ((i * 70 + t * 2) % (w + 40)) - 30, 6 + i * 7, '#ffffff', 0.95, 26, 7);
    }
    px(ctx, 0, h - 10, '#6f9a6a', 1, w, 10);
  },
};
