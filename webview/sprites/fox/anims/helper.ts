import type { Animation, Overlay } from '../../frames';
import { anim, frame, type Pose } from '../pose';

// An assistant is writing code in your place: the fox puts on a little pair of round glasses and supervises,
// following the lines with its eyes and nodding as they come.

const SIT = { body: 'sit' } as const;

/** Round glasses seen from the side: one lens round its eye, the arm going back to its ear. */
const GLASSES = ['.....EEEE.', 'EEEEE....E', '....E....E', '....E....E', '.....EEEE.'] as const;
/** Where the lens' corner is from the corner of its open eye. */
const LENS_AT = [-7, -1] as const;

/** Where the open eye of a sitting fox is from the middle of its head: the glasses follow the head from there. */
const SITTING = frame(SIT);
const EYE_FROM_HEAD = [(SITTING.eye?.[0] ?? 0) - SITTING.head[0], (SITTING.eye?.[1] ?? 0) - SITTING.head[1]] as const;

/** The pose with its glasses on, `lower` pixels down its nose (they come up from under its chin). */
function wearing(pose: Pose, lower = 0): Pose {
  const { head } = frame(pose);
  const glasses: Overlay = { x: head[0] + EYE_FROM_HEAD[0] + LENS_AT[0], y: head[1] + EYE_FROM_HEAD[1] + LENS_AT[1] + lower, glyph: GLASSES, mirrors: true };
  return { ...pose, props: [glasses] };
}

const READING: Pose = { ...SIT, head: [0, 1], eye: 'down', mouth: 'flat' };

export const helperAnims = {
  // It looks down, brings the glasses up its nose with a paw, and pushes them into place.
  glassesOn: anim([
    [{ ...SIT, eye: 'down', tail: 'sitA' }, 180],
    [wearing({ ...SIT, head: [0, 1], eye: 'closed', paw: 'beg', tail: 'sitA' }, 5), 110],
    [wearing({ ...SIT, head: [0, 1], eye: 'closed', paw: 'beg', tail: 'sitB' }, 2), 110],
    [wearing({ ...SIT, eye: 'closed', paw: 'lick', tail: 'sitB' }), 160],
    [wearing({ ...SIT, eye: 'wide', tail: 'sitA' }), 220],
    [wearing({ ...READING, tail: 'sitA' }), 160],
  ]),
  // Its eyes run along a line, drop to the next; a nod when one is to its liking; a glance at us over the rims.
  supervise: anim([
    [wearing({ ...READING, tail: 'sitA' }), 420],
    [wearing({ ...READING, head: [1, 1], tail: 'sitA' }), 380],
    [wearing({ ...READING, head: [0, 1], tail: 'sitB' }), 300],
    [wearing({ ...READING, head: [1, 2], tail: 'sitB' }), 380],
    [wearing({ ...SIT, head: [0, 2], eye: 'closed', mouth: 'smile', tail: 'sitA' }), 150],
    [wearing({ ...SIT, head: [0, 0], eye: 'happy', mouth: 'smile', tail: 'sitA' }), 220],
    [wearing({ ...READING, tail: 'sitB' }), 420],
    [wearing({ ...READING, head: [1, 1], tail: 'sitB' }), 380],
    [wearing({ ...SIT, eye: 'open', tail: 'sitA' }), 480],
    [wearing({ ...READING, tail: 'sitA' }), 160],
  ]),
  // It takes them off the way it put them on, and blinks.
  glassesOff: anim([
    [wearing({ ...SIT, eye: 'open', paw: 'lick', tail: 'sitA' }), 160],
    [wearing({ ...SIT, head: [0, 1], eye: 'closed', paw: 'beg', tail: 'sitA' }, 2), 110],
    [wearing({ ...SIT, head: [0, 1], eye: 'closed', paw: 'beg', tail: 'sitB' }, 5), 110],
    [{ ...SIT, eye: 'closed', tail: 'sitB' }, 160],
    [{ ...SIT, eye: 'happy', tail: 'sitA' }, 260],
  ]),
} satisfies Record<string, Animation>;
