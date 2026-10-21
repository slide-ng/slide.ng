import {
  Component,
  ComponentRef,
  ViewContainerRef,
  computed,
  effect,
  inject,
  untracked,
  viewChild,
} from '@angular/core';
import { DrawingPreview } from '../drawing/drawing-preview';
import { CANVAS_HEIGHT, CANVAS_WIDTH, fitScale } from '../lib/canvas';
import { hostSize } from '../lib/element-size';
import { mountSlide } from '../lib/mount-slide';
import { Nav } from '../lib/nav';
import { SlideBase } from '../lib/slide-base';
import { SlideLayer } from '../lib/slide-layer';

// The next step as a small picture: the next click of this slide, or the next slide when the
// clicks are used up. It is the real slide component with its click set to that step.
@Component({
  selector: 'app-next-preview',
  imports: [DrawingPreview, SlideLayer],
  host: { class: 'block relative h-full w-full overflow-hidden' },
  template: `
    @if (frame(); as f) {
      <!-- A picture of what comes next: screen readers and the Tab key skip it (the current slide has the same content). -->
      <div
        id="next-canvas"
        class="canvas absolute left-1/2 top-1/2"
        aria-hidden="true"
        inert
        [style]="style()"
      >
        <app-slide-layer name="global-bottom" [no]="f.no" /><ng-container #host /><app-slide-layer
          name="global-top"
          [no]="f.no"
        /><app-drawing-preview [no]="f.no" />
      </div>
    } @else if (nav.ready()) {
      <div class="h-full flex justify-center items-center">
        <div class="text-gray-500">End of the presentation</div>
      </div>
    }
  `,
})
export class NextPreview {
  protected nav = inject(Nav);
  private size = hostSize();
  private host = viewChild('host', { read: ViewContainerRef });
  private ref?: ComponentRef<SlideBase>;
  private shown = 0;

  /** What to show next: [slide, click], or null at the very end. */
  protected frame = computed(() => {
    if (!this.nav.ready()) return null;
    if (this.nav.clicks() < this.nav.clicksTotal())
      return { no: this.nav.no(), clicks: this.nav.clicks() + 1 };
    if (this.nav.no() < this.nav.total) return { no: this.nav.no() + 1, clicks: 0 };
    return null;
  });
  protected style = computed(() => {
    const scale = fitScale(this.size().w, this.size().h);
    return {
      width: `${CANVAS_WIDTH}px`,
      height: `${CANVAS_HEIGHT}px`,
      transform: `translate(-50%, -50%) scale(${scale})`,
      '--slidev-slide-scale': scale,
    };
  });

  constructor() {
    effect(() => {
      const frame = this.frame(),
        host = this.host();
      untracked(() => {
        if (!frame || !host) {
          this.shown = 0;
          return;
        }
        // A new slide gets a new component; the same slide only moves its click.
        if (frame.no !== this.shown || !this.ref) {
          host.clear();
          this.ref = mountSlide(host, frame.no, 'previewNext');
          this.shown = frame.no;
        }
        this.ref.instance.clicks.setCurrent(frame.clicks);
      });
    });
  }
}
