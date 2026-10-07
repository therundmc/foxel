import type { VistaPainter } from './paint';
import { drippingAt, FAR, MIDDLE, NEAR, paintDrip, paintLeafDrips, paintRain, paintRipples } from './rain-drops';
import { landOf, paintLand } from './rain-land';
import { leafTips, paintLife, paintMirror, paintVeil } from './rain-life';
import { planOf } from './rain-plan';
import { bowShown, paintRainbow, paintShafts, paintSky } from './rain-sky';

/**
 * A shower watched from under a leaf. A few drops, then the rain sets in over a meadow of puddles and misty
 * hills, and a frog comes to shelter nearby. At the great moment the rain thins out, the clouds part on the side
 * the fox looks to, light comes down, the colours warm up and a rainbow slowly draws itself. Everything stays
 * washed and dripping until the end.
 */
export const rain: VistaPainter = {
  back(view) {
    const plan = planOf(view);
    const land = landOf(view, plan);
    paintSky(view, plan);
    paintLand(view, land.far, plan.fresh);
    paintVeil(view, plan);
    paintRainbow(view, plan);
    paintShafts(view, plan);
    paintLand(view, land.near, plan.fresh);
    paintMirror(view, land.puddles, bowShown(view, plan));
    paintRipples(view, plan, land.puddles);
    paintRain(view, plan, FAR, false);
    paintLife(view, plan, land.plant);
    if (land.plant) {
      leafTips(land.plant, view.dir).forEach((tip, i) => {
        paintDrip(view.ctx, tip.x, tip.y, land.plant!.base + 1, view.t, i, (time) => drippingAt(time, plan.clearAt));
      });
    }
    paintRain(view, plan, MIDDLE, false);
  },
  // What falls between the fox and us: the nearest rain, and the beads running off its leaf.
  front(view) {
    const plan = planOf(view);
    paintRain(view, plan, NEAR, true);
    paintLeafDrips(view, plan);
  },
};
