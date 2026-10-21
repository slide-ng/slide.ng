// <slide-ng-clicks> makes each child of its content appear on its own click (each item of a list, each row of a table).
// Options: depth="2" (nested lists), every="2" (items per click), at="3" (first click), hide, animation="fade right".
import {
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  booleanAttribute,
  effect,
  inject,
  input,
} from '@angular/core';
import { clickAnimationClasses } from './click-animation';
import { ClicksContext, RawAt, RawSingleAt, normalizeSingle } from './clicks';
import { stateOf } from './slide-ng-click';

@Component({
  selector: 'slide-ng-clicks',
  template: '<ng-content />',
  host: { style: 'display: contents' },
})
export class SlideNgClicks implements OnInit, OnDestroy {
  depth = input<number | string>(1);
  every = input<number | string>(1);
  at = input<RawAt>('+1');
  hide = input(false, { transform: booleanAttribute });
  /** Click animation presets for every item (`fade right`, or a list), as Slidev's `<v-clicks animation>`. */
  animation = input<string | string[] | undefined>(undefined);

  private ctx = inject(ClicksContext);
  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private injector = inject(Injector);
  private animationClasses = clickAnimationClasses();
  private keys: unknown[] = [];

  ngOnInit() {
    const every = +this.every(),
      depth = +this.depth();
    const at = normalizeSingle(this.at() as RawSingleAt);
    if (at == null) return;
    const relative = typeof at === 'string';

    const items = this.items(depth);
    const animations = this.animationClasses(this.animation());

    let index = 1,
      previous = 0;
    for (const li of items) {
      const showAt = +at + Math.ceil(index++ / every) - 1;
      const delta = showAt - previous;
      previous = showAt;
      const info = this.ctx.calculate(relative ? (delta >= 0 ? `+${delta}` : `${delta}`) : showAt)!;
      this.ctx.register(li, info, { el: li });
      this.keys.push(li);
      li.classList.add('slidev-vclick-target', ...animations);
      const state = stateOf(
        this.ctx,
        () => info,
        () => this.hide(),
      );
      // The items are plain HTML, so we toggle their classes by hand.
      effect(
        () => {
          li.classList.toggle('slidev-vclick-hidden', state.hidden());
          // Inert while hidden, also with a preset such as `fade`, which keeps the item visible (see slide-ng-click.ts).
          li.toggleAttribute('inert', state.hidden());
          li.classList.toggle('slidev-vclick-current', state.current());
          li.classList.toggle('slidev-vclick-prior', state.prior());
        },
        { injector: this.injector },
      );
    }

    // Slidev's "gap": reserve the rest of the clicks so later elements start after the list.
    const size = +at + Math.ceil((index - 1) / every) - 1 - previous;
    const gap = {};
    this.keys.push(gap);
    this.ctx.register(gap, { delta: size, max: this.ctx.currentOffset + size - 1 });
  }

  // What gets a click, as in Slidev's v-clicks: each child of the element; when the only child is a list, each item (and with
  // `depth`, the items of the lists inside it); when it is a table, each body row. Document order is Slidev's order.
  private items(depth: number): HTMLElement[] {
    const children = Array.from(this.el.children) as HTMLElement[];
    const only = children.length === 1 ? children[0] : null;
    if (only && (only.tagName === 'UL' || only.tagName === 'OL'))
      return Array.from(this.el.querySelectorAll('li')).filter((li) => this.listDepth(li) <= depth);
    if (only?.tagName === 'TABLE') {
      const body = only.querySelectorAll<HTMLElement>('tbody > tr');
      return Array.from(body.length ? body : only.querySelectorAll<HTMLElement>('tr'));
    }
    return children;
  }

  // How many <ul>/<ol> sit between this <li> and the <slide-ng-clicks> element.
  private listDepth(li: HTMLElement) {
    let depth = 0;
    for (let p = li.parentElement; p && p !== this.el; p = p.parentElement) {
      if (p.tagName === 'UL' || p.tagName === 'OL') depth++;
    }
    return depth;
  }

  ngOnDestroy() {
    this.keys.forEach((k) => this.ctx.unregister(k));
  }
}
