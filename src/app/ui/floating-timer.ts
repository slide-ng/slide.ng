import { Component, DestroyRef, ElementRef, computed, inject, signal } from '@angular/core';
import { T } from '../i18n/t';
import { Timer } from '../presenter/timer';
import { TimerPrefs } from './timer-prefs';

/** Pixels the pointer must move before a press on the clock is a drag and not a click. */
const DRAG_START = 4;

const clamp = (n: number) => Math.min(0.98, Math.max(0.02, n));

/** Milliseconds without mouse movement before the timer fades. */
const IDLE = 3000;

// The timer over the slide page, for a talk without the presenter page: shown from the settings or the right-click menu,
// dragged anywhere on the stage, in three sizes. A click on the clock starts or pauses it; hover it for reset and hide. It fades
// while the mouse rests, like the navigation bar, and comes back when the mouse moves.
@Component({
  selector: 'app-floating-timer',
  imports: [T],
  templateUrl: './floating-timer.html',
})
export class FloatingTimer {
  protected timer = inject(Timer);
  protected prefs = inject(TimerPrefs);
  private host = inject(ElementRef<HTMLElement>);
  protected dragging = signal(false);
  private press: { x: number; y: number; id: number } | null = null;
  private idle = signal(false);
  protected hovered = signal(false);
  protected opacity = computed(() => {
    if (this.dragging() || this.hovered()) return 1;
    if (this.prefs.fade() === 'always' || this.idle()) return 0.25;
    return this.timer.status() === 'running' ? 1 : 0.6;
  });

  constructor() {
    let wait: ReturnType<typeof setTimeout> | undefined;
    const wake = () => {
      this.idle.set(false);
      clearTimeout(wait);
      wait = setTimeout(() => this.idle.set(true), IDLE);
    };
    wake();
    window.addEventListener('pointermove', wake, { passive: true });
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('pointermove', wake);
      clearTimeout(wait);
    });
  }

  protected down(event: PointerEvent) {
    if (event.button !== 0) return;
    event.stopPropagation();
    this.press = { x: event.clientX, y: event.clientY, id: event.pointerId };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  protected move(event: PointerEvent) {
    if (!this.press || event.pointerId !== this.press.id) return;
    if (
      !this.dragging() &&
      Math.hypot(event.clientX - this.press.x, event.clientY - this.press.y) < DRAG_START
    )
      return;
    this.dragging.set(true);
    const stage = (this.host.nativeElement as HTMLElement).parentElement?.getBoundingClientRect();
    if (!stage?.width || !stage.height) return;
    this.prefs.place.set({
      x: clamp((event.clientX - stage.left) / stage.width),
      y: clamp((event.clientY - stage.top) / stage.height),
    });
  }

  protected up(event: PointerEvent) {
    if (!this.press || event.pointerId !== this.press.id) return;
    event.stopPropagation();
    if (!this.dragging()) this.timer.toggle();
    this.press = null;
    this.dragging.set(false);
  }
}
