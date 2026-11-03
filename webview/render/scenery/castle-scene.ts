import { seeded, type VistaView } from './paint';
import { cumulus, paintCloud, type Cloud } from './castle-clouds';
import { islandOf, type Island } from './castle-island';
import { hillOf, type Hill } from './castle-hill';
import { rgb } from './clouds-pixels';

// Where everything stands, worked out once for a size: the island, high on the side the fox looks to; the
// bank of cloud that hides it at first, in two halves that will part; the cloud that veils it again at the end;
// great clouds far behind, and small ones drifting across.

/** The air the far clouds fade into: the farther, the bluer and paler. */
const FAR_AIR = rgb('#b4d4f0');

/** A cloud that drifts across the view with the breeze. */
export interface Drift {
  readonly cloud: Cloud;
  readonly x: number;
  readonly y: number;
  /** Pixels a second toward the side the fox turns from. */
  readonly speed: number;
}

export interface Scene {
  readonly key: string;
  readonly island: Island;
  readonly hill: Hill;
  /** The island's middle while hidden and once out, and the row of its top. */
  readonly hidden: number;
  readonly shown: number;
  readonly top: number;
  /** Far behind the island, and drifting in front of it. */
  readonly far: readonly Drift[];
  readonly near: readonly Drift[];
  /** The two halves of the bank and the veil, all rising out of the sea of clouds, their bases on `baseY`. */
  readonly bank: readonly [Cloud, Cloud];
  readonly bankX: readonly [number, number];
  readonly veil: Cloud;
  readonly baseY: number;
}

let built: Scene | undefined;

export function sceneOf(view: VistaView): Scene {
  const { w, h, dir } = view;
  const foxX = Math.round(view.foxX);
  const key = `${w}x${h}:${foxX}:${dir}`;
  if (built?.key === key) {
    return built;
  }
  const sun = -dir as 1 | -1;
  const size = Math.round(Math.min(h * 0.7, w * 0.31));
  const island = islandOf(size, sun);
  const hill = hillOf(w, h, foxX, dir);
  const room = dir > 0 ? w - foxX : foxX;
  const clampX = (x: number): number => Math.max(size * 0.56, Math.min(w - size * 0.56, x));
  const shown = clampX(foxX + dir * Math.max(size * 0.5 + 24, room * 0.52));
  const hidden = shown + dir * size * 0.16;
  const top = Math.round(Math.max(3, h * 0.06) + island.tall);
  const random = seeded(0xc1a5 + w * 3 + h);

  // The bank: two great heaps rising side by side out of the sea of clouds, over the hidden island, a dip
  // between their heads where the spire's tip shows.
  const baseY = hill.seaY + Math.round(h * 0.08);
  const bankTall = baseY - (top - island.tall * 0.95);
  const bank: [Cloud, Cloud] = [
    paintCloud(cumulus(0xba1, size * 1.25, bankTall, sun, true), sun, 0, FAR_AIR),
    paintCloud(cumulus(0xba4, size * 1.2, bankTall * 0.96, sun, true), sun, 0, FAR_AIR),
  ];
  const bankX: [number, number] = [hidden - dir * size * 0.32, hidden + dir * size * 0.36];
  const veil = paintCloud(cumulus(0xbe1, size * 1.4, baseY - (top - island.tall) + 4, sun, true), sun, 0, FAR_AIR);

  // Far behind: a great tower of cloud beyond the island, another on the other side of the sky, both faded.
  const far: Drift[] = [];
  const seaY = hill.seaY;
  const greatTall = seaY * 0.92;
  far.push({ cloud: paintCloud(cumulus(0xfa1, Math.min(w * 0.3, greatTall * 1.05), greatTall, sun, true), sun, 0.32, FAR_AIR), x: shown + dir * size * 0.85, y: seaY + 3, speed: 0.04 });
  const behind = w - room;
  far.push({
    cloud: paintCloud(cumulus(0xfa2, Math.min(w * 0.2, seaY * 0.8), seaY * 0.45, sun, true), sun, 0.42, FAR_AIR),
    x: foxX - dir * Math.max(behind * 0.5, size * 0.3),
    y: seaY + 3,
    speed: 0.04,
  });
  for (let n = Math.max(1, Math.round(w / 200)); n > 0; n--) {
    const wide = seaY * (0.3 + random() * 0.2);
    far.push({ cloud: paintCloud(cumulus(0xfa3 + n, wide, wide * 0.45, sun), sun, 0.45, FAR_AIR), x: random() * w, y: seaY + 2, speed: 0.06 });
  }
  // Small clouds high up, drifting across faster, crisp and near.
  const near: Drift[] = [];
  for (let n = Math.max(2, Math.round(w / 90)); n > 0; n--) {
    const wide = Math.max(8, h * (0.1 + random() * 0.14));
    near.push({
      cloud: paintCloud(cumulus(0xc10 + n, wide, wide * (0.35 + random() * 0.15), sun), sun, 0.05 + random() * 0.15, FAR_AIR),
      x: random() * (w + 40),
      y: Math.round(h * (0.1 + random() * 0.35)),
      speed: 0.18 + random() * 0.12,
    });
  }
  built = { key, island, hill, hidden, shown, top, far, near, bank, bankX, veil, baseY };
  return built;
}
