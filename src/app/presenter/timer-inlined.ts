import { Component, computed, inject } from '@angular/core';
import { T } from '../i18n/t';
import { Timer } from './timer';

// The clock at the bottom right of the presenter page. Hover it (or Tab to it) for pause / play and reset; on a touch screen,
// which cannot hover (a phone used as the remote), they are always shown.
@Component({
  selector: 'app-timer-inlined',
  imports: [T],
  templateUrl: './timer-inlined.html',
  styles: `
    @media (hover: none) {
      .timer-icon {
        opacity: 0;
      }
      .timer-buttons {
        opacity: 1;
      }
    }
  `,
})
export class TimerInlined {
  protected timer = inject(Timer);
  protected color = computed(() => {
    if (this.timer.status() === 'stopped') return 'op50';
    if (this.timer.status() === 'paused') return 'text-blue6 dark:text-blue3';
    const p = this.timer.percentage();
    return p > 100
      ? 'text-red6 dark:text-red3'
      : p > 80
        ? 'text-yellow6 dark:text-yellow3'
        : 'text-green6 dark:text-green3';
  });
}
