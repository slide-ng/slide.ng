import {
  Component,
  ViewContainerRef,
  effect,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DrawingPreview } from '../drawing/drawing-preview';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../lib/canvas';
import { CLICKS_MAX, ClicksContext } from '../lib/clicks';
import { mountSlide } from '../lib/mount-slide';
import { SlideLayer } from '../lib/slide-layer';

// One page of the print output: slide `no` frozen at one click, at its real size.
// The id is `<slide>-<click + 1>` (001-01), the same pattern as Slidev, so exporters can read the slide number from it.
@Component({
  selector: 'app-print-frame',
  imports: [SlideLayer, DrawingPreview],
  host: {
    class: 'print-slide-container bg-main text-main',
    '[id]': 'id()',
    '[attr.data-slide-ng-no]': 'no()',
    '[style.width.px]': 'width',
    '[style.height.px]': 'height',
  },
  template: `
    <app-slide-layer name="global-bottom" [no]="no()" />
    <ng-container #host />
    <app-drawing-preview [no]="no()" />
    <app-slide-layer name="global-top" [no]="no()" />
  `,
})
export class PrintFrame {
  no = input.required<number>();
  /** The click to show; the slide clamps it, so CLICKS_MAX means "the final state". */
  at = input(CLICKS_MAX);
  readonly width = CANVAS_WIDTH;
  readonly height = CANVAS_HEIGHT;
  private host = viewChild.required('host', { read: ViewContainerRef });
  /** The slide's click state, known once the slide is created. */
  readonly clicks = signal<ClicksContext | null>(null);

  protected id = () => {
    const click = (this.clicks()?.current() ?? 0) + 1;
    return `${String(this.no()).padStart(3, '0')}-${String(click).padStart(2, '0')}`;
  };

  constructor() {
    effect(() => {
      const no = this.no(),
        at = this.at(),
        host = this.host();
      untracked(() => {
        const slide = mountSlide(host, no, 'print').instance;
        slide.clicks.setCurrent(at);
        this.clicks.set(slide.clicks);
      });
    });
  }
}
