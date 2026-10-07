import type { Scene } from '../../shared/protocol';
import { SPRITE_SIZE } from '../sprites/frames';
import type { Buddy } from './buddy';
import { startContemplate } from './features/contemplate';
import { startHunt } from './features/hunt';
import { HUNGRY_SAD_MS, fillBowl } from './features/meals';
import { startMousing } from './features/mousing';
import { REACTION_MS, react } from './features/reactions';
import { startBedtime } from './features/rest';
import { GOOD_NIGHT, MORNING, SIGH, perform } from './features/touch';

type Act =
  | 'morning'
  | 'goodNight'
  | 'hungry'
  | 'starving'
  | 'drink'
  | 'askBreak'
  | 'sigh'
  | 'doze'
  | 'drowsy'
  | 'typing'
  | 'bedtime'
  | 'party'
  | 'roll'
  | 'dig'
  | 'glass'
  | 'stargaze'
  | 'sunrise'
  | 'daydream'
  | 'sunset'
  | 'rain'
  | 'snow'
  | 'mouse';

/** Jumps straight into one of its daily moments, whatever it was doing: for the showcase. */
export function act(b: Buddy, name: Act): void {
  b.meals.hungry = false;
  b.meals.thirsty = false;
  b.rest.sleepy = false;
  b.rest.breakWanted = false;
  b.rest.askingBreak = false;
  b.rest.breakAsks = 0;
  b.world.foodBowl.hide();
  b.world.waterBowl.hide();
  b.interrupt();
  b.y = 0;
  b.enter('sit', b.ambientDuration('sit'));
  switch (name) {
    case 'morning':
      perform(b, MORNING);
      return;
    case 'goodNight':
      perform(b, GOOD_NIGHT);
      return;
    case 'sigh':
      perform(b, SIGH);
      return;
    case 'hungry':
      react(b, 'hungry');
      return;
    case 'starving':
      react(b, 'hungry');
      b.meals.hungerMs = HUNGRY_SAD_MS;
      return;
    case 'drink':
      react(b, 'drink');
      return;
    case 'askBreak':
      react(b, 'breakTime');
      return;
    case 'typing':
      react(b, 'typing');
      return;
    case 'mouse':
      startMousing(b);
      return;
    case 'stargaze':
      startContemplate(b, 'stars');
      return;
    case 'daydream':
      startContemplate(b, 'clouds');
      return;
    case 'sunrise':
    case 'sunset':
    case 'rain':
    case 'snow':
      startContemplate(b, name);
      return;
    case 'bedtime':
      b.rest.sleepy = true;
      startBedtime(b);
      return;
    case 'party':
      b.world.effects.push('confetti');
      b.enter('celebrate', REACTION_MS.celebrate);
      return;
    default:
      b.enter(name, b.ambientDuration(name));
  }
}

const BIRD_LANDS_AWAY = 60;
/** Long enough for a whole contemplation and for the sky to fade afterwards. */
const CONTEMPLATE_MS = 72_000;

// A bird comes down a little way off, on the side with more room.
function landBird(b: Buddy): void {
  const { bird, width, height } = b.world;
  const center = b.x + SPRITE_SIZE / 2;
  b.enter('sit', 20_000);
  bird.land(center + (center < width / 2 ? 1 : -1) * BIRD_LANDS_AWAY, Infinity, width, height);
}

interface Script {
  /** Hour it pretends it is; the fraction is the minutes. */
  hour: number;
  ms: number;
  party?: boolean;
  cues: readonly (readonly [number, (b: Buddy) => void])[];
}

