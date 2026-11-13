import { Injectable, computed } from '@angular/core';
import { HEADMATTER } from '../../slides/generated';
import { scopedKey } from '../lib/deck-scope';
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
  readonly minutes = storedSignal<number | null>('slide-ng-timer-minutes', null);
  readonly place = storedSignal<TimerPlace>('slide-ng-timer-place', { x: 0.92, y: 0.06 });
  readonly startSlide = storedSignal<number | null>('slide-ng-timer-start', null);
  readonly deckStart = positive(HEADMATTER['timerStart']);
  readonly startAt = computed(() => this.startSlide() ?? this.deckStart);

  constructor() {
    const key = scopedKey('slide-ng-timer-minutes');
    window.addEventListener('storage', (e) => {
      if (e.key !== key) return;
      try {
        this.minutes.set(e.newValue == null ? null : JSON.parse(e.newValue));
      } catch {
        this.minutes.set(null);
      }
    });
  }

  setMinutes(text: string) {
    const n = Number(text);
    this.minutes.set(text.trim() && Number.isFinite(n) && n > 0 ? n : null);
  }

  setStart(text: string) {
    this.startSlide.set(text.trim() ? positive(Number(text)) : null);
  }

  toggle() {
    this.shown.update((v) => !v);
  }
}

function positive(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}
