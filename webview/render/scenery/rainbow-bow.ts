import { clamp01, prerender, px, ramp, type VistaView } from './paint';
import { BLOOM_TO_S, bloomAt, hash, secondAt, type Plan, type Pond } from './rainbow-plan';

// The rainbow: six soft colours in rings of pixels round a centre under the hills. At the moment a little star
// draws it across the sky from the foot by the fox to the far one, leaving the colours behind it; a fainter
// second bow comes out above it, its colours the other way round. Inside the bow the sky is a little brighter,
// between the two a little darker, as in a real one. Then it stays, breathing, a gleam running along it now and then.

/** From the outside in: rose, apricot, butter, mint, sky, lilac. */
const COLORS = ['#ff8296', '#ffb46e', '#ffe57a', '#97e28c', '#7cc6f4', '#ab95ec'] as const;
const GLOW = '#fffaf0';
const DARK = '#5a6088';
const STAR = '#ffffff';
const STAR_ARM = '#ffe98a';

/** How strong each part is: the bow, the second one, the brighter sky inside, the darker band between. */
const BOW_ALPHA = 0.9;
const SECOND_ALPHA = 0.34;
const GLOW_ALPHA = 0.16;
const DARK_ALPHA = 0.1;
/** How wide the soft edge that the bow is drawn with is, along it, and how far it reaches inside. */
const EDGE = 0.07;
const GLOW_REACH = 9;
/** A gleam runs along the bow every so many seconds, once it is drawn. */
const GLEAM_EVERY_S = 9;
const GLEAM_FOR_S = 3.5;
/** Little twinkles on the bow once it is drawn: how long each lasts. */
const TWINKLE_S = 0.9;

/** What a pixel of the bow is: one colour of the bow, of the second bow, the glow, the dark band. */
const SECOND = COLORS.length;
const GLOWING = SECOND * 2;
const DARKER = GLOWING + 1;
const KINDS = DARKER + 1;

interface Bow {
  readonly key: string;
  /** For each kind, its pixels: x, y, how far along the bow from where it starts (0 to 1), its own strength. */
  readonly pixels: readonly Float32Array[];
  /** For each pixel of the view, the kind of the bow there plus one (0 where there is none), and how far along. */
  readonly kind: Uint8Array;
  readonly along: Float32Array;
  /** Once it is all out, its four parts painted whole, each at its own strength pixel by pixel: the bow, the second, the glow, the dark band. */
  readonly whole: readonly HTMLCanvasElement[];
}

/** The kinds of pixel each whole part is made of. */
const PARTS = [[0, SECOND], [SECOND, GLOWING], [GLOWING, DARKER], [DARKER, KINDS]] as const;

let kept: Bow | undefined;

/** How far along the bow a point is, from 0 at the foot by the fox to 1 at the far one. */
function alongAt(plan: Plan, x: number, y: number): number {
  const angle = Math.atan2(plan.bowY - y, x - plan.bowX) / Math.PI;
  // The feet are under the hills: 0 and 1 are where the bow meets the horizon.
  const low = Math.asin(Math.min(1, (plan.bowY - plan.horizon) / plan.radius)) / Math.PI;
  const share = plan.from > 0 ? angle : 1 - angle;
  return (share - low) / (1 - 2 * low);
}

