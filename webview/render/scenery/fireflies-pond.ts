import { lookoutTop } from './lookout';
import { gradient, prerender, seeded, type VistaView } from './paint';

// A pond on a warm summer night, painted once for a view: a deep blue-green sky, a big full moon low behind the far
// trees, still dark water giving the trees back, and a few water lilies. Nothing of it moves; the moonlight on the
// water, the reeds, the frog and the fireflies are painted over it.

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));

/** The sky from the top down: it keeps a little of the day's warmth above the trees. */
const SKY = [[0, '#071a2a'], [0.45, '#0d3140'], [0.8, '#1d5350'], [1, '#3a6a56']] as const;
const MOON = '#f6efc9';
/** The moon's halo, as the three channels of its colour: how strong it is close to the moon, a little way off, and far. */
const HALO = '214,236,190';
const HALO_FADES = [[0, 0.36], [0.3, 0.13], [1, 0]] as const;
/** The halo reaches this many times the moon's radius. */
const HALO_REACH = 7;
const FAR_TREES = '#21514c';
const NEAR_TREES = '#0b2428';
const MIST = '#6f9c86';
/** The water from the far shore to our feet. */
const WATER = [[0, '#2a5f58'], [0.3, '#16424a'], [1, '#0d2a36']] as const;
const FAR_MIRRORED = '#1d4a49';
const NEAR_MIRRORED = '#0d2a30';
const PAD = '#235843';
const PAD_LIT = '#4a8a62';
/** A lily closed for the night: its pale tip and its rosy side. */
const BUD = ['#f4e8ee', '#cf9fbb'] as const;

/** The frog's pad, and the room the pond needs before a frog comes to sit on it. */
const FROG_PAD = 11;
const FROG_NEEDS = 22;
/** Two pads one above the other keep this many rows apart, or they read as rungs. */
const PADS_APART = 6;

export interface Pond {
  readonly image: HTMLCanvasElement;
  /** The rows of the water: its far shore, and where the lookout hides it. */
  readonly shore: number;
  readonly foot: number;
  readonly moonX: number;
  readonly moonR: number;
  /** The top left corner of the pad the frog sits on, where there is room for one. */
  readonly frog: { readonly x: number; readonly y: number } | undefined;
}

interface Pad {
  readonly x: number;
  readonly y: number;
  readonly wide: number;
  readonly tall: number;
  readonly bud: boolean;
}

/** A line of trees: how tall they stand in each column. Each crown is a low dome resting on the bank, from `low` to `high` tall, wider than it is tall. */
function crowns(w: number, random: () => number, low: number, high: number, gaps: number): Int16Array {
  const tall = new Int16Array(w).fill(low);
  for (let x = -high * 2; x < w + high * 2; ) {
    const top = low + random() * (high - low);
    const r = Math.max(2, top * (0.7 + 0.8 * random()));
    for (let dx = -Math.floor(r); dx <= Math.floor(r); dx++) {
      const at = Math.round(x) + dx;
      if (at >= 0 && at < w) {
        tall[at] = Math.max(tall[at], Math.round(top * Math.sqrt(1 - (dx / r) ** 2)));
      }
    }
    x += r * (0.6 + 0.9 * random()) + (random() < gaps ? high * 2 * random() : 0);
  }
  return tall;
}

// Lily pads lie in small rafts, wider and thicker the closer they float to us, and keep off the moon's path.
function rafts(view: VistaView, shore: number, foot: number, moonX: number, moonR: number, frogX: number | undefined): Pad[] {
  const { w, foxX, dir } = view;
  const deep = foot - shore;
  const random = seeded(0x1171);
  const pads: Pad[] = [];
  const free = (x: number, y: number, wide: number, tall: number): boolean =>
    x >= 1 && x + wide < w && Math.abs(x + wide / 2 - moonX) > moonR * 1.5 + wide && y + tall <= lookoutTop(view, x + wide / 2) - 1 &&
    pads.every((p) => x + wide + 1 < p.x || p.x + p.wide + 1 < x || Math.abs(y - p.y) >= PADS_APART);
  const raft = (cx: number, depth: number, count: number): void => {
    for (let i = 0; i < count; i++) {
      const near = clamp(depth + (random() - 0.5) * 0.26, 0.3, 0.9);
      const wide = Math.round(5 + 4 * near + random() * 2);
      const tall = deep > 18 ? 2 : 1;
      const x = Math.round(cx + (random() - 0.5) * (14 + 16 * near) - wide / 2);
      const y = shore + Math.round(deep * near);
      if (free(x, y, wide, tall)) {
        pads.push({ x, y, wide, tall, bud: tall > 1 && i === 1 });
      }
    }
  };
  if (frogX !== undefined) {
    const x = Math.round(frogX - FROG_PAD / 2);
    pads.push({ x, y: Math.min(shore + Math.round(deep * 0.74), lookoutTop(view, frogX) - 4), wide: FROG_PAD, tall: 2, bud: false });
    raft(frogX - dir * 6, 0.58, 4);
  } else {
    raft(foxX + dir * 44, 0.6, 3);
  }
  // A second raft behind the fox's shoulder, and a last small one far off beyond the moon's path.
  raft(foxX - dir * clamp((dir > 0 ? foxX : w - foxX) * 0.55, 24, 90), 0.66, 4);
  raft(moonX + dir * clamp(w * 0.16, 16, 60), 0.42, 3);
  return pads;
}

