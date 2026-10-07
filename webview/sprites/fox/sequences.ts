import type { Animation } from '../frames';
import { TREAT_STAGES } from '../props';
import type { Extra } from './overlays';
import { anim, type Pose } from './pose';

// Animations too long or too regular to spell out frame by frame in the table.

// Also returns, for each bite stage, the time to resume from: lying down calmly in front of what is left.
export function eatAnimation(): { animation: Animation; resumeAt: number[] } {
  const LIE = { body: 'lie' } as const;
  const steps: [Pose, number][] = [
    [{ body: 'bow', treat: 0, eye: 'down' }, 220],
    [{ ...LIE, treat: 0, head: [1, 2], eye: 'down', extras: ['sniffA'] }, 320],
    [{ ...LIE, treat: 0, head: [1, 1], eye: 'happy', tail: 'sitB' }, 300],
  ];
  const resumeAt = [0];
  const elapsed = (): number => steps.reduce((sum, [, d]) => sum + d, 0);
  TREAT_STAGES.forEach((_, s) => {
    const left = s + 1 < TREAT_STAGES.length ? s + 1 : undefined;
    steps.push(
      [{ ...LIE, treat: s, head: [1, 2], eye: 'closed', mouth: 'open' }, 180],
      [{ ...LIE, treat: s, head: [2, 3], eye: 'closed', mouth: 'flat' }, 200],
      [{ ...LIE, treat: left, head: [0, 1], eye: 'closed', mouth: 'flat', extras: ['crumbsA'] }, 160],
      [{ ...LIE, treat: left, eye: 'happy', mouth: 'open', tail: 'sitA', extras: ['crumbsB'] }, 220],
      [{ ...LIE, treat: left, head: [0, 1], eye: 'happy', mouth: 'flat', tail: 'sitB' }, 220],
      [{ ...LIE, treat: left, eye: 'happy', mouth: 'open', tail: 'sitA' }, 220],
      [{ ...LIE, treat: left, head: [0, 1], eye: 'happy', mouth: 'flat', tail: 'sitB' }, 220],
    );
    if (left !== undefined) {
      resumeAt.push(elapsed());
    }
    steps.push([{ ...LIE, treat: left, eye: 'happy', tail: 'sitA' }, 260]);
  });
  steps.push(
    [{ ...LIE, eye: 'happy', mouth: 'tongue' }, 280],
    [{ ...LIE, eye: 'happy', mouth: 'tongue', head: [1, 0] }, 280],
    [{ ...LIE, eye: 'happy' }, 300],
    [{ ...LIE, eye: 'happy', tail: 'sitA', extras: ['heartsA'] }, 450],
    [{ ...LIE, eye: 'happy', tail: 'sitB', bob: 1, extras: ['heartsB'] }, 450],
  );
  return { animation: anim(steps), resumeAt };
}

export function nuzzleAnimation(body: 'stand' | 'lie'): Animation {
  return anim([
    [{ body, head: [1, 0], eye: 'closed', tail: body === 'lie' ? 'sitA' : 'wagL' }, 220],
    [{ body, head: [2, -1], eye: 'closed', tail: body === 'lie' ? 'sitB' : 'wagR', extras: ['smallHeartA'] }, 260],
    [{ body, head: [1, 0], eye: 'closed', tail: body === 'lie' ? 'sitA' : 'wagL' }, 220],
    [{ body, head: [2, -1], eye: 'closed', tail: body === 'lie' ? 'sitB' : 'wagR', extras: ['smallHeartB'] }, 260],
    [{ body, eye: 'happy', tail: body === 'lie' ? 'sitA' : 'up' }, 360],
  ]);
}

// Your hand is resting on it: without moving from where it is, it looks up and gently presses its head into it,
// toward its nose (`lean` 1) or toward its back (-1).
export function nudgeAnimation(body: 'sit' | 'lie', lean: 1 | -1): Animation {
  const rest: [number, number] = lean === 1 ? [0, 1] : [-1, 1];
  const press: [number, number] = lean === 1 ? [1, 0] : [-2, 0];
  return anim([
    [{ body, head: rest, eye: 'up', tail: 'sitA' }, 650],
    [{ body, head: press, eye: 'closed', tail: 'sitA' }, 560],
    [{ body, head: rest, eye: 'closed', tail: 'sitB' }, 460],
    [{ body, head: press, eye: 'closed', tail: 'sitB' }, 560],
    [{ body, head: rest, eye: 'happy', tail: 'sitA' }, 760],
  ]);
}

