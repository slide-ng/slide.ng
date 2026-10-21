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

/**
 * The clicks where a part changes: where it starts (and ends, for a range), or each click it spans (code steps).
 * The nav steps one whole click at a time, so a fractional value (`slide-ng-click="1.5"`) changes at the next whole
 * click, and a range that no whole click is in (`[3, 1]`, or `[0, 0]`, which is read as `[1, 1]`) never changes.
 */
export function changesOf(part: ClickPart): number[] {
  if (part.steps) return [...new Set(part.steps.map(Math.ceil))].sort((a, b) => a - b);
  const { end, max } = part.info;
  const start = Math.ceil(part.info.start);
  if (Number.isFinite(end)) return Math.ceil(end) > start ? [start, Math.ceil(end)] : [];
  const clicks: number[] = [];
  for (let c = start; c <= Math.ceil(max); c++) clicks.push(c);
  return clicks;
}

/**
 * One mark per element that changes after `current` (and no later than `total`), with its first such click. The nav
 * stops at a fractional total (1.5) on the next whole click, so a part that changes there is marked with that click (2):
 * a badge always has a whole number, and going to it lands on the total.
 */
export function previewMarks(
  parts: readonly ClickPart[],
  current: number,
  total: number,
): PreviewMark[] {
  const first = new Map<Element, number>();
  for (const part of parts) {
    const at = changesOf(part).find((c) => c < total + 1 && Math.min(c, total) > current);
    if (at == null) continue;
    const seen = first.get(part.el);
    if (seen == null || at < seen) first.set(part.el, at);
  }
  const next = Math.ceil(Math.min(current + 1, total));
  return [...first].map(([el, at]) => ({ el, at, isNext: at === next }));
}
