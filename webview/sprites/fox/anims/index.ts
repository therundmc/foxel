import type { Animation } from '../../frames';
import { boxAnims } from './box';
import { cloudAnims } from './cloud';
import { detectiveAnims } from './detective';
import { flagAnims } from './flag';
import { flinchAnims } from './flinch';
import { helperAnims } from './helper';
import { hourglassAnims } from './hourglass';
import { letterAnims } from './letter';
import { parcelAnims } from './parcel';
import { pebblesAnims } from './pebbles';
import { tangleAnims } from './tangle';
import { zoneAnims } from './zone';

/** The same animation played backwards: how something that came goes away again. */
const reversed = (animation: Animation): Animation => ({ frames: [...animation.frames].reverse(), durations: [...animation.durations].reverse() });

/** What it does about your work: each group of animations, with its accessories, has a file of its own. */
export const WORK_ANIMATIONS = {
  ...flagAnims,
  ...letterAnims,
  ...tangleAnims,
  ...flinchAnims,
  ...boxAnims,
  ...hourglassAnims,
  ...pebblesAnims,
  ...cloudAnims,
  // Its cloud drifts off the way it came, when it has fretted enough for now.
  cloudOut: reversed(cloudAnims.cloudIn),
  ...detectiveAnims,
  ...zoneAnims,
  ...helperAnims,
  ...parcelAnims,
};
