import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RENDER_CONTEXT } from '../lib/slide-context';

// Shows its content only where the slide is drawn: slide, presenter, print or overview.
// `main` means slide or presenter; `visible` means while the element is on the screen (it is a block then, to be seen).
// Several contexts: one of them must match and, as in Slidev, `visible` (which matches anywhere) must hold too.
// Content marked `fallback` is shown everywhere else.
//   <slide-ng-render-when context="slide">only on the real slide<div fallback>thumbnail</div></slide-ng-render-when>
@Component({
  selector: 'slide-ng-render-when',
  template: `
    @if (show()) {
      <ng-content />
    } @else {
      <ng-content select="[fallback]" />
    }
  `,
  host: { '[style.display]': 'watchesVisibility() ? "block" : null' },
})
export class RenderWhen {
  context = input.required<string | string[]>();
  private current = inject(RENDER_CONTEXT);
  private visible = signal(false);
  private wanted = computed(() => [this.context()].flat());
  protected watchesVisibility = computed(() => this.wanted().includes('visible'));

  protected show = computed(() => {
    const wanted = this.wanted();
    const matches = wanted.some(
      (w) =>
        w === 'visible' ||
        w === this.current ||
        (w === 'main' && ['slide', 'presenter'].includes(this.current)),
    );
    return matches && (!this.watchesVisibility() || this.visible());
  });

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (!this.watchesVisibility()) return;
      // Without IntersectionObserver there is no way to tell, so the content is shown.
      if (typeof IntersectionObserver === 'undefined') return this.visible.set(true);
      const observer = new IntersectionObserver(([entry]) =>
        this.visible.set(entry.isIntersecting),
      );
      observer.observe(host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
