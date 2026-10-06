import type { BuddySettings, HostMessage } from '../shared/protocol';
import { Behavior, type Gaze, type WorldPoint } from './behavior';
import {
  ANIMATIONS,
  BALL_FRAMES,
  BALL_SIZE,
  BUG_FRAMES,
  BUG_H,
  BUG_W,
  COATS,
  GROUND_ROW,
  PALETTE,
  SPRITE_SIZE,
  TRANSPARENT,
  TREAT_H,
  TREAT_STAGES,
  TREAT_W,
  frameAt,
  touchZone,
  type Frame,
  type Glyph,
  type TouchZone,
} from './sprites';

declare function acquireVsCodeApi(): {
  postMessage(msg: unknown): void;
};

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MAX_FRAME_DT_MS = 100;
const RESTFUL_FRAME_MS = 80;
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.25)';
const DEFAULT_SCALE = 4;
const POINTER_IDLE_MS = 4000;
const BLINK_MS = 140;
const BLINK_GAP_MIN_MS = 2500;
const BLINK_GAP_MAX_MS = 6500;
const STROKE_WINDOW_MS = 1200;
const STROKE_REVERSALS = 2;
const STROKE_MIN_TRAVEL = 3;
const THROW_SAMPLE_MS = 100;
const MAX_THROW_SPEED = 180;
const EXIT_THROW_SPEED = 90;
const SPAWN_SPEED = 40;
const CLICK_SLOP = 2;
const GAZE_DELAY_MS = 220;
const GAZE_HOLD_MS = 350;
const CENTER_GAZE: Gaze = { x: 0, y: 0 };

const vscode = acquireVsCodeApi();
const canvas = document.getElementById('stage') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
const behavior = new Behavior();
const bitmaps = new Map<Glyph, HTMLCanvasElement>();

let settings: BuddySettings = { scale: DEFAULT_SCALE, speed: 1, coat: 'red' };
let scale = DEFAULT_SCALE;
let width = 0;
let height = 0;
let pointer: { x: number; y: number; time: number } | undefined;
let holding: 'ball' | 'treat' | undefined;
let dragged = false;
// Whenever the view appears, the fox peeks in from an edge instead of just being there.
let introPending = true;
let shownGaze: Gaze = CENTER_GAZE;
let wantedGaze: Gaze = CENTER_GAZE;
let wantedSince = 0;
let shownSince = 0;
let pressedOnBuddy: { x: number; y: number } | undefined;
let throwSamples: (WorldPoint & { t: number })[] = [];
let strokeDir = 0;
let strokeTravel = 0;
let strokeReversals: number[] = [];
let nextBlinkAt = performance.now() + blinkGap();

function blinkGap(): number {
  return BLINK_GAP_MIN_MS + Math.random() * (BLINK_GAP_MAX_MS - BLINK_GAP_MIN_MS);
}

function colorOf(letter: string): string {
  return COATS[settings.coat]?.[letter] ?? PALETTE[letter];
}

function bitmap(pixels: Glyph): HTMLCanvasElement {
  let bmp = bitmaps.get(pixels);
  if (bmp) {
    return bmp;
  }
  bmp = document.createElement('canvas');
  bmp.width = pixels[0].length;
  bmp.height = pixels.length;
  const g = bmp.getContext('2d') as CanvasRenderingContext2D;
  pixels.forEach((line, y) => {
    for (let x = 0; x < line.length; x++) {
      if (line[x] !== TRANSPARENT) {
        g.fillStyle = colorOf(line[x]);
        g.fillRect(x, y, 1, 1);
      }
    }
  });
  bitmaps.set(pixels, bmp);
  return bmp;
}

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  scale = Math.max(1, Math.round(settings.scale) || DEFAULT_SCALE);
  behavior.setWorldSize(Math.floor(width / scale), Math.floor(height / scale));
  if (introPending && behavior.maxX > 0) {
    introPending = false;
    behavior.startIntro();
  }
}

// World y is the height above the ground line, in sprite pixels.
function toWorld(cssX: number, cssY: number): WorldPoint {
  return { x: cssX / scale, y: (height - scale - cssY) / scale };
}

