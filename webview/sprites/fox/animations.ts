import { WORK_ANIMATIONS } from './anims';
import type { Animation } from '../frames';
import {
  GALLOP_GATHER,
  GALLOP_LAND,
  GALLOP_PUSH,
  GALLOP_STRETCH,
  HOP_FLY,
  HOP_GATHER,
  HOP_KICK,
  HOP_LAND,
  RUN_GATHER,
  RUN_REACH,
  STEP_A,
  STEP_B,
  THUMP,
  TUCK,
  anim,
  type Pose,
} from './pose';
import { eatAnimation, nudgeAnimation, nuzzleAnimation, patAnimation, shakeAnimation, sleepAnimation } from './sequences';

// Timings the simulation needs to line its movement up with the frames below.
export const TWIRL_CROUCH_MS = 120;
export const TWIRL_AIR_MS = 600;
export const STARTLE_CROUCH_MS = 120;
export const STARTLE_AIR_MS = 420;
// Intro peek timeline: look around, duck back shyly, peek again, light up.
export const PEEK_LOOK_MS = 1100;
export const PEEK_DUCK_MS = 600;
export const PEEK_RETURN_MS = 220;
export const PEEK_HAPPY_MS = 800;
export const TOSS_FLICK_MS = 300;
export const TOSS_CATCH_MS = 450;
/** When the morning greeting starts waving (and shows the sun). */
export const MORNING_WAVE_MS = 2700;
export const KIBBLE_MS = 940;

export const JUMP_CROUCH_MS = 120;
export const JUMP_AIR_MS = 480;
export const JUMP_LAND_MS = 120;

const SIT = { body: 'sit' } as const;
const BEHIND = { body: 'behind' } as const;
const FRONT = { body: 'front' } as const;

const EAT = eatAnimation();
/** Where to pick the eat animation back up for a treat already eaten down to a given TREAT_STAGES index. */
export const EAT_RESUME_MS: readonly number[] = EAT.resumeAt;

