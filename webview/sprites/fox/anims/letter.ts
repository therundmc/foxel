import type { Animation, Glyph, Overlay, Point } from '../../frames';
import { outlined } from '../../grid';
import { BIRD_FRAMES } from '../../props';
import { anim, type Pose } from '../pose';

const SIT = { body: 'sit' } as const;

// An envelope seen from its back: the white flap comes down to a red seal, the bottom edge is in shadow.
const LETTER = outlined([
  'tWWWWWWWt',
  'ctWWWWWtc',
  'cctWWWtcc',
  'ccctAtccc',
  'ccccAcccc',
  'hhhhhhhhh',
]);

/** Middle of the mouth of a sitting pose. */
const mouthOf = (p: Pose): Point => [26 + (p.head?.[0] ?? 0), 16 + (p.head?.[1] ?? 0) - (p.snoutUp ?? 0)];

/**
 * The same pose with the letter in its mouth: behind the fox, so that its muzzle closes over the corner.
 * `back` and `down` are how far the letter still is from there, while it draws it out from under its chest.
 */
const holding = (p: Pose, back = 0, down = 0): Pose => {
  const [mx, my] = mouthOf(p);
  return { ...p, props: [{ x: mx - back, y: my - 2 + down, glyph: LETTER, mirrors: true, behind: true }] };
};

// The bird always looks the way the fox does; alternating the two glyphs beats its wings.
const bird = (x: number, y: number, wing: 0 | 1): Overlay => ({ x, y, glyph: BIRD_FRAMES[wing], mirrors: true });
/** The same pose with the bird in the air at (x, y), over whatever it already holds. */
const birdAt = (p: Pose, x: number, y: number, wing: 0 | 1): Pose => ({ ...p, props: [...(p.props ?? []), bird(x, y, wing)] });

// Its feet, seen only when its wings are down and it hangs on to the letter from a pixel higher.
const CLAWS: Glyph = ['SS'];
/**
 * The letter at (x, y) hanging from the bird: wings up, its belly is on the top edge; wings down, it has risen a
 * pixel and holds on by its feet. `lead` is how far ahead of the letter it flies: the letter swings under it.
 */
const carried = (x: number, y: number, wing: 0 | 1, lead: number, behind?: true): readonly Overlay[] => {
  const bx = x + lead;
  const by = y - 5 - wing;
  const claws: Overlay[] = wing === 1 ? [{ x: bx + 4, y: by + 5, glyph: CLAWS, mirrors: true }] : [];
  return [{ x, y, glyph: LETTER, mirrors: true, behind }, bird(bx, by, wing), ...claws];
};

const WATCH = { ...SIT, eye: 'up', mouth: 'flat' } as const;
// Neck stretched, the letter held up for the bird.
const OFFER = { ...SIT, head: [0, -1], snoutUp: 1, eye: 'up', mouth: 'flat' } as const;
const GONE = { ...SIT, eye: 'up', mouth: 'open' } as const;

