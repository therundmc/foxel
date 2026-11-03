import { seeded } from './paint';

// The clouds of the dusk: big soft banks of round puffs with flat undersides, lit from below by the sun that has just
// gone, their tops already in shade; and a few long thin strands low over the mountains, the last to hold the light.
// By night they are the same shapes, dark on the dark sky.

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));

/** A cloud: its middle and the row of its underside, how wide and how thick it is at most. */
interface Cloud {
  readonly x: number;
  readonly bottom: number;
  readonly wide: number;
  readonly thick: number;
  readonly seed: number;
}

/** The clouds of a view, gathered on the side the sun went down. */
export function cloudsOf(w: number, shore: number, sunX: number, dir: 1 | -1): Cloud[] {
  const random = seeded(0xc10d);
  const big = clamp(Math.round(shore * 0.32), 5, 24);
  return [
    { x: sunX - dir * w * 0.22, bottom: Math.round(shore * 0.44), wide: w * 0.5, thick: big, seed: random() },
    { x: sunX - dir * w * 0.78, bottom: Math.round(shore * 0.26), wide: w * 0.3, thick: Math.round(big * 0.7), seed: random() },
    { x: sunX + dir * w * 0.1, bottom: Math.round(shore * 0.18), wide: w * 0.26, thick: Math.round(big * 0.55), seed: random() },
    { x: sunX - dir * w * 0.15, bottom: Math.round(shore * 0.72), wide: w * 0.42, thick: 2, seed: random() },
    { x: sunX - dir * w * 0.62, bottom: Math.round(shore * 0.63), wide: w * 0.3, thick: 1, seed: random() },
  ];
}

/** Which pixels of a cloud's box are cloud: round puffs, widest and tallest in its middle, cut flat underneath. */
function shapeOf({ wide, thick, seed }: Cloud, boxW: number, boxH: number): Uint8Array {
  const random = seeded(Math.floor(seed * 1e6));
  const mask = new Uint8Array(boxW * boxH);
  const puffs: [number, number, number][] = [];
  for (let u = thick * 0.4; u < wide - thick * 0.4; ) {
    const envelope = Math.sin((Math.PI * u) / wide) ** 0.6;
    const r = Math.max(1.5, thick * envelope * (0.5 + 0.5 * random()));
    puffs.push([u + thick, boxH - r * (0.45 + 0.2 * random()), r]);
    u += r * (0.7 + 0.7 * random());
  }
  for (const [px, py, r] of puffs) {
    for (let y = Math.max(0, Math.floor(py - r)); y < boxH; y++) {
      for (let x = Math.max(0, Math.floor(px - r * 1.5)); x < Math.min(boxW, px + r * 1.5); x++) {
        if (((x - px) / 1.5) ** 2 + (y - py) ** 2 <= r * r) {
          mask[y * boxW + x] = 1;
        }
      }
    }
  }
  return mask;
}

/** Paints the clouds in the given tones: shaded tops, bodies, lit undersides and their brightest lowest row. */
export function drawClouds(ctx: CanvasRenderingContext2D, all: readonly Cloud[], tones: readonly [string, string, string, string]): void {
  for (const cloud of all) {
    const { x, bottom, wide, thick } = cloud;
    if (thick <= 2) {
      // A strand: a thin line, thinning to nothing at its ends, its lower row lit.
      for (let col = Math.floor(x - wide / 2); col < x + wide / 2; col++) {
        const s = (col - (x - wide / 2)) / wide;
        const tall = Math.round(thick * Math.sin(Math.PI * s) ** 0.5 + 0.3 * Math.sin(col * 0.4 + cloud.seed * 9));
        const low = bottom + Math.round(Math.sin(col * 0.05 + cloud.seed * 9));
        for (let up = 0; up < tall; up++) {
          ctx.fillStyle = tones[up === 0 ? 3 : 2];
          ctx.fillRect(col, low - up, 1, 1);
        }
      }
      continue;
    }
    const boxW = Math.ceil(wide + thick * 2);
    const boxH = thick * 2;
    const mask = shapeOf(cloud, boxW, boxH);
    const left = Math.round(x - boxW / 2);
    const top = bottom - boxH + 1;
    const lit = thick > 10 ? 2 : 1;
    for (let col = 0; col < boxW; col++) {
      // Each run of cloud in this column, from its underside up.
      for (let y = boxH - 1; y >= 0; ) {
        if (!mask[y * boxW + col]) {
          y--;
          continue;
        }
        let end = y;
        while (end >= 0 && mask[end * boxW + col]) {
          end--;
        }
        const tall = y - end;
        const shade = Math.max(1, Math.floor(tall * 0.35));
        for (let up = 0; up < tall; up++) {
          const fromTop = tall - 1 - up;
          const dither = (col + up) % 2 === 0;
          const tone = up === 0 ? 3 : up <= lit || (up === lit + 1 && dither) ? 2 : fromTop < shade || (fromTop === shade && dither) ? 0 : 1;
          ctx.fillStyle = tones[tone];
          ctx.fillRect(left + col, top + y - up, 1, 1);
        }
        y = end;
      }
    }
  }
}
