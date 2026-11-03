import { paintLookout, paintLookoutFront, type LookoutTones } from './lookout';
import { mix, type VistaPainter, type VistaView } from './paint';
import { paintBow } from './rainbow-bow';
import { landOf, paintLand, paintSmoke } from './rainbow-land';
import { lightAt, planOf } from './rainbow-plan';
import { paintBirds, paintClouds, paintSky } from './rainbow-sky';
import { FAR, NEAR, paintDrops, paintPond } from './rainbow-water';

// A sunshower over soft green hills. Light rain falls through the sunshine, the drops glinting as they catch it;
// a pond in the meadow is ringed with ripples, and a little house far off on a hill sends up its smoke. On the side
// the fox looks to, the shower's cloud moves off with its veil of rain, the dark wall the rainbow will come out on.
//   0 s   the shower in a pale grey light, the sun out of sight behind us
//   2 s   the light warms little by little and the rain thins, until 20 s
//  moment a little star draws the rainbow across the sky from the foot by the fox to the far one, over the house
//         (0.4 to 5.6 s), and lands in a burst; the pond takes its foot; the last drops glint with its colours
//         (1 to 10 s); a faint second bow comes out above it (5 to 10 s); a few little birds fly out from behind
//         the fox and away through it (6.5 to 22.5 s); the light clears to a fresh blue (5 to 18 s)
//  after  it stays, breathing; a gleam runs along it every 9 s and it twinkles here and there; the cloud pales
//         as it moves off (18 to 45 s)

/** The lookout wet under the shower, then fresh green in the sun, with the flowers of a spring meadow. */
const WET: LookoutTones = {
  body: '#4c7a4e',
  rim: '#6a9a62',
  deep: '#3a6040',
  blades: ['#5a8a56', '#77a56a'],
  front: ['#4f7f4f', '#3f6a44'],
  flowers: ['#d4d0dc', '#d2b4c4', '#d4cca8', '#bcc4dc'],
};
const SUNNY: LookoutTones = {
  body: '#5e9e48',
  rim: '#a4dc6a',
  deep: '#447a3c',
  blades: ['#7cc456', '#a8e070'],
  front: ['#6cb24c', '#4f8c40'],
  flowers: ['#fff8f4', '#ffbcd0', '#fff0a0', '#d0dcff'],
};

function lookoutTones(view: VistaView): LookoutTones {
  const sun = Math.min(1, lightAt(view.t, view.moment));
  const pair = (a: readonly [string, string], b: readonly [string, string]): [string, string] => [mix(a[0], b[0], sun), mix(a[1], b[1], sun)];
  return {
    body: mix(WET.body, SUNNY.body, sun),
    rim: mix(WET.rim, SUNNY.rim, sun),
    deep: mix(WET.deep, SUNNY.deep, sun),
    blades: pair(WET.blades, SUNNY.blades),
    front: pair(WET.front, SUNNY.front),
    flowers: WET.flowers?.map((flower, i) => mix(flower, SUNNY.flowers?.[i] ?? flower, sun)),
  };
}

export const rainbow: VistaPainter = {
  back(view) {
    const plan = planOf(view);
    const land = landOf(view, plan);
    const light = lightAt(view.t, view.moment);
    const sun = Math.min(1, light);
    paintSky(view, plan, light);
    paintClouds(view, plan, light);
    paintLand(view, land.far, sun);
    paintBow(view, plan);
    paintBirds(view, plan);
    paintLand(view, land.near, sun);
    paintSmoke(view, plan);
    paintPond(view, plan, light);
    paintDrops(view, plan, FAR, sun);
    paintLookout(view, lookoutTones(view));
  },
  // The near drops fall between the fox and us, and a few blades of the lookout stand over its paws.
  front(view) {
    const plan = planOf(view);
    paintDrops(view, plan, NEAR, Math.min(1, lightAt(view.t, view.moment)));
    paintLookoutFront(view, lookoutTones(view));
  },
};
