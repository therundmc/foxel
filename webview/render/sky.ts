import { lightTint } from '../../shared/day';
import type { Stars } from '../sim/props/stars';
import { PALETTE } from '../sprites/palette';
import type { Stage } from '../stage';

const SHOOTING_MS = 900;
const SHOOTING_GAP_MIN_MS = 40_000;
const SHOOTING_GAP_SPREAD_MS = 50_000;
const SHOOTING_TRAIL = 5;
const SHOOTING_ALPHA = 0.55;
const CONFETTI_COLORS = ['L', 'S', 'C', 'V', 'B', 'U'];
const CONFETTI_GRAVITY = 40;

// The sky it gazes at: a veil of night coming down from the top, and stars lighting up one after the other.
const NIGHT_RGB = '22, 28, 72';
const VEIL_ALPHA = 0.62;
/** A light theme needs more night for the stars to show. */
const VEIL_ALPHA_LIGHT = 0.9;
/** The stars are laid out once over this width, so a wider view uncovers more of the same sky. */
const STAR_SPAN = 1024;
/** One star for this many sprite pixels of sky. */
const STAR_AREA = 70;
const STAR_GROUND_CLEARANCE = 6;
const WISH_TRAVEL = 78;
const WISH_DROP = 15;
const WISH_TRAIL = 22;
/** How far above the ground the wished-on star starts, when the view is tall enough. */
const WISH_HEIGHT = 60;

interface Star {
  x: number;
  /** How far down the sky it sits, from 0 at the top to 1 just above the ground. */
  down: number;
  /** When it lights up as the sky comes out, from 0 (first) to 1 (last). */
  order: number;
  color: string;
  alpha: number;
  /** Bright enough to sparkle with four little rays. */
  rays: boolean;
  period: number;
  phase: number;
}

// Always the same sky: the seed is fixed, so the fox's stars are where they were last night.
function starField(count: number): Star[] {
  let seed = 0x5eed;
  const random = (): number => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: count }, () => {
    const kind = random();
    const rays = kind > 0.93;
    const bright = kind > 0.62;
    return {
      x: Math.floor(random() * STAR_SPAN),
      down: random() ** 1.35,
      order: rays ? random() * 0.5 : random(),
      color: rays ? PALETTE.W : random() < 0.3 ? PALETTE.Z : PALETTE.J,
      alpha: bright ? 0.75 + random() * 0.25 : 0.3 + random() * 0.3,
      rays,
      period: 350 + random() * 900,
      phase: random() * Math.PI * 2,
    };
  });
}

const lightTheme = (): boolean => /vscode-(high-contrast-)?light/.test(document.body.className);

interface Confetto {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

/** What is in the air: the night sky it gazes at, a rare shooting star at night, party confetti. */
export class Sky {
  private nextShootingAt = performance.now() + SHOOTING_GAP_MIN_MS;
  private shooting: { x: number; y: number; at: number } | undefined;
  private confetti: Confetto[] = [];
  private stars: Star[] = [];

  draw(stage: Stage, clock: Date, now: number): void {
    if (lightTint(clock) !== 'night') {
      this.shooting = undefined;
      return;
    }
    const worldW = stage.width / stage.scale;
    const worldH = stage.height / stage.scale;
    if (!this.shooting && now >= this.nextShootingAt) {
      this.shooting = { x: worldW * (0.3 + 0.7 * Math.random()), y: 1 + Math.random() * worldH * 0.2, at: now };
      this.nextShootingAt = now + SHOOTING_GAP_MIN_MS + Math.random() * SHOOTING_GAP_SPREAD_MS;
    }
    if (!this.shooting) {
      return;
    }
    const p = (now - this.shooting.at) / SHOOTING_MS;
    if (p >= 1) {
      this.shooting = undefined;
      return;
    }
    const fade = SHOOTING_ALPHA * Math.sin(Math.PI * p);
    const headX = this.shooting.x - p * 40;
    const headY = this.shooting.y + p * 14;
    for (let i = 0; i < SHOOTING_TRAIL; i++) {
      this.pixel(stage, headX + i * 2, headY - i * 0.7, PALETTE.J, fade * (1 - i / SHOOTING_TRAIL));
    }
  }

