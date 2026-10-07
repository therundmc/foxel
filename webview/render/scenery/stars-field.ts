import { clamp01, prerender, seeded, type VistaView } from './paint';

// The stars of the night sky: where each one is, how bright, and its own slow way of twinkling.

/** The sky is laid out once, larger than any view: a wider or taller panel just uncovers more of the same night. */
const WORLD_W = 640;
const WORLD_H = 208;
/** The heavens turn: the whole field slides this many pixels a second toward the side the fox looks to. */
const DRIFT = 0.055;
/** Room kept on both sides of what is prerendered, for that slide. */
const EDGE = 6;
/** A star takes this long to light up, with a little flash as it does. */
const LIGHT_S = 1.8;
const FLASH_S = 2.4;
/** How far around the moon its light washes the stars out, in moon radii. */
export const MOON_REACH = 4.2;
/** The ripple of light that answers the wish: how wide its ring is. */
const WAVE_WIDTH = 20;

const WHITE = '#ffffff';
/** Warm, pale gold, white, pale blue, blue: most stars are white or blue, a few glow warm. */
const TINTS = ['#ffd9b0', '#fff6c4', WHITE, '#cfd8ff', '#a9c2ff'];
const DUST_TINTS = ['#b9c1f2', '#d4cff5', '#9fb6ea'];

const SPECK = 0;
const BRIGHT = 1;
const RAYED = 2;

interface Star {
  readonly x: number;
  /** Height above the foot of the sky. */
  readonly up: number;
  readonly kind: number;
  readonly tint: string;
  readonly glow: number;
  /** Its breathing: how fast, from where, and how deep it dims. */
  readonly speed: number;
  readonly phase: number;
  readonly depth: number;
  /** A quicker shiver on top, for the few that scintillate (0 for the others). */
  readonly flicker: number;
  /** When it lights up, in seconds. */
  readonly lit: number;
}

export interface Field {
  readonly stars: readonly Star[];
  /** The faintest ones, too many to twinkle one by one: two sheets that shimmer against each other. */
  readonly dust: readonly HTMLCanvasElement[];
}

/** A point of the sky and how far its influence goes, squared. */
export interface Spot {
  readonly x: number;
  readonly y: number;
  readonly reach2: number;
}

/** A ring of light spreading from a point: stars flare as it passes them. */
export interface Wave {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly strength: number;
}

/** Stars thin out and dim in the haze just above the horizon. */
const haze = (up: number): number => 0.22 + 0.78 * clamp01((up - 3) / 24);

function scatter(): Star[] {
  const random = seeded(0x57a125);
  const stars: Star[] = [];
  const add = (kind: number, x: number, up: number, glow: number, lit: number): void => {
    const pick = random();
    const mood = random();
    // A third barely move, most breathe slowly, a few shiver.
    const calm = mood < 0.32;
    stars.push({
      x,
      up,
      kind,
      tint: TINTS[pick < 0.1 ? 0 : pick < 0.3 ? 1 : pick < 0.62 ? 2 : pick < 0.88 ? 3 : 4],
      glow: glow * haze(up),
      speed: (Math.PI * 2) / (calm ? 6 + random() * 7 : 2.4 + random() * 4.2),
      phase: random() * Math.PI * 2,
      depth: calm ? 0.06 + random() * 0.14 : 0.3 + random() * 0.4,
      flicker: mood > 0.82 ? (Math.PI * 2) / (0.45 + random() * 0.6) : 0,
      lit,
    });
  };
  // The great ones first, spread on a loose grid so that no two crowd each other and no view is left without.
  const grid = (cell: number, from: number, chance: number, place: (x: number, up: number) => void): void => {
    for (let gy = from; gy < WORLD_H; gy += cell) {
      for (let gx = 0; gx < WORLD_W; gx += cell) {
        const x = gx + (0.12 + 0.76 * random()) * cell;
        const up = gy + (0.12 + 0.76 * random()) * cell;
        if (random() < chance) {
          place(Math.floor(x), Math.floor(up));
        }
      }
    }
  };
  grid(58, 15, 0.8, (x, up) => add(RAYED, x, up, 1, 2 + random() * 5.5));
  grid(23, 6, 0.72, (x, up) => add(BRIGHT, x, up, 0.72 + random() * 0.28, 4 + random() * 8.5));
  const specks = Math.round((WORLD_W * WORLD_H) / 120);
  for (let i = 0; i < specks; i++) {
    const glow = 0.2 + 0.8 * random() ** 2.6;
    // The brightest come out first, as they do at dusk.
    add(SPECK, Math.floor(random() * WORLD_W), Math.floor(random() * WORLD_H), glow, 7 + (1 - glow) * 11 + random() * 3);
  }
  return stars;
}

function dustSheet(w: number, skyH: number, seed: number): HTMLCanvasElement {
  return prerender(w + EDGE * 2, skyH, (ctx) => {
    const random = seeded(seed);
    const count = Math.round((WORLD_W * WORLD_H) / 46);
    for (let i = 0; i < count; i++) {
      const x = Math.floor(random() * WORLD_W) - EDGE;
      const up = Math.floor(random() * WORLD_H);
      const alpha = (0.14 + 0.3 * random() ** 1.5) * haze(up);
      const tint = DUST_TINTS[Math.floor(random() * DUST_TINTS.length)];
      if (x < w + EDGE && up < skyH) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = tint;
        ctx.fillRect(x + EDGE, skyH - 1 - up, 1, 1);
      }
    }
  });
}

