import { paintLookout, paintLookoutFront, type LookoutTones } from './lookout';
import { mix, type VistaPainter, type VistaView } from './paint';
import { paintLight, paintMist, paintSky } from './rain-air';
import { FAR, NEAR, paintDrips, paintRain, paintSheets } from './rain-drops';
import { groveOf, paintRow, paintShiver } from './rain-grove';
import { paintLeaves, paintSwirl } from './rain-leaves';
import { lightOn, planOf } from './rain-plan';

/** The lookout in autumn, under the rain and in the golden light; its flowers are a few fallen leaves. */
const RAINY: LookoutTones = {
  body: '#55573c',
  rim: '#747245',
  deep: '#3c3e2e',
  blades: ['#66663f', '#827a46'],
  front: ['#484a32', '#5f5d38'],
  flowers: ['#d06a2c', '#b8402e', '#d9a033', '#c8562a', '#a83a34'],
};
const GOLDEN: LookoutTones = {
  body: '#8a7c3e',
  rim: '#cdae54',
  deep: '#5a5234',
  blades: ['#a8983e', '#d4b858'],
  front: ['#6e6634', '#94863c'],
  flowers: ['#ee7a2a', '#d4452c', '#f0b838', '#e5622a', '#c0403a'],
};

/** How thick a bank of mist is, as a share of the height of the near trees. */
const MIST_THICK = 0.2;
/** How much of the warm light shows on the sky, and again over the trees it comes through. */
const LIGHT_BEHIND = 0.7;
const LIGHT_THROUGH = 0.22;

function lookoutTones({ moment }: VistaView): LookoutTones {
  const gold = lightOn(moment, 2.5);
  const pair = (rainy: readonly [string, string], golden: readonly [string, string]): [string, string] => [
    mix(rainy[0], golden[0], gold),
    mix(rainy[1], golden[1], gold),
  ];
  return {
    body: mix(RAINY.body, GOLDEN.body, gold),
    rim: mix(RAINY.rim, GOLDEN.rim, gold),
    deep: mix(RAINY.deep, GOLDEN.deep, gold),
    blades: pair(RAINY.blades, GOLDEN.blades),
    front: pair(RAINY.front, GOLDEN.front),
    flowers: RAINY.flowers?.map((leaf, i) => mix(leaf, GOLDEN.flowers?.[i] ?? leaf, gold)),
  };
}

/**
 * A day of wind and rain in the Japanese countryside, in autumn. A grey sky; in the upper corners, the foliage of
 * the maples we stand under, tossing in the gusts; far away, wooded hills ridge behind ridge, their colours in the
 * mist; a driving rain that leans with the wind, and leaves blown across. At the great moment a breath of wind
 * lifts a swirl of leaves and carries it away; then the wind drops, the rain thins, the mist lifts and a warm
 * light comes over the hills.
 */
export const rain: VistaPainter = {
  back(view) {
    const plan = planOf(view);
    const grove = groveOf(view);
    const thick = Math.max(4, Math.round(grove.tall * MIST_THICK));
    paintSky(view, plan);
    paintLight(view, LIGHT_BEHIND);
    grove.rows.forEach((_, row) => {
      paintRow(view, grove, row);
      if (row === grove.rows.length - 1) {
        paintShiver(view, grove, plan.gust);
        paintLight(view, LIGHT_THROUGH);
      }
      paintMist(view, plan, row, grove.feet[row], thick);
    });
    paintLeaves(view);
    paintSwirl(view);
    paintLookout(view, lookoutTones(view));
  },
  // What is between the fox and us: the rain, the drops off its leaf, and a few blades of the lookout over its paws.
  front(view) {
    const plan = planOf(view);
    paintRain(view, plan, FAR);
    paintSheets(view, plan);
    paintRain(view, plan, NEAR);
    paintDrips(view, plan);
    paintLookoutFront(view, lookoutTones(view));
  },
};
