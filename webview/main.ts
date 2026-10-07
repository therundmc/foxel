import { clockAt, lightTint, partyKind } from '../shared/day';
import type { HostMessage, WebviewMessage } from '../shared/protocol';
import { Input } from './input';
import { Bitmaps } from './render/bitmaps';
import { Renderer } from './render/renderer';
import { Sky } from './render/sky';
import type { Session } from './session';
import { Buddy } from './sim/buddy';
import { spawnBall } from './sim/features/fetch';
import { startIntro } from './sim/features/intro';
import { fillBowl } from './sim/features/meals';
import { react } from './sim/features/reactions';
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
const SPAWN_SPEED = 40;

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
};
const renderer = new Renderer(stage, bitmaps, sky, session);
const input = new Input(stage, session);

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
    case 'confetti':
      sky.burst(stage, buddy.x + SPRITE_SIZE / 2);
      break;
    default:
      effect satisfies never;
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
    case 'reaction':
      if (!showcase.active) {
        react(buddy, msg.reaction);
      }
      break;
    case 'play':
      showcase.play(msg.scenes);
      break;
    case 'shown':
      if (!session.introPending && buddy.state !== 'intro') {
        session.introPending = true;
        resize();
      }
      break;
    case 'giveTreat':
      giveTreat(buddy, worldWidth * (0.2 + 0.6 * Math.random()));
      break;
    case 'fillBowl':
      fillBowl(buddy);
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
resize();
requestAnimationFrame(tick);
vscode.postMessage({ type: 'ready' });
