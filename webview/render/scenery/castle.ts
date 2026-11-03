import { gradient, ramp, type VistaPainter, type VistaView } from './paint';
import { paintLookout, paintLookoutFront, type LookoutTones } from './lookout';
import { drawCloud } from './castle-clouds';
import { paintBirds, paintFalls, type Place } from './castle-life';
import { sceneOf, type Drift, type Scene } from './castle-scene';

// An island in the sky. The fox sits on a green hilltop above a sea of clouds and looks up into a deep summer
// sky heaped with great cumulus. Something is hidden in a bank of cloud on the side it looks to: the tip of a
// spire over it, the shadow of rock under it, threads of water falling out of it. At the great moment the bank
// parts and an island glides out, an old stone castle on it the ivy has taken back, waterfalls spilling over
// its rim into veils of mist; the sun catches it, rays slant through the clouds, its birds wheel past over the
// fox. It lingers, drifts on, and the clouds close over it again.
//   0 s     the sky, the bank, birds circling something in it; its shadow and the glint of falling water
//           show through the cloud (from 3 s), the tip of a spire over it
//  moment   the bank parts, its halves sinking into the sea of clouds (until +13 s); the island glides out
//           of it toward the fox, out of the mist (+1 to +7 s)
//   +4 s    the sun warms its stones (until +11 s); rays through the clouds (+5 to +30 s)
//   +8.5 s  four of its birds break away and sweep past over the fox, one after another
//   +14 s   it lingers, drifting slowly on toward the fox's side
//   +18 s   a great cloud comes over from the far side and veils it again (until +38 s)

const SKY = [[0, '#2d68cc'], [0.4, '#4f92e2'], [0.78, '#9cc8ee'], [1, '#dcebf5']] as const;
const SUN_GLOW = '#fff6dc';
const RAY = '#fff4d0';
/** How it moves: gliding out of the bank, then drifting on, in sizes of itself. */
const GLIDE_S = [0, 14] as const;
const DRIFT_ON = 0.12;
const DRIFT_S = [14, 50] as const;
const PART_S = [0, 13] as const;
const CLEAR_S = [1, 7, 26, 36] as const;
const WARM_S = [4, 11, 26, 34] as const;
const RAYS_S = [5, 12, 20, 30] as const;
const VEIL_S = [18, 38] as const;
/** Its shadow in the bank and the glints of its falls show from this long after the sky appears. */
const HINT_S = [3, 10] as const;
const HILL: LookoutTones = {
  body: '#84bf5e',
  rim: '#c2e286',
  deep: '#6aa65a',
  blades: ['#76b25a', '#a6d872'],
  front: ['#b4dc7c', '#7cb85c'],
  flowers: ['#fffaf2', '#ffd76a'],
};

const momentOf = ({ moment }: VistaView): number => moment ?? -1;

/** Where the island is now: out of the bank toward the fox, then on, very slowly, rising and sinking a little. */
function placeOf(view: VistaView, scene: Scene): Place {
  const m = momentOf(view);
  const { size } = scene.island;
  const x = scene.hidden + (scene.shown - scene.hidden) * ramp(m, GLIDE_S[0], GLIDE_S[1]) - view.dir * size * DRIFT_ON * ramp(m, DRIFT_S[0], DRIFT_S[1]);
  return { x: Math.round(x), y: scene.top + Math.round(Math.sin(view.t * 0.42) * 0.8) };
}

function drawDrift(view: VistaView, drift: Drift): void {
  const { ctx, w, t, dir } = view;
  const width = drift.cloud.canvas.width;
  const lap = w + width * 2;
  const along = (((drift.x - dir * drift.speed * t + width) % lap) + lap) % lap;
  drawCloud(ctx, drift.cloud, along - width, drift.y);
}

