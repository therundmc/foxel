import type { Pond } from './fireflies-pond';
import { clamp01, ramp, seeded, type VistaView } from './paint';

// The fireflies. A few of them live over the pond: each wanders on its own slow path and glows at its own pace, then
// one after the other they take the same slow breath. At the great moment a little stream of them lifts off beside the
// fox, and hundreds more come out of the water and go up in a turning, widening column that leans the way the fox
// looks; up there they spread out and stay, a second sky.

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));

const CORE = '#f4ffa6';
const GLOW = '#b9e645';
const MIRRORED = '#a8d84e';

/** One breath of the whole pond, once they glow together, in seconds. */
const BREATH_S = 3.6;
/** They fall into that rhythm one after the other between these two times, each over a few seconds. */
const JOIN_FROM_S = 12;
const JOIN_TO_S = 20;
const JOINING_S = 3;
/** A firefly never goes quite dark, or its path would be lost; together they keep more, or the pond would go out. */
const FAINT = 0.15;
const FAINT_TOGETHER = 0.38;
/** While they rise they keep more of their light between two breaths: the column must stay in sight. The first stream hardly dims: the fox follows it. */
const FAINT_RISING = 0.45;
const FAINT_STREAM = 0.85;

/** The first stream lifts off within this long of the moment; the pond follows until `LAST_LIFT_S`. */
const STREAM_S = 1.4;
const FIRST_LIFT_S = 2;
const LAST_LIFT_S = 6.5;
/** How long one takes to reach its place in the sky, and to be drawn into the column. */
const RISE_S = [6, 8] as const;
const DRAWN_IN_S = 4.5;
const STREAM_DRAWN_IN_S = 3.2;
/** The first stream climbs in this share of the time the others take. */
const STREAM_RISE = 0.65;
/** The column: how many ribbons of light it has, how fast the place they leave from goes round, and how fast they then turn (radians a second). */
const RIBBONS = 2;
const LEAVES_TURNING = 1.5;
const TURNS = 0.32;
/** Seen from a little above, a turn is a flat ring: this much of its width shows as height. */
const RING = 0.18;
/** Up there they go on drifting the way the fox looks, in pixels a second. */
const SKY_DRIFT = 0.45;

interface Light {
  /** The spot of water it lives over, and how high above it. */
  readonly x: number;
  readonly water: number;
  readonly above: number;
  /** Its wandering: how far each way, and how fast. */
  readonly roamX: number;
  readonly roamY: number;
  readonly paceX: number;
  readonly paceY: number;
  readonly turn: number;
  /** When it comes out, in seconds of the sky; never, for those that only come at the great moment. */
  readonly out: number;
  /** Its own glow, and when it gives it up for the common breath. */
  readonly pace: number;
  readonly phase: number;
  readonly joins: number;
  /** The rise: when it lifts off after the moment, how long it takes, its angle in the column, how far it turns from its axis, and where that axis stands. */
  readonly lifts: number;
  readonly rises: number;
  readonly angle: number;
  readonly wide: number;
  readonly toward: number;
  /** How long it takes to be drawn there, and how much of its light it keeps between two breaths on the way up. */
  readonly drawnIn: number;
  readonly keeps: number;
  /** Its place in the sky. */
  readonly skyX: number;
  readonly skyY: number;
  readonly bright: number;
}

interface Swarm {
  readonly key: string;
  readonly lights: readonly Light[];
  /** How far the top of the column leans the way the fox looks. */
  readonly leans: number;
}

/** How bright one must be to wear a halo, and a wide one. */
const HALO_FROM = 0.3;
const WIDE_HALO_FROM = 0.72;

const NEVER = 1e9;

