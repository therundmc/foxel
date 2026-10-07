import { lightTint } from '../shared/day';
import { PALETTE } from './sprites';

export interface View {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scale: number;
}

const SHOOTING_MS = 900;
const SHOOTING_GAP_MIN_MS = 40_000;
const SHOOTING_GAP_SPREAD_MS = 50_000;
const SHOOTING_TRAIL = 5;
const SHOOTING_ALPHA = 0.55;
const CONFETTI_COLORS = ['L', 'S', 'C', 'V', 'B', 'U'];
const CONFETTI_GRAVITY = 40;

interface Confetto {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

/** A rare shooting star at night behind the fox, and party confetti in front. */
export class Sky {
  private nextShootingAt = performance.now() + SHOOTING_GAP_MIN_MS;
  private shooting: { x: number; y: number; at: number } | undefined;
  private confetti: Confetto[] = [];

  draw(view: View, clock: Date, now: number): void {
    if (lightTint(clock) !== 'night') {
      this.shooting = undefined;
      return;
    }
    const worldW = view.width / view.scale;
    const worldH = view.height / view.scale;
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
      this.pixel(view, headX + i * 2, headY - i * 0.7, PALETTE.J, fade * (1 - i / SHOOTING_TRAIL));
    }
  }

  burst(view: View, centerX: number): void {
    const worldH = view.height / view.scale;
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

  drawConfetti(view: View, dtMs: number): void {
    const dt = dtMs / 1000;
    const worldH = view.height / view.scale;
    this.confetti = this.confetti.filter((c) => (c.life -= dt) > 0 && c.y < worldH);
    for (const c of this.confetti) {
      c.vy += CONFETTI_GRAVITY * dt;
      c.x += (c.vx + Math.sin(c.life * 6) * 6) * dt;
      c.y += c.vy * dt;
      this.pixel(view, c.x, c.y, PALETTE[c.color], Math.min(1, c.life));
    }
  }

  get busy(): boolean {
    return this.confetti.length > 0;
  }

  private pixel(view: View, x: number, y: number, color: string, alpha: number): void {
    const s = view.scale;
    view.ctx.globalAlpha = alpha;
    view.ctx.fillStyle = color;
    view.ctx.fillRect(Math.round(x) * s, Math.round(y) * s, s, s);
    view.ctx.globalAlpha = 1;
  }
}