function screenY(worldY: number): number {
  return height - scale - worldY * scale;
}

function buddyRect(): Rect {
  const size = SPRITE_SIZE * scale;
  return {
    x: Math.round(behavior.x * scale),
    y: height - size - Math.round(behavior.y * scale),
    w: size,
    h: size,
  };
}

function ballRect(): Rect {
  const ball = behavior.ball;
  const size = BALL_SIZE * scale;
  return {
    x: Math.round(ball.x * scale),
    y: Math.round(screenY(ball.y + BALL_SIZE)),
    w: size,
    h: size,
  };
}

function inside(r: Rect, x: number, y: number, pad = 0): boolean {
  return x >= r.x - pad && x < r.x + r.w + pad && y >= r.y - pad && y < r.y + r.h + pad;
}

function overBuddy(x: number, y: number): boolean {
  return behavior.visible && !introPending && inside(buddyRect(), x, y);
}

function currentFrame(): Frame {
  const { anim, elapsed } = behavior.current();
  return frameAt(ANIMATIONS[anim], elapsed);
}

function zoneAt(x: number, y: number): TouchZone | undefined {
  if (!overBuddy(x, y)) {
    return undefined;
  }
  const r = buddyRect();
  const lx = (x - r.x) / scale;
  return touchZone(currentFrame(), behavior.dir === 1 ? lx : SPRITE_SIZE - lx, (y - r.y) / scale);
}

function overBall(x: number, y: number): boolean {
  return behavior.ball.state === 'free' && inside(ballRect(), x, y, scale * 2);
}

function treatRect(): Rect {
  const treat = behavior.treat;
  return {
    x: Math.round(treat.x * scale),
    y: Math.round(screenY(treat.y + TREAT_H)),
    w: TREAT_W * scale,
    h: TREAT_H * scale,
  };
}

function overTreat(x: number, y: number): boolean {
  return behavior.treat.state === 'free' && inside(treatRect(), x, y, scale * 2);
}

function draw(now: number): void {
  ctx.clearRect(0, 0, width, height);
  const frame = currentFrame();
  drawTreat(frame);
  if (behavior.visible && !introPending) {
    drawBuddy(buddyRect(), frame, now);
  }
  drawBall();
  drawBug();
}

// Two-row pixel ellipse on the ground; shrinks as the thing above it rises.
function drawShadow(centerX: number, widthPx: number): void {
  const s = scale;
  const w = Math.max(2, Math.round(widthPx)) * s;
  const x = Math.round(centerX - w / 2);
  ctx.fillStyle = SHADOW_COLOR;
  ctx.fillRect(x, height - 2 * s, w, s);
  ctx.fillRect(x + s, height - s, w - 2 * s, s);
}

function drawBuddy(rect: Rect, frame: Frame, now: number): void {
  const s = scale;
  drawShadow(rect.x + rect.w / 2, 16 - Math.min(behavior.y, 8));

  const flip = behavior.dir === -1;
  const img = bitmap(frame.pixels);
  if (flip) {
    ctx.save();
    ctx.translate(rect.x + rect.w, rect.y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, rect.w, rect.h);
    ctx.restore();
  } else {
    ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h);
  }
  drawEyes(frame, rect, flip, now);

  // Overlays (Zzz, ?, hearts) follow the facing side but must never be mirrored.
  for (const o of frame.overlays) {
    const glyph = bitmap(o.glyph);
    const x = flip ? SPRITE_SIZE - o.x - glyph.width : o.x;
    ctx.drawImage(glyph, rect.x + x * s, rect.y + o.y * s, glyph.width * s, glyph.height * s);
  }
}

