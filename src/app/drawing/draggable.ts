import { Component, ElementRef, inject, input, signal } from '@angular/core';
import { scopedKey } from '../lib/deck-scope';

// A box the user can move around by its background (Slidev's Draggable). Its place is remembered in the browser.
@Component({
  selector: 'app-draggable',
  host: {
    class: 'fixed z-nav touch-none',
    '[style.left.px]': 'pos().x',
    '[style.top.px]': 'pos().y',
    '(pointerdown)': 'down($event)',
    '(window:pointermove)': 'move($event)',
    '(window:pointerup)': 'up()',
  },
  template: '<ng-content />',
})
export class Draggable {
  initialX = input(10);
  initialY = input(10);
  /** localStorage key that remembers where the box was left (of this deck only, deck-scope.ts). */
  storageKey = input('slidev-drawing-pos');
  protected pos = signal({ x: 10, y: 10 });
  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private grab: { dx: number; dy: number } | null = null;

  constructor() {
    // Inputs are set after the constructor, so look at them one tick later.
    queueMicrotask(() => this.pos.set(this.load() ?? { x: this.initialX(), y: this.initialY() }));
  }

  private load(): { x: number; y: number } | null {
    try {
      const p = JSON.parse(localStorage.getItem(scopedKey(this.storageKey())) ?? 'null');
      return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? p : null;
    } catch {
      return null;
    }
  }

  protected down(e: PointerEvent) {
    // Buttons and inputs inside keep working; only the background drags.
    if (e.button !== 0 || (e.target as HTMLElement).closest('button, input')) return;
    const r = this.el.getBoundingClientRect();
    this.grab = { dx: e.clientX - r.left, dy: e.clientY - r.top };
  }

  protected move(e: PointerEvent) {
    if (!this.grab) return;
    // Keep at least a corner of the box on screen.
    const x = Math.min(Math.max(e.clientX - this.grab.dx, 0), window.innerWidth - 40);
    const y = Math.min(Math.max(e.clientY - this.grab.dy, 0), window.innerHeight - 40);
    this.pos.set({ x, y });
  }

  protected up() {
    if (!this.grab) return;
    this.grab = null;
    try {
      localStorage.setItem(scopedKey(this.storageKey()), JSON.stringify(this.pos()));
    } catch {
      /* not remembered */
    }
  }
}
