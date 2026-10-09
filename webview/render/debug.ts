import type { Session } from '../session';
import { MOOD_NEXT } from '../sim/features/ambient';
import { LOW } from '../sim/features/bond';
import { DOODLE_BOND, DOODLE_EVERY_MS, DOODLE_MOOD, GIFTS_A_DAY, GIFT_BOND, GIFT_EVERY_MS } from '../sim/features/gifts';
import { KEPT_MOST } from '../sim/props/keepsakes';
import type { Stage } from '../stage';

// The debug corner, top left: gauges for what it feels and why. Only with the hidden `foxel.debug` setting;
// its view shows no text and no numbers otherwise.

const FONT = '10px ui-monospace, Menlo, Consolas, monospace';
const ROW = 13;
const PAD = 5;
const LABEL_W = 62;
const BAR_W = 96;
const BAR_H = 6;
const NOTE_X = PAD + LABEL_W + BAR_W + 6;
const GOOD = '#7ccf5a';
const FAIR = '#8ab4f8';
const POOR = '#e0525c';
const WAIT = '#ffd23f';
/** Held back by something other than time. */
const HELD = '#888888';
const SOON = 'any moment now';

const [PLAYFUL_FROM, LISTLESS_TO] = [MOOD_NEXT[0].from, MOOD_NEXT[1].to];
const percent = (share: number): string => `${Math.round(share * 100)}%`;
const minutes = (ms: number): string => `${Math.max(1, Math.ceil(ms / 60_000))} min`;

/** One line of the corner: what it measures, how full its gauge is (0 to 1), where its thresholds are, and what that means in words. */
interface Gauge {
  label: string;
  share: number;
  /** Where the gauge starts filling from: 0 for most, the middle for one that goes both ways. */
  from?: number;
  marks?: readonly number[];
  colour: string;
  note: string;
}

function gauges({ world, buddy, facts }: Session): Gauge[] {
  const { mood, attachment, finds, doodle } = world;
  const { gift, bond } = buddy;
  const feeling = buddy.state === 'sulk' ? 'sulking' : mood <= LOW ? 'will sulk' : mood <= LISTLESS_TO ? 'listless' : mood >= PLAYFUL_FROM ? 'playful' : 'even';
  const grown = attachment >= DOODLE_BOND ? 'brings finds, draws hearts' : attachment >= GIFT_BOND ? 'brings finds' : 'still getting to know you';
  const broughtToday = gift.day === world.now.toDateString() ? gift.given : 0;
  const findWait =
    attachment < GIFT_BOND ? `needs attachment ${percent(GIFT_BOND)}`
    : mood < 0 ? 'not on a bad day'
    : broughtToday >= GIFTS_A_DAY ? `${GIFTS_A_DAY} brought today, enough`
    : finds.kept.length >= KEPT_MOST ? 'its corner is full'
    : gift.sinceGiftMs < GIFT_EVERY_MS ? `in ${minutes(GIFT_EVERY_MS - gift.sinceGiftMs)}`
    : SOON;
  const heartWait =
    attachment < DOODLE_BOND ? `needs attachment ${percent(DOODLE_BOND)}`
    : mood < DOODLE_MOOD ? 'needs a better mood'
    : doodle.there ? 'one is drawn'
    : gift.sinceDoodleMs < DOODLE_EVERY_MS ? `in ${minutes(DOODLE_EVERY_MS - gift.sinceDoodleMs)}`
    : SOON;
  const lines: Gauge[] = [
    { label: 'Mood', share: (mood + 1) / 2, from: 0.5, marks: [LOW, LISTLESS_TO, PLAYFUL_FROM].map((m) => (m + 1) / 2), colour: mood <= LISTLESS_TO ? POOR : mood >= PLAYFUL_FROM ? GOOD : FAIR, note: `${mood >= 0 ? '+' : ''}${mood.toFixed(2)} ${feeling}${bond.sulky && buddy.state !== 'sulk' ? ', not made up' : ''}` },
    { label: 'Attachment', share: attachment, marks: [GIFT_BOND, DOODLE_BOND], colour: GOOD, note: `${percent(attachment)} ${grown}` },
  ];
  if (facts) {
    const cares = (['fed', 'played', 'petted', 'treated'] as const).map((care) => `[${facts.off.includes(care) ? '-' : (facts.cares[care] ?? 0) > 0 ? 'x' : ' '}]${care}`).join(' ');
    const slights = Object.entries(facts.slights).map(([what, n]) => `${what} ×${n}`).join(' ');
    lines.push(
      // Both are full once everything that counts has been done: more of it adds nothing.
      { label: 'Today', share: facts.worth, colour: facts.worth >= 1 ? GOOD : FAIR, note: `${percent(facts.worth)}${facts.worth >= 1 ? ' full' : ''} ${cares}` },
      {
        label: 'Together',
        share: facts.togetherMin / facts.togetherFullMin,
        colour: facts.togetherMin >= facts.togetherFullMin ? GOOD : FAIR,
        note: `${facts.togetherMin} min${facts.togetherMin >= facts.togetherFullMin ? ` (full from ${facts.togetherFullMin})` : ` of ${facts.togetherFullMin}`}${slights ? ` · let down: ${slights}` : ''}`,
      },
    );
  }
  lines.push(
    { label: 'Next find', share: gift.sinceGiftMs / GIFT_EVERY_MS, colour: findWait === SOON ? GOOD : findWait.startsWith('in ') ? WAIT : HELD, note: `${findWait} (${finds.kept.length}/${KEPT_MOST} kept)` },
    { label: 'Next heart', share: gift.sinceDoodleMs / DOODLE_EVERY_MS, colour: heartWait === SOON ? GOOD : heartWait.startsWith('in ') ? WAIT : HELD, note: heartWait },
  );
  return lines;
}