// The eye sits in a 4x4 patch of fur (see frame.eye), so it can be repainted blinking or looking around.
// Eyes lag behind the target and step one pixel at a time, so they glance rather than twitch.
function settleGaze(target: Gaze | undefined, now: number): Gaze {
  const want = target ?? CENTER_GAZE;
  if (want.x !== wantedGaze.x || want.y !== wantedGaze.y) {
    wantedGaze = want;
    wantedSince = now;
  }
  const settled = now - wantedSince >= GAZE_DELAY_MS && now - shownSince >= GAZE_HOLD_MS;
  if (settled && (shownGaze.x !== wantedGaze.x || shownGaze.y !== wantedGaze.y)) {
    const step = (from: -1 | 0 | 1, to: -1 | 0 | 1): -1 | 0 | 1 => (from === to ? from : from === 0 ? to : 0);
    shownGaze = { x: step(shownGaze.x, wantedGaze.x), y: step(shownGaze.y, wantedGaze.y) };
    shownSince = now;
  }
  return shownGaze;
}

function drawEyes(frame: Frame, rect: Rect, flip: boolean, now: number): void {
  if (!frame.eye) {
    return;
  }
  const s = scale;
  const [ex, ey] = frame.eye;
  const paint = (lx: number, ly: number, w: number, color: string): void => {
    ctx.fillStyle = color;
    for (let x = lx; x < lx + w; x++) {
      const sx = flip ? SPRITE_SIZE - 1 - x : x;
      ctx.fillRect(rect.x + sx * s, rect.y + ly * s, s, s);
    }
  };
  const blinking = now >= nextBlinkAt;
  const eyeCenter = {
    x: behavior.x + (flip ? SPRITE_SIZE - ex - 1 : ex + 1),
    y: behavior.y + GROUND_ROW + 1 - (ey + 1.5),
  };
  const gaze = blinking ? undefined : settleGaze(behavior.gaze(eyeCenter), now);
  if (!blinking && (!gaze || (gaze.x === 0 && gaze.y === 0))) {
    return;
  }
  for (let y = ey - 1; y <= ey + 2; y++) {
    paint(ex - 1, y, 4, colorOf('O'));
  }
  if (blinking || !gaze) {
    paint(ex - 1, ey + 1, 1, PALETTE.E);
    paint(ex, ey + 2, 2, PALETTE.E);
    paint(ex + 2, ey + 1, 1, PALETTE.E);
    return;
  }
  const x = ex + gaze.x;
  if (gaze.y === 1) {
    paint(x, ey + 1, 2, PALETTE.E);
    paint(x, ey + 2, 2, PALETTE.E);
    paint(x + 1, ey + 1, 1, PALETTE.W);
    return;
  }
  const top = ey + gaze.y;
  for (let y = top; y < top + 3; y++) {
    paint(x, y, 2, PALETTE.E);
  }
  paint(x + 1, top, 1, PALETTE.W);
}

function drawBall(): void {
  const ball = behavior.ball;
  if (ball.state !== 'free' && ball.state !== 'held') {
    return;
  }
  const r = ballRect();
  drawShadow(r.x + r.w / 2, BALL_SIZE - Math.min(ball.y / 6, 4));
  const n = BALL_FRAMES.length;
  const step = (Math.PI * BALL_SIZE) / n;
  const spin = ((Math.floor(ball.spin / step) % n) + n) % n;
  ctx.drawImage(bitmap(BALL_FRAMES[spin]), r.x, r.y, r.w, r.h);
}

const TREAT_STAGES_FACING_LEFT = TREAT_STAGES.map((g) => g.map((line) => [...line].reverse().join('')));

// While eating, the frame says how much is left; the bitten end faces the fox.
function drawTreat(frame: Frame): void {
  const treat = behavior.treat;
  let glyph: Glyph | undefined;
  if (treat.state === 'free' || treat.state === 'held') {
    glyph = (treat.facing === 1 ? TREAT_STAGES : TREAT_STAGES_FACING_LEFT)[treat.stage];
  } else if (treat.state === 'eating' && behavior.state === 'snack' && frame.treat !== undefined) {
    glyph = (behavior.dir === 1 ? TREAT_STAGES : TREAT_STAGES_FACING_LEFT)[frame.treat];
  }
  if (!glyph) {
    return;
  }
  const r = treatRect();
  drawShadow(r.x + r.w / 2, TREAT_W - Math.min(treat.y / 6, 4));
  ctx.drawImage(bitmap(glyph), r.x, r.y, r.w, r.h);
}

