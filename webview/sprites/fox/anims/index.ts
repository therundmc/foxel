import { boxAnims } from './box';
import { cloudAnims } from './cloud';
import { detectiveAnims } from './detective';
import { flagAnims } from './flag';
import { flinchAnims } from './flinch';
import { hourglassAnims } from './hourglass';
import { letterAnims } from './letter';
import { pebblesAnims } from './pebbles';
import { tangleAnims } from './tangle';
import { zoneAnims } from './zone';

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
  ...detectiveAnims,
  ...zoneAnims,
};
