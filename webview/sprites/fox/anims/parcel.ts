import { outlined } from '../../grid';
import type { Animation, Overlay } from '../../frames';
import { anim, type Pose } from '../pose';

// A big paste: a parcel drops out of the air, the fox catches it on its paws, is delighted, and puts it away
// behind itself.

const SIT = { body: 'sit' } as const;

/** A little parcel: brown paper, a string round it both ways, a bow on top. */
const PARCEL = outlined(['..A.A..', 'TTTATTT', 'TTTATTT', 'AAAAAAA', 'tttAttt', 'tttAttt']);

/** The parcel with its top left corner at (x, y); behind the fox once it is put away. */
const parcel = (x: number, y: number, behind = false): readonly Overlay[] => [{ x, y, glyph: PARCEL, mirrors: true, ...(behind ? { behind: true as const } : {}) }];
const holding = (pose: Pose, x: number, y: number, behind = false): Pose => ({ ...pose, props: parcel(x, y, behind) });

export const parcelAnims = {
  catchParcel: anim([
    // It hears it coming and looks up; the parcel falls faster and faster.
    [holding({ ...SIT, eye: 'up', ears: 'up', tail: 'sitA' }, 22, -34), 110],
    [holding({ ...SIT, eye: 'up', mouth: 'open', tail: 'sitA' }, 22, -26), 90],
    [holding({ ...SIT, eye: 'up', mouth: 'open', paw: 'beg', tail: 'sitB' }, 22, -12), 80],
    [holding({ ...SIT, eye: 'wide', mouth: 'open', paw: 'beg', tail: 'sitB' }, 22, 4), 70],
    // Caught: it gives under the weight, then comes back up.
    [holding({ ...SIT, bob: 1, head: [0, 1], eye: 'closed', paw: 'beg', tail: 'sitA' }, 22, 12), 120],
    [holding({ ...SIT, eye: 'happy', mouth: 'open', paw: 'beg', tail: 'sitB', extras: ['sparkleA'] }, 22, 10), 260],
    [holding({ ...SIT, eye: 'happy', mouth: 'open', paw: 'beg', tail: 'sitA', extras: ['sparkleB'] }, 22, 10), 260],
    // And puts it away behind itself: over its shoulder, then down out of sight behind its back.
    [holding({ ...SIT, head: [-1, 0], eye: 'open', tail: 'sitB' }, 14, 6), 120],
    [holding({ ...SIT, head: [-1, 0], eye: 'open', tail: 'sitB' }, 8, 10, true), 110],
    [holding({ ...SIT, head: [-1, 1], eye: 'down', tail: 'sitA' }, 7, 17, true), 110],
    [{ ...SIT, eye: 'happy', tail: 'sitB' }, 240],
    [{ ...SIT, tail: 'sitA' }, 160],
  ]),
} satisfies Record<string, Animation>;
