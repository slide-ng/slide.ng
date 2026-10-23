// What code blocks and math blocks share: a list of ranges ("2-3|5|all"), one per click.
// A subclass reads `shown()` (the range for the current click) and applies it to its own lines.
import {
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  numberAttribute,
  signal,
} from '@angular/core';
import { CLICKS_MAX, ClickInfo, ClicksContext, RawSingleAt } from '../lib/clicks';
import { rangeAt } from './ranges';

@Directive()
export abstract class RangedBlock implements OnInit, OnDestroy {
  // "2-3|5|all": one range per click
  ranges = input<string[], string | undefined>([], { transform: (v) => (v ? v.split('|') : []) });
  finally = input('last');
  at = input<RawSingleAt>('+1');
  startLine = input(1, { transform: numberAttribute });

  protected clicks = inject(ClicksContext);
  private blockHost = inject<ElementRef<Element>>(ElementRef).nativeElement;
  private info = signal<ClickInfo | null>(null);

  /** The range for the current click, and whether the whole block is hidden at this click. */
  protected shown = computed(() => {
    const info = this.info();
    const index = info ? Math.max(0, this.clicks.current() - info.start + 1) : CLICKS_MAX;
    const last = this.finally() === 'last' ? (this.ranges().at(-1) ?? 'all') : this.finally();
    return rangeAt(this.ranges(), index, last);
  });

  // In template order, so that "+1" counts the elements before this one.
  ngOnInit() {
    if (!this.ranges().length) return;
    const place = () => {
      const info = this.clicks.calculateSince(this.at(), this.ranges().length - 1);
      this.info.set(info);
      this.clicks.register(this, info, { el: this.blockHost });
    };
    place();
    this.clicks.track(this, this.blockHost, place);
  }

  ngOnDestroy() {
    this.clicks.unregister(this);
  }
}
