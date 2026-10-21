import { Injectable, signal } from '@angular/core';

// Fullscreen on/off. `isFullscreen` follows the browser, so the Escape key (which the browser
// handles itself) keeps the buttons right too.
@Injectable({ providedIn: 'root' })
export class Fullscreen {
  readonly isFullscreen = signal(!!document.fullscreenElement);
  /**
   * False where the page may not go fullscreen: an iframe without `allow="fullscreen"` (the browser would log a permissions
   * policy violation) or a browser without the Fullscreen API (an iPhone). The buttons are hidden then, and `f` does nothing.
   */
  readonly available = !!document.fullscreenEnabled;

  constructor() {
    document.addEventListener('fullscreenchange', () =>
      this.isFullscreen.set(!!document.fullscreenElement),
    );
  }

  toggle() {
    if (!document.fullscreenElement && !this.available) return;
    // The browser may refuse (no user gesture); nothing useful to do then.
    const done = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen();
    done.catch(() => {});
  }
}
