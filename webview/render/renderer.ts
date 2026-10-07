import { partyKind } from '../../shared/day';
import { foxShown, type Session } from '../session';
import type { Buddy } from '../sim/buddy';
import type { Bowl } from '../sim/props/bowl';
import { ANIMATIONS } from '../sprites/fox/animations';
import { SPRITE_SIZE, frameAt, type Frame, type Glyph } from '../sprites/frames';
import {
  BALL_FRAMES,
  BALL_SIZE,
  BASKET_BACK,
  BASKET_FRONT,
  BASKET_W,
  BIRD_FRAMES,
  BIRD_H,
  BIRD_W,
  BUG_FRAMES,
  CAKE,
  EMOTE_BUD,
  EMOTES,
  type Emote,
  FOOD_BOWL,
  GRASS,
  GRASS_H,
  GRASS_W,
  HATS,
  MOUSE_FRAMES,
  TREAT_STAGES,
  TREAT_W,
  WATER_BOWL,
} from '../sprites/props';
import type { Rect, Stage } from '../stage';
import type { Bitmaps } from './bitmaps';
import { Eyes } from './eyes';
import { drawBubbles } from './bubbles';
import { SceneryLayers } from './scenery';
import type { Sky } from './sky';

const SHADOW_COLOR = 'rgba(0, 0, 0, 0.25)';
// Above the ear tips, where the picture bubble sits.
const EMOTE_ABOVE_HEAD = 13;
const EMOTE_BUD_MS = 130;
const CAKE_FLICKER_MS = 300;
const mirrored = (glyph: Glyph): Glyph => glyph.map((line) => [...line].reverse().join(''));
const TREAT_STAGES_FACING_LEFT = TREAT_STAGES.map(mirrored);
const MOUSE_FRAMES_FACING_LEFT = MOUSE_FRAMES.map(mirrored);
const BIRD_FRAMES_FACING_LEFT = BIRD_FRAMES.map(mirrored);

/** The frame of its animation the buddy is showing right now. */
export function currentFrame(buddy: Buddy): Frame {
  const { anim, elapsed } = buddy.current();
  return frameAt(ANIMATIONS[anim], elapsed);
}

/** Paints one frame of the scene, back to front. */
export class Renderer {
  private readonly eyes = new Eyes();
  private readonly scenery = new SceneryLayers();
  private emote: { shown: Emote; since: number } | undefined;

  constructor(
    private readonly stage: Stage,
    private readonly bitmaps: Bitmaps,
    private readonly sky: Sky,
    private readonly session: Session,
  ) {}

  blink(now: number): void {
    this.eyes.blink(now);
  }

  draw(now: number, dt: number): void {
    const { stage, sky, session } = this;
    const { world, buddy } = session;
    stage.ctx.clearRect(0, 0, stage.width, stage.height);
    this.scenery.drawBack(stage, world.scenery);
    this.drawCake(now);
    const frame = currentFrame(buddy);
    this.drawBasket(BASKET_BACK, BASKET_FRONT.length + BASKET_BACK.length);
    this.drawBowl(world.foodBowl, FOOD_BOWL);
    this.drawBowl(world.waterBowl, WATER_BOWL);
    this.drawTreat(frame);
    this.drawBird(true);
    const fox = foxShown(session);
    if (fox) {
      this.drawBuddy(stage.buddyRect(buddy), frame, now);
    }
    this.drawBasket(BASKET_FRONT, BASKET_FRONT.length);
    this.drawMouse();
    this.drawGrass();
    if (fox) {
      this.drawEmote(stage.buddyRect(buddy), frame, now);
    }
    this.drawBall();
    this.drawBug();
    this.drawBird(false);
    drawBubbles(stage, world.bubbles);
    this.scenery.drawFront(stage, world.scenery);
    sky.drawConfetti(stage, dt);
  }

  // The basket sits under the curled-up fox: back rim and cushion behind it, front rim in front.
  private drawBasket(glyph: Glyph, topAboveGround: number): void {
    const { ctx, scale } = this.stage;
    const { basket } = this.session.world;
    if (basket.x === undefined) {
      return;
    }
    const x = Math.round((basket.x + (SPRITE_SIZE - BASKET_W) / 2) * scale);
    const y = Math.round(this.stage.screenY(topAboveGround));
    if (glyph === BASKET_FRONT && basket.cap) {
      // Its nightcap, left on the cushion.
      const cap = HATS.nightcap.glyph;
      const capX = x + Math.round(((BASKET_W - cap[0].length) / 2) * scale);
      ctx.drawImage(this.bitmaps.get(cap), capX, y - (cap.length - 2) * scale, cap[0].length * scale, cap.length * scale);
    }
    ctx.drawImage(this.bitmaps.get(glyph), x, y, glyph[0].length * scale, glyph.length * scale);
  }

