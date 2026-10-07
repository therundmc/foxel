import { paintBoughs } from './blossom-boughs';
import { springLand, type SpringLand } from './blossom-land';
import { caughtPetals, FAR_PETALS, NEAR_PETALS, paintFalling, paintSettled, paintStream } from './blossom-petals';
import { hash } from './blossom-wind';
import { paintLookout, paintLookoutFront, type LookoutTones } from './lookout';
import { gradient, mix, ramp, type VistaPainter, type VistaView } from './paint';

// A spring day in the Japanese countryside, seen from under the cherry trees: the sister picture of the autumn rain.
//   0 s   a tender blue sky with two thin high clouds drifting, a far green valley with its river and its drifts of
//         cherry trees, and in the two upper corners the boughs in bloom we stand under; petals come down a few at a
//         time, in handfuls when the breeze rises, and one or two settle on the grass
//  moment hanafubuki: a breath of wind goes through the boughs, they toss (0.5 s), and a whole stream of petals lets
//         go and flows across the view in a long curling ribbon, thick for 4 s, thinning until 10 s; some drop
//         out of it and come down
//  after  petals keep falling a little more than before, the grass is strewn with them (2 to 10 s), and the light is
//         a touch warmer (2 to 10 s)

/** The sky from the top down to the horizon. */
const SKY = [[0, '#74b1e8'], [0.4, '#9dcdf2'], [0.78, '#cfe7f5'], [1, '#eef5ee']] as const;
/** The warmer light of afterwards: it lies low, over the valley, and comes from then to then (seconds of the moment). */
const WARM_RGB = '255,222,178';
const WARM = 0.2;
const WARMS_S = [2, 10] as const;
const CLOUD = '#ffffff';
const GLINT = '#ffffff';

/** A thin high cloud, as wisps: [row, from, to, how much it shows], lengths in shares of its own. */
type Wisp = readonly [row: number, from: number, to: number, alpha: number];
/** Two of them: where each floats (shares of the width from the middle, against the wind, and of the sky's height), how long it is (of the width), its pace in pixels a second. */
const CLOUDS: readonly { readonly aside: number; readonly high: number; readonly long: number; readonly pace: number; readonly wisps: readonly Wisp[] }[] = [
  { aside: 0.2, high: 0.5, long: 0.2, pace: 1.1, wisps: [[-1, 0.3, 0.66, 0.55], [0, 0.04, 0.92, 0.9], [1, 0, 1, 0.9], [2, 0.22, 0.74, 0.55], [2, 0.84, 1.12, 0.45]] },
  { aside: -0.1, high: 0.2, long: 0.13, pace: 0.6, wisps: [[0, 0.2, 1, 0.8], [1, 0, 0.7, 0.8], [2, 0.3, 0.5, 0.45], [-1, 0.62, 1.2, 0.45]] },
];

const SPRING: LookoutTones = { body: '#5aa650', rim: '#8fd064', deep: '#3c7f44', blades: ['#4a964a', '#74bd58'], front: ['#8ad260', '#68b450'] };
const WARMED: LookoutTones = { body: '#6aac4e', rim: '#a8d868', deep: '#467f40', blades: ['#5a9c48', '#8cc65a'], front: ['#9cd862', '#78b84e'] };

const warmth = ({ moment }: VistaView): number => (moment === undefined ? 0 : ramp(moment, WARMS_S[0], WARMS_S[1]));

function lookoutTones(view: VistaView): LookoutTones {
  const warm = warmth(view);
  const pair = (a: readonly [string, string], b: readonly [string, string]): [string, string] => [mix(a[0], b[0], warm), mix(a[1], b[1], warm)];
  return {
    body: mix(SPRING.body, WARMED.body, warm),
    rim: mix(SPRING.rim, WARMED.rim, warm),
    deep: mix(SPRING.deep, WARMED.deep, warm),
    blades: pair(SPRING.blades, WARMED.blades),
    front: pair(SPRING.front, WARMED.front),
    flowers: caughtPetals(view),
  };
}

// The clouds are a few long thin wisps each, drifting slowly the way the breeze goes; the higher one more slowly.
function paintClouds({ ctx, w, t, dir }: VistaView, { skyline }: SpringLand): void {
  ctx.fillStyle = CLOUD;
  CLOUDS.forEach((cloud) => {
    const long = Math.max(14, Math.round(w * cloud.long));
    const left = Math.round(w / 2 - dir * (w * cloud.aside - t * cloud.pace) - long / 2);
    const top = Math.max(2, Math.round(skyline * cloud.high));
    cloud.wisps.forEach(([row, from, to, alpha]) => {
      // Mirrored when the breeze goes the other way, so its tail always trails behind.
      const start = dir > 0 ? from : 1 - to;
      ctx.globalAlpha = alpha;
      ctx.fillRect(left + Math.round(start * long), top + row, Math.round((to - from) * long), 1);
    });
  });
  ctx.globalAlpha = 1;
}

// The river catches the light: a few sparks on it, each coming and going in its own time.
function paintGlints({ ctx, t }: VistaView, { water }: SpringLand): void {
  ctx.fillStyle = GLINT;
  water.forEach(([from, to, row], i) => {
    for (let k = 0; k * 7 < to - from; k++) {
      const spark = Math.sin(t * (1.3 + hash(i, k)) + hash(k, i) * 6.3);
      if (spark > 0.3) {
        ctx.globalAlpha = spark;
        ctx.fillRect(from + Math.floor(hash(i + 0.5, k) * (to - from)), row, i > 3 ? 2 : 1, 1);
      }
    }
  });
  ctx.globalAlpha = 1;
}

export const blossom: VistaPainter = {
  back(view) {
    const land = springLand(view);
    gradient(view, 0, land.horizon, SKY);
    paintClouds(view, land);
    view.ctx.drawImage(land.image, 0, 0);
    paintGlints(view, land);
    gradient(view, 0, view.h, [[0, `rgba(${WARM_RGB},0)`], [0.85, `rgba(${WARM_RGB},1)`], [1, `rgba(${WARM_RGB},1)`]], WARM * warmth(view));
    paintBoughs(view);
    paintFalling(view, FAR_PETALS);
    paintStream(view, false);
    paintLookout(view, lookoutTones(view));
  },
  // What passes between the fox and us: the nearest petals, and the ones lying in the grass at its feet.
  front(view) {
    paintFalling(view, NEAR_PETALS);
    paintStream(view, true);
    paintSettled(view);
    paintLookoutFront(view, lookoutTones(view));
  },
};
