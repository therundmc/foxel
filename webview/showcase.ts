import type { Scene } from '../shared/protocol';
import type { Behavior } from './behavior';

interface Script {
  /** Hour it pretends it is; the fraction is the minutes. */
  hour: number;
  ms: number;
  party?: boolean;
  cues: readonly (readonly [number, (b: Behavior) => void])[];
}

const SCRIPTS: Record<Scene, Script> = {
  morning: { hour: 7.5, ms: 6000, cues: [[0, (b) => b.act('morning')]] },
  breakfast: { hour: 8.25, ms: 14_000, cues: [[0, (b) => b.act('hungry')], [4000, (b) => b.fillBowl()]] },
  drink: { hour: 10.25, ms: 9000, cues: [[0, (b) => b.act('drink')]] },
  askBreak: { hour: 11.25, ms: 20_000, cues: [[0, (b) => b.act('askBreak')]] },
  sigh: { hour: 11.5, ms: 5000, cues: [[0, (b) => b.act('sigh')]] },
  starving: { hour: 12.5, ms: 14_000, cues: [[0, (b) => b.act('starving')], [5000, (b) => b.fillBowl()]] },
  doze: { hour: 15.25, ms: 9000, cues: [[0, (b) => b.act('doze')]] },
  party: { hour: 16.25, ms: 6000, party: true, cues: [[0, (b) => b.act('party')]] },
  typing: {
    hour: 22.5,
    ms: 5000,
    cues: [[0, (b) => b.act('typing')], [1500, (b) => b.react('typing')], [3000, (b) => b.react('typing')]],
  },
  drowsy: { hour: 22.75, ms: 7000, cues: [[0, (b) => b.act('drowsy')]] },
  goodNight: { hour: 23, ms: 5000, cues: [[0, (b) => b.act('goodNight')]] },
  bedtime: { hour: 23.5, ms: 15_000, cues: [[0, (b) => b.act('bedtime')], [11_000, (b) => b.react('wake')]] },
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

  update(dtMs: number, behavior: Behavior): void {
    const scene = this.queue[0];
    if (!scene) {
      return;
    }
    const { cues, ms } = SCRIPTS[scene];
    while (this.cue < cues.length && cues[this.cue][0] <= this.ms) {
      cues[this.cue][1](behavior);
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
