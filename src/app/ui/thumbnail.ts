import {
  Component,
  ViewContainerRef,
  computed,
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

// One overview card: the real slide component, drawn at its last click (or at `clicks`) and scaled down to `width`.
@Component({
  selector: 'app-thumbnail',
  imports: [DrawingPreview],
  host: {
    class: 'block overflow-hidden relative pointer-events-none',
    inert: '', // a picture only: nothing inside can take the focus
    'aria-hidden': 'true',
    '[style.width.px]': 'width()',
    '[style.height.px]': 'height()',
  },
  template: `<div
    class="bg-main text-main absolute top-0 left-0 overflow-hidden origin-top-left"
    [style]="style()"
  >
    <ng-container #host /><app-drawing-preview [no]="no()" />
  </div>`,
})
export class Thumbnail {
  no = input.required<number>();
  width = input(300);
  /** The click to draw; more than the slide has shows the final state. */
  clicks = input(CLICKS_MAX);
  private slideClicks = signal<ClicksContext | null>(null);
  /** How many clicks the drawn slide has (for a clicks slider next to it). */
  readonly clicksTotal = computed(() => this.slideClicks()?.total() ?? 0);
  private host = viewChild.required('host', { read: ViewContainerRef });

  protected height = computed(() => (this.width() * CANVAS_HEIGHT) / CANVAS_WIDTH);
  protected style = computed(() => {
    const scale = this.width() / CANVAS_WIDTH;
    return {
      width: `${CANVAS_WIDTH}px`,
      height: `${CANVAS_HEIGHT}px`,
      transform: `scale(${scale})`,
      '--slidev-slide-scale': scale,
    };
  });

  constructor() {
    effect(() => {
      const no = this.no(),
        host = this.host();
      untracked(() => {
        host.clear();
        const clicks = mountSlide(host, no, 'overview').instance.clicks;
        // Asking for too many clicks shows the final state: the slide clamps the number.
        clicks.setCurrent(this.clicks());
        this.slideClicks.set(clicks);
      });
    });
    effect(() => this.slideClicks()?.setCurrent(this.clicks()));
  }
}
