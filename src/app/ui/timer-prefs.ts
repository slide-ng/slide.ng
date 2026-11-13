import { Injectable } from '@angular/core';
import { storedSignal } from '../lib/stored-signal';

export type TimerSize = 's' | 'm' | 'l';

/** When the floating timer fades: while the mouse rests, or always (it shows fully on hover). */
export type TimerFade = 'idle' | 'always';

/** Where the floating timer sits: its centre, as a share of the stage's width and height. */
export interface TimerPlace {
  readonly x: number;
  readonly y: number;
}

// The floating timer of the slide page, remembered in the browser like the other settings.
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