  private drawBowl(bowl: Bowl, stages: readonly Glyph[]): void {
    if (!bowl.visible) {
      return;
    }
    const r = this.stage.rect(bowl.box);
    const glyph = stages[Math.min(bowl.amount, stages.length - 1)];
    this.stage.ctx.drawImage(this.bitmaps.get(glyph), r.x, r.y, r.w, r.h);
    // The little bird that brings it and takes it back.
    const bird = bowl.courier;
    if (bird) {
      const at = this.stage.rect({ x: bird.x, y: bird.y, w: BIRD_W, h: BIRD_H });
      const flying = (bird.dir === 1 ? BIRD_FRAMES : BIRD_FRAMES_FACING_LEFT)[bird.wingsUp ? 0 : 1];
      this.stage.ctx.drawImage(this.bitmaps.get(flying), at.x, at.y, at.w, at.h);
    }
  }

  private drawCake(now: number): void {
    const { ctx, width, scale } = this.stage;
    const { settings, clock } = this.session;
    if (!settings.dayNight || partyKind(clock, settings.installedOn) !== 'anniversary') {
      return;
    }
    const glyph = CAKE[Math.floor(now / CAKE_FLICKER_MS) % CAKE.length];
    const x = Math.round((width / scale) * 0.12) * scale;
    const y = Math.round(this.stage.screenY(glyph.length));
    ctx.drawImage(this.bitmaps.get(glyph), x, y, glyph[0].length * scale, glyph.length * scale);
  }

  // A little picture bubble above the head: what it feels or wants, never words.
  private drawEmote(rect: Rect, frame: Frame, now: number): void {
    const { ctx, scale } = this.stage;
    const buddy = this.session.buddy;
    const emote = buddy.emote();
    if (emote !== this.emote?.shown) {
      this.emote = emote && { shown: emote, since: now };
    }
    if (!emote || !this.emote) {
      return;
    }
    // It swells up before its picture shows.
    const glyph = now - this.emote.since < EMOTE_BUD_MS ? EMOTE_BUD : EMOTES[emote];
    const [hx, hy] = frame.head;
    const w = glyph[0].length;
    const left = buddy.dir === 1 ? hx + 1 : SPRITE_SIZE - hx - 1 - w;
    const top = hy - EMOTE_ABOVE_HEAD - glyph.length;
    const y = Math.max(0, rect.y + top * scale);
    ctx.drawImage(this.bitmaps.get(glyph), rect.x + left * scale, y, w * scale, glyph.length * scale);
  }

  // Two-row pixel ellipse on the ground; shrinks as the thing above it rises.
  private drawShadow(centerX: number, widthPx: number): void {
    const { ctx, height, scale: s } = this.stage;
    const w = Math.max(2, Math.round(widthPx)) * s;
    const x = Math.round(centerX - w / 2);
    ctx.fillStyle = SHADOW_COLOR;
    ctx.fillRect(x, height - 2 * s, w, s);
    ctx.fillRect(x + s, height - s, w - 2 * s, s);
  }

  private drawBuddy(rect: Rect, frame: Frame, now: number): void {
    const { ctx, scale: s } = this.stage;
    const buddy = this.session.buddy;
    this.drawShadow(rect.x + rect.w / 2, 16 - Math.min(buddy.y, 8));

    const flip = buddy.dir === -1;
    const img = this.bitmaps.get(frame.pixels);
    if (flip) {
      ctx.save();
      ctx.translate(rect.x + rect.w, rect.y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, rect.w, rect.h);
      ctx.restore();
    } else {
      ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h);
    }
    this.eyes.draw(this.stage, this.bitmaps, buddy, frame, rect, flip, now);
    this.drawHat(frame, rect, flip);

