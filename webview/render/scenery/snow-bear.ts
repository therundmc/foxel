import { px, ramp, type VistaView } from './paint';
import type { WinterLand } from './snow-land';

// A white bear on the ice, far away: it ambles across the frozen lake toward the side the fox looks to, and when the
// northern lights come out it sits down and watches them too.

/** Facing right: two steps of its walk, and sitting with its nose in the air. `W` fur, `s` fur in shade, `E` nose and eye. */
const WALK = [
  ['......WW..', '..WWWWWWW.', '.WWWWWWWWE', 'sWWWWWWWW.', '.sW...sW..', '.s....s...'],
  ['......WW..', '..WWWWWWW.', '.WWWWWWWWE', 'sWWWWWWWW.', '..sW..sW..', '...s...s..'],
] as const;
const SITS = ['.......W..', '......WWE.', '.....WWW..', '..WWWWWW..', '.sWWWWWW..', '.ssWWsWW..'] as const;
const FUR = { W: '#edf2fb', s: '#aebbd6', E: '#1b2238' } as const;
const LONG = WALK[0][0].length;
const TALL = WALK[0].length;
/** Pixels a second, seconds for one step, and how far ahead of the fox it starts. */
const AMBLES = 1.3;
const STEP_S = 0.55;
const STARTS = 46;
/** It needs this much ice to walk on. */
const MIN_ICE = 5;

export function paintBear({ ctx, w, t, moment, foxX, dir }: VistaView, land: WinterLand): void {
  const ice = land.lakeFoot - land.lakeTop;
  if (ice < MIN_ICE || w < 120) {
    return;
  }
  // It walks until the lights come out, or until it is near the edge of the view; then it sits.
  const walked = moment === undefined ? t : t - moment + Math.min(moment, 1.5) * ramp(1.5 - moment, 0, 1.5);
  const room = (dir > 0 ? w - foxX : foxX) - STARTS - LONG - 6;
  const gone = Math.min(Math.max(0, room), AMBLES * Math.max(0, walked));
  const sitting = (moment !== undefined && moment > 1.5) || gone >= room;
  const glyph = sitting ? SITS : WALK[Math.floor(t / STEP_S) % 2];
  const head = foxX + dir * (STARTS + gone);
  const left = Math.round(dir > 0 ? head : head - LONG);
  const top = land.lakeTop + Math.max(1, Math.round(ice * 0.45)) - TALL + 1;
  // A faint shadow on the ice under it.
  px(ctx, left + 1, top + TALL, FUR.E, 0.25, LONG - 3, 1);
  glyph.forEach((line, y) => {
    for (let x = 0; x < LONG; x++) {
      const c = line[dir > 0 ? x : LONG - 1 - x];
      if (c !== '.') {
        px(ctx, left + x, top + y, FUR[c as keyof typeof FUR]);
      }
    }
  });
}