function bowOf(view: VistaView, plan: Plan): Bow {
  if (kept?.key === plan.key) {
    return kept;
  }
  const { w, h } = view;
  const { bowX, bowY, radius, outer, thick } = plan;
  const lists: number[][] = Array.from({ length: KINDS }, () => []);
  const kind = new Uint8Array(w * h);
  const along = new Float32Array(w * h);
  const inner = radius - COLORS.length * thick;
  const secondIn = outer - COLORS.length * thick;
  for (let y = Math.max(0, bowY - outer - 1); y < Math.min(h, bowY); y++) {
    for (let x = Math.max(0, bowX - outer - 1); x <= Math.min(w - 1, bowX + outer + 1); x++) {
      const d = Math.hypot(x + 0.5 - bowX, y + 0.5 - bowY);
      let k = -1;
      let strength = 1;
      if (d < radius && d >= inner) {
        k = Math.floor((radius - d) / thick);
      } else if (d < outer && d >= secondIn) {
        k = SECOND + COLORS.length - 1 - Math.floor((outer - d) / thick);
      } else if (d < inner && d >= inner - GLOW_REACH) {
        k = GLOWING;
        strength = 1 - Math.floor((inner - d) / 3) / 3;
      } else if (d >= radius && d < secondIn) {
        k = DARKER;
      }
      if (k < 0) {
        continue;
      }
      const f = alongAt(plan, x + 0.5, y + 0.5);
      // Its feet melt a little into the haze over the hills.
      strength *= 0.6 + 0.4 * clamp01((plan.horizon + 2 - y) / (h * 0.18));
      lists[k].push(x, y, f, strength);
      kind[y * w + x] = k + 1;
      along[y * w + x] = f;
    }
  }
  const pixels = lists.map((list) => Float32Array.from(list));
  const whole = PARTS.map(([from, to]) =>
    prerender(w, h, (ctx) => {
      for (let k = from; k < to; k++) {
        for (let i = 0; i < pixels[k].length; i += 4) {
          px(ctx, pixels[k][i], pixels[k][i + 1], colorOf(k), pixels[k][i + 3]);
        }
      }
    }),
  );
  kept = { key: plan.key, pixels, kind, along, whole };
  return kept;
}

/** How much of a pixel `f` along the bow shows when it has drawn itself `p` of the way. */
const shown = (f: number, p: number): number => (p <= 0 ? 0 : p >= 1 ? 1 : clamp01((p * (1 + EDGE) - f) / EDGE));

const colorOf = (k: number): string => (k < SECOND ? COLORS[k] : k < GLOWING ? COLORS[k - SECOND] : k === GLOWING ? GLOW : DARK);

/** How strong each kind of pixel is at this point of the moment, before it is drawn along. */
function strengths({ t, moment }: VistaView): number[] {
  const second = secondAt(moment);
  const breath = 0.92 + 0.08 * Math.sin(t * 0.7);
  return Array.from({ length: KINDS }, (_, k) =>
    k < SECOND ? BOW_ALPHA * breath : k < GLOWING ? SECOND_ALPHA * second * breath : k === GLOWING ? GLOW_ALPHA : DARK_ALPHA * second,
  );
}

/** Where along the bow the gleam is now, or undefined between two. */
function gleamAt(moment: number | undefined): number | undefined {
  if (moment === undefined || moment < BLOOM_TO_S + 3) {
    return undefined;
  }
  const since = (moment - BLOOM_TO_S - 3) % GLEAM_EVERY_S;
  return since < GLEAM_FOR_S ? -0.15 + 1.3 * (since / GLEAM_FOR_S) : undefined;
}

/** The point `f` along the bow, `inside` pixels in from its outer edge. */
function pointAt(plan: Plan, f: number, inside: number): readonly [number, number] {
  const low = Math.asin(Math.min(1, (plan.bowY - plan.horizon) / plan.radius)) / Math.PI;
  const share = low + f * (1 - 2 * low);
  const angle = Math.PI * (plan.from > 0 ? share : 1 - share);
  const r = plan.radius - inside;
  return [Math.round(plan.bowX + Math.cos(angle) * r), Math.round(plan.bowY - Math.sin(angle) * r)];
}

/** A little four-pointed star of pixels; `big` gives it longer arms. */
export function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number, big: boolean, arm = STAR_ARM): void {
  px(ctx, x, y, STAR, alpha);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    px(ctx, x + dx, y + dy, arm, alpha * 0.8);
    if (big) {
      px(ctx, x + dx * 2, y + dy * 2, arm, alpha * 0.35);
    }
  }
}