/** Every animation the fox has. Add one here and its name becomes a valid `AnimName`. */
export const ANIMATIONS = {
  idle: anim([
    [{ tail: 'up' }, 700],
    [{ tail: 'wagL' }, 400],
    [{ tail: 'up' }, 400],
    [{ tail: 'wagR' }, 400],
    [{ tail: 'up', bob: 1 }, 700],
  ]),
  walk: anim([
    [{ legs: STEP_A, tail: 'wagL' }, 210],
    [{ bob: 1 }, 210],
    [{ legs: STEP_B, tail: 'wagR' }, 210],
    [{ bob: 1 }, 210],
  ]),
  // The head stays level while the body bounces under it, so the ears never leave the sprite.
  run: anim([
    [{ legs: HOP_KICK, bob: -1, pitch: -1, head: [1, 2], tail: 'streamB', eye: 'happy', mouth: 'tongue' }, 90],
    [{ legs: HOP_FLY, bob: -2, head: [1, 2], tail: 'flat', eye: 'happy', mouth: 'open' }, 110],
    [{ legs: HOP_LAND, pitch: 1, head: [1, 0], tail: 'streamA', eye: 'happy', mouth: 'tongue' }, 80],
    [{ legs: HOP_GATHER, bob: 1, head: [0, -1], tail: 'streamB', eye: 'happy', mouth: 'tongue' }, 90],
  ]),
  jump: anim([
    [{ bob: 1, mouth: 'open' }, JUMP_CROUCH_MS],
    [{ legs: TUCK, eye: 'happy', mouth: 'open' }, JUMP_AIR_MS],
    [{ bob: 1, tail: 'wagL' }, JUMP_LAND_MS],
  ]),
  sit: anim([
    [{ ...SIT, tail: 'sitA' }, 900],
    [{ ...SIT, tail: 'sitB' }, 900],
  ]),
  groom: anim([
    [{ ...SIT, paw: 'lick', eye: 'closed', mouth: 'tongue', head: [0, 1] }, 260],
    [{ ...SIT, paw: 'lick', eye: 'closed', mouth: 'smile', head: [0, 2] }, 260],
  ]),
  stretch: anim([
    [{ body: 'bow', eye: 'closed', mouth: 'open' }, 700],
    [{ body: 'bow', eye: 'closed', mouth: 'open', head: [0, -1] }, 700],
    [{ eye: 'happy' }, 300],
  ]),
  // Pulling its basket in by the rim, backing up as it comes; and pushing it away with its head, twice.
  tug: anim([
    [{ body: 'bow', head: [1, 3], eye: 'closed', tail: 'high' }, 260],
    [{ body: 'bow', bob: 1, head: [-1, 2], eye: 'closed', tail: 'highL' }, 240],
    [{ body: 'bow', head: [1, 3], eye: 'closed', tail: 'high' }, 260],
    [{ body: 'bow', bob: 1, head: [-1, 2], eye: 'closed', tail: 'highR' }, 240],
    [{ eye: 'sleepy', tail: 'wagL' }, 240],
  ]),
  shove: anim([
    [{ head: [-1, 0], eye: 'closed', ears: 'back' }, 200],
    [{ legs: STEP_A, head: [2, 2], eye: 'closed', ears: 'back', tail: 'up' }, 240],
    [{ eye: 'open' }, 160],
    [{ head: [-1, 0], eye: 'closed', ears: 'back' }, 200],
    [{ legs: STEP_B, head: [2, 2], eye: 'closed', ears: 'back', tail: 'up' }, 240],
    [{ eye: 'happy', tail: 'wagL' }, 280],
    [{ eye: 'happy', tail: 'wagR' }, 280],
  ]),
  // Soap bubbles: looking up at them, jumping nose first at one, sneezing at the soap, and holding the last one on its nose.
  bubbleWatch: anim([
    [{ head: [0, -1], eye: 'up', mouth: 'open', tail: 'wagL' }, 200],
    [{ head: [0, -1], eye: 'up', mouth: 'open', tail: 'wagR' }, 200],
  ]),
  popLeap: anim([
    [{ legs: RUN_REACH, head: [1, -1], eye: 'up', mouth: 'open', tail: 'flat' }, 150],
    [{ legs: TUCK, head: [1, -2], eye: 'up', mouth: 'open', snoutUp: 1, tail: 'up' }, 330],
  ]),
  sneeze: anim([
    [{ head: [-1, -1], eye: 'closed', ears: 'back', mouth: 'open' }, 240],
    [{ bob: 1, head: [1, 2], eye: 'closed', ears: 'back', mouth: 'open', extras: ['sniffB'] }, 150],
    [{ head: [0, 1], eye: 'closed' }, 160],
    [{ eye: 'happy', tail: 'wagL' }, 220],
  ]),
  // The other ways it bursts them: snapping at one (and the face it pulls at the taste), batting one with a
  // paw, whipping its tail up through one, and jumping curled into a spinning ball.
  chomp: anim([
    [{ head: [-1, 0], eye: 'wide', mouth: 'open' }, 150],
    [{ head: [2, 0], eye: 'closed', mouth: 'flat', tail: 'up' }, 190],
    [{ eye: 'wide', mouth: 'flat' }, 180],
  ]),
  bleh: anim([
    [{ eye: 'closed', mouth: 'blep', ears: 'back' }, 420],
    [{ head: [0, 1], eye: 'closed', mouth: 'blep', ears: 'back' }, 200],
    [{ eye: 'happy', mouth: 'blep', tail: 'wagL' }, 220],
  ]),
  swat: anim([
    [{ ...SIT, eye: 'up', tail: 'sitA' }, 140],
    [{ ...SIT, paw: 'beg', eye: 'wide', tail: 'sitB' }, 160],
    [{ ...SIT, paw: 'wave2', eye: 'happy', mouth: 'open', tail: 'sitA' }, 180],
    [{ ...SIT, paw: 'wave1', eye: 'happy', mouth: 'open', tail: 'sitB' }, 160],
    [{ ...SIT, eye: 'happy', tail: 'sitA' }, 180],
  ]),
  tailWhip: anim([
    [{ head: [-1, 0], eye: 'up', tail: 'wagL' }, 130],
    [{ bob: 1, head: [-1, 1], eye: 'closed', tail: 'flat' }, 130],
    [{ eye: 'happy', mouth: 'open', tail: 'high' }, 120],
    [{ eye: 'happy', mouth: 'open', tail: 'highL' }, 110],
    [{ eye: 'happy', mouth: 'open', tail: 'highR' }, 110],
    [{ eye: 'happy', mouth: 'open', tail: 'highL' }, 110],
    [{ eye: 'happy', tail: 'wagR' }, 170],
  ]),
  spinBall: anim([
    [{ bob: 2, eye: 'closed', tail: 'flat' }, 140],
    [{ legs: TUCK, head: [-1, 2], eye: 'closed', tail: 'flat' }, 620],
    [{ bob: 1, eye: 'dizzy', tail: 'poof' }, 220],
    [{ eye: 'happy', tail: 'wagL', extras: ['sparkleA'] }, 240],
  ]),
  bubbleNose: anim([
    [{ ...SIT, snoutUp: 1, eye: 'up', tail: 'sitA' }, 420],
    [{ ...SIT, snoutUp: 1, eye: 'up', tail: 'sitB' }, 420],
  ]),
  // Sitting by its empty bowl: it looks at it, lifts a paw, and bats it away.
  bat: anim([
    [{ ...SIT, eye: 'down', tail: 'sitA' }, 260],
    [{ ...SIT, paw: 'beg', eye: 'down', tail: 'sitB' }, 200],
    [{ ...SIT, paw: 'tapNear', eye: 'closed', head: [1, 1], tail: 'sitA' }, 180],
    [{ ...SIT, eye: 'happy', tail: 'sitB' }, 280],
    [{ ...SIT, eye: 'happy', tail: 'sitA' }, 280],
  ]),
  yawn: anim([
    [SIT, 300],
    [{ ...SIT, eye: 'closed', mouth: 'open', head: [0, -1] }, 900],
    [{ ...SIT, eye: 'closed' }, 300],
  ]),
  sniff: anim([
    [{ legs: STEP_A, head: [1, 4], eye: 'down', extras: ['sniffA'] }, 300],
    [{ head: [1, 5], eye: 'down', extras: ['sniffB'] }, 300],
    [{ legs: STEP_B, head: [1, 4], eye: 'down' }, 300],
    [{ head: [1, 5], eye: 'down' }, 300],
  ]),
  chaseTail: anim([
    [{ legs: RUN_REACH, tail: 'wagR', eye: 'happy', mouth: 'open', head: [-1, 1] }, 110],
    [{ legs: RUN_GATHER, bob: -1, tail: 'wagL', eye: 'happy', mouth: 'open', head: [-1, 1] }, 110],
  ]),
  lookAround: anim([
    [{ extras: ['question'] }, 600],
    [{ head: [0, -1], extras: ['question'] }, 600],
  ]),
  sleep: sleepAnimation(),
  sleepSunrise: sleepAnimation('dreamSun'),
  sleepClouds: sleepAnimation('dreamPeak'),
  sleepSunset: sleepAnimation('dreamDusk'),
  sleepStars: sleepAnimation('dreamStars'),
  sleepRain: sleepAnimation('dreamLeaf'),
  sleepSnow: sleepAnimation('dreamLights'),
  sleepDunes: sleepAnimation('dreamWorm'),
  sleepBlossom: sleepAnimation('dreamBlossom'),
  sleepWheat: sleepAnimation('dreamWheat'),
  sleepTrain: sleepAnimation('dreamTrain'),
  sleepFireflies: sleepAnimation('dreamFirefly'),
  typing: anim([
    [{ ...SIT, paw: 'tapNear', eye: 'down', mouth: 'flat' }, 180],
    [{ ...SIT, paw: 'tapFar', eye: 'down', mouth: 'flat' }, 180],
  ]),
  wave: anim([
    [{ ...SIT, paw: 'wave1', eye: 'happy', mouth: 'open' }, 220],
    [{ ...SIT, paw: 'wave2', eye: 'happy', mouth: 'open' }, 220],
  ]),
  love: anim([
    [{ ...SIT, eye: 'happy', tail: 'sitA', extras: ['heartsA'] }, 300],
    [{ ...SIT, bob: 1, eye: 'happy', tail: 'sitB', extras: ['heartsB'] }, 300],
  ]),
  celebrate: anim([
    [{ legs: TUCK, tail: 'wagL', eye: 'happy', mouth: 'open', extras: ['sparkleA'] }, 180],
    [{ bob: 1, tail: 'wagR', eye: 'happy', mouth: 'open', extras: ['sparkleB'] }, 180],
  ]),
  panic: anim(
    (
      [
        [GALLOP_STRETCH, -1],
        [GALLOP_LAND, 0],
        [GALLOP_GATHER, -1],
        [GALLOP_PUSH, 0],
      ] as const
    ).map(([legs, bob]) => [
      { legs, bob, tail: 'flat', ears: 'back', eye: 'wide', mouth: 'open', extras: ['sweat'] },
      70,
    ]),
  ),
  dizzy: anim([
    [{ eye: 'dizzy', mouth: 'tongue', head: [-1, 0], extras: ['starsA'] }, 250],
    [{ eye: 'dizzy', mouth: 'tongue', head: [1, 1], bob: 1, extras: ['starsB'] }, 250],
  ]),
  carry: anim([
    [{ legs: STEP_A, tail: 'wagL', ball: true }, 150],
    [{ bob: 1, ball: true }, 150],
    [{ legs: STEP_B, tail: 'wagR', ball: true }, 150],
    [{ bob: 1, ball: true }, 150],
  ]),
  pounce: anim([
    [{ body: 'bow', eye: 'happy', mouth: 'open' }, 200],
    [{ legs: TUCK, tail: 'wagR', eye: 'happy', mouth: 'open', head: [1, 1] }, 200],
  ]),
  lie: anim([
    [{ body: 'lie', tail: 'sitA' }, 1400],
    [{ body: 'lie', bob: 1, tail: 'sitB' }, 1400],
  ]),
  alert: anim([[{ head: [0, -1], tail: 'up', extras: ['bang'] }, 500]]),
  stalk: anim([
    [{ bob: 2, head: [1, 1], tail: 'flat', legs: STEP_A, mouth: 'flat' }, 340],
    [{ bob: 2, head: [1, 1], tail: 'flat', mouth: 'flat' }, 340],
    [{ bob: 2, head: [1, 1], tail: 'flat', legs: STEP_B, mouth: 'flat' }, 340],
    [{ bob: 2, head: [1, 1], tail: 'flat', mouth: 'flat' }, 340],
  ]),
  wiggle: anim([
    [{ body: 'bow', tail: 'highL', mouth: 'flat' }, 110],
    [{ body: 'bow', bob: 1, tail: 'highR', mouth: 'flat' }, 110],
  ]),
  leap: anim([
    [{ legs: RUN_REACH, head: [1, -1], tail: 'flat', mouth: 'open' }, 200],
    [{ legs: TUCK, head: [1, -1], tail: 'flat', mouth: 'open' }, 400],
  ]),
  snatch: anim([[{ legs: TUCK, head: [1, -1], tail: 'wagR', eye: 'happy', ball: true }, 600]]),
  proud: anim([
    [{ ...SIT, eye: 'happy', tail: 'sitA', extras: ['sparkleA'] }, 350],
    [{ ...SIT, eye: 'happy', tail: 'sitB', extras: ['sparkleB'] }, 350],
  ]),
  puzzled: anim([
    [{ ...SIT, head: [0, 1], extras: ['question'] }, 700],
    [{ ...SIT, head: [-1, 1], extras: ['question'] }, 700],
  ]),
  sad: anim([
    [{ ...SIT, ears: 'back', eye: 'down', mouth: 'flat', head: [0, 2] }, 900],
    [{ ...SIT, ears: 'back', eye: 'down', mouth: 'flat', head: [0, 2], bob: 1 }, 900],
  ]),
  petted: anim([
    [{ ...SIT, eye: 'happy', head: [0, 1], tail: 'sitA', extras: ['smallHeartA'] }, 350],
    [{ ...SIT, eye: 'happy', head: [0, 1], bob: 1, tail: 'sitB', extras: ['smallHeartB'] }, 350],
  ]),
  cuddle: anim([
    [{ body: 'lie', eye: 'happy', tail: 'sitA', extras: ['heartsA'] }, 450],
    [{ body: 'lie', eye: 'happy', bob: 1, tail: 'sitB', extras: ['heartsB'] }, 450],
  ]),
  nudge: nudgeAnimation('sit', 1),
  nudgeBack: nudgeAnimation('sit', -1),
  nudgeLie: nudgeAnimation('lie', 1),
  nudgeLieBack: nudgeAnimation('lie', -1),
  watch: anim([
    [{ ...SIT, tail: 'sitA', mouth: 'tongue' }, 160],
    [{ ...SIT, tail: 'sitB', mouth: 'tongue', bob: 1 }, 160],
  ]),
  ready: anim([
    [{ tail: 'wagL', mouth: 'tongue' }, 180],
    [{ tail: 'wagR', mouth: 'tongue' }, 180],
  ]),
  boop: anim([
    [{ eye: 'closed', ears: 'back', head: [-1, 0] }, 180],
    [{ eye: 'closed', ears: 'back', mouth: 'open', head: [1, 1], extras: ['sniffB'] }, 240],
    [{ eye: 'happy', tail: 'wagL' }, 300],
    [{ eye: 'happy', tail: 'wagR' }, 300],
  ]),
  eat: EAT.animation,
  beg: anim([
    [{ ...SIT, mouth: 'tongue', tail: 'sitA' }, 240],
    [{ ...SIT, mouth: 'tongue', tail: 'sitB', paw: 'beg', head: [1, 0] }, 200],
    [{ ...SIT, mouth: 'tongue', tail: 'sitA', paw: 'beg', head: [1, 0] }, 200],
    [{ ...SIT, mouth: 'tongue', tail: 'sitB' }, 240],
  ]),
  pat: patAnimation('sit'),
  patLie: patAnimation('lie'),
  scratch: anim([
    [{ eye: 'happy', mouth: 'tongue', tail: 'wagL', head: [0, 1] }, 160],
    [{ eye: 'happy', mouth: 'tongue', tail: 'wagR', legs: THUMP, head: [0, 1] }, 120],
    [{ eye: 'happy', mouth: 'tongue', tail: 'wagL', head: [0, 1], bob: 1 }, 120],
    [{ eye: 'happy', mouth: 'tongue', tail: 'wagR', legs: THUMP, head: [0, 1] }, 120],
    [{ eye: 'happy', mouth: 'tongue', tail: 'wagL', head: [0, 1], bob: 1 }, 120],
    [{ eye: 'happy', mouth: 'tongue', tail: 'wagR', legs: THUMP, head: [0, 1] }, 120],
    [{ eye: 'happy', mouth: 'open', tail: 'up', extras: ['smallHeartA'] }, 300],
    [{ eye: 'happy', tail: 'wagL', extras: ['smallHeartB'] }, 300],
  ]),
  shake: anim([
    [{ ...SIT, tail: 'sitA' }, 220],
    [{ ...SIT, paw: 'wave1', tail: 'sitB' }, 420],
    [{ ...SIT, paw: 'wave1', head: [0, 1], eye: 'happy', tail: 'sitA' }, 260],
    [{ ...SIT, paw: 'wave2', eye: 'happy', mouth: 'open', tail: 'sitB' }, 220],
    [{ ...SIT, paw: 'wave1', head: [0, 1], eye: 'happy', tail: 'sitA' }, 260],
    [{ ...SIT, eye: 'happy', tail: 'sitB', extras: ['smallHeartA'] }, 400],
  ]),
  blep: anim([
    [{ mouth: 'flat' }, 160],
    [{ mouth: 'blep' }, 900],
    [{ eye: 'happy', mouth: 'blep', tail: 'wagL' }, 300],
    [{ eye: 'happy', tail: 'wagR' }, 300],
  ]),
  lick: anim([
    [{ head: [1, -1], eye: 'happy', mouth: 'open' }, 140],
    [{ head: [1, -1], eye: 'happy', mouth: 'tongue', tail: 'wagL' }, 160],
    [{ head: [1, 0], eye: 'happy', mouth: 'open' }, 140],
    [{ head: [1, -1], eye: 'happy', mouth: 'tongue', tail: 'wagR' }, 160],
    [{ head: [1, 0], eye: 'happy', mouth: 'open' }, 140],
    [{ eye: 'happy', tail: 'wagL', extras: ['smallHeartA'] }, 420],
  ]),
  nuzzle: nuzzleAnimation('stand'),
  nuzzleLie: nuzzleAnimation('lie'),
  tilt: anim([
    [{ head: [-1, 1], mouth: 'flat', extras: ['question'] }, 520],
    [{ mouth: 'flat', extras: ['question'] }, 140],
    [{ head: [1, 1], extras: ['question'] }, 520],
    [{ eye: 'happy', tail: 'wagL' }, 200],
    [{ eye: 'happy', tail: 'wagR' }, 200],
  ]),
  playBow: anim(
    Array.from({ length: 8 }, (_, i) => [
      { body: 'bow', eye: 'happy', mouth: 'open', tail: i % 2 ? 'highR' : 'highL', bob: i % 2 },
      110,
    ]),
  ),
  flop: anim([
    [{ bob: 1, eye: 'happy', mouth: 'open' }, 160],
    [{ body: 'lie', eye: 'happy', mouth: 'open', tail: 'sitA' }, 300],
    [{ body: 'lie', eye: 'happy', mouth: 'tongue', tail: 'sitB', bob: 1, extras: ['heartsA'] }, 450],
    [{ body: 'lie', eye: 'happy', mouth: 'tongue', tail: 'sitA', extras: ['heartsB'] }, 450],
  ]),
  highFive: anim([
    [{ ...SIT, tail: 'sitA' }, 150],
    [{ ...SIT, paw: 'wave2', eye: 'wide', mouth: 'open', tail: 'sitB' }, 260],
    [{ ...SIT, paw: 'wave2', eye: 'happy', mouth: 'open', tail: 'sitA', extras: ['sparkleA'] }, 380],
    [{ ...SIT, paw: 'wave2', eye: 'happy', tail: 'sitB', extras: ['sparkleB'] }, 380],
    [{ ...SIT, eye: 'happy', tail: 'sitA' }, 300],
  ]),
  twirl: anim([
    [{ bob: 1, eye: 'happy', mouth: 'open', tail: 'wagL' }, TWIRL_CROUCH_MS],
    [{ legs: TUCK, eye: 'happy', mouth: 'open', tail: 'wagR' }, TWIRL_AIR_MS],
    [{ bob: 1, eye: 'happy', tail: 'up', extras: ['sparkleA'] }, 200],
    [{ eye: 'happy', tail: 'wagL', extras: ['sparkleB'] }, 320],
  ]),
  startle: anim([
    [{ bob: 1, eye: 'wide', mouth: 'flat' }, STARTLE_CROUCH_MS],
    [{ legs: TUCK, eye: 'wide', mouth: 'open', tail: 'poof', extras: ['bang'] }, STARTLE_AIR_MS],
    [{ bob: 1, eye: 'wide', tail: 'poof' }, 180],
    [{ tail: 'poof', extras: ['question'] }, 520],
    [{ eye: 'happy', tail: 'wagL' }, 300],
  ]),
  tailPoof: anim([
    [{ tail: 'poof', eye: 'wide', mouth: 'flat' }, 420],
    [{ tail: 'poof', mouth: 'smile', extras: ['sparkleA'] }, 420],
    [{ tail: 'wagL', eye: 'happy' }, 180],
    [{ tail: 'wagR', eye: 'happy' }, 180],
    [{ tail: 'wagL', eye: 'happy' }, 180],
    [{ tail: 'wagR', eye: 'happy' }, 180],
  ]),
  peek: anim([
    [{ head: [0, 1], mouth: 'flat' }, 500],
    [{}, PEEK_LOOK_MS - 500],
    [{ head: [-1, 1], eye: 'closed', mouth: 'flat' }, PEEK_DUCK_MS],
    [{}, PEEK_RETURN_MS],
    [{ head: [1, 0], eye: 'happy', mouth: 'open', extras: ['sparkleB'] }, PEEK_HAPPY_MS],
  ]),
  // Flicks the ball onto its nose, sits up with a paw tucked like a seal and sways gently to keep it there.
  balance: anim([
    [{ ...SIT, ball: true, tail: 'sitA' }, 240],
    [{ ...SIT, head: [0, 1], ball: true, tail: 'sitB' }, 140],
    [{ ...SIT, ballAt: [7, -8], eye: 'up', mouth: 'open', snoutUp: 1, paw: 'beg', tail: 'sitA' }, 150],
    [{ ...SIT, ballAt: [7, -3.6], eye: 'up', snoutUp: 1, paw: 'beg', tail: 'sitB' }, 280],
    [{ ...SIT, head: [-1, 0], ballAt: [7.5, -3.6], eye: 'up', snoutUp: 1, paw: 'beg', tail: 'sitA' }, 260],
    [{ ...SIT, ballAt: [7, -3.6], eye: 'up', snoutUp: 1, paw: 'beg', tail: 'sitB' }, 220],
    [{ ...SIT, head: [1, 0], ballAt: [6.5, -3.6], eye: 'up', snoutUp: 1, paw: 'beg', tail: 'sitA' }, 260],
    [{ ...SIT, ballAt: [7, -3.6], eye: 'up', snoutUp: 1, paw: 'beg', tail: 'sitB' }, 220],
    [{ ...SIT, head: [-1, 0], ballAt: [7.5, -3.6], eye: 'up', snoutUp: 1, paw: 'beg', tail: 'sitA' }, 260],
    [{ ...SIT, ballAt: [7, -3.6], eye: 'up', snoutUp: 1, paw: 'beg', tail: 'sitB' }, 220],
    [{ ...SIT, head: [1, 0], ballAt: [6.5, -3.6], eye: 'up', snoutUp: 1, paw: 'beg', tail: 'sitA' }, 260],
    [{ ...SIT, ballAt: [7, -3.6], eye: 'up', snoutUp: 1, paw: 'beg', tail: 'sitB', extras: ['sparkleA'] }, 320],
    [{ ...SIT, ballAt: [7, -3.6], eye: 'up', snoutUp: 1, paw: 'beg', tail: 'sitA', extras: ['sparkleB'] }, 320],
    [{ ...SIT, head: [0, 1], ballAt: [7, -8], eye: 'up', mouth: 'open', tail: 'sitB' }, 160],
    [{ ...SIT, ballAt: [6, -2], eye: 'up', mouth: 'open', tail: 'sitA' }, 100],
    [{ ...SIT, head: [0, 1], ball: true, eye: 'happy', tail: 'sitB' }, 200],
    [{ ...SIT, ball: true, eye: 'happy', tail: 'sitA', extras: ['smallHeartA'] }, 450],
  ]),
  // Toss: flick the ball up (the world ball flies), watch it, catch it.
  tossFlick: anim([
    [{ ball: true, tail: 'wagL' }, 160],
    [{ head: [1, 1], ball: true, tail: 'wagR', bob: 1 }, TOSS_FLICK_MS - 160],
  ]),
  tossWait: anim([
    [{ eye: 'up', mouth: 'open', tail: 'wagL' }, 140],
    [{ eye: 'up', mouth: 'open', tail: 'wagR' }, 140],
  ]),
  tossCatch: anim([
    [{ head: [0, 1], ball: true, eye: 'happy', bob: 1 }, 160],
    [{ ball: true, eye: 'happy', tail: 'wagL', extras: ['sparkleA'] }, TOSS_CATCH_MS - 160],
  ]),
  // Drops the ball between its paws, nudges it back and forth with its nose, then snaps it up.
  pawPlay: anim([
    [{ body: 'bow', ball: true, eye: 'happy' }, 220],
    [{ body: 'lie', ballGround: 27.5, eye: 'down', tail: 'sitA' }, 300],
    [{ body: 'lie', head: [1, 1], ballGround: 28.5, eye: 'happy', mouth: 'open', tail: 'sitB' }, 200],
    [{ body: 'lie', head: [0, 1], ballGround: 26.5, eye: 'down', tail: 'sitA' }, 220],
    [{ body: 'lie', head: [1, 1], ballGround: 28.5, eye: 'happy', mouth: 'open', tail: 'sitB' }, 200],
    [{ body: 'lie', head: [0, 1], ballGround: 25.5, eye: 'down', tail: 'sitA' }, 240],
    [{ body: 'lie', head: [0, 1], ballGround: 25.5, eye: 'happy', tail: 'sitB', extras: ['smallHeartA'] }, 300],
    [{ body: 'lie', head: [1, 2], ballGround: 26.5, eye: 'closed', mouth: 'open', tail: 'sitA' }, 180],
    [{ body: 'lie', ball: true, eye: 'happy', tail: 'sitB' }, 300],
    [{ ball: true, eye: 'happy', tail: 'wagL' }, 260],
  ]),
  // Post-lunch dip: nods off sitting up, jerks awake, nods off again.
  doze: anim([
    [{ ...SIT, eye: 'sleepy', tail: 'sitA' }, 900],
    [{ ...SIT, eye: 'sleepy', head: [0, 1], tail: 'sitB' }, 700],
    [{ ...SIT, eye: 'closed', head: [0, 2], tail: 'sitA' }, 1100],
    [{ ...SIT, eye: 'wide', tail: 'sitB' }, 180],
    [{ ...SIT, eye: 'sleepy', tail: 'sitA' }, 900],
  ]),
  morning: anim([
    [{ body: 'bow', eye: 'closed', mouth: 'open' }, 600],
    [{ body: 'bow', eye: 'closed', mouth: 'open', head: [0, -1] }, 500],
    [{ eye: 'happy' }, 250],
    [{ ...SIT, eye: 'sleepy' }, 220],
    [{ ...SIT, eye: 'closed', mouth: 'open', head: [0, -1] }, 800],
    [{ ...SIT, eye: 'closed' }, MORNING_WAVE_MS - 2370],
    [{ ...SIT, paw: 'wave1', eye: 'happy', mouth: 'open', tail: 'sitA' }, 220],
    [{ ...SIT, paw: 'wave2', eye: 'happy', mouth: 'open', tail: 'sitB' }, 220],
    [{ ...SIT, paw: 'wave1', eye: 'happy', mouth: 'open', tail: 'sitA' }, 220],
    [{ ...SIT, paw: 'wave2', eye: 'happy', mouth: 'open', tail: 'sitB' }, 220],
    [{ ...SIT, eye: 'happy', tail: 'sitA' }, 500],
  ]),
  goodNight: anim([
    [{ ...SIT, eye: 'sleepy', tail: 'sitA' }, 300],
    [{ ...SIT, paw: 'wave1', eye: 'sleepy', tail: 'sitB' }, 260],
    [{ ...SIT, paw: 'wave2', eye: 'sleepy', tail: 'sitA' }, 260],
    [{ ...SIT, paw: 'wave1', eye: 'sleepy', tail: 'sitB' }, 260],
    [{ ...SIT, eye: 'closed', mouth: 'open', head: [0, -1], tail: 'sitA' }, 900],
    [{ ...SIT, eye: 'sleepy', tail: 'sitB' }, 500],
  ]),
  // Sits by the empty bowl with a rumbling tummy, nudges the bowl, then looks up at you.
  hungry: anim([
    [{ ...SIT, mouth: 'flat', tail: 'sitA', extras: ['rumbleA'] }, 450],
    [{ ...SIT, mouth: 'flat', tail: 'sitB', extras: ['rumbleB'] }, 450],
    [{ ...SIT, mouth: 'flat', tail: 'sitA' }, 1300],
    [{ body: 'bow', head: [1, 2], eye: 'down', mouth: 'flat' }, 300],
    [{ body: 'bow', head: [2, 3], eye: 'down', mouth: 'flat' }, 260],
    [{ body: 'bow', head: [1, 2], eye: 'down', mouth: 'flat' }, 260],
    [{ ...SIT, mouth: 'flat', tail: 'sitB' }, 1500],
  ]),
  hungrySad: anim([
    [{ ...SIT, ears: 'back', eye: 'down', mouth: 'flat', head: [0, 1], tail: 'sitA' }, 1300],
    [{ ...SIT, ears: 'back', eye: 'down', mouth: 'flat', head: [0, 1], tail: 'sitB', extras: ['rumbleA'] }, 1300],
  ]),
  // One kibble per loop.
  eatBowl: anim([
    [{ head: [1, 4], eye: 'closed', mouth: 'open', tail: 'wagL' }, 220],
    [{ head: [1, 5], eye: 'closed', mouth: 'flat', tail: 'wagR' }, 220],
    [{ head: [1, 3], eye: 'happy', mouth: 'open', tail: 'wagL' }, 230],
    [{ head: [1, 3], eye: 'happy', mouth: 'flat', tail: 'wagR' }, KIBBLE_MS - 670],
  ]),
  drink: anim([
    [{ head: [1, 5], eye: 'closed', mouth: 'tongue', tail: 'wagL' }, 170],
    [{ head: [1, 4], eye: 'closed', mouth: 'flat', tail: 'wagR' }, 170],
  ]),
  drowsy: anim([
    [{ ...SIT, eye: 'sleepy', tail: 'sitA' }, 1200],
    [{ ...SIT, eye: 'closed', mouth: 'open', head: [0, -1], tail: 'sitB' }, 900],
    [{ ...SIT, eye: 'sleepy', tail: 'sitA', bob: 1 }, 1500],
  ]),
  typingSleepy: anim([
    [{ ...SIT, paw: 'tapNear', eye: 'sleepy', mouth: 'flat' }, 320],
    [{ ...SIT, paw: 'tapFar', eye: 'sleepy', mouth: 'flat' }, 320],
  ]),
  // Comes right up to the glass of its view, facing us: it rubs it with both front paws, gives it a few licks and is proud of the shine.
  glass: anim([
    [{ ...SIT, tail: 'sitA' }, 350],
    [{ ...FRONT, tail: 'frontA' }, 600],
    [{ ...FRONT, head: [0, 1], tail: 'frontB' }, 350],
    [{ ...FRONT, pads: [0, 0], tail: 'frontA' }, 400],
    ...Array.from({ length: 4 }, (): [Pose, number][] => [
      [{ ...FRONT, pads: [2, 0], eye: 'closed', tail: 'frontB' }, 150],
      [{ ...FRONT, pads: [0, 2], eye: 'closed', tail: 'frontA' }, 150],
    ]).flat(),
    [{ ...FRONT, pads: [1, 1], tail: 'frontA' }, 450],
    ...Array.from({ length: 4 }, (): [Pose, number][] => [
      [{ ...FRONT, pads: [1, 1], eye: 'happy', lick: 3, tail: 'frontB' }, 170],
      [{ ...FRONT, pads: [1, 1], eye: 'happy', lick: 2, head: [0, -1], tail: 'frontA' }, 170],
    ]).flat(),
    [{ ...FRONT, pads: [1, 1], eye: 'happy', tail: 'frontB', extras: ['sparkleA'] }, 420],
    [{ ...FRONT, pads: [1, 1], eye: 'happy', tail: 'frontA', extras: ['sparkleB'] }, 420],
    [{ ...FRONT, eye: 'happy', tail: 'frontB' }, 500],
    [{ ...SIT, eye: 'happy', tail: 'sitA' }, 350],
  ]),
  // Digs with its front paws, stops to look at the hole, digs some more and is rather pleased.
  dig: anim([
    ...Array.from({ length: 4 }, (): [Pose, number][] => [
      [{ body: 'bow', head: [1, 3], eye: 'down', mouth: 'flat', tail: 'highL', extras: ['dirtA'] }, 110],
      [{ body: 'bow', bob: 1, head: [1, 4], eye: 'down', mouth: 'flat', tail: 'highR', extras: ['dirtB'] }, 110],
    ]).flat(),
    [{ body: 'bow', head: [0, 1], eye: 'wide', tail: 'high' }, 420],
    ...Array.from({ length: 4 }, (): [Pose, number][] => [
      [{ body: 'bow', head: [1, 3], eye: 'down', mouth: 'flat', tail: 'highL', extras: ['dirtA'] }, 110],
      [{ body: 'bow', bob: 1, head: [1, 4], eye: 'down', mouth: 'flat', tail: 'highR', extras: ['dirtB'] }, 110],
    ]).flat(),
    [{ ...SIT, eye: 'happy', mouth: 'tongue', tail: 'sitA', extras: ['sparkleA'] }, 450],
    [{ ...SIT, eye: 'happy', mouth: 'tongue', tail: 'sitB', extras: ['sparkleB'] }, 450],
  ]),
  // Before a sky worth watching: it sits, pricks its ears, looks up, shuts its eyes and breathes it in.
  gazePrelude: anim([
    [{ ...SIT, tail: 'sitA' }, 900],
    [{ ...SIT, ears: 'back', tail: 'sitA' }, 150],
    [{ ...SIT, tail: 'sitA' }, 260],
    [{ ...SIT, ears: 'back', tail: 'sitB' }, 150],
    [{ ...SIT, eye: 'up', tail: 'sitB' }, 1300],
    [{ ...SIT, eye: 'up', head: [0, -1], tail: 'sitA' }, 900],
    [{ ...SIT, eye: 'closed', head: [0, -1], tail: 'sitA' }, 1100],
    [{ ...SIT, eye: 'closed', tail: 'sitB', bob: 1 }, 1200],
    [{ ...SIT, eye: 'happy', tail: 'sitA' }, 900],
  ]),
  // It turns away: first its head, then all of it, and its tail settles behind it.
  gazeTurn: anim([
    [{ ...SIT, away: true, tail: 'sitA' }, 420],
    [{ ...SIT, away: true, head: [-2, 0], tail: 'sitB' }, 380],
    [{ ...BEHIND, tail: 'behindMidL' }, 420],
    [{ ...BEHIND, tail: 'behindMidR' }, 380],
  ]),
  // Lost in the sky, its back to us: it breathes slowly, its head drifts and its tail sweeps the ground behind it.
  gaze: anim([
    [{ ...BEHIND, tail: 'behindR' }, 1700],
    [{ ...BEHIND, tail: 'behindMidR', bob: 1 }, 480],
    [{ ...BEHIND, tail: 'behindMidL', bob: 1 }, 480],
    [{ ...BEHIND, tail: 'behindL', head: [-1, 0] }, 1900],
    [{ ...BEHIND, tail: 'behindMidL', head: [-1, 0], bob: 1 }, 480],
    [{ ...BEHIND, tail: 'behindMidR', bob: 1 }, 480],
    [{ ...BEHIND, tail: 'behindR', head: [1, 0] }, 1900],
    [{ ...BEHIND, tail: 'behindR', head: [1, -1] }, 1500],
    [{ ...BEHIND, tail: 'behindR', head: [1, -1], ears: 'back' }, 140],
    [{ ...BEHIND, tail: 'behindR', head: [1, -1] }, 900],
    [{ ...BEHIND, tail: 'behindMidR', bob: 1 }, 480],
    [{ ...BEHIND, tail: 'behindMidL', bob: 1 }, 480],
    [{ ...BEHIND, tail: 'behindL' }, 1700],
    [{ ...BEHIND, tail: 'behindMidL' }, 480],
    [{ ...BEHIND, tail: 'behindMidR' }, 480],
  ]),
  // The sky's great moment: it sits up, follows it across, bows its head over a wish, and wags at the thought.
  gazeAwe: anim([
    [{ ...BEHIND, head: [0, -1], tail: 'behindMidR' }, 500],
    [{ ...BEHIND, head: [1, -1], tail: 'behindMidR' }, 600],
    [{ ...BEHIND, head: [2, 0], tail: 'behindR' }, 900],
    [{ ...BEHIND, head: [1, 0], tail: 'behindR' }, 500],
    [{ ...BEHIND, head: [0, 1], ears: 'back', tail: 'behindMidR' }, 1200],
    [{ ...BEHIND, head: [0, 1], ears: 'back', tail: 'behindMidR', bob: 1 }, 1100],
    ...Array.from({ length: 4 }, (): [Pose, number][] => [
      [{ ...BEHIND, tail: 'behindL', extras: ['smallHeartA'] }, 210],
      [{ ...BEHIND, tail: 'behindR', extras: ['smallHeartB'] }, 210],
    ]).flat(),
  ]),
  // It has had its fill: its head comes round first, then it faces our way again.
  gazeReturn: anim([
    [{ ...BEHIND, head: [0, 1], tail: 'behindMidR' }, 700],
    [{ ...BEHIND, tail: 'behindMidL' }, 400],
    [{ ...SIT, away: true, head: [-2, 0], tail: 'sitB' }, 400],
    [{ ...SIT, away: true, tail: 'sitA' }, 400],
    [{ ...SIT, eye: 'happy', tail: 'sitA' }, 700],
  ]),
  // Full of it, it sighs, lies down and lets its eyes close.
  gazeSettle: anim([
    [{ ...SIT, eye: 'happy', tail: 'sitB' }, 900],
    [{ ...SIT, eye: 'closed', tail: 'sitB', bob: 1 }, 1000],
    [{ ...SIT, eye: 'happy', head: [0, 1], tail: 'sitA' }, 700],
    [{ body: 'lie', eye: 'happy', tail: 'sitA' }, 1100],
    [{ body: 'lie', eye: 'sleepy', tail: 'sitB' }, 1200],
    [{ body: 'lie', eye: 'closed', tail: 'sitB', bob: 1 }, 1000],
    [{ body: 'lie', eye: 'sleepy', tail: 'sitA' }, 900],
    [{ body: 'lie', eye: 'closed', tail: 'sitA' }, 1400],
  ]),
  // Flat in the tall grass, watching.
  lurk: anim([
    [{ body: 'lie', mouth: 'flat', tail: 'sitA' }, 500],
    [{ body: 'lie', mouth: 'flat', tail: 'sitB' }, 500],
  ]),
  // Lands nose first where the mouse was.
  dive: anim([
    [{ body: 'bow', head: [1, 5], eye: 'closed', mouth: 'flat', tail: 'high', extras: ['dirtA'] }, 300],
    [{ body: 'bow', head: [1, 4], eye: 'closed', mouth: 'flat', tail: 'highL' }, 220],
    [{ body: 'bow', head: [0, 1], eye: 'wide', tail: 'highR' }, 420],
  ]),
  // The mouse ended up on its nose: they look at each other, and it is love.
  mouseFriend: anim([
    [{ ...SIT, head: [0, 3], eye: 'up', mouth: 'flat', tail: 'sitA', extras: ['mouseA'] }, 600],
    [{ ...SIT, head: [0, 3], eye: 'up', mouth: 'flat', tail: 'sitA', extras: ['mouseB'] }, 300],
    [{ ...SIT, head: [0, 3], eye: 'happy', tail: 'sitB', extras: ['mouseA', 'smallHeartA'] }, 450],
    [{ ...SIT, head: [0, 3], eye: 'happy', mouth: 'tongue', tail: 'sitA', extras: ['mouseB', 'smallHeartB'] }, 450],
  ]),
  // You ignored the break: it flops down and sighs.
  // After the rain, or the snow: it shakes itself from nose to tail, and what was on it flies off.
  shakeDry: shakeAnimation('sprayA', 'sprayB'),
  shakeSnow: shakeAnimation('flurryA', 'flurryB'),
  sigh: anim([
    [{ body: 'lie', eye: 'down', mouth: 'flat', tail: 'sitA' }, 900],
    [{ body: 'lie', eye: 'closed', mouth: 'flat', bob: 1, tail: 'sitA', extras: ['sniffB'] }, 700],
    [{ body: 'lie', eye: 'down', mouth: 'flat', tail: 'sitB' }, 1500],
  ]),
  ...WORK_ANIMATIONS,
} satisfies Record<string, Animation>;

export type AnimName = keyof typeof ANIMATIONS;
