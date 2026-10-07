/** How the editor area is split, as VS Code describes it: groups in a row or in a column, each maybe split again the other way. */
export interface EditorLayout {
  orientation: 0 | 1;
  groups: LayoutGroup[];
}

export interface LayoutGroup {
  size?: number;
  groups?: LayoutGroup[];
}

/** Groups one above the other. */
const STACKED = 1;
/** How much of the editor area's height the fox's strip takes when it is first made; it can be dragged after that. */
export const STRIP_SHARE = 0.22;

/** The same layout with one more group across the whole of its bottom: the last one, for the fox. */
export function withStripBelow(layout: EditorLayout): EditorLayout {
  const rest = 1 - STRIP_SHARE;
  if (layout.orientation !== STACKED) {
    // Groups side by side: all of them go into one row above the strip.
    return { orientation: STACKED, groups: [{ groups: layout.groups, size: rest }, { size: STRIP_SHARE }] };
  }
  // Already one above the other: they share what is left in the proportions they had.
  const total = layout.groups.reduce((sum, group) => sum + (group.size ?? 1), 0);
  return {
    orientation: STACKED,
    groups: [...layout.groups.map((group) => ({ ...group, size: ((group.size ?? 1) / total) * rest })), { size: STRIP_SHARE }],
  };
}
