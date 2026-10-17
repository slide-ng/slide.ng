import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { Ui } from '../lib/ui-state';
import { Drawings } from './drawings';

// The transparent <svg> over the slide that drauu draws into (Slidev's DrawingLayer).
// It sits inside the canvas, so positions are in slide coordinates.
@Component({
  selector: 'app-drawing-layer',
  // The host must let clicks through to the slide; only the <svg> catches them, and only while drawing is on.
  host: { class: 'block pointer-events-none' },
  template: `@if (drawings.available) {
    <svg
      #svg
      id="drawing-layer"
      aria-hidden="true"
      class="w-full h-full absolute top-0"
      [class.pointer-events-auto]="drawings.enabled()"
      [class.touch-none]="drawings.enabled()"
    ></svg>
  }`,
})
export class DrawingLayer implements OnDestroy {
  protected drawings = inject(Drawings);
  private ui = inject(Ui);
  private svg = viewChild<ElementRef<SVGSVGElement>>('svg');
  private host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    if (!this.drawings.available) return;
    afterNextRender(() =>
      this.drawings.attach(this.svg()!.nativeElement, this.host.parentElement!),
    );
    effect(() => this.drawings.setScale(this.ui.canvasScale()));
  }

  ngOnDestroy() {
    this.drawings.detach();
  }
}