// Shaking itself off: the body twists one way and the other, ears flat, and drops or snow fly from it.
export function shakeAnimation(out: Extra, farther: Extra): Animation {
  return anim([
    [{ eye: 'closed', ears: 'back', tail: 'up' }, 220],
    ...Array.from({ length: 6 }, (_, i): [Pose, number][] => [
      [{ eye: 'closed', ears: 'back', head: [-1, 0], bob: 1, tail: 'wagL', extras: [i % 2 === 0 ? out : farther] }, 75],
      [{ eye: 'closed', ears: 'back', head: [1, 0], tail: 'wagR', extras: [i % 2 === 0 ? farther : out] }, 75],
    ]).flat(),
    [{ eye: 'happy', mouth: 'tongue', tail: 'wagL' }, 260],
    [{ eye: 'happy', mouth: 'tongue', tail: 'wagR' }, 260],
  ]);
}

// A long sleepy loop: slow breathing with rising Zzz, little twitches and dreams of the ball, a treat and a butterfly.
// With `sky`, it first dreams of that: something it sat and watched before going to sleep.
export function sleepAnimation(sky?: Extra): Animation {
  const SLEEP = { body: 'curl', eye: 'closed', ears: 'back' } as const;
  const breathe = (): [Pose, number][] => [
    [{ ...SLEEP, extras: ['zzz1'] }, 900],
    [{ ...SLEEP, bob: 1, extras: ['zzz2'] }, 900],
    [{ ...SLEEP, extras: ['zzz3'] }, 900],
    [{ ...SLEEP, bob: 1 }, 900],
  ];
  const dreamOf = (about: Extra, twitch: Pose): [Pose, number][] => [
    [{ ...SLEEP, extras: ['dreamDots1'] }, 400],
    [{ ...SLEEP, bob: 1, extras: ['dreamDots2'] }, 400],
    [{ ...SLEEP, extras: [about] }, 900],
    [{ ...SLEEP, ...twitch, extras: [about] }, 220],
    [{ ...SLEEP, bob: 1, extras: [about] }, 900],
    [{ ...SLEEP, ...twitch, extras: [about] }, 220],
    [{ ...SLEEP, mouth: 'blep', extras: [about] }, 1100],
    [{ ...SLEEP, bob: 1, mouth: 'blep' }, 900],
  ];
  return anim([
    ...breathe(),
    ...(sky ? [...dreamOf(sky, { tail: 'curlFlick' }), ...breathe()] : []),
    ...breathe(),
    [{ ...SLEEP, ears: 'up' }, 150],
    [SLEEP, 150],
    [{ ...SLEEP, ears: 'up' }, 150],
    [{ ...SLEEP, bob: 1 }, 500],
    ...breathe(),
    ...dreamOf('dreamBall', { tail: 'curlFlick' }),
    ...breathe(),
    [{ ...SLEEP, tail: 'curlFlick' }, 200],
    [SLEEP, 200],
    [{ ...SLEEP, tail: 'curlFlick' }, 200],
    [{ ...SLEEP, bob: 1 }, 600],
    ...breathe(),
    ...dreamOf('dreamBone', { mouth: 'open' }),
    ...breathe(),
    ...breathe(),
    ...dreamOf('dreamButterfly', { ears: 'up' }),
  ]);
}

export function patAnimation(body: 'sit' | 'lie'): Animation {
  return anim([
    [{ body, head: [0, 1], eye: 'closed', tail: 'sitA' }, 240],
    [{ body, head: [0, 2], eye: 'closed', tail: 'sitB', extras: ['smallHeartA'] }, 340],
    [{ body, head: [0, 1], eye: 'closed', tail: 'sitA', extras: ['smallHeartB'] }, 340],
    [{ body, head: [0, 2], eye: 'happy', tail: 'sitB' }, 300],
    [{ body, eye: 'happy', tail: 'sitA' }, 280],
  ]);
}
