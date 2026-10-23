// The presenter timer (Slidev's useTimer): a stopwatch that counts up, or a countdown from `duration`.
// The state is shared, so the presenter page, the notes page and other windows show the same time.
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HEADMATTER } from '../../slides/generated';
import { TimerState } from '../sync/shared-state';
import { SyncState } from '../sync/sync-state';
import { scopedKey } from '../lib/deck-scope';

/** `30min`, `1h30min`, `90s`, `1.5h` or a plain number of minutes -> seconds. Empty or wrong text gives 30 minutes (Slidev's default). */
export function parseDuration(value: unknown): number {
  if (typeof value === 'number' && value > 0) return value * 60;
  if (typeof value !== 'string') return 30 * 60;
  const units: Record<string, number> = { h: 3600, hr: 3600, min: 60, m: 60, s: 1 };
  let seconds = 0,
    found = false;
  for (const [, n, unit] of value
    .toLowerCase()
    .matchAll(/(\d+(?:\.\d+)?)\s*(hr|h|min|m|s)(?![a-z])/g)) {
    seconds += +n * units[unit];
    found = true;
  }
  if (!found && /^\d+(\.\d+)?$/.test(value.trim())) return +value * 60;
  return found && seconds > 0 ? seconds : 30 * 60;
}

/** Milliseconds the timer has been running at `now`. */
export function passedMs(t: TimerState, now: number): number {
  if (t.status === 'stopped' || !t.startedAt) return 0;
  return (t.status === 'paused' ? t.pausedAt : now) - t.startedAt;
}

/** The parts of the clock face. A stopwatch that has not started shows dashes. */
export function clockParts(
  mode: 'stopwatch' | 'countdown',
  durationSec: number,
  t: TimerState,
  now: number,
) {
  if (mode === 'stopwatch' && (t.status === 'stopped' || !t.startedAt))
    return { h: '', m: '-', s: '--' };
  const total = mode === 'countdown' ? durationSec * 1000 - passedMs(t, now) : passedMs(t, now);
  const negative = total < 0;
  const abs = Math.abs(total);
  const h = Math.floor(abs / 3_600_000);
  const m = Math.floor(abs / 60_000) % 60;
  const s = Math.floor(abs / 1000) % 60;
  // The minus goes in front of the first part shown: -1:20:01, -4:05.
  return {
    h: h ? (negative ? '-' : '') + String(h) : '',
    m: (negative && !h ? '-' : '') + (h ? String(m).padStart(2, '0') : String(m)),
    s: String(s).padStart(2, '0'),
  };
}

const SAVED = 'slide-ng-timer';
function readSaved(): TimerState | null {
  try {
    const t = JSON.parse(sessionStorage.getItem(scopedKey(SAVED)) ?? 'null');
    return t &&
      ['running', 'paused', 'stopped'].includes(t.status) &&
      typeof t.startedAt === 'number' &&
      (t.changedAt === undefined || typeof t.changedAt === 'number')
      ? (t as TimerState)
      : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class Timer {
  private sync = inject(SyncState);
  readonly mode: 'stopwatch' | 'countdown' =
    HEADMATTER['timer'] === 'countdown' ? 'countdown' : 'stopwatch';
  readonly duration = parseDuration(HEADMATTER['duration']);
  private state = computed(() => this.sync.shared().timer);
  /** The clock; it ticks only while the timer runs. */
  readonly now = signal(Date.now());
  readonly status = computed(() => this.state().status);
  readonly passed = computed(() => passedMs(this.state(), this.now()) / 1000);
  readonly percentage = computed(() => (this.passed() / this.duration) * 100);
  readonly parts = computed(() => clockParts(this.mode, this.duration, this.state(), this.now()));

  constructor() {
    // A reload of the presenter page keeps a running or paused timer (it is kept per tab). A new tab gets it from the
    // other windows, which answer its hello with the timer (sync-state.ts), or in dev from the server (ws-hub.mjs).
    // Only when this window knows no newer change of the timer (a reset made while the tab was away comes back with the
    // other windows' answers, and the newer change wins: mergeShared).
    const saved = readSaved();
    const now = this.state();
    if (
      saved &&
      saved.status !== 'stopped' &&
      now.status === 'stopped' &&
      (saved.changedAt ?? 0) >= (now.changedAt ?? 0)
    )
      this.set(saved);
    // Every timer this window shows is kept for the tab, also one that came from another window or the dev server: a tab
    // that got the timer back that way may be the only one that knows it after the dev server restarts (`r`).
    effect(() => {
      const timer = this.state();
      try {
        sessionStorage.setItem(scopedKey(SAVED), JSON.stringify(timer));
      } catch {
        // no storage (a private window): the timer just starts over after a reload
      }
    });
    effect((onCleanup) => {
      if (this.status() !== 'running') return;
      this.now.set(Date.now());
      const id = setInterval(() => this.now.set(Date.now()), 100);
      onCleanup(() => clearInterval(id));
    });
  }

  /** A change made here: it gets the time it was made, so it wins over older ones (shared-state.ts mergeShared). */
  private set(timer: TimerState) {
    this.sync.patchShared({ timer });
  }
  private change(timer: Omit<TimerState, 'changedAt'>) {
    this.set({ ...timer, changedAt: Date.now() });
  }

  start() {
    const t = this.state();
    if (t.status === 'running') return;
    // Resuming moves the start forward by the time spent paused.
    const startedAt = t.status === 'paused' ? Date.now() - (t.pausedAt - t.startedAt) : Date.now();
    this.change({ status: 'running', startedAt, pausedAt: 0 });
  }

  pause() {
    if (this.state().status === 'running')
      this.change({ ...this.state(), status: 'paused', pausedAt: Date.now() });
  }

  toggle() {
    if (this.status() === 'running') this.pause();
    else this.start();
  }
  reset() {
    this.change({ status: 'stopped', startedAt: 0, pausedAt: 0 });
  }
}
