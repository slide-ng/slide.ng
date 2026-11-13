import { Component, inject } from '@angular/core';
import { T } from '../i18n/t';
import { Timer } from '../presenter/timer';

// <slide-ng-timer /> shows the presenter timer on a slide or in a layer, so a talk without the presenter page has a clock.
// A click starts or pauses it; the presenter page and every other window show the same time.
@Component({
  selector: 'slide-ng-timer',
  imports: [T],
  templateUrl: './slide-timer.html',
})
export class SlideTimer {
  protected timer = inject(Timer);
}