function paintPad(ctx: CanvasRenderingContext2D, { x, y, wide, tall, bud }: Pad): void {
  if (tall === 1) {
    ctx.fillStyle = PAD_LIT;
    ctx.fillRect(x, y, wide, 1);
    return;
  }
  // Its far edge is shorter and catches the moon; the near one has the notch every lily pad has.
  ctx.fillStyle = PAD_LIT;
  ctx.fillRect(x + 1, y, wide - 2, 1);
  ctx.fillStyle = PAD;
  ctx.fillRect(x, y + 1, wide - 3, 1);
  ctx.fillRect(x + wide - 2, y + 1, 2, 1);
  if (bud) {
    ctx.fillStyle = BUD[0];
    ctx.fillRect(x + 2, y - 2, 1, 2);
    ctx.fillStyle = BUD[1];
    ctx.fillRect(x + 3, y - 1, 1, 1);
  }
}

function build(view: VistaView): Pond {
  const { w, h, foxX, dir } = view;
  const foot = h - 3;
  const shore = foot - clamp(Math.round(h * 0.46), 16, 62);
  const deep = foot - shore;
  const bank = clamp(Math.round(h * 0.12), 4, 14);
  const room = dir > 0 ? w - foxX : foxX;
  const moonR = clamp(Math.round(Math.min(h * 0.13, w * 0.11)), 4, 13);
  const moonX = Math.round(clamp(foxX + dir * clamp(room * 0.56, 24, 150), moonR + 2, w - moonR - 3));
  // Low enough for the trees to hide its foot.
  const moonY = shore - Math.round(bank * 0.75) - Math.round(moonR * 0.45);
  const frogX = deep >= FROG_NEEDS && room > 70 ? Math.round(foxX + dir * clamp(room * 0.3, 36, 58)) : undefined;
  const random = seeded(0xf1f1);
  const far = crowns(w, random, Math.round(bank * 0.4), bank * 1.4, 0.2);
  const near = crowns(w, random, 1, bank * 0.7, 0.45);
  // No tree stands tall in front of the moon: only its foot is hidden.
  const hides = shore - moonY - Math.round(moonR * 0.2);
  const base = Math.round(bank * 0.4);
  const span = (x: number): number => clamp(x, 0, w - 1);
  let tallest = base + 1;
  for (let x = span(moonX - moonR); x <= span(moonX + moonR); x++) {
    tallest = Math.max(tallest, far[x]);
  }
  // The crowns there are lowered rather than cut, less and less on either side of it.
  const lowered = Math.min(1, (hides - base) / (tallest - base));
  for (let x = span(moonX - moonR * 2); x <= span(moonX + moonR * 2); x++) {
    const share = lowered + (1 - lowered) * clamp(Math.abs(x - moonX) / moonR - 1, 0, 1);
    far[x] = Math.round(base + (far[x] - base) * share);
  }
  const pads = rafts(view, shore, foot, moonX, moonR, frogX);
  const image = prerender(w, h, (ctx) => {
    const painted: VistaView = { ...view, ctx };
    gradient(painted, 0, shore, SKY);
    const halo = ctx.createRadialGradient(moonX, moonY, moonR * 0.8, moonX, moonY, moonR * HALO_REACH);
    HALO_FADES.forEach(([at, alpha]) => halo.addColorStop(at, `rgba(${HALO},${alpha})`));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, shore);
    // A plain round moon, with one softer ring of pixels so its edge does not cut the sky.
    ctx.fillStyle = MOON;
    [[0.5, 0.4], [0, 1]].forEach(([more, alpha]) => {
      ctx.globalAlpha = alpha;
      for (let dy = -moonR - 1; dy <= moonR + 1; dy++) {
        const half = Math.floor(Math.sqrt(Math.max(0, (moonR + 0.5 + more) ** 2 - dy * dy)));
        if (half > 0) {
          ctx.fillRect(moonX - half, moonY + dy, half * 2 + 1, 1);
        }
      }
    });
    ctx.globalAlpha = 1;
    gradient(painted, shore, h, WATER);
    // The far bank: trees paled by the distance, darker bushes at the water's edge, and both given back by the pond,
    // a little shorter and broken into dashes further from the shore.
    ([[far, FAR_TREES, FAR_MIRRORED], [near, NEAR_TREES, NEAR_MIRRORED]] as const).forEach(([tall, color, mirrored]) => {
      ctx.fillStyle = color;
      for (let x = 0; x < w; x++) {
        ctx.fillRect(x, shore - tall[x], 1, tall[x]);
      }
      ctx.fillStyle = mirrored;
      for (let x = 0; x < w; x++) {
        const given = Math.round(tall[x] * 0.6);
        for (let row = 0; row < given; row++) {
          const dash = 3 + (row % 3);
          if (row < 2 || Math.floor((x + row * 5) / dash) % 2 === 0) {
            ctx.fillRect(x, shore + row, 1, 1);
          }
        }
      }
    });
    // A breath of mist where the water meets the bank.
    ctx.fillStyle = MIST;
    [[0, 0.2], [1, 0.08]].forEach(([row, alpha]) => {
      ctx.globalAlpha = alpha;
      ctx.fillRect(0, shore + row, w, 1);
    });
    ctx.globalAlpha = 1;
    pads.forEach((pad) => paintPad(ctx, pad));
  });
  const frog = frogX === undefined ? undefined : { x: pads[0].x, y: pads[0].y };
  return { image, shore, foot, moonX, moonR, frog };
}

let kept: { key: string; pond: Pond } | undefined;

/** The pond of this view, painted the first time it is asked for. */
export function pondOf(view: VistaView): Pond {
  const key = `${view.w}:${view.h}:${view.foxX}:${view.dir}`;
  if (kept?.key !== key) {
    kept = { key, pond: build(view) };
  }
  return kept.pond;
}
