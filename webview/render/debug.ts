import type { Session } from '../session';
import { slighted, welcomeBack } from '../sim/features/bond';
import { startGift } from '../sim/features/gifts';
import { startMilestone } from '../sim/features/growth';
import { MOOD_NEXT } from '../sim/features/ambient';
import { LOW } from '../sim/features/bond';
import { DOODLE_EVERY_MS, GIFTS_A_DAY, GIFT_EVERY_MS, broughtToday } from '../sim/features/gifts';
import { LAST_STAGE, STAGES, STAGE_NAMES, UNLOCKS, has, owns, stageFor, type Unlock } from '../sim/unlocks';
import { FIND_ORDER } from '../sprites/keepsakes';
import type { Stage } from '../stage';

// The debug corner, top left, laid out the way its life is: first the day (its mood, and what today was made of),
// then your life together (its attachment, the stage it has reached, what that stage gave it and what the next one
// will), then what is on its way (a find, a heart). Drag along the mood or the attachment gauge to set it; the
// buttons make things happen now, or move it a stage up or down. Only with the hidden `foxel.debug` setting; its view
// shows no text and no numbers otherwise.

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

/** What a button of the corner does. `hide` folds the corner away, `live` hands its feelings back to the extension, `new game` starts its life over. */
const BUTTONS: readonly { label: string; press(session: Session): void }[] = [
  { label: 'hide', press: (session) => void (session.debugOpen = false) },
  { label: 'live', press: (session) => force(session, {}) },
  { label: 'stage -', press: (session) => toStage(session, session.world.stage - 1) },
  { label: 'stage +', press: (session) => (session.world.stage < 0 ? startMilestone(session.buddy, 0) : toStage(session, session.world.stage + 1)) },
  { label: 'let down', press: ({ buddy }) => slighted(buddy) },
  { label: 'find', press: ({ buddy }) => (buddy.interrupt(), startGift(buddy)) },
  { label: 'heart', press: ({ buddy }) => (buddy.interrupt(), (buddy.gift.sinceDoodleMs = DOODLE_EVERY_MS), buddy.enterNext('doodle')) },
  { label: 'back 3 d', press: ({ buddy }) => welcomeBack(buddy, 3) },
  { label: 'back 20 d', press: ({ buddy }) => welcomeBack(buddy, 20) },
  // Asks first, then forgets everything: the first meeting again.
  { label: 'new game', press: (session) => session.startOver() },
];
const BUTTON_PAD = 4;
const BUTTON_GAP = 4;
const BUTTON_H = 13;
const UNFOLD = 'debug';

// Makes it feel what the corner says rather than what the extension worked out; nothing forced, and it is the extension's again.
function force(session: Session, forced: Session['forced']): void {
  session.forced = forced;
  session.world.mood = forced.mood ?? session.felt.mood;
  session.world.attachment = forced.attachment ?? session.felt.attachment;
  // Forcing its attachment up moves the most it ever was too, so that the stages can be tried out.
  session.world.peak = Math.max(session.world.peak, session.world.attachment);
}

// Up a stage: its attachment is taken to where that stage begins, and it marks it as soon as it has a quiet moment.
// Down a stage: what that stage had brought is taken out of its life again, to see it come back.
function toStage(session: Session, stage: number): void {
  const { world } = session;
  const to = Math.min(LAST_STAGE, Math.max(-1, stage));
  const attachment = STAGES[Math.max(0, to)];
  session.forced = { ...session.forced, attachment };
  world.attachment = attachment;
  world.peak = to < 0 ? -1 : attachment;
  if (to < world.stage) {
    world.stage = to;
    world.album.pictures = to + 1;
  }
}

/** One line of the corner: what it measures, how full its gauge is (0 to 1), where its thresholds are, and what that means in words. */
interface Gauge {
  label: string;
  share: number;
  /** Dragging along it sets this feeling. */
  sets?: 'mood' | 'attachment';
  /** A line of words only, under a heading: no gauge. */
  words?: true;
  /** Where the gauge starts filling from: 0 for most, the middle for one that goes both ways. */
  from?: number;
  marks?: readonly number[];
  colour: string;
  note: string;
}

const names = (stage: number, held: boolean, world: Session['world']): string =>
  (Object.keys(UNLOCKS) as Unlock[])
    .filter((what) => UNLOCKS[what].stage === stage && (!held || !has(world, what)))
    .join(', ');

