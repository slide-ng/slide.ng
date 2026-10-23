import { Component, computed, input, output } from '@angular/core';
import { T } from '../i18n/t';

// A row of cells, one per click of the slide (Slidev's ClicksSlider). Click one to go there.
@Component({
  selector: 'app-clicks-slider',
  imports: [T],
  template: `
    <div
      class="flex gap-1 items-center select-none"
      [title]="'presenter.clicks' | t: { count: cells().length }"
      [class.op50]="cells().length < 2"
    >
      <div class="flex items-center font-mono gap-0.2 min-w-16 me-1">
        <div class="i-carbon:cursor-1 text-sm op50"></div>
        <div class="flex-auto"></div>
        <span
          ><span class="text-primary">{{ current() }}</span
          ><span class="op65 text-sm">/</span><span class="op65 text-sm">{{ total() }}</span></span
        >
      </div>
      <div class="relative flex-auto font-mono flex h-5">
        @for (i of cells(); track i) {
          <button
            type="button"
            class="clicks-cell border-y border-main overflow-hidden relative flex items-center justify-center text-xs"
            [class.cursor-pointer]="!readonly()"
            [class.border-s]="i === start()"
            [class.border-e]="i === total()"
            [style.width.%]="100 / cells().length"
            [disabled]="readonly()"
            [attr.aria-label]="'presenter.click' | t: { no: i }"
            [attr.aria-current]="i === current() ? 'step' : null"
            (click)="pick(i)"
          >
            <div class="absolute inset-0" [class]="i <= current() ? 'bg-primary op15' : ''"></div>
            <div class="z-1" [class]="i === current() ? 'text-primary font-bold' : 'op65'">
              {{ i }}
            </div>
          </button>
        }
      </div>
    </div>
  `,
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
