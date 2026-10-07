import { clamp01, seeded } from './paint';
import { peakHeight, peakSnow, type Peak } from './peak';
import { blend, rgb, wander, type Pixels } from './clouds-pixels';

// The great peak on a summer afternoon: two faces meeting on the ridge that comes down from its summit, one in
// the sun and one in its own shadow, snow on its head and in its gullies, and its foot lost in the haze.

const ROCK = { lit: rgb('#a9c0ec'), lined: rgb('#96aee4'), shade: rgb('#7c93d4'), dark: rgb('#6a80c8') };
const SNOW = { lit: rgb('#ffffff'), shade: rgb('#d3e0f8') };
const AIR = rgb('#cfe2f6');

/** The ridge leans toward the shaded side as it comes down, this many pixels a row: the sunny face is the wide one. */
const RIDGE_DRIFT = 0.2;
/** The lowest part of the peak pales in two flat steps, up to this much. */
const HAZE_BELOW = 0.68;
const HAZE = 0.5;
/** What a stroke leaves on the face: snow in a gully, bare rock through the snow, a rib of darker rock. */
const GULLY = 1;
const BARE = 2;
const RIB = 3;

const tri = (v: number): number => Math.abs((((v % 1) + 1) % 1) - 0.5) * 2;

/** Where the shoulder of the peak ends: the lowest column of its upper half where the outline runs nearly level. */
function shoulderOf(tall: number): number {
  let at = 0;
  for (let dx = 1; peakHeight(dx, tall) > tall * 0.45; dx++) {
    if (peakHeight(dx - 1, tall) - peakHeight(dx, tall) < 0.6) {
      at = dx;
    }
  }
  return at;
}

/** Paints the peak into `out`, its foot on row `foot`, down to row `until`; the sun is on the side of `dir`. */
export function paintPeak(out: Pixels, peak: Peak, foot: number, until: number, dir: number): void {
  const { tall } = peak;
  const summit = foot - tall;
  const random = seeded(0x9ea4);
  const rough = wander(51);
  const ridge = (down: number): number => peak.x - dir * RIDGE_DRIFT * down + tri(down / 7) * 2 - 1;

  // Thin strokes that run down the slope, away from the ridge.
  const marks = new Uint8Array(out.w * out.h);
  const stroke = (x: number, y: number, rows: number, every: number, mark: number): void => {
    const side = x < ridge(y - summit) ? -1 : 1;
    for (let n = 0; n < rows; n++) {
      const sx = Math.round(x) + side * Math.floor(n / every);
      if (sx >= 0 && sx < out.w && y + n >= 0 && y + n < out.h) {
        marks[(y + n) * out.w + sx] = mark;
      }
    }
  };
  for (let n = 0, count = Math.round(tall / 5); n < count; n++) {
    const dx = Math.round((random() * 0.62 - 0.26) * tall);
    stroke(peak.x + dx, Math.round(summit + peakSnow(dx, tall)), Math.round(tall * (0.07 + 0.13 * random())), 2, GULLY);
  }
  for (let n = 0, count = Math.round(tall / 9); n < count; n++) {
    const down = Math.round(tall * (0.14 + 0.2 * random()));
    stroke(ridge(down) + (random() * 2 - 1) * down * 0.45, summit + down, 2 + Math.round(tall / 24), 1, BARE);
  }
  for (let n = 0, count = Math.round(tall / 7); n < count; n++) {
    const down = Math.round(tall * (0.5 + 0.34 * random()));
    stroke(ridge(down) + (random() * 2 - 1) * down * 0.5, summit + down, Math.round(tall * (0.08 + 0.1 * random())), 2, RIB);
  }

  const shoulder = shoulderOf(tall);
  const shoulderDown = tall - peakHeight(shoulder, tall);
  const facet = tall * 0.3;
  for (let x = 0; x < out.w; x++) {
    const dx = x - peak.x;
    const high = peakHeight(dx, tall);
    if (high <= 0) {
      continue;
    }
    const snowLine = peakSnow(dx, tall);
    for (let y = Math.max(0, Math.round(foot - high)); y < Math.min(out.h, until); y++) {
      const down = y - summit;
      let sunny = (x - ridge(down)) * dir > 0;
      // Under the shoulder a small face turns the other way: in shade on the sunny side, catching light on the other.
      const under = down - shoulderDown;
      const aside = shoulder + under * 0.12 - dx;
      if (shoulder > 0 && under > 0 && under < facet && aside >= 0 && aside < Math.min(under * 0.8, (facet - under) * 1.3)) {
        sunny = dir < 0;
      }
      const mark = marks[y * out.w + x];
      if (down < snowLine ? mark !== BARE : mark === GULLY) {
        out.set(x, y, sunny ? SNOW.lit : SNOW.shade);
        continue;
      }
      const rock = sunny ? (mark === RIB ? ROCK.lined : ROCK.lit) : mark === RIB ? ROCK.dark : ROCK.shade;
      // The edge of each step wanders, so the haze does not lie in ruled lines.
      const haze = Math.floor(clamp01((down / tall - HAZE_BELOW) / (1 - HAZE_BELOW) + rough(x * 0.23) * 0.12) * 2.99) / 2;
      out.set(x, y, blend(rock, AIR, haze * HAZE));
    }
  }
}
