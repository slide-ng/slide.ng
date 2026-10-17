// The slide-ng-click directive: <div slide-ng-click>, <div slide-ng-click="3">, <div [slide-ng-click]="[2,4]">,
// <div slide-ng-after>, <div slide-ng-click-hide>. Port of Slidev's slide-ng-click / slide-ng-after directives.
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
import { ClickInfo, ClicksContext, RawAt } from './clicks';

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
    '[class.slidev-vclick-current]': 'state.current()',
    '[class.slidev-vclick-prior]': 'state.prior()',
    '[attr.data-slidev-clicks-start]': 'info()?.start',
    '[attr.data-slidev-clicks-end]': 'endAttr()',
  },
})
export class SlideNgClick implements OnInit, OnDestroy {
  at = input<RawAt>(undefined, { alias: 'slide-ng-click' });
  after = input(false, { alias: 'slide-ng-after', transform: booleanAttribute });
  hide = input(false, { alias: 'slide-ng-click-hide', transform: booleanAttribute });

  private ctx = inject(ClicksContext);
  private el = inject<ElementRef<Element>>(ElementRef).nativeElement;
  info = signal<ClickInfo | null>(null);
  state = stateOf(
    this.ctx,
    () => this.info(),
    () => this.hide(),
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
  }

  private place() {
    const at = this.at() ?? (this.after() ? '+0' : undefined); // slide-ng-after = same click as the element before
    const info = this.ctx.calculate(at);
    this.info.set(info);
    this.ctx.register(this, info);
  }

  ngOnDestroy() {
    this.ctx.unregister(this);
  }
}
