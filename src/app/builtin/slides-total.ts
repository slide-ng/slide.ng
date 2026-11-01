import { Component, inject } from '@angular/core';
import { Nav } from '../lib/nav';

// <slide-ng-total /> shows how many slides the deck has.
@Component({
  selector: 'slide-ng-total',
  templateUrl: './slides-total.html',
})
export class SlidesTotal {
  protected nav = inject(Nav);
}
