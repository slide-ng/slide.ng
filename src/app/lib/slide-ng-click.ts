// The slide-ng-click directive: <div slide-ng-click>, <div slide-ng-click="3">, <div [slide-ng-click]="[2,4]">,
// <div slide-ng-after>, <div slide-ng-click-hide>. Port of Slidev's v-click / v-after directives.
// Presets: `slide-ng-click.fade.right` in markdown becomes `click-anim="fade.right"` (scripts/lib/directives.mjs).
import {
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  signal,
  booleanAttribute,
} from '@angular/core';
import { clickAnimationClasses } from './click-animation';
import { ClickInfo, ClicksContext, RawAt, RawSingleAt } from './clicks';

/** Works out whether an element is hidden / current / prior (port of Slidev's class logic). */
export function stateOf(ctx: ClicksContext, info: () => ClickInfo | null, hide: () => boolean) {
  const active = computed(() => {
    const i = info();
    return !!i && i.isActive(ctx.current());
  });
  const current = computed(() => {
    const i = info();
    return !!i && i.isCurrent(ctx.current());
  });
  // `hide` flips the meaning: shown first, hidden once the click is reached.
  const hidden = computed(() => (info() ? (hide() ? active() : !active()) : false));
  return { hidden, current, prior: computed(() => active() && !current()) };
}

@Directive({
  selector: '[slide-ng-click], [slide-ng-after], [slide-ng-click-hide]',
  host: {
    '[class.slidev-vclick-target]': 'info() !== null',
    '[class.slidev-vclick-hidden]': 'state.hidden()',
    // A preset such as `fade` keeps a hidden element visible; screen readers still skip it until it is revealed.
    '[attr.aria-hidden]': 'state.hidden() ? "true" : null',
    '[class.slidev-vclick-current]': 'state.current()',
    '[class.slidev-vclick-prior]': 'state.prior()',
    '[attr.data-slidev-clicks-start]': 'info()?.start',
    '[attr.data-slidev-clicks-end]': 'endAttr()',
  },
})
export class SlideNgClick implements OnInit, OnDestroy {
  at = input<RawAt>(undefined, { alias: 'slide-ng-click' });
  after = input(false, { alias: 'slide-ng-after', transform: booleanAttribute });
  /** `slide-ng-click-hide` hides at the next click; `slide-ng-click-hide="3"` at click 3, as Slidev's `v-click-hide="3"`. */
  hideAt = input<RawAt>(undefined, { alias: 'slide-ng-click-hide' });
  hide = computed(() => booleanAttribute(this.hideAt()));
  /** The click of `slide-ng-click-hide="3"`; undefined for the flag (bare, `true` or `"true"`; `"false"` is off). */
  private hideValue = computed(() => {
    const v = this.hideAt();
    return this.hide() && v !== '' && v !== true && v !== 'true' ? v : undefined;
  });
  /** The element's own click to show at, if it has one besides the hide click. */
  private showAt = computed(() => this.at() ?? (this.after() ? '+0' : undefined)); // slide-ng-after = same click as the element before
  /** `slide-ng-click="2" slide-ng-click-hide="3"`: shown at 2 and hidden from 3 on, like Slidev. */
  private showThenHide = computed(
    () =>
      this.showAt() !== undefined &&
      this.hideValue() !== undefined &&
      !Array.isArray(this.hideValue()),
  );
  /** Click animation presets of this element, such as `fade.right` (the slide's `clickAnimation` when there are none). */
  animation = input<string | string[] | undefined>(undefined, { alias: 'click-anim' });

  private ctx = inject(ClicksContext);
  private el = inject<ElementRef<Element>>(ElementRef).nativeElement;
  private animationClasses = clickAnimationClasses();
  info = signal<ClickInfo | null>(null);
  state = stateOf(
    this.ctx,
    () => this.info(),
    () => this.hide() && !this.showThenHide(),
  );
  endAttr = computed(() => {
    const e = this.info()?.end;
    return e != null && isFinite(e) ? e : null;
  });

  // Inputs are set before ngOnInit, and ngOnInit runs in template order.
  // That order is what makes relative clicks ("+1") work.
  ngOnInit() {
    this.place();
    this.ctx.track(this, this.el, () => this.place());
    if (this.info()) this.el.classList.add(...this.animationClasses(this.animation()));
  }

  private place() {
    const hideAt = this.hideValue() as RawSingleAt;
    const info = this.showThenHide()
      ? this.ctx.calculateUntil(this.showAt(), hideAt)
      : this.ctx.calculate(this.showAt() ?? hideAt);
    this.info.set(info);
    this.ctx.register(this, info);
  }

  ngOnDestroy() {
    this.ctx.unregister(this);
  }
}
