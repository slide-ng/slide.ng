import { Component, Injector, computed, inject, input } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { LAYERS } from '../../slides/generated/layers';
import { SLIDE_NO } from './slide-context';

// Shows one of the deck's layer components (src/app/layers/*.ts): `global-top` and `global-bottom` once
// over or under all slides, `slide-top` and `slide-bottom` inside every slide. The layer covers the slide
// but lets clicks through; give your own elements `pointer-events: auto` if they need the mouse.
@Component({
  selector: 'app-slide-layer',
  imports: [NgComponentOutlet],
  host: { style: 'position: absolute; inset: 0; pointer-events: none; display: block' },
  template: `@if (component(); as c) {
    <ng-container *ngComponentOutlet="c; injector: injector()" />
  }`,
})
export class SlideLayer {
  name = input.required<'global-top' | 'global-bottom' | 'slide-top' | 'slide-bottom'>();
  /** The slide a global layer is drawn with (the presented one, or a printed page's), so `SLIDE_NO` and
   *  `<slide-ng-current-no />` work in a footer. A slide layer is inside its slide and already has it. */
  no = input<number>();
  protected component = computed(() => LAYERS[this.name()]);
  private parent = inject(Injector);
  protected injector = computed(() => {
    const no = this.no();
    return no == null
      ? this.parent
      : Injector.create({ providers: [{ provide: SLIDE_NO, useValue: no }], parent: this.parent });
  });
}
