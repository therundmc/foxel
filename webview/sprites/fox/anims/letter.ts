import type { Animation, Overlay } from '../../frames';
import { outlined } from '../../grid';
import { BIRD_FRAMES } from '../../props';
import { anim, type Pose } from '../pose';

const SIT = { body: 'sit' } as const;

// A small cream envelope with a red seal.
const ENVELOPE = outlined(['ccccccc', 'cqcccqc', 'ccqAqcc', 'ccccccc', 'ccccccc']);

const env = (x: number, y: number): Overlay => ({ x, y, glyph: ENVELOPE, mirrors: true });
// The bird always faces right; alternating the wings makes it flap.
const bird = (x: number, y: number, wing: 0 | 1): Overlay => ({ x, y, glyph: BIRD_FRAMES[wing], mirrors: true });

const held: Pose = { ...SIT, eye: 'happy', mouth: 'flat' };
const watching: Pose = { ...SIT, eye: 'up', mouth: 'open' };

export const letterAnims = {
  sendLetter: anim([
    [{ ...SIT, tail: 'sitA', props: [env(25, 21)] }, 300],
    [{ ...held, tail: 'sitB', props: [env(26, 15)] }, 250],
    [{ ...held, tail: 'sitA', props: [env(26, 15)] }, 200],
    [{ ...SIT, eye: 'up', mouth: 'flat', tail: 'sitB', props: [env(26, 15), bird(0, -6, 0)] }, 250],
    [{ ...SIT, eye: 'up', mouth: 'flat', tail: 'sitA', props: [env(26, 15), bird(14, -1, 1)] }, 250],
    [{ ...SIT, eye: 'up', mouth: 'flat', tail: 'sitB', props: [env(26, 15), bird(23, 5, 0)] }, 250],
    [{ ...SIT, eye: 'up', mouth: 'smile', tail: 'sitA', props: [env(27, 14), bird(27, 8, 1)] }, 200],
    [{ ...watching, tail: 'sitB', props: [env(30, 10), bird(29, 3, 0)] }, 250],
    [{ ...watching, tail: 'sitA', props: [env(35, 2), bird(34, -4, 1)] }, 250],
    [{ ...watching, tail: 'sitB', props: [env(41, -6), bird(40, -12, 0)] }, 250],
    [{ ...watching, tail: 'sitA', props: [env(47, -11), bird(46, -17, 1)] }, 200],
    [{ ...SIT, paw: 'wave1', eye: 'happy', mouth: 'open', tail: 'sitB' }, 220],
    [{ ...SIT, paw: 'wave2', eye: 'happy', mouth: 'open', tail: 'sitA' }, 200],
    [{ ...SIT, paw: 'wave1', eye: 'happy', mouth: 'open', tail: 'sitB' }, 200],
    [{ ...SIT, tail: 'sitA', eye: 'happy' }, 300],
  ]),
} satisfies Record<string, Animation>;
