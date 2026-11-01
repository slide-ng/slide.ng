import { Component, computed, input, output } from '@angular/core';
import { T } from '../i18n/t';

// A row of cells, one per click of the slide (Slidev's ClicksSlider). Click one to go there.
@Component({
  selector: 'app-clicks-slider',
  imports: [T],
  templateUrl: './clicks-slider.html',
})
export class ClicksSlider {
  current = input.required<number>();
  total = input.required<number>();
  start = input(0);
  readonly = input(false);
  /** The click the user chose. */
  picked = output<number>();
  protected cells = computed(() =>
    Array.from(
      { length: Math.max(this.total() - this.start() + 1, 0) },
      (_, i) => this.start() + i,
    ),
  );

  protected pick(i: number) {
    if (!this.readonly()) this.picked.emit(i);
  }
}
