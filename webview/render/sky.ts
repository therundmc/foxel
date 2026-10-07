import { PALETTE } from '../sprites/palette';
import type { Stage } from '../stage';

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

/** Party confetti, in front of the fox. */
export class Sky {
  private confetti: Confetto[] = [];

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
