// Text that picks the biggest font size that fits its box (like a PowerPoint text box):
//   <slide-ng-auto-fit-text class="w-60 h-20" min="30" max="100">Some text</slide-ng-auto-fit-text>
// Slidev uses the `fitty` package; this tries sizes between min and max by halving, which is enough
// for a box with a size, and needs no dependency.
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  input,
  numberAttribute,
  booleanAttribute,
  viewChild,
} from '@angular/core';

/** The biggest size in [min, max] for which `fits(size)` is true (min if none fits). */
export function biggestFit(min: number, max: number, fits: (size: number) => boolean): number {
  let low = min,
    high = max;
  while (high - low > 0.5) {
    const mid = (low + high) / 2;
    if (fits(mid)) low = mid;
    else high = mid;
  }
  return fits(high) ? high : low;
}

@Component({
  selector: 'slide-ng-auto-fit-text',
  host: { class: 'slidev-auto-fit-text block overflow-hidden' },
  templateUrl: './auto-fit-text.html',
  // A line height relative to the size: an inherited one in px would let big lines overlap and spill out.
  styles: ['.slidev-auto-fit-text-inner { display: inline-block; line-height: 1.2; }'],
})
export class AutoFitText implements AfterViewInit, OnDestroy {
  modelValue = input('');
  max = input(100, { transform: numberAttribute });
  min = input(30, { transform: numberAttribute });
  multiLine = input(true, { alias: 'multi-line', transform: booleanAttribute });

  private host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private inner = viewChild.required<ElementRef<HTMLElement>>('inner');
  private watcher = new ResizeObserver(() => this.fit());

  constructor() {
    effect(() => {
      this.min();
      this.max();
      this.multiLine();
      this.modelValue();
      this.fit();
    });
  }

  ngAfterViewInit() {
    this.watcher.observe(this.host);
    // Letter shapes change when the web fonts arrive, so fit again then.
    void document.fonts?.ready.then(() => this.fit());
    this.fit();
  }

  ngOnDestroy() {
    this.watcher.disconnect();
  }

  private fit() {
    const box = this.host,
      inner = this.inner().nativeElement;
    if (box.clientWidth <= 0) return; // hidden: nothing to measure yet
    inner.style.whiteSpace = this.multiLine() ? 'normal' : 'nowrap';
    // Several lines may wrap inside the box width but must stay within its height.
    inner.style.maxWidth = '100%';
    const fits = (size: number) => {
      inner.style.fontSize = `${size}px`;
      return (
        inner.scrollWidth <= box.clientWidth &&
        (!this.multiLine() || inner.offsetHeight <= box.clientHeight || box.clientHeight === 0)
      );
    };
    inner.style.fontSize = `${biggestFit(this.min(), this.max(), fits)}px`;
  }
}
