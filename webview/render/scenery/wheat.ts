import { paintLookout, paintLookoutFront, type LookoutTones } from './lookout';
import { gradient, type VistaPainter } from './paint';

// A wheat field in the wind: a first draft, to be painted properly.
const SKY = ['#5c9be0', '#cfe6f7', '#f6e2a0'] as const;
const TONES: LookoutTones = { body: '#4c8f4a', rim: '#7cc060', deep: '#35703c', blades: ['#3f8546', '#5fa84e'], front: ['#86cf5c', '#6cb952'] };

export const wheat: VistaPainter = {
  back(view) {
    gradient(view, 0, view.h, SKY.map((color, i) => [i / 2, color] as const));
    paintLookout(view, TONES);
  },
  front(view) {
    paintLookoutFront(view, TONES);
  },
};
