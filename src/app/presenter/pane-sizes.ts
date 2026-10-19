// The sizes of the presenter's panes, changed by dragging the borders (ported from Slidev's presenter.vue resizers).
// `width` is the notes column; `rows` is the notes row, or in layout 2 the current slide's row. Kept per layout.

export interface PaneSize {
  width: number;
  rows: number;
}
export type PaneSizes = Record<string, PaneSize>;

export const DEFAULT_PANE: PaneSize = { width: 360, rows: 280 };
// Slidev's RESIZER_LIMITS.
export const LIMITS = {
  minWidth: 240,
  maxWidth: 720,
  minRows: 160,
  maxWidthRatio: 0.7,
  maxRowsRatio: 0.75,
};

/** The notes width, kept between the limits and at most 70% of the page's grid. */
export function clampWidth(width: number, gridWidth: number): number {
  if (!Number.isFinite(width)) return LIMITS.minWidth;
  const w = Math.max(LIMITS.minWidth, Math.min(LIMITS.maxWidth, Math.round(width)));
  return Math.min(w, Math.max(LIMITS.minWidth, Math.round(gridWidth * LIMITS.maxWidthRatio)));
}

/** The row size, at least 160 px and at most 75% of the grid's height. */
export function clampRows(rows: number, gridHeight: number): number {
  if (!Number.isFinite(rows)) return LIMITS.minRows;
  const r = Math.max(LIMITS.minRows, Math.round(rows));
  return Math.min(r, Math.max(LIMITS.minRows, Math.round(gridHeight * LIMITS.maxRowsRatio)));
}

/** The saved size of one layout, with the defaults for what is missing or wrong. */
export function paneSizeOf(sizes: unknown, layout: number): PaneSize {
  const saved =
    sizes && typeof sizes === 'object'
      ? (sizes as Record<string, Partial<PaneSize> | undefined>)[layout]
      : undefined;
  const pick = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback;
  return {
    width: pick(saved?.width, DEFAULT_PANE.width),
    rows: pick(saved?.rows, DEFAULT_PANE.rows),
  };
}

/** Which borders can be dragged in a layout. `wide` and `stacked` are layout 1's two media cases (see presenter.css). */
export function resizers(layout: number, wide: boolean, stacked: boolean) {
  const layout1Stacked = layout === 1 && stacked && !wide;
  return {
    width: !layout1Stacked,
    rows: !layout1Stacked,
    /** Dragging toward this side makes the notes bigger: the notes column is on the right (layout 1 wide). */
    notesOnRight: layout === 1 && wide,
    /** The notes row is below the border (layout 1): dragging up makes it bigger. */
    notesBelow: layout === 1,
  };
}