let world: Star[] | undefined;
let kept: { key: string; field: Field } | undefined;

/** The part of the sky a view `w` wide shows, up to `skyH` above the foot of the sky. */
export function fieldFor(w: number, skyH: number): Field {
  const key = `${w}x${skyH}`;
  if (kept?.key !== key) {
    world ??= scatter();
    const stars = world
      .filter((s) => s.x < w + EDGE * 2 && s.up < skyH)
      // One colour after the other, so that painting them changes the brush as rarely as possible.
      .sort((a, b) => (a.tint < b.tint ? -1 : a.tint > b.tint ? 1 : 0));
    kept = { key, field: { stars, dust: [dustSheet(w, skyH, 0xd057), dustSheet(w, skyH, 0xfa12)] } };
  }
  return kept.field;
}

/**
 * A slide of a fraction of a pixel, on a grid that has none: the star stays put most of the time,
 * then hands over to the next pixel in a short cross-fade, instead of hopping.
 */
const handover = (fraction: number): number => clamp01((fraction - 0.36) / 0.28);

/** The dust comes out last, one sheet after the other, and the two keep shimmering against each other. */
export function drawDust({ ctx, t, dir }: VistaView, field: Field, floorY: number): void {
  const slide = t * DRIFT * dir;
  const whole = Math.floor(slide);
  const next = handover(slide - whole);
  field.dust.forEach((sheet, i) => {
    const out = clamp01((t - 10 - i * 4.5) / 8);
    const alpha = out * out * (0.8 + 0.2 * Math.sin(t * (0.5 - i * 0.14) + i * 2.4));
    const top = floorY + 1 - sheet.height;
    ctx.globalAlpha = alpha * (1 - next);
    ctx.drawImage(sheet, whole - EDGE, top);
    ctx.globalAlpha = alpha * next;
    ctx.drawImage(sheet, whole + 1 - EDGE, top);
  });
  ctx.globalAlpha = 1;
}

export function drawStars(view: VistaView, field: Field, floorY: number, moon: Spot, wave: Wave | undefined): void {
  const { ctx, t, dir } = view;
  const slide = t * DRIFT * dir;
  let brush = '';
  for (const s of field.stars) {
    const age = t - s.lit;
    if (age <= 0) {
      continue;
    }
    let shine = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
    let alpha = s.glow * Math.min(1, age / LIGHT_S) * (1 - s.depth * (1 - shine));
    if (s.flicker > 0) {
      alpha *= 0.76 + 0.24 * Math.sin(t * s.flicker + s.phase * 7);
    }
    let flare = age < FLASH_S ? Math.sin((Math.PI * age) / FLASH_S) : 0;
    // The world starts a little left of the view, so that the slide never uncovers an empty margin.
    const exact = s.x - EDGE + slide;
    const x = Math.floor(exact);
    const y = floorY - s.up;
    const mx = x - moon.x;
    const my = y - moon.y;
    const near = (mx * mx + my * my) / moon.reach2;
    if (near < 1) {
      alpha *= 0.2 + 0.8 * near;
    }
    if (wave) {
      const ring = 1 - Math.abs(Math.hypot(x - wave.x, y - wave.y) - wave.radius) / WAVE_WIDTH;
      if (ring > 0) {
        const lift = ring * ring * wave.strength;
        alpha = Math.min(1, alpha + lift * 0.55);
        shine = Math.max(shine, lift);
        flare = Math.max(flare, lift * 0.8);
      }
    }
    if (alpha < 0.03) {
      continue;
    }
    if (s.tint !== brush) {
      brush = s.tint;
      ctx.fillStyle = brush;
    }
    if (s.kind === SPECK) {
      const next = handover(exact - x);
      if (next < 1) {
        ctx.globalAlpha = Math.min(1, alpha * (1 + 0.5 * flare)) * (1 - next);
        ctx.fillRect(x, y, 1, 1);
      }
      if (next > 0) {
        ctx.globalAlpha = Math.min(1, alpha * (1 + 0.5 * flare)) * next;
        ctx.fillRect(x + 1, y, 1, 1);
      }
      continue;
    }
    if (s.kind === RAYED) {
      // A soft bed of light, then rays that lengthen as it shines and draw back as it dims.
      ctx.globalAlpha = alpha * 0.1;
      ctx.fillRect(x - 1, y - 1, 3, 3);
      ctx.globalAlpha = Math.min(1, alpha * (0.05 + 0.3 * shine * shine + 0.45 * flare));
      ctx.fillRect(x - 2, y, 5, 1);
      ctx.fillRect(x, y - 2, 1, 5);
      ctx.globalAlpha = alpha * (0.42 + 0.3 * shine);
      ctx.fillRect(x - 1, y, 3, 1);
      ctx.fillRect(x, y - 1, 1, 3);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = WHITE;
      ctx.fillRect(x, y, 1, 1);
      brush = '';
      continue;
    }
    // A bright one: a point, and the hint of a cross at the top of its breath.
    ctx.globalAlpha = Math.min(1, alpha * (0.08 + 0.26 * shine * shine + 0.5 * flare));
    ctx.fillRect(x - 1, y, 3, 1);
    ctx.fillRect(x, y - 1, 1, 3);
    ctx.globalAlpha = alpha;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;
}
