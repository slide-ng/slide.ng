import { Component, inject } from '@angular/core';
import { Timer } from './timer';

@Component({
  selector: 'app-clock-face',
  templateUrl: './clock-face.html',
})
export class ClockFace {
  protected timer = inject(Timer);
}
