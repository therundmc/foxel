import type { Session } from '../session';
import type { Stage } from '../stage';

const FONT = '10px ui-monospace, Menlo, Consolas, monospace';
const LINE = 12;
const PAD = 4;
const signed = (v: number): string => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
const minutes = (ms: number): string => `${Math.floor(ms / 60_000)} min`;

// What the simulation knows about how it feels, followed by what the extension sent.
function lines({ world, buddy, notes }: Session): string[] {
  const { bond, gift } = buddy;
  const flags = [bond.slighted && 'slighted', bond.sulky && 'sulky', bond.soothed && 'soothed', bond.sulkedLow && 'sulked for its mood'].filter(Boolean);
  return [
    `mood ${signed(world.mood)}   attachment ${world.attachment.toFixed(3)}`,
    `${buddy.state} (${buddy.current().anim}) · ${flags.join(', ') || 'at peace'}`,
    `finds ${world.finds.kept.length} kept, ${gift.day === world.now.toDateString() ? gift.given : 0} today, last ${minutes(gift.sinceGiftMs)} ago · heart ${world.doodle.there ? 'drawn' : `${minutes(gift.sinceDoodleMs)} ago`}`,
    ...notes,
  ];
}

/** The debug corner, top left: the numbers behind what it does. Only with the hidden `foxel.debug` setting; its view shows no text otherwise. */
export function drawDebug(stage: Stage, session: Session): void {
  const { ctx } = stage;
  const text = lines(session);
  ctx.save();
  ctx.font = FONT;
  ctx.textBaseline = 'top';
  const width = Math.max(...text.map((line) => ctx.measureText(line).width));
  // Thin enough for the fox to show through when it walks under it.
  ctx.fillStyle = session.light ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 0, width + 2 * PAD, text.length * LINE + 2 * PAD);
  ctx.fillStyle = session.light ? '#333333' : '#dddddd';
  text.forEach((line, i) => ctx.fillText(line, PAD, PAD + i * LINE));
  ctx.restore();
}
