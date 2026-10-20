// What the presenter's click preview marks: for each element that a later click changes, the first such click.
// The clicks come from the parts the slide registered in its ClicksContext.
import { ClickPart } from '../lib/clicks';

export interface PreviewMark {
  el: Element;
  /** The first click after the current one that shows, hides or moves this element. */
  at: number;
  /** That click is the very next one. */
  isNext: boolean;
}

/** The clicks where a part changes: where it starts (and ends, for a range), or each click it spans (code steps). */
export function changesOf(part: ClickPart): number[] {
  if (part.steps) return [...new Set(part.steps)].sort((a, b) => a - b);
  const { start, end, max } = part.info;
  if (Number.isFinite(end)) return [start, end];
  const clicks: number[] = [];
  for (let c = start; c <= max; c++) clicks.push(c);
  return clicks;
}

/** One mark per element that changes after `current` (and no later than `total`), with its first such click. */
export function previewMarks(
  parts: readonly ClickPart[],
  current: number,
  total: number,
): PreviewMark[] {
  const first = new Map<Element, number>();
  for (const part of parts) {
    const at = changesOf(part).find((c) => c > current && c <= total);
    if (at == null) continue;
    const seen = first.get(part.el);
    if (seen == null || at < seen) first.set(part.el, at);
  }
  return [...first].map(([el, at]) => ({ el, at, isNext: at === current + 1 }));
}