/** The debug corner, top left. */
export function drawDebug(stage: Stage, session: Session): void {
  const { ctx } = stage;
  const { buddy, facts, light } = session;
  const lines = gauges(session);
  const footer = `${buddy.state} · ${buddy.current().anim}${facts ? ` · away ${facts.daysAway ?? '–'} d · born ${facts.born} (${facts.daysKept} d kept)` : ''}`;
  const ink = light ? '#333333' : '#dddddd';
  ctx.save();
  ctx.font = FONT;
  ctx.textBaseline = 'middle';
  // Thin enough for the fox to show through when it walks under it.
  ctx.fillStyle = light ? 'rgba(255, 255, 255, 0.72)' : 'rgba(0, 0, 0, 0.55)';
  const width = Math.max(ctx.measureText(footer).width + 2 * PAD, ...lines.map(({ note }) => NOTE_X + ctx.measureText(note).width + PAD));
  ctx.fillRect(0, 0, width, (lines.length + 1) * ROW + 2 * PAD);
  lines.forEach(({ label, share, from = 0, marks = [], colour, note }, i) => {
    const y = PAD + i * ROW + ROW / 2;
    const x = PAD + LABEL_W;
    const full = Math.min(1, Math.max(0, share));
    ctx.fillStyle = ink;
    ctx.fillText(label, PAD, y);
    ctx.fillText(note, NOTE_X, y);
    ctx.fillStyle = light ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(x, y - BAR_H / 2, BAR_W, BAR_H);
    ctx.fillStyle = colour;
    ctx.fillRect(x + Math.min(from, full) * BAR_W, y - BAR_H / 2, Math.max(1, Math.abs(full - from) * BAR_W), BAR_H);
    ctx.fillStyle = ink;
    for (const mark of [from, ...marks].filter((m) => m > 0 && m < 1)) {
      ctx.fillRect(x + Math.round(mark * BAR_W), y - BAR_H / 2 - 1, 1, BAR_H + 2);
    }
  });
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.75;
  ctx.fillText(footer, PAD, PAD + lines.length * ROW + ROW / 2);
  ctx.restore();
}