  /** The night sky of its stargazing, as far out as `sky.glow` says. */
  drawNight(stage: Stage, sky: Stars, now: number): void {
    if (sky.glow <= 0) {
      return;
    }
    const { ctx, width, height, scale } = stage;
    const worldW = width / scale;
    const worldH = height / scale;
    const glow = sky.glow * sky.glow * (3 - 2 * sky.glow);
    const top = (lightTheme() ? VEIL_ALPHA_LIGHT : VEIL_ALPHA) * glow;
    const veil = ctx.createLinearGradient(0, 0, 0, height);
    veil.addColorStop(0, `rgba(${NIGHT_RGB}, ${top})`);
    veil.addColorStop(0.55, `rgba(${NIGHT_RGB}, ${top * 0.6})`);
    veil.addColorStop(1, `rgba(${NIGHT_RGB}, 0)`);
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, width, height);

    const count = Math.round((STAR_SPAN * worldH) / STAR_AREA);
    if (this.stars.length !== count) {
      this.stars = starField(count);
    }
    const depth = Math.max(1, worldH - STAR_GROUND_CLEARANCE);
    for (const star of this.stars) {
      const lit = Math.min(1, (sky.glow * 1.2 - star.order) / 0.2);
      if (star.x >= worldW || lit <= 0) {
        continue;
      }
      const twinkle = 0.72 + 0.28 * Math.sin(now / star.period + star.phase);
      const y = 1 + star.down * depth;
      this.pixel(stage, star.x, y, star.color, star.alpha * lit * twinkle);
      if (star.rays && twinkle > 0.8) {
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
          this.pixel(stage, star.x + dx, y + dy, PALETTE.J, 0.5 * lit);
        }
      }
    }

    const wish = sky.shooting;
    if (wish) {
      const fade = Math.sin(Math.PI * wish.progress) ** 0.4;
      const headX = wish.x + wish.dir * wish.progress * WISH_TRAVEL;
      const headY = Math.max(1, worldH - WISH_HEIGHT) + wish.progress * WISH_DROP;
      for (let i = WISH_TRAIL; i >= 0; i--) {
        const y = headY - (i * WISH_DROP) / WISH_TRAVEL;
        this.pixel(stage, headX - wish.dir * i, y, i < 3 ? PALETTE.W : PALETTE.J, fade * (1 - i / (WISH_TRAIL + 1)));
      }
      for (const [dx, dy] of [[0, -1], [0, 1], [1, 0], [-1, 0]] as const) {
        this.pixel(stage, headX + dx, headY + dy, PALETTE.J, fade * 0.6);
      }
    }
  }

  burst(stage: Stage, centerX: number): void {
    const worldH = stage.height / stage.scale;
    for (let i = 0; i < 40; i++) {
      this.confetti.push({
        x: centerX + (Math.random() - 0.5) * 30,
        y: Math.max(0, worldH - 36 - Math.random() * 6),
        vx: (Math.random() - 0.5) * 20,
        vy: -Math.random() * 15,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        life: 2.5 + Math.random(),
      });
    }
  }

  drawConfetti(stage: Stage, dtMs: number): void {
    const dt = dtMs / 1000;
    const worldH = stage.height / stage.scale;
    this.confetti = this.confetti.filter((c) => (c.life -= dt) > 0 && c.y < worldH);
    for (const c of this.confetti) {
      c.vy += CONFETTI_GRAVITY * dt;
      c.x += (c.vx + Math.sin(c.life * 6) * 6) * dt;
      c.y += c.vy * dt;
      this.pixel(stage, c.x, c.y, PALETTE[c.color], Math.min(1, c.life));
    }
  }

  get busy(): boolean {
    return this.confetti.length > 0;
  }

  private pixel(stage: Stage, x: number, y: number, color: string, alpha: number): void {
    const s = stage.scale;
    stage.ctx.globalAlpha = alpha;
    stage.ctx.fillStyle = color;
    stage.ctx.fillRect(Math.round(x) * s, Math.round(y) * s, s, s);
    stage.ctx.globalAlpha = 1;
  }
}
