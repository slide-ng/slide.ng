import { Component, computed, input, viewChild, viewChildren } from '@angular/core';
import { CLICKS_MAX } from '../lib/clicks';
import { PrintFrame } from './print-frame';

// All the pages of one slide: one page at its final state, or with `withClicks` one page per click step.
@Component({
  selector: 'app-print-slide',
  imports: [PrintFrame],
  host: { class: 'contents' },
  templateUrl: './print-slide.html',
})
export class PrintSlide {
  no = input.required<number>();
  withClicks = input(false);
  protected readonly maxClick = CLICKS_MAX;
  private first = viewChild(PrintFrame);
  private frames = viewChildren(PrintFrame);

  // The first page tells how many clicks the slide has; the other pages follow.
  protected steps = computed(() => {
    const ctx = this.first()?.clicks();
    if (!this.withClicks() || !ctx?.mounted()) return [];
    return Array.from(
      { length: Math.max(0, ctx.total() - ctx.clicksStart) },
      (_, i) => ctx.clicksStart + i + 1,
    );
  });

  /** Every page is created and its slide is drawn. */
  readonly ready = computed(() => {
    const frames = this.frames();
    const wanted = 1 + this.steps().length;
    const first = this.first()?.clicks();
    // In click mode the number of pages is only known once the first slide is mounted.
    if (this.withClicks() && !first?.mounted()) return false;
    return frames.length === wanted && frames.every((f) => f.clicks()?.mounted());
  });
}
