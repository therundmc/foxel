import { lookoutTop } from './lookout';
import { mix, type VistaView } from './paint';

// Reeds at the water's edge, seen from very close in the lower corners of the picture: dark against the bright water.

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));

/** Stalk and head, as the dusk begins and once it has deepened. */
const STALK = ['#3b432f', '#23263c'] as const;
const HEAD = ['#4c3429', '#2a2032'] as const;
/** The tallest reed, as a share of the view and in pixels. */
const TALLEST_SHARE = 0.4;
const TALLEST = [10, 27] as const;
const HEAD_TALL = 4;
/** A reed shorter than this is too young to have a head. */
const HEADED_FROM = 10;
/** No reed stands this close to the fox: it has its place, and so has the bird that may sit beside it. */
const CLEAR = 30;

/** One reed: [how far from the corner, its height as a share of the tallest, which way it bows (1 into the picture), whether it has a head]. */
type Reed = readonly [aside: number, share: number, bow: -1 | 0 | 1, head: boolean];
/** The corner behind the fox's shoulder has a real clump; the one it looks to, two short reeds. */
const CLUMP: readonly Reed[] = [[2, 0.62, 0, true], [5, 1, 1, true], [9, 0.42, 1, false], [12, 0.8, 0, true], [17, 0.3, 1, false]];
const PAIR: readonly Reed[] = [[3, 0.5, 1, true], [7, 0.3, 0, false]];

export function paintReeds(view: VistaView, deepened: number): void {
  const { ctx, w, h, t, foxX, dir } = view;
  const tallest = clamp(Math.round(h * TALLEST_SHARE), TALLEST[0], TALLEST[1]);
  const stalk = mix(STALK[0], STALK[1], deepened);
  const head = mix(HEAD[0], HEAD[1], deepened);
  const corner = (reeds: readonly Reed[], edge: number, inward: number): void => {
    for (const [aside, share, bow, withHead] of reeds) {
      const x = edge + inward * aside;
      if (Math.abs(x - foxX) < CLEAR) {
        continue;
      }
      const tall = Math.max(4, Math.round(tallest * share));
      const foot = lookoutTop(view, x) + 1;
      const low = Math.round(tall * 0.45);
      // It bows a little as it rises, and only its top gives to the wind.
      const gust = Math.sin(t * 0.9 - dir * x * 0.07) > 0.75 ? dir : 0;
      const mid = x + bow * inward;
      const headed = withHead && tall >= HEADED_FROM;
      const top = headed ? HEAD_TALL + 2 : Math.max(2, Math.round(tall * 0.22));
      ctx.fillStyle = stalk;
      ctx.fillRect(x, foot - low, 1, low);
      ctx.fillRect(mid, foot - tall + top, 1, tall - low - top);
      ctx.fillRect(mid + gust, foot - tall, 1, top);
      if (headed) {
        ctx.fillStyle = head;
        ctx.fillRect(mid + gust, foot - tall + 2, 2, HEAD_TALL);
      }
    }
  };
  corner(CLUMP, dir > 0 ? 0 : w - 1, dir);
  corner(PAIR, dir > 0 ? w - 1 : 0, -dir);
}
