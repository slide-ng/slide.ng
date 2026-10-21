import { Injectable, effect, signal } from '@angular/core';
import { storedSignal } from './stored-signal';
import { wakeLockEnabled } from './switches';

/**
 * Keeps the screen awake while presenting (the browser's Screen Wake Lock).
 * The headmatter `wakeLock` (`true` by default, `false`, `dev` or `build`, as in Slidev) turns it on until the user chooses
 * otherwise in the settings; off for the current mode, the lock is never asked for and the settings do not offer it.
 */
@Injectable({ providedIn: 'root' })
export class WakeLock {
  readonly supported = 'wakeLock' in navigator && wakeLockEnabled();
  readonly enabled = storedSignal('slidev-wake-lock', true);
  /** True while the browser really holds the lock. */
  readonly held = signal(false);
  private sentinel: WakeLockSentinel | null = null;

  constructor() {
    if (!this.supported) return;
    effect(() => {
      if (this.enabled()) void this.acquire();
      else void this.release();
    });
    // The browser drops the lock when the tab is hidden; ask again when it is back.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.enabled() && !this.sentinel)
        void this.acquire();
    });
  }

  private async acquire() {
    if (this.sentinel) return;
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      // The setting was switched off while the browser was answering: do not keep the lock.
      if (!this.enabled()) {
        await sentinel.release();
        return;
      }
      sentinel.addEventListener('release', () => {
        this.sentinel = null;
        this.held.set(false);
      });
      this.sentinel = sentinel;
      this.held.set(true);
    } catch {
      /* refused (hidden tab, battery saver): the setting stays on, `held` stays false */
    }
  }

  private async release() {
    await this.sentinel?.release();
  }
}
