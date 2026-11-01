import { Component, ElementRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { Nav } from '../lib/nav';
import { SyncState } from '../sync/sync-state';
import { PresenterPrefs } from './prefs';

// The presenter's mouse over the slide, drawn on top of it (Slidev's LaserPointer and PresenterMouse).
// On the presenter page it measures the mouse and shares it; on every other page it shows what arrives.
// Positions are percents of the slide, so every window size agrees.
@Component({
  selector: 'app-presenter-cursor',
  host: {
    class: 'pointer-events-none text-xl',
    '(window:focus)': 'focused.set(true)',
    '(window:blur)': 'focused.set(false)',
    '(document:pointermove)': 'move($event)',
    '(document:pointerleave)': 'mouse.set(null)',
  },
  templateUrl: './presenter-cursor.html',
})
export class PresenterCursor {
  private nav = inject(Nav);
  private sync = inject(SyncState);
  private prefs = inject(PresenterPrefs);
  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected focused = signal(document.hasFocus());
  /** Our own mouse over the slide, in percent. */
  protected mouse = signal<{ x: number; y: number } | null>(null);
  private frame = 0;
  private last = { x: 0, y: 0 }; // the newest mouse position in the window

  // What to draw: on the presenter page the laser follows our own mouse; elsewhere, what the presenter shares.
  protected point = computed(() => {
    const m = this.mouse();
    const own =
      m &&
      this.prefs.cursorStyle() === 'laser' &&
      (!this.nav.isPresenter || this.prefs.showCursor())
        ? { ...m, style: 'laser' as const }
        : null;
    return this.nav.isPresenter ? own : (own ?? this.sync.shared().cursor);
  });

  constructor() {
    // Share our mouse (presenter only). `null` tells the others the cursor left the slide.
    let sharing = false;
    effect(() => {
      if (!this.nav.isPresenter) return;
      const m = this.mouse(),
        show = this.prefs.showCursor() && this.focused(),
        style = this.prefs.cursorStyle();
      untracked(() => {
        if (m && show) {
          sharing = true;
          this.sync.patchShared({ cursor: { ...m, style } });
        } else if (sharing) {
          sharing = false;
          this.sync.patchShared({ cursor: null });
        }
      });
    });
    // The laser hides the real cursor on the slide.
    effect(() =>
      document.body.classList.toggle(
        'slidev-self-laser-active',
        this.prefs.cursorStyle() === 'laser' &&
          (!this.nav.isPresenter || this.prefs.showCursor()) &&
          !!this.mouse(),
      ),
    );
  }

  // Once per frame is enough, and it keeps the message rate low. The frame uses the newest position.
  protected move(e: PointerEvent) {
    this.last = { x: e.clientX, y: e.clientY };
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      const rect = this.el.parentElement!.getBoundingClientRect(); // the canvas
      const x = ((this.last.x - rect.left) / rect.width) * 100,
        y = ((this.last.y - rect.top) / rect.height) * 100;
      this.mouse.set(x < 0 || x > 100 || y < 0 || y > 100 ? null : { x, y });
    });
  }
}
