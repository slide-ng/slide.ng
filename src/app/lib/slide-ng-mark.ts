// <span slide-ng-mark.red.circle="2">text</span>: draws a hand-made looking mark around the element
// on a click. Uses rough-notation, loaded only when a slide has a slide-ng-mark.
import {
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RENDER_CONTEXT } from './slide-context';
import type { RoughAnnotation } from 'rough-notation/lib/model';
import { ClickInfo, ClicksContext } from './clicks';
import { markOptions } from './mark-options';

// While the mark is still to be drawn the element has `data-slide-ng-waitfor`, so an exporter can wait for it.
@Directive({
  selector: '[slide-ng-mark]',
  host: { '[attr.data-slide-ng-waitfor]': 'pending() ? "svg.rough-annotation" : null' },
})
export class SlideNgMark implements OnInit, OnDestroy {
  value = input<unknown>(undefined, { alias: 'slide-ng-mark' });
  // The generator moves `.red.circle` out of the attribute name into this one.
  mods = input('', { alias: 'mark-mods' });

  private ctx = inject(ClicksContext);
  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private annotation = signal<RoughAnnotation | null>(null);
  private info = signal<ClickInfo | null>(null);
  private options = markOptions(undefined, '');
  private printing = inject(RENDER_CONTEXT) === 'print';
  protected pending = signal(true);
  private timer?: ReturnType<typeof setTimeout>;
  private gone = false;

  constructor() {
    effect(() => {
      const mark = this.annotation();
      if (!mark) return;
      const at = this.options.at;
      const info = this.info();
      const show = at === true || at === 'true' || (!!info && info.isActive(this.ctx.current()));
      clearTimeout(this.timer);
      if (!show) {
        this.pending.set(false);
        return mark.hide();
      }
      // rough-notation has no delay option, so we wait ourselves.
      // On paper there is no animation and no delay: the mark is just there.
      const delay = this.printing ? 0 : (this.options.delay ?? 0);
      this.timer = setTimeout(() => {
        mark.show();
        this.fade();
        this.pending.set(false);
      }, delay);
    });
  }

  async ngOnInit() {
    this.options = markOptions(this.value(), this.mods());
    const at = this.options.at;
    if (at !== true && at !== 'true' && at !== false && at !== 'false') {
      const place = () => {
        const info = this.ctx.calculate(at as never);
        this.info.set(info);
        this.ctx.register(this, info); // ngOnInit runs in template order, so "+1" works like slide-ng-click
      };
      place();
      this.ctx.track(this, this.el, place);
    }
    const { annotate } = await import('rough-notation');
    if (this.gone) return;
    const { at: _at, delay: _d, opacity: _o, ...config } = this.options;
    this.annotation.set(
      annotate(this.el, (this.printing ? { ...config, animate: false } : config) as never),
    );
  }

  ngOnDestroy() {
    this.gone = true;
    clearTimeout(this.timer);
    this.annotation()?.remove();
    this.ctx.unregister(this);
  }

  // The drawing is an <svg> next to the element; opacity from `.op50` goes on it.
  private fade() {
    const { opacity } = this.options;
    if (opacity == null) return;
    const svg = [this.el.nextElementSibling, this.el.previousElementSibling].find((n) =>
      n?.matches('svg.rough-annotation'),
    );
    if (svg) (svg as SVGElement).style.opacity = String(opacity);
  }
}
