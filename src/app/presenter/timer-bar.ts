import { Component, computed, inject } from '@angular/core';
import { Timer } from './timer';

// A coloured bar under the progress bar: how much of the planned time is used.
@Component({
  selector: 'app-timer-bar',
  templateUrl: './timer-bar.html',
})
export class TimerBar {
  protected timer = inject(Timer);
  protected color = computed(() => {
    if (this.timer.status() === 'paused') return 'bg-blue';
    const p = this.timer.percentage();
    return p > 100 ? 'bg-red' : p > 80 ? 'bg-yellow' : 'bg-green';
  });
}
