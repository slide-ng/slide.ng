// <slide-ng-switch> shows one child at a time, one per click. Port of Slidev's SlideNgSwitch, where the
// children are slots named 1, 2, 5-7. Here the children are elements with an `at` attribute:
//   <slide-ng-switch><div at="1">first</div><div at="2">second</div><div at="3-5">third, for 3 clicks</div></slide-ng-switch>
import {
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  effect,
  inject,
  input,
} from '@angular/core';
import { ClicksContext, RawSingleAt } from './clicks';

interface Slot {
  el: Element;
  start: number;
  end: number;
}

// Slidev's rule: a single number lasts until the next slot starts; `a-b` is explicit.
export function parseSlots(items: { el: Element; at: string }[]): Slot[] {
  const sorted = [...items].sort((a, b) => parseInt(b.at) - parseInt(a.at)); // biggest start first
  let lastStart: number | undefined;
  return sorted.map(({ el, at }) => {
    if (/^\d+$/.test(at)) {
      const slot = { el, start: +at, end: lastStart ?? +at + 1 };
      lastStart = +at;
      return slot;
    }
    const [start, end] = at.split('-').map(Number);
    if (!Number.isFinite(start) || !Number.isFinite(end))
      throw new Error(`Invalid range for slide-ng-switch: ${at}`);
    lastStart = start;
    return { el, start, end };
  });
}

@Component({
  selector: 'slide-ng-switch',
  template: '<ng-content />',
  host: { style: 'display: block' },
})
export class SlideNgSwitch implements OnInit, OnDestroy {
  at = input<RawSingleAt>('+1');
  private ctx = inject(ClicksContext);
  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private injector = inject(Injector);

  ngOnInit() {
    const items = Array.from(this.el.children)
      .filter((c) => c.hasAttribute('at'))
      .map((el) => ({ el, at: el.getAttribute('at')! }));
    const slots = parseSlots(items);
    const size = Math.max(...slots.map((s) => s.end)) - 1;
    const info = this.ctx.calculateSince(this.at(), size);
    // The switch changes where a child starts or ends, counted from the switch's own first click.
    const steps = info ? slots.flatMap((s) => [s.start, s.end].map((c) => info.start + c - 1)) : [];
    if (info) this.ctx.register(this, info, { el: this.el, steps });

    for (const { el, start, end } of slots) {
      el.classList.add('slidev-vclick-target');
      el.setAttribute('data-slidev-clicks-start', String(start));
      el.setAttribute('data-slidev-clicks-end', String(end));
      effect(
        () => {
          // 1 = the click where the switch starts; before that nothing is shown.
          const offset = info ? this.ctx.current() - info.start + 1 : 0;
          el.classList.toggle('slidev-vclick-display-none', !(start <= offset && offset < end));
          el.classList.toggle('slidev-vclick-current', offset === start);
          el.classList.toggle('slidev-vclick-prior', offset >= end);
        },
        { injector: this.injector },
      );
    }
  }

  ngOnDestroy() {
    this.ctx.unregister(this);
  }
}