const SCRIPTS: Record<Scene, Script> = {
  sunrise: { hour: 6.6, ms: CONTEMPLATE_MS, cues: [[0, (b) => act(b, 'sunrise')]] },
  morning: { hour: 7.5, ms: 6000, cues: [[0, (b) => act(b, 'morning')]] },
  breakfast: { hour: 8.25, ms: 14_000, cues: [[0, (b) => act(b, 'hungry')], [4000, fillBowl]] },
  drink: { hour: 10.25, ms: 9000, cues: [[0, (b) => act(b, 'drink')]] },
  rain: { hour: 10.75, ms: CONTEMPLATE_MS, cues: [[0, (b) => act(b, 'rain')]] },
  askBreak: { hour: 11.25, ms: 20_000, cues: [[0, (b) => act(b, 'askBreak')]] },
  sigh: { hour: 11.5, ms: 5000, cues: [[0, (b) => act(b, 'sigh')]] },
  starving: { hour: 12.5, ms: 14_000, cues: [[0, (b) => act(b, 'starving')], [5000, fillBowl]] },
  daydream: { hour: 14.5, ms: CONTEMPLATE_MS, cues: [[0, (b) => act(b, 'daydream')]] },
  doze: { hour: 15.25, ms: 9000, cues: [[0, (b) => act(b, 'doze')]] },
  dig: { hour: 15.5, ms: 5000, cues: [[0, (b) => act(b, 'dig')]] },
  roll: { hour: 15.75, ms: 6000, cues: [[0, (b) => act(b, 'roll')]] },
  glass: { hour: 16, ms: 8000, cues: [[0, (b) => act(b, 'glass')]] },
  party: { hour: 16.25, ms: 6000, party: true, cues: [[0, (b) => act(b, 'party')]] },
  bird: { hour: 18.5, ms: 17_000, cues: [[0, landBird], [3200, (b) => startHunt(b, 'bird')]] },
  mouse: { hour: 18.75, ms: 18_000, cues: [[0, (b) => act(b, 'mouse')]] },
  sunset: { hour: 19.6, ms: CONTEMPLATE_MS, cues: [[0, (b) => act(b, 'sunset')]] },
  typing: {
    hour: 22.5,
    ms: 5000,
    cues: [[0, (b) => act(b, 'typing')], [1500, (b) => react(b, 'typing')], [3000, (b) => react(b, 'typing')]],
  },
  drowsy: { hour: 22.75, ms: 7000, cues: [[0, (b) => act(b, 'drowsy')]] },
  stargaze: { hour: 22.9, ms: CONTEMPLATE_MS, cues: [[0, (b) => act(b, 'stargaze')]] },
  snow: { hour: 22.95, ms: CONTEMPLATE_MS, cues: [[0, (b) => act(b, 'snow')]] },
  goodNight: { hour: 23, ms: 5000, cues: [[0, (b) => act(b, 'goodNight')]] },
  bedtime: { hour: 23.5, ms: 15_000, cues: [[0, (b) => act(b, 'bedtime')], [11_000, (b) => react(b, 'wake')]] },
};

/** Plays daily moments back to back, each at its own pretend time of day. */
export class Showcase {
  private queue: Scene[] = [];
  private ms = 0;
  private cue = 0;

  play(scenes: readonly Scene[]): void {
    this.queue = [...scenes];
    this.ms = 0;
    this.cue = 0;
  }

  get active(): boolean {
    return this.queue.length > 0;
  }

  get hour(): number | undefined {
    return this.queue.length > 0 ? SCRIPTS[this.queue[0]].hour : undefined;
  }

  get party(): boolean {
    return this.queue.length > 0 && SCRIPTS[this.queue[0]].party === true;
  }

  update(dtMs: number, buddy: Buddy): void {
    const scene = this.queue[0];
    if (!scene) {
      return;
    }
    const { cues, ms } = SCRIPTS[scene];
    while (this.cue < cues.length && cues[this.cue][0] <= this.ms) {
      cues[this.cue][1](buddy);
      this.cue++;
    }
    this.ms += dtMs;
    if (this.ms >= ms) {
      this.queue.shift();
      this.ms = 0;
      this.cue = 0;
    }
  }
}
