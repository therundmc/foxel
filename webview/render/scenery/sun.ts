import { gradient, px, ramp, type VistaPainter, type VistaView } from './paint';

// First draft of the sunrise and the sunset: to be painted properly.
function paint(view: VistaView, rising: boolean): void {
  const { ctx, h, t, foxX, dir } = view;
  gradient(view, 0, h, rising ? [[0, '#5b7fc7'], [0.6, '#ffc98a'], [1, '#ffe9b8']] : [[0, '#3b2f6b'], [0.6, '#e8735a'], [1, '#ffc46b']]);
  const up = ramp(t, 0, 50);
  px(ctx, foxX + dir * 30, h - 4 - (rising ? up : 1 - up) * 18, '#fff3c0', 1, 9, 9);
}

export const sunrise: VistaPainter = { back: (view) => paint(view, true) };
export const sunset: VistaPainter = { back: (view) => paint(view, false) };
