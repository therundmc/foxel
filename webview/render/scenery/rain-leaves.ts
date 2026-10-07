import { px, ramp, type VistaView } from './paint';
import { gustAt, hash } from './rain-plan';

// The leaves: a few coming down one at a time, rocking, and at the great moment a small swirl of them that a
// breath of wind lifts from the grass and carries away, which is what the fox follows.

/** Orange, red and yellow, each with the paler edge that leads. */
const LEAVES = [['#dd7426', '#f4a246'], ['#c23f2c', '#e2653e'], ['#e6b033', '#f8d868']] as const;

// One leaf, three pixels, tilted the way it slides: `slide` goes from -1 (left) to 1 (right).
function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, slide: number, tone: number, alpha = 1): void {
  const [body, edge] = LEAVES[tone];
  const col = Math.round(x);
  const row = Math.round(y);
  const tilt = slide > 0.4 ? 1 : slide < -0.4 ? -1 : 0;
  px(ctx, col - 1, row + (tilt > 0 ? 1 : 0), tilt < 0 ? edge : body, alpha);
  px(ctx, col, row, body, alpha);
  px(ctx, col + 1, row + (tilt < 0 ? 1 : 0), tilt < 0 ? body : edge, alpha);
}

/** Square pixels of view for each falling leaf, and the fewest and the most there are. */
const AREA = 2400;
const FEWEST = 2;
const MOST = 9;
/** Pixels a second: how fast the slowest falls, how far the wind takes it sideways, and how much farther in a gust. */
const FALLS = 7;
const DRIFTS = 5;
const GUSTS = 9;

/** Leaves falling from the top of the view. Each is a little clock: it falls, waits, and falls again elsewhere. */
export function paintLeaves({ ctx, w, h, t, dir }: VistaView): void {
  const count = Math.min(MOST, Math.max(FEWEST, Math.round((w * h) / AREA)));
  for (let i = 0; i < count; i++) {
    const speed = FALLS + 3 * hash(i, 21);
    const cycle = (h + 8) / speed + 1 + 4 * hash(i, 22);
    const at = t + hash(i, 23) * cycle;
    const fall = Math.floor(at / cycle);
    const since = at - fall * cycle;
    const swing = since * (1.5 + 0.6 * hash(i, 24)) + i;
    // Spread over the width, one stretch each, so two never fall side by side.
    const from = ((i + 0.15 + 0.7 * hash(fall, i + 25)) / count) * w;
    const x = from + (4 + 2 * hash(i, 26)) * Math.sin(swing) + dir * (DRIFTS * since + GUSTS * gustAt(t)) - dir * w * 0.15;
    // It hangs a little at each end of its swing.
    const y = since * speed - 4 - 1.5 * Math.sin(swing) ** 2;
    leaf(ctx, x, y, Math.cos(swing), Math.floor(hash(fall, i + 27) * LEAVES.length));
  }
}

/** How many leaves the breath of wind picks up, how long it blows, and how far it carries them at most. */
const SWIRL = 7;
const BLOWS = 2.6;
const CARRIES = 140;
const SETTLES = 3.2;

/** The swirl: it rises from the grass behind the fox, turns on itself past its head, and is gone on the side it looks to. */
export function paintSwirl({ ctx, w, h, moment, foxX, dir }: VistaView): void {
  if (moment === undefined || moment > BLOWS + SETTLES + SWIRL * 0.12) {
    return;
  }
  const room = dir > 0 ? w - foxX : foxX;
  const travel = 24 + Math.min(CARRIES, room - 8);
  const height = Math.min(26, h - 8);
  for (let i = 0; i < SWIRL; i++) {
    // They follow one another, like a ribbon.
    const since = moment - i * 0.12;
    if (since < 0) {
      continue;
    }
    const after = Math.max(0, since - BLOWS);
    const turn = since * (4.6 + 1.6 * hash(i, 31)) + i * 2.4;
    const wide = (2.5 + 4 * hash(i, 32)) * ramp(since, 0, 0.8);
    const x = foxX + dir * (travel * ramp(since, 0, BLOWS + 0.4) - 24 + 14 * after) + wide * 1.4 * Math.cos(turn);
    // Up from the grass, a wave on the way, then down again once the wind has dropped.
    const y = h - 5 - (height - 5) * ramp(since, 0, 1.1) - 4 * Math.sin(since * 2.3 + i) + wide * Math.sin(turn) + after * (5 + 4 * after);
    leaf(ctx, x, y, -dir * Math.sin(turn), i % LEAVES.length, 1 - ramp(after, SETTLES - 1.2, SETTLES));
  }
}
