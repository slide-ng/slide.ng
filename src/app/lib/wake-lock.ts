import { Injectable, InjectionToken, effect, inject, signal } from '@angular/core';
import { storedSignal } from './stored-signal';
import { wakeLockEnabled } from './switches';

/** Whether the deck runs inside an `<iframe>` (embedded in another page). A frame of another origin may not even be read. */
export function inFrame(w: Window = window): boolean {
  try {
    return w.self !== w.top;
  } catch {
    return true;
  }
}
export const IN_FRAME = new InjectionToken<boolean>('IN_FRAME', { factory: () => inFrame() });

/**
 * Keeps the screen awake while presenting (the browser's Screen Wake Lock).
 * The headmatter `wakeLock` (`true` by default, `false`, `dev` or `build`, as in Slidev) turns it on until the user chooses
 * otherwise in the settings; off for the current mode, the lock is never asked for and the settings do not offer it.
 * A deck embedded in another page (an iframe) asks for it only once the reader uses the deck (a click, a tap or a key in it)
 * or makes it full screen: a reader who only scrolls past it keeps a screen that goes to sleep.
 */
@Injectable({ providedIn: 'root' })
export class WakeLock {
  readonly supported = 'wakeLock' in navigator && wakeLockEnabled();
  readonly enabled = storedSignal('slidev-wake-lock', true);
  /** True while the browser really holds the lock. */
  readonly held = signal(false);
  private sentinel: WakeLockSentinel | null = null;
  /** The lock may be asked for: at once, or in a frame after the reader used the deck. */
  private readonly armed = signal(!inject(IN_FRAME));

  constructor() {
    if (!this.supported) return;
    if (!this.armed()) {
      const arm = () => {
        this.armed.set(true);
        for (const type of ['pointerdown', 'keydown'] as const)
          document.removeEventListener(type, arm, true);
        document.removeEventListener('fullscreenchange', arm);
      };
      for (const type of ['pointerdown', 'keydown'] as const)
        document.addEventListener(type, arm, true);
      document.addEventListener('fullscreenchange', arm);
    }
    effect(() => {
      if (this.enabled() && this.armed()) void this.acquire();
      else if (!this.enabled()) void this.release();
    });
    // The browser drops the lock when the tab is hidden; ask again when it is back.
    document.addEventListener('visibilitychange', () => {
      if (
        document.visibilityState === 'visible' &&
        this.enabled() &&
        this.armed() &&
        !this.sentinel
      )
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