export const letterAnims = {
  sendLetter: anim([
    // It looks down, tucks its nose under its chest, rummages and comes up with a letter.
    [{ ...SIT, tail: 'sitA' }, 140],
    [{ ...SIT, head: [0, 1], eye: 'down', tail: 'sitA' }, 110],
    [{ ...SIT, head: [-1, 3], eye: 'down', mouth: 'flat', tail: 'sitA' }, 80],
    [{ ...SIT, head: [-3, 6], eye: 'closed', mouth: 'flat', tail: 'sitB' }, 120],
    [{ ...SIT, head: [-2, 6], eye: 'closed', mouth: 'flat', tail: 'sitA' }, 100],
    [holding({ ...SIT, head: [-2, 4], eye: 'closed', mouth: 'flat', tail: 'sitB' }, 9, 1), 80],
    [holding({ ...SIT, head: [-1, 2], eye: 'down', mouth: 'flat', tail: 'sitB' }, 3, 0), 70],
    [holding({ ...SIT, head: [0, -1], snoutUp: 1, eye: 'happy', mouth: 'flat', tail: 'sitA' }), 90],
    [holding({ ...SIT, eye: 'happy', mouth: 'flat', tail: 'sitB' }), 200],
    [holding({ ...SIT, eye: 'happy', mouth: 'flat', tail: 'sitA' }), 150],
    // A bird drops out of the sky in a curve and round to its nose: it follows it with its eyes, then holds the letter up.
    [birdAt(holding({ ...SIT, eye: 'up', mouth: 'flat', tail: 'sitA' }), 8, -36, 1), 60],
    [birdAt(holding({ ...WATCH, snoutUp: 1, tail: 'sitB' }), 15, -30, 0), 60],
    [birdAt(holding({ ...WATCH, snoutUp: 1, tail: 'sitB' }), 22, -24, 1), 70],
    [birdAt(holding({ ...WATCH, snoutUp: 1, tail: 'sitA' }), 28, -17, 0), 70],
    [birdAt(holding({ ...WATCH, snoutUp: 1, tail: 'sitA' }), 33, -10, 1), 70],
    [birdAt(holding({ ...WATCH, snoutUp: 1, head: [0, 1], tail: 'sitB' }), 35, -4, 0), 80],
    [birdAt(holding({ ...WATCH, snoutUp: 1, head: [0, 1], tail: 'sitB' }), 35, 1, 1), 80],
    [birdAt(holding({ ...OFFER, eye: 'up', tail: 'sitA' }), 34, 4, 0), 90],
    // It hovers over the letter, beating its wings, and lands on its edge: the fox's head dips under it.
    [birdAt(holding({ ...OFFER, tail: 'sitA' }), 32, 3, 1), 80],
    [birdAt(holding({ ...OFFER, tail: 'sitB' }), 31, 2, 0), 80],
    [birdAt(holding({ ...OFFER, tail: 'sitB' }), 31, 4, 1), 80],
    [birdAt(holding({ ...OFFER, tail: 'sitA' }), 31, 3, 0), 80],
    [{ ...OFFER, tail: 'sitA', props: carried(26, 12, 1, 5, true) }, 80],
    [{ ...OFFER, head: [0, 0], eye: 'happy', tail: 'sitB', props: carried(26, 13, 0, 5, true) }, 130],
    // Off it goes with the letter swinging under it, slowly then faster, up and out of sight.
    [{ ...OFFER, mouth: 'open', tail: 'sitB', props: carried(28, 11, 1, 3, true) }, 100],
    [{ ...GONE, tail: 'sitA', props: carried(30, 9, 0, 2) }, 90],
    [{ ...GONE, head: [0, -1], tail: 'sitA', props: carried(33, 5, 1, 1) }, 80],
    [{ ...GONE, head: [0, -1], tail: 'sitB', props: carried(36, -1, 0, 0) }, 70],
    [{ ...GONE, paw: 'wave1', tail: 'sitB', props: carried(39, -8, 1, 1) }, 70],
    [{ ...GONE, paw: 'wave1', tail: 'sitA', props: carried(41, -16, 0, 2) }, 60],
    [{ ...GONE, paw: 'wave2', tail: 'sitA', props: carried(43, -24, 1, 1) }, 60],
    [{ ...GONE, paw: 'wave2', tail: 'sitB', props: carried(44, -31, 0, 2) }, 60],
    // It waves it goodbye.
    [{ ...SIT, paw: 'wave1', eye: 'happy', mouth: 'open', snoutUp: 1, tail: 'sitB' }, 170],
    [{ ...SIT, paw: 'wave2', eye: 'happy', mouth: 'open', tail: 'sitA' }, 190],
    [{ ...SIT, paw: 'wave1', eye: 'happy', mouth: 'open', tail: 'sitB' }, 170],
    [{ ...SIT, paw: 'wave2', eye: 'happy', mouth: 'smile', tail: 'sitA' }, 150],
    [{ ...SIT, head: [0, 1], eye: 'happy', tail: 'sitB' }, 140],
    [{ ...SIT, tail: 'sitA' }, 260],
  ]),
} satisfies Record<string, Animation>;
