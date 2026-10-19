import { Component, computed, inject } from '@angular/core';
import { T } from '../i18n/t';
import { Timer } from './timer';

// The clock at the bottom right of the presenter page. Hover it (or Tab to it) for pause / play and reset.
@Component({
  selector: 'app-timer-inlined',
  imports: [T],
  template: `
    <div
      id="timer"
      class="group flex items-center justify-center ps-4 select-none"
      [class]="color()"
    >
      <!-- The buttons are always there (so Tab reaches them) and show on hover or focus, over the clock icon. -->
      <div class="relative w-22px h-12 flex items-center justify-center">
        <div
          class="group-hover:op-0 group-focus-within:op-0 text-2xl"
          [class]="timer.mode === 'countdown' ? 'i-carbon:timer' : 'i-carbon:time'"
          aria-hidden="true"
        ></div>
        <div
          class="absolute inset-0 flex flex-col items-center justify-center op-0 group-hover:op-100 group-focus-within:op-100"
        >
          <button
            id="timer-toggle"
            type="button"
            class="relative op-80 hover:op-100 cursor-pointer bg-transparent border-0 p-0 text-inherit"
            [attr.aria-label]="(timer.status() === 'running' ? 'timer.pause' : 'timer.start') | t"
            (click)="timer.toggle()"
          >
            <div
              [class]="timer.status() === 'running' ? 'i-carbon:pause text-lg' : 'i-carbon:play'"
            ></div>
          </button>
          <button
            id="timer-reset"
            type="button"
            class="op-80 hover:op-100 cursor-pointer bg-transparent border-0 p-0 text-inherit"
            [attr.aria-label]="'timer.reset' | t"
            (click)="timer.reset()"
          >
            <div class="i-carbon:renew"></div>
          </button>
        </div>
      </div>
      <div id="timer-text" class="text-3xl px-3 my-auto font-mono">
        @if (timer.parts().h) {
          <span>{{ timer.parts().h }}</span
          ><span class="op50">:</span>
        }
        <span>{{ timer.parts().m }}</span
        ><span class="op50">:</span><span>{{ timer.parts().s }}</span>
      </div>
    </div>
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
