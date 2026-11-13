import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { T } from '../i18n/t';
import { watchIdle } from '../lib/idle';
import { ClockFace } from '../presenter/clock-face';
import { Timer } from '../presenter/timer';
import { TimerPrefs } from './timer-prefs';

const DRAG_START = 4;
const IDLE = 3000;
const clamp = (n: number) => Math.min(0.98, Math.max(0.02, n));

@Component({
  selector: 'app-floating-timer',
  imports: [ClockFace, T],
  templateUrl: './floating-timer.html',
})
export class FloatingTimer {
  protected timer = inject(Timer);
  protected prefs = inject(TimerPrefs);
  private host = inject(ElementRef<HTMLElement>);
  protected dragging = signal(false);
  protected hovered = signal(false);
  private idle = signal(false);
  private press: { x: number; y: number; id: number } | null = null;
  protected opacity = computed(() => {
    if (this.dragging() || this.hovered()) return 1;
    if (this.prefs.fade() === 'always' || this.idle()) return 0.25;
    return this.timer.status() === 'running' ? 1 : 0.6;
  });

  constructor() {
    watchIdle(IDLE, (idle) => this.idle.set(idle))();
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
    this.cancel();
  }

  protected cancel() {
    this.press = null;
    this.dragging.set(false);
  }

  protected keyClick(event: MouseEvent) {
    if (event.detail === 0) this.timer.toggle();
  }
}
