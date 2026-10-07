import type { VistaPainter } from './paint';
import { cloudsOf, paintCurtains, paintSky, struckBy } from './rain-clouds';
import { FAR, NEAR as NEAR_RAIN, paintRain } from './rain-drops';
import { MIDDLE, NEAR, paintBlades, paintLookout, paintPlane, RANGE } from './rain-land';
import { flashOf, paintBolt, paintRainbow } from './rain-light';
import { planOf } from './rain-plan';

/**
 * A summer storm watched from a hilltop. Great clouds gather over far hills, grey curtains of rain hang under
 * them, and now and then one lights up from inside. At the great moment a last flash, then the storm moves on:
 * the rain stops, the clouds open on the side the fox looks to, light warms the hills and a pale rainbow draws itself.
 */
export const rain: VistaPainter = {
  back(view) {
    const plan = planOf(view);
    const flash = flashOf(view, plan);
    const clouds = cloudsOf(view, plan);
    const struck = struckBy(flash, clouds, view);
    const lit = flash?.glow ?? 0;
    const among = plan.base - Math.round(plan.rise * 0.4);
    paintSky(view, plan, clouds, flash, struck);
    paintPlane(view, plan, RANGE, lit);
    paintCurtains(view, plan, clouds, among);
    if (flash && struck) {
      paintBolt(view.ctx, flash, struck.left + Math.round(struck.shape.w * 0.5), plan.cloudBase - 2, among);
    }
    paintRainbow(view, plan);
    paintPlane(view, plan, MIDDLE, lit);
    paintPlane(view, plan, NEAR, lit);
    paintRain(view, plan, FAR, false);
    paintLookout(view, plan, lit);
  },
  // What is between the fox and us: the nearest rain and a few blades of the lookout over its paws.
  front(view) {
    const plan = planOf(view);
    paintRain(view, plan, NEAR_RAIN, true);
    paintBlades(view, plan, flashOf(view, plan)?.glow ?? 0);
  },
};
