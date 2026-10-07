import type { Vista } from '../../../shared/day';
import type { Scenery } from '../../sim/props/scenery';
import type { Stage } from '../../stage';
import { clouds } from './clouds';
import type { VistaPainter, VistaView } from './paint';
import { rain } from './rain';
import { snow } from './snow';
import { stars } from './stars';
import { sunrise, sunset } from './sun';

/** One painter per sky. The compiler asks for an entry here when a `Vista` is added. */
const VISTAS: Record<Vista, VistaPainter> = { sunrise, clouds, sunset, stars, rain, snow };

type Layer = 'back' | 'front';

/**
 * Paints the sky the fox contemplates. Each layer is painted small, one canvas pixel per sprite pixel,
 * then blown up onto the stage: so it sits on the fox's pixel grid whatever is drawn, and fades as a whole.
 */
export class SceneryLayers {
  private readonly canvases: Partial<Record<Layer, HTMLCanvasElement>> = {};

  drawBack(stage: Stage, scenery: Scenery): void {
    this.draw('back', stage, scenery);
  }

  drawFront(stage: Stage, scenery: Scenery): void {
    this.draw('front', stage, scenery);
  }

  private draw(layer: Layer, stage: Stage, scenery: Scenery): void {
    const paint = scenery.vista && VISTAS[scenery.vista][layer];
    if (!paint || scenery.glow <= 0) {
      return;
    }
    const w = Math.ceil(stage.width / stage.scale);
    const h = Math.ceil(stage.height / stage.scale);
    const canvas = (this.canvases[layer] ??= document.createElement('canvas'));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, w, h);
    const view: VistaView = {
      ctx,
      w,
      h,
      t: scenery.ageMs / 1000,
      moment: scenery.momentMs === undefined ? undefined : scenery.momentMs / 1000,
      foxX: scenery.x,
      dir: scenery.dir,
    };
    ctx.save();
    paint.call(VISTAS[scenery.vista as Vista], view);
    ctx.restore();
    // Anchored to the bottom, like the fox: a view that is not a whole number of pixels high loses its top row.
    const glow = scenery.glow * scenery.glow * (3 - 2 * scenery.glow);
    stage.ctx.globalAlpha = glow;
    stage.ctx.drawImage(canvas, 0, stage.height - h * stage.scale, w * stage.scale, h * stage.scale);
    stage.ctx.globalAlpha = 1;
  }
}
