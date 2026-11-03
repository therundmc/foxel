import type { Scene } from './lanterns-scene';
import { WINDOWS } from './lanterns-town';
import { lookoutTop } from './lookout';
import { ramp, type VistaView } from './paint';

// The town's lights, which do: its paper windows coming on as night falls and flickering softly, the round lanterns
// along its eaves and its bridge lit one after the other, the stone lanterns of the path, each given back by the
// water; and the thin plume of steam from the chimney. At the great moment every window glows brighter.

const RED = '#d23a2c';
const LIT = '#ffa04a';
const CORE = '#ffe2a0';
const GLOW = '#ff8c42';
const STONE_LIT = '#ffe6a8';
const BRIGHTER = '#fff2c4';
const STEAM = ['#f4e8ee', '#b8b8d8'] as const;
/** Over how long one glows into being, a little brighter at first, then settling. */
const KINDLE_S = 0.7;

/** How much the windows glow beyond their own light: once every lantern is out, they all burn their brightest. */
export function brighter({ moment }: VistaView): number {
  return moment === undefined ? 0 : ramp(moment, 2.5, 9) * (1 - 0.5 * ramp(moment, 26, 36));
}

/** A light's glow on the water: a short wavering stroke under the shore, as far below it as it stands above. */
function onWater(view: VistaView, scene: Scene, x: number, y: number, color: string, alpha: number, tall = 1): void {
  const { ctx, t } = view;
  const row = scene.shore + (scene.shore - y) - 1;
  if (row >= Math.min(scene.foot, lookoutTop(view, x) - 1)) {
    return;
  }
  const beat = Math.sin(t * 0.9 + x * 0.7 + row * 1.3);
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha * (0.7 + 0.3 * beat);
  ctx.fillRect(x + (beat > 0.65 ? 1 : beat < -0.65 ? -1 : 0), row - tall + 1, 1, tall + 1);
}

function windowsOf(view: VistaView, scene: Scene): void {
  const { ctx, t, moment } = view;
  const glow = brighter(view);
  for (const win of scene.windows) {
    const on = win.late ? (moment === undefined ? 0 : ramp(moment, 3 + win.phase * 0.5, 4 + win.phase * 0.5)) : ramp(t, win.wakes, win.wakes + 1.2);
    if (on <= 0) {
      continue;
    }
    // A slow breathing, and now and then a brief dip, as a flame behind paper does.
    const dip = Math.sin(t * 0.37 + win.phase * 3) > 0.96 ? 0.55 : 1;
    const flicker = (0.82 + 0.12 * Math.sin(t * 1.3 + win.phase) + 0.06 * Math.sin(t * 4.1 + win.phase * 2)) * dip;
    ctx.fillStyle = WINDOWS[win.tone];
    ctx.globalAlpha = Math.min(1, on * flicker * (0.75 + 0.25 * glow));
    ctx.fillRect(win.x, win.y, 1, win.tall);
    if (glow > 0) {
      ctx.fillStyle = BRIGHTER;
      ctx.globalAlpha = 0.45 * glow * on * flicker;
      ctx.fillRect(win.x, win.y, 1, win.tall);
      ctx.fillStyle = GLOW;
      ctx.globalAlpha = 0.12 * glow * on;
      ctx.fillRect(win.x - 1, win.y - 1, 3, win.tall + 2);
    }
    onWater(view, scene, win.x, win.y + win.tall - 1, WINDOWS[win.tone], (0.3 + 0.15 * glow) * on * flicker, win.tall);
  }
  ctx.globalAlpha = 1;
}

function hungOf(view: VistaView, scene: Scene): void {
  const { ctx, t } = view;
  for (const l of scene.hung) {
    const since = t - l.wakes;
    if (since <= 0) {
      continue;
    }
    // It glows into being: a little brighter than it will stay, then settling into its own soft flicker.
    const on = ramp(since, 0, KINDLE_S) * (1 + 0.35 * Math.sin(Math.PI * Math.min(1, since / (KINDLE_S * 1.6))));
    const flicker = 0.86 + 0.1 * Math.sin(t * 2.1 + l.x * 0.9) + 0.04 * Math.sin(t * 5.3 + l.y);
    const k = on * flicker;
    ctx.fillStyle = GLOW;
    ctx.globalAlpha = 0.16 * k;
    ctx.fillRect(l.x - 1, l.y - (l.big ? 1 : 0), 3, l.big ? 3 : 1);
    ctx.fillRect(l.x, l.y - (l.big ? 2 : 1), 1, l.big ? 5 : 3);
    if (l.stone) {
      ctx.fillStyle = STONE_LIT;
      ctx.globalAlpha = Math.min(1, 0.9 * k);
      ctx.fillRect(l.x, l.y, 1, 1);
      onWater(view, scene, l.x, l.y, STONE_LIT, 0.35 * k);
      continue;
    }
    if (l.big) {
      ctx.fillStyle = RED;
      ctx.globalAlpha = Math.min(1, 1.2 * on);
      ctx.fillRect(l.x, l.y, 1, 1);
      ctx.fillStyle = LIT;
      ctx.globalAlpha = Math.min(1, k);
      ctx.fillRect(l.x, l.y + 1, 1, 1);
    } else {
      ctx.fillStyle = k > 1 ? CORE : LIT;
      ctx.globalAlpha = Math.min(1, k);
      ctx.fillRect(l.x, l.y, 1, 1);
      ctx.fillStyle = RED;
      ctx.globalAlpha = 0.6 * Math.min(1, on);
      ctx.fillRect(l.x, l.y + 1, 1, 1);
    }
    onWater(view, scene, l.x, l.y + 1, LIT, 0.45 * k, l.big ? 2 : 1);
  }
  ctx.globalAlpha = 1;
}

// The steam: a thin plume of little puffs leaving the chimney, widening and bending away the way the fox looks.
function steamOf(view: VistaView, scene: Scene, night: number): void {
  const { ctx, t, dir, h } = view;
  const { chimneyX, chimneyY } = scene;
  const tall = Math.max(8, Math.min(chimneyY - 2, Math.round(h * 0.3)));
  const puffs = 22;
  ctx.fillStyle = night > 0.5 ? STEAM[1] : STEAM[0];
  for (let i = 0; i < puffs; i++) {
    const age = (t * 0.06 + i / puffs) % 1;
    const y = chimneyY - age * tall;
    const x = chimneyX + dir * age * age * tall * 0.9 + Math.sin(t * 0.7 + age * 7) * age * 2;
    const wide = age < 0.3 ? 1 : 2;
    ctx.globalAlpha = 0.42 * (1 - age) * Math.min(1, age * 8) * (1 - 0.35 * night);
    ctx.fillRect(Math.round(x), Math.round(y), wide, 1);
  }
  ctx.globalAlpha = 1;
}

/** The town's lights and its steam, over the land and under the lanterns that rise. */
export function paintTownLights(view: VistaView, scene: Scene, night: number): void {
  steamOf(view, scene, night);
  windowsOf(view, scene);
  hungOf(view, scene);
}