/** Light slanting down from the sun through gaps in the clouds onto the island: pale bands, row by row. */
function paintRays(view: VistaView, at: Place, size: number, amount: number): void {
  if (amount <= 0.01) {
    return;
  }
  const { ctx, h, dir, t } = view;
  ctx.fillStyle = RAY;
  [-0.32, 0.02, 0.3].forEach((offset, n) => {
    const wide = Math.max(2, Math.round(size * (0.08 + 0.05 * n)));
    const bottom = at.y + Math.round(size * 0.25);
    const slope = dir * 0.55;
    const breath = 0.75 + 0.25 * Math.sin(t * 0.35 + n * 2);
    for (let y = 0; y < Math.min(h, bottom); y++) {
      const x = at.x + offset * size - slope * (bottom - y);
      ctx.globalAlpha = amount * 0.2 * breath * (0.4 + 0.6 * (y / bottom));
      ctx.fillRect(Math.round(x), y, wide, 1);
    }
  });
  ctx.globalAlpha = 1;
}

function paintSky(view: VistaView): void {
  const { ctx, w, h, dir } = view;
  gradient(view, 0, h, SKY);
  const sx = dir > 0 ? w * 0.05 : w * 0.95;
  const radius = Math.max(70, w * 0.6);
  const glow = ctx.createRadialGradient(sx, 0, 0, sx, 0, radius);
  glow.addColorStop(0, SUN_GLOW);
  glow.addColorStop(1, 'rgba(255,246,220,0)');
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
}

export const castle: VistaPainter = {
  back(view) {
    const { ctx, t, dir } = view;
    const scene = sceneOf(view);
    const { island, hill } = scene;
    const m = momentOf(view);
    const at = placeOf(view, scene);
    const clear = ramp(m, CLEAR_S[0], CLEAR_S[1]) - ramp(m, CLEAR_S[2], CLEAR_S[3]);
    const warm = ramp(m, WARM_S[0], WARM_S[1]) - ramp(m, WARM_S[2], WARM_S[3]);
    paintSky(view);
    scene.far.forEach((drift) => drawDrift(view, drift));
    const birds = ramp(t, 1, 6);
    paintBirds(view, island, at, false, birds);
    // The island, out of the mist as it comes out of the cloud, warmed as the sun finds it.
    const left = at.x - island.ox;
    const top = at.y - island.oy;
    ctx.drawImage(island.veiled, left, top);
    if (clear > 0) {
      ctx.globalAlpha = clear;
      ctx.drawImage(island.clear, left, top);
      ctx.globalAlpha = clear * warm;
      ctx.drawImage(island.warm, left, top);
      ctx.globalAlpha = 1;
    }
    paintFalls(view, island, at, hill.seaY + 2, clear, warm);
    paintBirds(view, island, at, true, birds);
    // The bank parts like a curtain: its halves slide apart and sink into the sea of clouds.
    const part = ramp(m, PART_S[0], PART_S[1]);
    const { size } = island;
    const sink = (scene.baseY - scene.top) * 0.75 * part;
    drawCloud(ctx, scene.bank[1], scene.bankX[1] + dir * (size * 0.95 * part - t * 0.04), scene.baseY + sink * 0.8);
    drawCloud(ctx, scene.bank[0], scene.bankX[0] - dir * (size * 0.95 * part + t * 0.04), scene.baseY + sink);
    // Until then, all there is of it: its shadow in the cloud, and the glint of water falling.
    const hint = ramp(t, HINT_S[0], HINT_S[1]) * (1 - ramp(m, 0, 4));
    if (hint > 0) {
      ctx.globalAlpha = 0.07 * hint;
      ctx.drawImage(island.shadow, left, top);
      ctx.globalAlpha = 1;
      paintFalls(view, island, at, hill.seaY + 2, 0.5 * hint, 0, true);
    }
    // The veil comes over from the far side and settles in front of it.
    const veil = ramp(m, VEIL_S[0], VEIL_S[1]);
    if (veil > 0) {
      drawCloud(ctx, scene.veil, at.x + dir * size * (1.8 * (1 - veil) - 0.05), scene.baseY);
    }
    scene.near.forEach((drift) => drawDrift(view, drift));
    paintRays(view, at, size, ramp(m, RAYS_S[0], RAYS_S[1]) - ramp(m, RAYS_S[2], RAYS_S[3]));
    ctx.drawImage(hill.sea, 0, 0);
    ctx.drawImage(hill.hill, 0, 0);
    paintLookout(view, HILL);
  },
  front(view) {
    paintLookoutFront(view, HILL);
  },
};