/** The rainbow, the second one, the light round them, the star that draws them and the gleams that run along them. */
export function paintBow(view: VistaView, plan: Plan): void {
  const { ctx, t, moment, h } = view;
  const bloom = bloomAt(moment);
  if (bloom <= 0) {
    return;
  }
  const bow = bowOf(view, plan);
  const strong = strengths(view);
  const gleam = gleamAt(moment);
  PARTS.forEach(([from, to], part) => {
    const along = from === 0 || from === GLOWING;
    if (!along || bloom >= 1) {
      ctx.globalAlpha = strong[from];
      ctx.drawImage(bow.whole[part], 0, 0);
      return;
    }
    // While it draws itself, pixel by pixel.
    for (let k = from; k < to; k++) {
      const pixels = bow.pixels[k];
      ctx.fillStyle = colorOf(k);
      for (let i = 0; i < pixels.length; i += 4) {
        const alpha = strong[k] * pixels[i + 3] * shown(pixels[i + 2], bloom);
        if (alpha > 0.01) {
          ctx.globalAlpha = alpha;
          ctx.fillRect(pixels[i], pixels[i + 1], 1, 1);
        }
      }
    }
  });
  // Where the star has just passed, and where a gleam runs, the colours are lit almost white.
  ctx.globalAlpha = 1;
  ctx.fillStyle = GLOW;
  for (let k = 0; k < SECOND && (gleam !== undefined || bloom < 1); k++) {
    const pixels = bow.pixels[k];
    for (let i = 0; i < pixels.length; i += 4) {
      const f = pixels[i + 2];
      const fresh = bloom < 1 && f <= bloom * (1 + EDGE) ? Math.max(0, 1 - (bloom - f) / 0.1) * 0.4 : 0;
      const lit = gleam === undefined ? 0 : 0.35 * Math.exp(-(((f - gleam) / 0.05) ** 2));
      const alpha = Math.max(fresh, lit) * pixels[i + 3];
      if (alpha > 0.02) {
        ctx.globalAlpha = alpha;
        ctx.fillRect(pixels[i], pixels[i + 1], 1, 1);
      }
    }
  }
  ctx.globalAlpha = 1;
  const big = h >= 50;
  const middle = Math.round((COLORS.length * plan.thick) / 2);
  if (bloom < 1) {
    // The star that draws it, twinkling as it goes.
    const [x, y] = pointAt(plan, bloom, middle);
    sparkle(ctx, x, y, 1, big || Math.sin(t * 20) > 0);
  } else if (moment !== undefined) {
    // It lands on the far foot in a little burst, then twinkles here and there along the bow.
    const landed = moment - BLOOM_TO_S;
    if (landed < 1.6) {
      const [x, y] = pointAt(plan, 1, middle);
      const spread = Math.round(1 + landed * 4);
      const alpha = 1 - ramp(landed, 0.4, 1.6);
      sparkle(ctx, x, y - spread, alpha, false);
      sparkle(ctx, x - spread - 1, y + 1, alpha * 0.8, false);
      sparkle(ctx, x + spread + 1, y + 1, alpha * 0.8, false);
    }
    for (let stream = 0; stream < 2; stream++) {
      const at = (moment + stream * TWINKLE_S * 0.5) / TWINKLE_S;
      const nth = Math.floor(at);
      if (hash(nth, stream + 5) > 0.75) {
        continue;
      }
      const [x, y] = pointAt(plan, 0.08 + 0.84 * hash(nth, stream + 9), Math.floor(hash(nth, stream + 13) * COLORS.length * plan.thick));
      sparkle(ctx, x, y, Math.sin(Math.PI * (at - nth)) * ramp(landed, 0.8, 2.5), false);
    }
  }
}

/** The bow given back by the pond: the water mirrors the sky about the horizon, a little darker and broken by the ripples. */
export function paintBowInWater(view: VistaView, plan: Plan, pond: Pond, wobble: (x: number, y: number) => number): void {
  const { ctx, w, h, moment } = view;
  const bloom = bloomAt(moment);
  if (bloom <= 0) {
    return;
  }
  const bow = bowOf(view, plan);
  const strong = strengths(view);
  pond.rows.forEach(([from, wide], row) => {
    const y = pond.y + row;
    const mirrored = 2 * plan.horizon - y;
    if (mirrored < 0 || mirrored >= h) {
      return;
    }
    for (let x = Math.max(0, from); x < Math.min(w, from + wide); x++) {
      const source = Math.round(x + wobble(x, y));
      const at = mirrored * w + Math.min(w - 1, Math.max(0, source));
      const k = bow.kind[at] - 1;
      if (k < 0 || k >= GLOWING) {
        continue;
      }
      px(ctx, x, y, colorOf(k), 0.6 * strong[k] * shown(bow.along[at], k < SECOND ? bloom : 1));
    }
  });
}
