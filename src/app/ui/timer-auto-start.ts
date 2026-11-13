import { effect, inject, untracked } from '@angular/core';
import { Nav } from '../lib/nav';
import { Timer } from '../presenter/timer';
import { TimerPrefs } from './timer-prefs';

export function autoStartTimer() {
  const nav = inject(Nav);
  const timer = inject(Timer);
  const prefs = inject(TimerPrefs);
  let last: number | null = null;
  effect(() => {
    const no = nav.no();
    const from = last;
    last = no;
    untracked(() => {
      if (from !== null && from !== no && no === prefs.startAt() && timer.status() === 'stopped')
        timer.start();
    });
  });
}