function gather(view: VistaView, pond: Pond, key: string): Swarm {
  const { w, h, foxX, dir } = view;
  const deep = pond.foot - pond.shore;
  const room = dir > 0 ? w - foxX : foxX;
  const axis = clamp(foxX + dir * clamp(room * 0.36, 26, 90), 8, w - 8);
  const widest = clamp(w * 0.2, 12, 70);
  const random = seeded(0xf17e);
  const all = clamp(Math.round((w * h) / 85), 40, 480);
  const living = clamp(Math.round((w * deep) / 340), 5, 44);
  const stream = Math.round((all - living) * 0.08);
  const farthest = Math.max(axis, w - axis);
  const lights: Light[] = [];
  for (let i = 0; i < all; i++) {
    const lives = i < living;
    const leads = !lives && i < living + stream;
    // The ones that live here keep to the nearer water; the first stream comes out low beside the fox; the rest from all over the pond.
    const x = leads ? foxX + dir * (4 + random() * 24) : random() * w;
    const water = leads ? pond.foot - 1 - random() * 5 : pond.shore + deep * (lives ? 0.3 + 0.65 * random() : 0.08 + 0.9 * random());
    const roamY = lives ? 1 + random() * 2.5 : 1;
    const away = Math.abs(x - axis);
    // The column draws in those that come out near it; the others go up closer to where they were.
    const drawn = clamp(1.4 - away / (3 * widest), 0.35, 1);
    const lifts = leads
      ? 0.1 + random() * STREAM_S
      : FIRST_LIFT_S + (LAST_LIFT_S - FIRST_LIFT_S) * clamp01(0.75 * (away / farthest) ** 0.7 + 0.3 * random());
    lights.push({
      x,
      water,
      above: lives ? roamY + 1 + random() * Math.min(9, deep * 0.3) : 1 + random() * 2,
      roamX: lives ? 5 + random() * 8 : 2 + random() * 3,
      roamY,
      paceX: 0.12 + random() * 0.2,
      paceY: 0.2 + random() * 0.25,
      turn: random() * 6.3,
      // Three are out from the start; the others come one after the other.
      out: !lives ? NEVER : i < 3 ? -3 : 1 + (19 * (i - 3 + random())) / (living - 3),
      pace: 1.1 + random() * 1.1,
      phase: random() * 6.3,
      joins: JOIN_FROM_S + random() * (JOIN_TO_S - JOIN_FROM_S - JOINING_S),
      lifts,
      rises: (leads ? STREAM_RISE : 1) * (RISE_S[0] + random() * (RISE_S[1] - RISE_S[0])),
      angle: (6.283 / RIBBONS) * Math.floor(random() * RIBBONS) + LEAVES_TURNING * lifts + (random() - 0.5) * 0.5,
      wide: leads ? 3 + random() * 4 : widest * (0.75 + 0.25 * random()) * (0.4 + 0.6 * drawn),
      // The first stream does not wait for the column: it flies ahead, the way the fox looks.
      toward: leads ? foxX + dir * room * (0.34 + 0.4 * random()) : x + (axis - x) * drawn,
      drawnIn: leads ? STREAM_DRAWN_IN_S : DRAWN_IN_S,
      keeps: leads ? FAINT_STREAM : FAINT_RISING,
      skyX: -24 - dir * 12 + random() * (w + 48),
      skyY: 1 + random() ** 1.5 * (pond.foot - deep * 0.5 - 1),
      bright: lives ? 1 : 0.4 + 0.6 * random() ** 1.3,
    });
  }
  return { key, lights, leans: clamp(room * 0.2, 6, 50) };
}

/** The breath the whole pond glows with once they are together, from 0 to 1; it runs across the water like a slow wave. */
const breath = (t: number, x: number): number => (0.5 + 0.5 * Math.sin((6.283 * t) / BREATH_S - x * 0.012)) ** 1.3;

/** How much light the fireflies throw on what is around them, from 0 to 1. */
export function shine({ t, moment, w }: VistaView): number {
  const together = ramp(t, JOIN_FROM_S, JOIN_TO_S);
  const risen = moment === undefined ? 0 : ramp(moment, FIRST_LIFT_S, LAST_LIFT_S + RISE_S[0]);
  return together * (breath(t, w / 2) * (1 - risen) + 0.7 * risen);
}

let swarm: Swarm | undefined;
/** Scratch: for each light in sight, where it is, how bright, the row of its reflection, how tall and how strong that is. */
let seen = new Float32Array(0);
const FIELDS = 6;