function drawBug(): void {
  const bug = behavior.bug;
  if (!bug.active) {
    return;
  }
  const s = scale;
  const glyph = bitmap(BUG_FRAMES[bug.wingsUp ? 0 : 1]);
  const x = Math.round(bug.x * s);
  const y = Math.round(screenY(bug.y + BUG_H));
  ctx.drawImage(glyph, x, y, BUG_W * s, BUG_H * s);
}

function sampleThrow(p: WorldPoint): void {
  throwSamples.push({ ...p, t: performance.now() });
  if (throwSamples.length > 20) {
    throwSamples.shift();
  }
}

function releaseBall(cssX: number, cssY: number, minSpeed = 0): void {
  holding = undefined;
  const now = performance.now();
  const recent = throwSamples.filter((p) => now - p.t <= THROW_SAMPLE_MS);
  let vx = 0;
  let vy = 0;
  if (recent.length >= 2) {
    const a = recent[0];
    const b = recent[recent.length - 1];
    const dt = (b.t - a.t) / 1000;
    if (dt > 0) {
      vx = (b.x - a.x) / dt;
      vy = (b.y - a.y) / dt;
    }
  }
  const speed = Math.hypot(vx, vy);
  if (speed > MAX_THROW_SPEED) {
    vx *= MAX_THROW_SPEED / speed;
    vy *= MAX_THROW_SPEED / speed;
  } else if (speed < minSpeed) {
    const out = toWorld(cssX, cssY);
    const [dx, dy] = speed > 0 ? [vx, vy] : [out.x - width / scale / 2, 1];
    const len = Math.hypot(dx, dy);
    vx = (dx / len) * minSpeed;
    vy = (dy / len) * minSpeed;
  }
  behavior.throwBall(vx, vy, toWorld(cssX, cssY).x);
}

function releaseHeld(cssX: number, cssY: number, minSpeed = 0): void {
  if (holding === 'ball') {
    releaseBall(cssX, cssY, minSpeed);
  } else if (holding === 'treat') {
    holding = undefined;
    behavior.releaseTreat();
  }
}

// Petting = moving the pointer back and forth over the buddy.
function trackStroke(movementX: number): void {
  if (movementX === 0) {
    return;
  }
  const now = performance.now();
  const dir = Math.sign(movementX);
  if (dir === strokeDir) {
    strokeTravel += Math.abs(movementX);
  } else {
    if (strokeDir !== 0 && strokeTravel >= STROKE_MIN_TRAVEL * scale) {
      strokeReversals.push(now);
    }
    strokeDir = dir;
    strokeTravel = Math.abs(movementX);
  }
  strokeReversals = strokeReversals.filter((t) => now - t <= STROKE_WINDOW_MS);
  if (strokeReversals.length >= STROKE_REVERSALS) {
    behavior.pet();
  }
}

function updateCursor(x: number, y: number): void {
  let cursor = 'default';
  if (holding || (pressedOnBuddy && dragged)) {
    cursor = 'grabbing';
  } else if (overBall(x, y) || overTreat(x, y)) {
    cursor = 'grab';
  } else if (zoneAt(x, y)) {
    cursor = 'pointer';
  }
  canvas.style.cursor = cursor;
}

let last = performance.now();
function tick(now: number): void {
  requestAnimationFrame(tick);
  if (behavior.restful && !holding && now - last < RESTFUL_FRAME_MS) {
    return;
  }
  const dt = Math.min(now - last, MAX_FRAME_DT_MS);
  last = now;
  const pointerActive = pointer !== undefined && (holding || now - pointer.time < POINTER_IDLE_MS);
  behavior.setPointer(pointerActive && pointer ? toWorld(pointer.x, pointer.y) : undefined);
  behavior.update(dt * settings.speed);
  if (now >= nextBlinkAt + BLINK_MS) {
    nextBlinkAt = now + blinkGap();
  }
  draw(now);
}

