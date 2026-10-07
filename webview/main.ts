import { clockAt, lightTint, partyKind } from '../shared/day';
import type { HostMessage, WebviewMessage } from '../shared/protocol';
import { Input } from './input';
import { Bitmaps } from './render/bitmaps';
import { Renderer } from './render/renderer';
import { Sky } from './render/sky';
import type { Session } from './session';
import { Buddy } from './sim/buddy';
import { blowBubbles } from './sim/features/bubbles';
import { spawnBall } from './sim/features/fetch';
import { startIntro } from './sim/features/intro';
import { fillBowl } from './sim/features/meals';
import { react } from './sim/features/reactions';
import { recall, remember, sameMemory } from './sim/memory';
import { giveTreat } from './sim/features/treat';
import { Showcase } from './sim/showcase';
import { World, type Effect } from './sim/world';
import { SPRITE_SIZE } from './sprites/frames';
import { BALL_SIZE } from './sprites/props';
import { DEFAULT_SCALE, Stage } from './stage';

// Wires the view together: the simulation, what draws it, what the mouse does to it and what the extension says.

declare function acquireVsCodeApi(): {
  postMessage(msg: WebviewMessage): void;
};

const MAX_FRAME_DT_MS = 100;
const RESTFUL_FRAME_MS = 80;
/** Hidden for longer than this, the fox has been away: it comes back in from the edge. */
const AWAY_LONG_MS = 10 * 60_000;
const SPAWN_SPEED = 40;
const INTERACTION_EVERY_MS = 1000;

const vscode = acquireVsCodeApi();
const stage = new Stage(document.getElementById('stage') as HTMLCanvasElement);
const world = new World();
const buddy = new Buddy(world);
const sky = new Sky();
const showcase = new Showcase();
const bitmaps = new Bitmaps();
const session: Session = {
  world,
  buddy,
  settings: { scale: DEFAULT_SCALE, speed: 1, coat: 'red', dayNight: true, installedOn: '' },
  clock: new Date(),
  introPending: true,
  light: false,
};
const renderer = new Renderer(stage, bitmaps, sky, session);
const input = new Input(stage, session, onInteraction);

// Tells the extension the user is with the fox; once a second is plenty while they stroke it.
let toldAt = -Infinity;
function onInteraction(): void {
  const now = performance.now();
  if (now - toldAt >= INTERACTION_EVERY_MS) {
    toldAt = now;
    vscode.postMessage({ type: 'interaction' });
  }
}

function resize(): void {
  stage.fit(session.settings.scale);
  world.resize(Math.floor(stage.width / stage.scale), Math.floor(stage.height / stage.scale));
  if (session.introPending && buddy.maxX > 0) {
    session.introPending = false;
    startIntro(buddy);
  }
}

function updateClock(): void {
  const { settings } = session;
  const clock = clockAt(showcase.hour ?? settings.debugHour);
  session.clock = clock;
  const dayLife = settings.dayNight || showcase.active;
  world.setClock(clock, dayLife);
  if (showcase.active) {
    world.party = showcase.party ? 'friday' : undefined;
  } else {
    world.party = dayLife ? partyKind(clock, settings.installedOn) : undefined;
  }
  bitmaps.setTint(dayLife ? lightTint(clock) : 'day');
}

function onEffect(effect: Effect): void {
  switch (effect) {
    case 'fed':
      vscode.postMessage({ type: 'fed' });
      break;
    case 'played':
      vscode.postMessage({ type: 'played' });
      break;
    case 'confetti':
      sky.burst(stage, buddy.x + SPRITE_SIZE / 2);
      break;
    default:
      effect satisfies never;
  }
}

// The extension keeps what the fox carries over, for the next time the view is opened.
let saved = remember(buddy, Date.now());
function saveMemory(): void {
  const memory = remember(buddy, Date.now());
  if (!sameMemory(saved, memory)) {
    saved = memory;
    vscode.postMessage({ type: 'memory', memory });
  }
}

let last = performance.now();
function tick(now: number): void {
  requestAnimationFrame(tick);
  if (world.restful && !input.holding && !sky.busy && now - last < RESTFUL_FRAME_MS) {
    return;
  }
  const dt = Math.min(now - last, MAX_FRAME_DT_MS);
  last = now;
  updateClock();
  world.pointer = input.pointerAt(now);
  showcase.update(dt * session.settings.speed, buddy);
  world.update(dt * session.settings.speed);
  world.effects.splice(0).forEach(onEffect);
  saveMemory();
  renderer.blink(now);
  renderer.draw(now, dt);
}

function onMessage(msg: HostMessage): void {
  const worldWidth = stage.width / stage.scale;
  switch (msg.type) {
    case 'settings':
      bitmaps.setCoat(msg.settings.coat);
      session.settings = msg.settings;
      resize();
      break;
    case 'memory':
      recall(buddy, msg.memory, Date.now());
      break;
    case 'reaction':
      if (!showcase.active) {
        react(buddy, msg.reaction);
      }
      break;
    case 'play':
      showcase.play(msg.scenes);
      break;
    case 'shown':
      // Back after a moment, it is simply where you left it; after a long while, it makes its entrance again.
      if (performance.now() - last >= AWAY_LONG_MS && !session.introPending && buddy.state !== 'intro') {
        session.introPending = true;
        resize();
      }
      // The extension stops talking to a hidden view until it hears this again.
      vscode.postMessage({ type: 'ready' });
      break;
    case 'giveTreat':
      giveTreat(buddy, worldWidth * (0.2 + 0.6 * Math.random()));
      break;
    case 'fillBowl':
      fillBowl(buddy);
      break;
    case 'blowBubbles':
      blowBubbles(buddy);
      break;
    case 'spawnBall': {
      const x = worldWidth * (0.2 + 0.6 * Math.random());
      const y = stage.height / stage.scale - BALL_SIZE - 2;
      spawnBall(buddy, x, y, (Math.random() < 0.5 ? -1 : 1) * SPAWN_SPEED * Math.random());
      break;
    }
    default:
      // A message this version does not know is ignored; the compiler flags one it should know.
      msg satisfies never;
  }
}

window.addEventListener('message', (e: MessageEvent<HostMessage>) => onMessage(e.data));
new ResizeObserver(resize).observe(stage.canvas);

// The editor marks the body with its theme, and changes the mark when the theme changes.
function readTheme(): void {
  session.light = /\bvscode-(light|high-contrast-light)\b/.test(document.body.className);
  bitmaps.setLight(session.light);
}
new MutationObserver(readTheme).observe(document.body, { attributes: true, attributeFilter: ['class'] });
readTheme();
resize();
requestAnimationFrame(tick);
vscode.postMessage({ type: 'ready' });
