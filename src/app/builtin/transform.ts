// Scales (or just moves the origin of) what is inside:  <slide-ng-transform scale="0.5" origin="top center">...</slide-ng-transform>
import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'slide-ng-transform',
  host: {
    '[style.transform]': 'transform()',
    '[style.transform-origin]': 'origin() || "top left"',
    style: 'display: block',
  },
  templateUrl: './transform.html',
})
export class Transform {
  scale = input<number | string>();
  origin = input<string>();
  protected transform = computed(() => (this.scale() != null ? `scale(${this.scale() || 1})` : ''));
}