function gauges({ world, buddy, facts, forced }: Session): Gauge[] {
  const { mood, attachment, peak, stage, doodle } = world;
  const { gift, bond } = buddy;
  const feeling = buddy.state === 'sulk' ? 'sulking' : mood <= LOW ? 'will sulk' : mood <= LISTLESS_TO ? 'out of sorts' : mood >= PLAYFUL_FROM ? 'playful' : 'even';
  const lines: Gauge[] = [
    // The day.
    { label: 'Mood', sets: 'mood', share: (mood + 1) / 2, from: 0.5, marks: [LOW, LISTLESS_TO, PLAYFUL_FROM].map((m) => (m + 1) / 2), colour: mood <= LISTLESS_TO ? POOR : mood >= PLAYFUL_FROM ? GOOD : FAIR, note: `${mood >= 0 ? '+' : ''}${mood.toFixed(2)} ${feeling}${bond.sulky && buddy.state !== 'sulk' ? ', not made up' : ''}${forced.mood === undefined ? '' : ' (forced)'}` },
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
  // Your life together: the stage it has marked, what it is missing today for its mood, and what comes next.
  const due = stageFor(peak);
  const reached = Math.max(0, stage);
  lines.push({
    label: 'Attachment',
    sets: 'attachment',
    share: attachment,
    marks: STAGES.slice(1),
    colour: GOOD,
    note: `${percent(attachment)} · stage ${stage < 0 ? 'none yet' : `${stage}/${LAST_STAGE}, ${STAGE_NAMES[reached]}`}${due > stage ? ' · a new one to mark' : ''}${forced.attachment === undefined ? '' : ' (forced)'}`,
  });
  const missing = Array.from({ length: reached + 1 }, (_, n) => names(n, true, world)).filter(Boolean).join(', ');
  if (stage >= 0 && missing) {
    lines.push({ label: 'Not today', words: true, share: 0, colour: HELD, note: `${missing} (its mood)` });
  }
  if (stage < LAST_STAGE) {
    lines.push({ label: 'Next stage', words: true, share: 0, colour: HELD, note: `at ${percent(STAGES[stage + 1])}: ${names(stage + 1, false, world) || 'nothing yet'}` });
  }
  // What is on its way, once it has reached the stage for it.
  if (owns(world, 'finds')) {
    const wait = !has(world, 'finds') ? 'needs a better mood' : broughtToday(buddy) >= GIFTS_A_DAY ? `${GIFTS_A_DAY} brought today, enough` : gift.sinceGiftMs < GIFT_EVERY_MS ? `in ${minutes(GIFT_EVERY_MS - gift.sinceGiftMs)}` : SOON;
    const collected = Object.values(world.album.finds).filter((n) => (n ?? 0) > 0).length;
    lines.push({ label: 'Next find', share: gift.sinceGiftMs / GIFT_EVERY_MS, colour: wait === SOON ? GOOD : wait.startsWith('in ') ? WAIT : HELD, note: `${wait} (${collected}/${FIND_ORDER.length} kinds kept)` });
  }
  if (owns(world, 'hearts')) {
    const wait = !has(world, 'hearts') ? 'needs a better mood' : doodle.there ? 'one is drawn' : gift.sinceDoodleMs < DOODLE_EVERY_MS ? `in ${minutes(DOODLE_EVERY_MS - gift.sinceDoodleMs)}` : SOON;
    lines.push({ label: 'Next heart', share: gift.sinceDoodleMs / DOODLE_EVERY_MS, colour: wait === SOON ? GOOD : wait.startsWith('in ') ? WAIT : HELD, note: wait });
  }
  return lines;
}

/** Where each button is, in a row under the gauges. */
function buttons(stage: Stage, rows: number): { x: number; y: number; w: number; h: number; label: string; press(session: Session): void }[] {
  const { ctx } = stage;
  ctx.save();
  ctx.font = FONT;
  let x = PAD;
  const placed = BUTTONS.map(({ label, press }) => {
    const w = ctx.measureText(label).width + 2 * BUTTON_PAD;
    const at = { x, y: PAD + rows * ROW + 2, w, h: BUTTON_H, label, press };
    x += w + BUTTON_GAP;
    return at;
  });
  ctx.restore();
  return placed;
}

/** Folded away, only this shows: a small button at the top, in the middle, out of the way of what slides out of the corners. */
function unfoldButton(stage: Stage): { x: number; y: number; w: number; h: number } {
  const { ctx } = stage;
  ctx.save();
  ctx.font = FONT;
  const w = ctx.measureText(UNFOLD).width + 2 * BUTTON_PAD;
  ctx.restore();
  return { x: Math.round((stage.width - w) / 2), y: 2, w, h: BUTTON_H };
}

/**
 * A press, or a drag, at this point of the view: on a gauge that can be set it sets it, on a button it presses it
 * (not while dragging). Returns whether the point is on the corner at all, so that the fox does not get the click.
 */
export function pressDebug(stage: Stage, session: Session, x: number, y: number, dragging = false): boolean {
  if (!session.debugOpen) {
    const fold = unfoldButton(stage);
    const on = x >= fold.x && x < fold.x + fold.w && y >= fold.y && y < fold.y + fold.h;
    session.debugOpen = on && !dragging;
    return on;
  }
  const lines = gauges(session);
  const row = Math.floor((y - PAD) / ROW);
  const gauge = lines[row];
  const along = (x - PAD - LABEL_W) / BAR_W;
  if (gauge?.sets && along >= -0.05 && along <= 1.05) {
    const share = Math.round(Math.min(1, Math.max(0, along)) * 40) / 40;
    force(session, { ...session.forced, [gauge.sets]: gauge.sets === 'mood' ? share * 2 - 1 : share });
    return true;
  }
  const pressed = buttons(stage, lines.length + 1).find((button) => x >= button.x && x < button.x + button.w && y >= button.y && y < button.y + button.h);
  if (pressed && !dragging) {
    pressed.press(session);
  }
  return pressed !== undefined || coversDebug(stage, session, x, y);
}

/** Whether this point of the view is on the unfolded corner: what is under it does not get the pointer. */
export function coversDebug(stage: Stage, session: Session, x: number, y: number): boolean {
  if (!session.debugOpen || stepsAside(session)) {
    return false;
  }
  const rows = gauges(session).length;
  const row = buttons(stage, rows + 1);
  const last = row[row.length - 1];
  return x < Math.max(NOTE_X + 160, last.x + last.w + PAD) && y < last.y + last.h + PAD;
}

// While the box of keepsakes is out, in the same corner, the debug corner leaves it the room.
const stepsAside = (session: Session): boolean => !session.world.album.tucked;

/** The debug corner, top left. */
export function drawDebug(stage: Stage, session: Session): void {
  const { ctx } = stage;
  const { buddy, facts, light } = session;
  if (session.debugOpen && stepsAside(session)) {
    return;
  }
  if (!session.debugOpen) {
    const fold = unfoldButton(stage);
    ctx.save();
    ctx.font = FONT;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = light ? 'rgba(0, 0, 0, 0.14)' : 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(fold.x, fold.y, fold.w, fold.h);
    ctx.fillStyle = light ? '#333333' : '#dddddd';
    ctx.fillText(UNFOLD, fold.x + BUTTON_PAD, fold.y + fold.h / 2);
    ctx.restore();
    return;
  }
  const lines = gauges(session);
  const footer = `${buddy.state} · ${buddy.current().anim}${facts ? ` · away ${facts.daysAway ?? '–'} d · born ${facts.born} (${facts.daysKept} d kept)` : ''}`;
  const ink = light ? '#333333' : '#dddddd';
  ctx.save();
  ctx.font = FONT;
  ctx.textBaseline = 'middle';
  // Thin enough for the fox to show through when it walks under it.
  ctx.fillStyle = light ? 'rgba(255, 255, 255, 0.72)' : 'rgba(0, 0, 0, 0.55)';
  const width = Math.max(ctx.measureText(footer).width + 2 * PAD, ...lines.map(({ note, words }) => (words ? PAD + LABEL_W : NOTE_X) + ctx.measureText(note).width + PAD));
  const placed = buttons(stage, lines.length + 1);
  const last = placed[placed.length - 1];
  ctx.fillRect(0, 0, Math.max(width, last.x + last.w + PAD), last.y + last.h + PAD);
  lines.forEach(({ label, share, from = 0, marks = [], colour, note, words }, i) => {
    const y = PAD + i * ROW + ROW / 2;
    const x = PAD + LABEL_W;
    const full = Math.min(1, Math.max(0, share));
    ctx.fillStyle = ink;
    ctx.fillText(label, PAD, y);
    if (words) {
      // No gauge: the words start where it would.
      ctx.globalAlpha = 0.8;
      ctx.fillText(note, x, y);
      ctx.globalAlpha = 1;
      return;
    }
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
  ctx.globalAlpha = 1;
  for (const { x, y, w, h, label } of placed) {
    ctx.fillStyle = light ? 'rgba(0, 0, 0, 0.14)' : 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = ink;
    ctx.fillText(label, x + BUTTON_PAD, y + h / 2);
  }
  ctx.restore();
}
