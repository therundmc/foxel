import { lookoutTop } from './lookout';
import { prerender, seeded, type VistaView } from './paint';

// A winter valley at night in the far north, painted once for a view: snowy mountains, a frozen lake, pines along
// its shore and a little red wooden cabin with lit windows. Nothing of it moves; the snow, the smoke and the northern lights are painted over it.

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));
/** A wave folded into straight slopes, from 0 to 1. */
const fold = (v: number): number => 1 - Math.abs(((v % 2) + 2) % 2 - 1);

const FAR = '#2f3f6c';
const FAR_SNOW = '#8ea3cf';
const NEAR = '#22305a';
const NEAR_SNOW = '#6f86b8';
const PINE = '#14213d';
const PINE_SNOW = '#c7d8f0';
const LAKE = ['#182a52', '#1f3562', '#2a4474'] as const;
/** The cabin: red painted boards, pale corner posts, a dark door, snow on its steep roof. */
const BOARDS = '#8e2f3a';
const BOARDS_DARK = '#6f2530';
const TRIM = '#cdd8ea';
const DOOR = '#2a1d24';
const ROOF = '#e4edf9';
const CHIMNEY = '#3a3038';
const SHORE = '#b9c9e6';

/** How tall the cabin stands, and how many of those rows are its gable. */
const CABIN_TALL = 11;
const GABLE = 6;

export interface WinterLand {
  readonly image: HTMLCanvasElement;
  /** The rows of the lake: from its far shore down to where the lookout hides it. */
  readonly lakeTop: number;
  readonly lakeFoot: number;
  /** The highest the far mountains go: the northern lights hang above. */
  readonly skyline: number;
  /** The cabin: its lit windows as [x, y, width, height] and the top of its chimney, or undefined where there is no room for it. */
  readonly cabin: { readonly lights: readonly (readonly [number, number, number, number])[]; readonly chimneyX: number; readonly chimneyY: number } | undefined;
}

function build(view: VistaView): WinterLand {
  const { w, h, foxX, dir } = view;
  const lakeFoot = h - 3;
  const lakeTop = lakeFoot - clamp(Math.round(h * 0.13), 4, 18);
  const farTall = clamp(Math.round(h * 0.3), 8, 46);
  const nearTall = Math.round(farTall * 0.5);
  const random = seeded(0x51a0);
  // The cabin stands on the shore behind the fox's shoulder, away from where it looks, if there is room there.
  const behind = dir > 0 ? foxX : w - foxX;
  const cabinX = behind > 46 ? Math.round(foxX - dir * clamp(behind * 0.55, 30, 110)) : undefined;
  const image = prerender(w, h, (ctx) => {
    const column = (x: number, top: number, color: string, tall: number): void => {
      ctx.fillStyle = color;
      ctx.fillRect(x, top, 1, tall);
    };
    for (let x = 0; x < w; x++) {
      const far = Math.round(farTall * (0.3 + 0.7 * Math.max(fold(x / 57 + 0.3), 0.72 * fold(x / 33 + 1.2), 0.45 * fold(x / 17 + 0.6))));
      column(x, lakeTop - far, FAR, far);
      // Snow lies on the upper slopes, its lower edge ragged.
      column(x, lakeTop - far, FAR_SNOW, Math.max(1, Math.round(far * 0.34 + 1.5 * Math.sin(x * 0.9) - 2)));
      const near = Math.round(nearTall * (0.45 + 0.4 * Math.sin(x / 41 + 2) + 0.15 * Math.sin(x / 13)));
      column(x, lakeTop - near, NEAR, near);
      column(x, lakeTop - near, NEAR_SNOW, 1);
      // The lake: darker toward us, with a pale line of snow on its far shore.
      LAKE.forEach((color, i) => {
        const from = lakeTop + Math.round(((lakeFoot - lakeTop) * i) / LAKE.length);
        column(x, from, color, lakeFoot - from);
      });
      column(x, lakeTop, SHORE, 1);
      column(x, lakeFoot, SHORE, Math.max(0, lookoutTop(view, x) - lakeFoot));
    }
    // Pines along the far shore, in small stands, each with snow on its boughs.
    for (let x = 3 + random() * 8; x < w - 3; x += 3 + random() * (random() < 0.3 ? 26 : 5)) {
      const tall = 4 + Math.floor(random() * clamp(h * 0.06, 2, 6));
      const at = Math.round(x);
      if (cabinX !== undefined && Math.abs(at - cabinX) < 11) {
        continue;
      }
      for (let row = 0; row < tall; row++) {
        const half = Math.round(((row + 1) / tall) * 2);
        column(at - half, lakeTop - tall + row, PINE, 1);
        ctx.fillRect(at - half, lakeTop - tall + row, half * 2 + 1, 1);
        if (row % 2 === 0) {
          column(at - half + (row % 4 === 0 ? 0 : half), lakeTop - tall + row, PINE_SNOW, 1);
        }
      }
    }
    if (cabinX !== undefined) {
      // Its gable faces us: a steep roof, so the snow slides off, and every other board a little darker.
      const top = lakeTop - CABIN_TALL;
      for (let row = 0; row < GABLE; row++) {
        ctx.fillStyle = BOARDS;
        ctx.fillRect(cabinX - row, top + row, row * 2 + 1, 1);
      }
      ctx.fillRect(cabinX - 5, top + GABLE, 11, CABIN_TALL - GABLE);
      ctx.fillStyle = BOARDS_DARK;
      for (let x = cabinX - 3; x <= cabinX + 4; x += 2) {
        ctx.fillRect(x, top + GABLE, 1, CABIN_TALL - GABLE);
      }
      ctx.fillStyle = TRIM;
      ctx.fillRect(cabinX - 5, top + GABLE, 1, CABIN_TALL - GABLE);
      ctx.fillRect(cabinX + 5, top + GABLE, 1, CABIN_TALL - GABLE);
      ctx.fillRect(cabinX - 4, top + GABLE + 3, 4, 1);
      ctx.fillStyle = DOOR;
      ctx.fillRect(cabinX + 2, top + GABLE + 2, 2, CABIN_TALL - GABLE - 2);
      ctx.fillStyle = CHIMNEY;
      ctx.fillRect(cabinX + 3, top - 1, 2, 4);
      // Snow lies thick on both slopes of the roof, overhanging the walls, and caps the chimney.
      ctx.fillStyle = ROOF;
      for (let k = 0; k <= GABLE; k++) {
        ctx.fillRect(cabinX - k - 1, top - 1 + k, 2, 1);
        ctx.fillRect(cabinX + k, top - 1 + k, 2, 1);
      }
      ctx.fillRect(cabinX + 3, top - 2, 2, 1);
    }
  });
  const cabin =
    cabinX === undefined
      ? undefined
      : {
          // The window by the door, and a small one under the roof.
          lights: [[cabinX - 3, lakeTop - CABIN_TALL + GABLE + 1, 2, 2], [cabinX, lakeTop - CABIN_TALL + 3, 1, 1]] as const,
          chimneyX: cabinX + 3,
          chimneyY: lakeTop - CABIN_TALL - 3,
        };
  return { image, lakeTop, lakeFoot, skyline: lakeTop - farTall, cabin };
}

let kept: { key: string; land: WinterLand } | undefined;

/** The land of this view, painted the first time it is asked for. */
export function winterLand(view: VistaView): WinterLand {
  const key = `${view.w}:${view.h}:${view.foxX}:${view.dir}`;
  if (kept?.key !== key) {
    kept = { key, land: build(view) };
  }
  return kept.land;
}