    // Overlays (Zzz, ?, hearts) follow the facing side but must never be mirrored.
    for (const o of frame.overlays) {
      const glyph = this.bitmaps.get(o.glyph);
      const x = flip ? SPRITE_SIZE - o.x - glyph.width : o.x;
      ctx.drawImage(glyph, rect.x + x * s, rect.y + o.y * s, glyph.width * s, glyph.height * s);
    }
  }

  private drawHat(frame: Frame, rect: Rect, flip: boolean): void {
    const { ctx, scale: s } = this.stage;
    const hat = this.session.buddy.hat();
    if (!hat) {
      return;
    }
    const { glyph, x, y } = HATS[hat];
    const w = glyph[0].length;
    const img = this.bitmaps.get(glyph);
    const left = frame.head[0] + x;
    const top = rect.y + (frame.head[1] + y) * s;
    if (flip) {
      ctx.save();
      ctx.translate(rect.x + (SPRITE_SIZE - left) * s, top);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, w * s, glyph.length * s);
      ctx.restore();
    } else {
      ctx.drawImage(img, rect.x + left * s, top, w * s, glyph.length * s);
    }
  }

  private drawBall(): void {
    const ball = this.session.world.ball;
    if (ball.state !== 'free' && ball.state !== 'held') {
      return;
    }
    const r = this.stage.rect(ball.box);
    this.drawShadow(r.x + r.w / 2, BALL_SIZE - Math.min(ball.y / 6, 4));
    const n = BALL_FRAMES.length;
    const step = (Math.PI * BALL_SIZE) / n;
    const spin = ((Math.floor(ball.spin / step) % n) + n) % n;
    this.stage.ctx.drawImage(this.bitmaps.get(BALL_FRAMES[spin]), r.x, r.y, r.w, r.h);
  }

  // While eating, the frame says how much is left; the bitten end faces the fox.
  private drawTreat(frame: Frame): void {
    const { world, buddy } = this.session;
    const treat = world.treat;
    let glyph: Glyph | undefined;
    if (treat.state === 'free' || treat.state === 'held') {
      glyph = (treat.facing === 1 ? TREAT_STAGES : TREAT_STAGES_FACING_LEFT)[treat.stage];
    } else if (treat.state === 'eating' && buddy.state === 'snack' && frame.treat !== undefined) {
      glyph = (buddy.dir === 1 ? TREAT_STAGES : TREAT_STAGES_FACING_LEFT)[frame.treat];
    }
    if (!glyph) {
      return;
    }
    const r = this.stage.rect(treat.box);
    this.drawShadow(r.x + r.w / 2, TREAT_W - Math.min(treat.y / 6, 4));
    this.stage.ctx.drawImage(this.bitmaps.get(glyph), r.x, r.y, r.w, r.h);
  }

  private drawMouse(): void {
    const mouse = this.session.world.mouse;
    if (!mouse.active) {
      return;
    }
    const r = this.stage.rect(mouse.box);
    const glyph = (mouse.dir === 1 ? MOUSE_FRAMES : MOUSE_FRAMES_FACING_LEFT)[mouse.frame];
    this.stage.ctx.drawImage(this.bitmaps.get(glyph), r.x, r.y, r.w, r.h);
  }

  // In front of the fox, which hides in it; it comes out of the ground from the bottom up.
  private drawGrass(): void {
    const grass = this.session.world.grass;
    const rows = grass.box.h;
    if (!grass.active || rows < 1) {
      return;
    }
    const r = this.stage.rect(grass.box);
    const img = this.bitmaps.get(GRASS[grass.swayed ? 1 : 0]);
    this.stage.ctx.drawImage(img, 0, GRASS_H - rows, GRASS_W, rows, r.x, r.y, r.w, r.h);
  }

  // Flying across in the distance it passes behind the fox; down on the ground it is in front, like the other critters.
  private drawBird(far: boolean): void {
    const bird = this.session.world.bird;
    if (!bird.active || (bird.state === 'crossing') !== far) {
      return;
    }
    const r = this.stage.rect(bird.box);
    const glyph = (bird.dir === 1 ? BIRD_FRAMES : BIRD_FRAMES_FACING_LEFT)[bird.frame];
    this.stage.ctx.drawImage(this.bitmaps.get(glyph), r.x, r.y, r.w, r.h);
  }

  private drawBug(): void {
    const bug = this.session.world.bug;
    if (!bug.active) {
      return;
    }
    const r = this.stage.rect(bug.box);
    this.stage.ctx.drawImage(this.bitmaps.get(BUG_FRAMES[bug.wingsUp ? 0 : 1]), r.x, r.y, r.w, r.h);
  }
}