window.addEventListener('message', (e: MessageEvent<HostMessage>) => {
  const msg = e.data;
  if (msg.type === 'settings') {
    if (msg.settings.coat !== settings.coat) {
      bitmaps.clear();
    }
    settings = msg.settings;
    resize();
  } else if (msg.type === 'reaction') {
    behavior.react(msg.reaction);
  } else if (msg.type === 'shown') {
    if (!introPending && behavior.state !== 'intro') {
      introPending = true;
      resize();
    }
  } else if (msg.type === 'giveTreat') {
    behavior.giveTreat((width / scale) * (0.2 + 0.6 * Math.random()));
  } else if (msg.type === 'spawnBall') {
    const x = (width / scale) * (0.2 + 0.6 * Math.random());
    const y = height / scale - BALL_SIZE - 2;
    behavior.spawnBall(x, y, (Math.random() < 0.5 ? -1 : 1) * SPAWN_SPEED * Math.random());
  }
});

canvas.addEventListener('mousedown', (e) => {
  pointer = { x: e.clientX, y: e.clientY, time: performance.now() };
  dragged = false;
  const p = toWorld(e.clientX, e.clientY);
  if (overBall(e.clientX, e.clientY)) {
    holding = 'ball';
    throwSamples = [];
    behavior.grabBall(p.x, p.y);
    sampleThrow(p);
  } else if (overTreat(e.clientX, e.clientY)) {
    holding = 'treat';
    behavior.grabTreat(p.x, p.y);
  } else if (zoneAt(e.clientX, e.clientY)) {
    pressedOnBuddy = { x: e.clientX, y: e.clientY };
    strokeDir = 0;
    strokeTravel = 0;
    strokeReversals = [];
    updateCursor(e.clientX, e.clientY);
    e.preventDefault();
    return;
  } else {
    return;
  }
  dragged = true;
  updateCursor(e.clientX, e.clientY);
  e.preventDefault();
});

window.addEventListener('mousemove', (e) => {
  pointer = { x: e.clientX, y: e.clientY, time: performance.now() };
  if (holding) {
    dragged = true;
    const p = toWorld(e.clientX, e.clientY);
    if (holding === 'ball') {
      behavior.moveHeldBall(p.x, p.y);
      sampleThrow(p);
    } else {
      behavior.moveHeldTreat(p.x, p.y);
    }
  } else if (pressedOnBuddy && (e.buttons & 1) !== 0) {
    if (Math.hypot(e.clientX - pressedOnBuddy.x, e.clientY - pressedOnBuddy.y) > CLICK_SLOP * scale) {
      dragged = true;
    }
    if (overBuddy(e.clientX, e.clientY)) {
      trackStroke(e.movementX);
    }
  }
  updateCursor(e.clientX, e.clientY);
});

window.addEventListener('mouseup', (e) => {
  pressedOnBuddy = undefined;
  if (holding) {
    releaseHeld(e.clientX, e.clientY);
  }
  updateCursor(e.clientX, e.clientY);
});

window.addEventListener('blur', () => {
  if (holding && pointer) {
    releaseHeld(pointer.x, pointer.y);
  }
});

// The webview stops receiving mouse events once the pointer leaves it, so let go of what is held there.
window.addEventListener('mouseout', (e) => {
  if (e.relatedTarget) {
    return;
  }
  pressedOnBuddy = undefined;
  if (holding) {
    releaseHeld(e.clientX, e.clientY, EXIT_THROW_SPEED);
  }
  pointer = undefined;
});

canvas.addEventListener('click', (e) => {
  if (dragged || behavior.state === 'petted') {
    return;
  }
  const zone = zoneAt(e.clientX, e.clientY);
  if (zone) {
    behavior.touch(zone);
  }
});

canvas.addEventListener('dblclick', (e) => {
  if (behavior.ball.state === 'none' && !overBuddy(e.clientX, e.clientY)) {
    const p = toWorld(e.clientX, e.clientY);
    behavior.spawnBall(p.x, p.y, 0);
  }
});

new ResizeObserver(resize).observe(canvas);
resize();
requestAnimationFrame(tick);
vscode.postMessage({ type: 'ready' });
