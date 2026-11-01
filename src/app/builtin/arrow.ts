// A simple arrow:  <slide-ng-arrow x1="10" y1="20" x2="100" y2="200" color="green" width="3" two-way />
// Port of Slidev's Arrow.vue (without its drag events). The svg is placed at the top left of the slide.
import { Component, booleanAttribute, input } from '@angular/core';

let counter = 0;

@Component({
  selector: 'slide-ng-arrow',
  host: { class: 'absolute left-0 top-0 pointer-events-none' },
  templateUrl: './arrow.html',
})
export class Arrow {
  x1 = input.required<number | string>();
  y1 = input.required<number | string>();
  x2 = input.required<number | string>();
  y2 = input.required<number | string>();
  width = input<number | string>();
  color = input<string>();
  twoWay = input(false, { alias: 'two-way', transform: booleanAttribute });

  protected Math = Math;
  // Markers are found by id, so every arrow needs its own.
  protected id = `slide-arrow-${++counter}`;
}
