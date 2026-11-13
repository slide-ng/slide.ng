import { Injectable } from '@angular/core';
import { storedSignal } from '../lib/stored-signal';

export type TimerSize = 's' | 'm' | 'l';
export type TimerFade = 'idle' | 'always';

export interface TimerPlace {
  readonly x: number;
  readonly y: number;
}

@Injectable({ providedIn: 'root' })
export class TimerPrefs {
  readonly shown = storedSignal('slide-ng-timer-shown', false);
  readonly size = storedSignal<TimerSize>('slide-ng-timer-size', 'm');
  readonly fade = storedSignal<TimerFade>('slide-ng-timer-fade', 'idle');
  readonly place = storedSignal<TimerPlace>('slide-ng-timer-place', { x: 0.92, y: 0.06 });

  toggle() {
    this.shown.update((v) => !v);
  }
}