export function paintLights(view: VistaView, pond: Pond): void {
  const { ctx, w, h, t, moment, foxX, dir } = view;
  const key = `${w}:${h}:${foxX}:${dir}`;
  if (swarm?.key !== key) {
    swarm = gather(view, pond, key);
  }
  const { lights, leans } = swarm;
  if (seen.length < lights.length * FIELDS) {
    seen = new Float32Array(lights.length * FIELDS);
  }
  const deep = pond.foot - pond.shore;
  let count = 0;
  for (const light of lights) {
    const roam = Math.sin(t * light.paceX + light.turn) + 0.5 * Math.sin(t * light.paceX * 0.43 + light.turn * 2.3);
    const bob = Math.sin(t * light.paceY + light.turn * 1.7);
    let x = light.x + light.roamX * roam;
    let y = light.water - light.above - light.roamY * bob;
    const own = FAINT + (1 - FAINT) * (0.5 + 0.5 * Math.sin(t * light.pace + light.phase)) ** 1.6;
    const common = FAINT_TOGETHER + (1 - FAINT_TOGETHER) * breath(t, x);
    let shown = ramp(t, light.out, light.out + 2.5);
    let glow: number;
    const since = moment === undefined ? -1 : moment - light.lifts;
    if (since < 0) {
      if (shown <= 0) {
        continue;
      }
      glow = own + (common - own) * ramp(t, light.joins, light.joins + JOINING_S);
    } else {
      shown = Math.max(shown, ramp(since, 0, 1.2));
      const up = ramp(since, 0, light.rises);
      // The column: it turns about an axis that leans the way the fox looks, and opens as it goes up.
      const around = light.angle + TURNS * since;
      const radius = light.wide * up ** 0.85;
      const drawn = ramp(since, 0, light.drawnIn);
      const columnX = light.toward + dir * leans * up + radius * Math.cos(around);
      const columnY = y + (light.skyY - y) * up + RING * radius * Math.sin(around);
      // Near the top it lets go of the column for its own place in the sky.
      const settled = ramp(up, 0.6, 1);
      const skyX = light.skyX + dir * SKY_DRIFT * since + 0.5 * light.roamX * roam;
      const skyY = light.skyY + light.roamY * bob;
      x += (columnX - x) * drawn;
      x += (skyX - x) * settled;
      y += (columnY - y) * drawn;
      y += (skyY - y) * settled;
      const rising = common + (1 - common) * light.keeps * ramp(since, 0, 1.5);
      glow = own + (rising - own) * (1 - ramp(since, light.rises * 0.5, light.rises * 1.1));
    }
    if (x < -2 || x > w + 2 || y < -2) {
      continue;
    }
    const strength = shown * glow * light.bright;
    // The water gives it back, lower the higher it flies, and longer.
    const high = light.water - y;
    const at = count * FIELDS;
    seen[at] = Math.round(x);
    seen[at + 1] = Math.round(y);
    seen[at + 2] = strength;
    seen[at + 3] = Math.round(light.water + high * 0.5);
    seen[at + 4] = 1 + Math.min(3, Math.floor(high * 0.1));
    seen[at + 5] = high > 0 ? 0.34 * strength * clamp01(1 - high / (1.5 * deep)) : 0;
    count++;
  }
  ctx.fillStyle = MIRRORED;
  for (let at = 0; at < count * FIELDS; at += FIELDS) {
    if (seen[at + 5] > 0.02 && seen[at + 3] <= pond.foot + 2) {
      ctx.globalAlpha = seen[at + 5];
      ctx.fillRect(seen[at], seen[at + 3], 1, seen[at + 4]);
    }
  }
  // A soft cross of light around each, wider around the brightest, then every one's own pixel.
  ctx.fillStyle = GLOW;
  for (let at = 0; at < count * FIELDS; at += FIELDS) {
    const strength = seen[at + 2];
    if (strength > HALO_FROM) {
      ctx.globalAlpha = 0.55 * (strength - HALO_FROM * 0.6);
      ctx.fillRect(seen[at] - 1, seen[at + 1], 3, 1);
      ctx.fillRect(seen[at], seen[at + 1] - 1, 1, 3);
    }
    if (strength > WIDE_HALO_FROM) {
      ctx.globalAlpha = 0.3 * (strength - WIDE_HALO_FROM * 0.8);
      ctx.fillRect(seen[at] - 1, seen[at + 1] - 1, 3, 3);
      ctx.fillRect(seen[at] - 2, seen[at + 1], 5, 1);
      ctx.fillRect(seen[at], seen[at + 1] - 2, 1, 5);
    }
  }
  ctx.fillStyle = CORE;
  for (let at = 0; at < count * FIELDS; at += FIELDS) {
    ctx.globalAlpha = Math.min(1, seen[at + 2] * 1.25);
    ctx.fillRect(seen[at], seen[at + 1], 1, 1);
  }
  ctx.globalAlpha = 1;
}
