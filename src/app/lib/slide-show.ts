import {
  Component,
  ElementRef,
  ViewContainerRef,
  computed,
  effect,
  inject,
  input,
  untracked,
  viewChild,
} from '@angular/core';
import { NotFoundLayout } from '../layouts/404';
import { HEADMATTER } from '../../slides/generated';
import { CANVAS_HEIGHT, CANVAS_WIDTH, fitScale } from './canvas';
import { hostSize } from './element-size';
import { Nav } from './nav';
import { SlideLayer } from './slide-layer';
import { RenderContext } from './slide-context';
import { Stage } from './stage';
import { pickTransition } from './transitions';
import { Ui } from './ui-state';
import { ViewPrefs } from './view-prefs';
import { filterCss } from './filters';
import { documentTitle } from './page-title';

// The slide on screen: a canvas of fixed size, scaled to fit this element, with the current slide
// component inside. The deck and the presenter's main pane both use it. Whatever is placed
// inside `<app-slide-show>...</app-slide-show>` (drawing layer, laser pointer) is drawn on top, in canvas coordinates.
@Component({
  selector: 'app-slide-show',
  host: { id: 'slide-container', class: 'slide-show', '(pointerdown)': 'hostClick($event)' },
  imports: [NotFoundLayout, SlideLayer],
  template: `
    <div
      #canvas
      id="slide-content"
      class="canvas"
      [style.width.px]="width"
      [style.height.px]="height"
      [style]="canvasStyle()"
    >
      <app-slide-layer name="global-bottom" [no]="nav.no()" />
      <ng-container #host />
      @if (nav.notFound()) {
        <sn-404 />
      }
      <app-slide-layer name="global-top" [no]="nav.no()" />
      <ng-content />
    </div>
  `,
})
export class SlideShow {
  /** 'slide' for the audience's page, 'presenter' for the presenter's main pane. */
  context = input<RenderContext>('slide');
  protected nav = inject(Nav);
  private ui = inject(Ui);
  private view = inject(ViewPrefs);
  private self = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private host = viewChild.required('host', { read: ViewContainerRef });
  private canvas = viewChild.required<ElementRef<HTMLElement>>('canvas');

  readonly width = CANVAS_WIDTH;
  readonly height = CANVAS_HEIGHT;
  private size = hostSize();
  // `--slidev-slide-scale` is what the iframe layouts use to stay sharp (as in Slidev).
  private scale = computed(
    () =>
      (this.context() === 'slide' && this.ui.slideScale()) ||
      fitScale(this.size().w, this.size().h),
  );
  protected canvasStyle = computed(() => ({
    transform: `translate(-50%, -50%) scale(${this.scale()})`,
    '--slidev-slide-scale': this.scale(),
    filter: filterCss(this.view.filters()) || null,
  }));

  private stage?: Stage;
  private shown = 0; // the slide number on screen, to tell which way we moved

  constructor() {
    effect(() => this.ui.canvasScale.set(this.scale()));
    // One slide component per slide number, so each slide gets a fresh ClicksContext.
    effect(() => {
      const no = this.nav.no(),
        host = this.host();
      this.stage ??= new Stage(host, this.canvas().nativeElement, this.context());
      untracked(() => (this.nav.notFound() ? this.clear() : this.show(no)));
    });
    // Keep ?clicks= in the URL up to date so a reload or shared link lands on the same click.
    effect(() => {
      const clicks = this.nav.ctx();
      if (!clicks || !clicks.mounted()) return;
      this.nav.writeClicksParam(clicks.current());
    });
  }

  private show(no: number) {
    const direction = Math.sign(no - this.shown);
    this.nav.direction.set(direction);
    const transition = this.shown
      ? pickTransition(this.nav.slides, this.shown, no, HEADMATTER['transition'] as string)
      : null;
    this.shown = no;
    const slide = this.stage!.show(no, transition);
    const wanted = this.nav.clicksParam();
    if (wanted != null) slide.clicks.setCurrent(+wanted || 0); // clamped once the slide is mounted
    this.nav.setContext(no, slide.clicks);
    if (this.context() === 'slide') {
      document.title = documentTitle(this.nav.meta().title, HEADMATTER);
    }
  }

  private clear() {
    this.stage!.clear();
    this.shown = 0;
    this.nav.setContext(0, null);
  }

  // Clicking the dark area beside the slide goes forward (right half) or back (left half), like Slidev.
  protected hostClick(e: PointerEvent) {
    if (this.context() !== 'slide' || e.button !== 0 || e.target !== this.self) return;
    if (e.pageX / window.innerWidth > 0.5) this.nav.next();
    else this.nav.prev();
  }
}
