import { Component, inject } from '@angular/core';
import { T } from '../i18n/t';
import { RENDER_CONTEXT } from '../lib/slide-context';
import { ClockFace } from '../presenter/clock-face';
import { Timer } from '../presenter/timer';

@Component({
  selector: 'slide-ng-timer',
  imports: [ClockFace, T],
  templateUrl: './slide-timer.html',
})
export class SlideTimer {
  protected timer = inject(Timer);
  protected live = ['slide', 'presenter'].includes(inject(RENDER_CONTEXT));
}
