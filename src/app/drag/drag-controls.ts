import { Component, computed, inject } from '@angular/core';
import { Ui } from '../lib/ui-state';
import { Arrow, Box, Corner, moveArrowEnd, nudgeDelta, resizeBox, rotationTo } from './drag-math';
import { DragState, zoomOf } from './drag-state';

// The frame, corner handles and rotation handle of the element being dragged (Slidev's DragControl).
// It sits inside the slide canvas, so everything here is in slide pixels. Arrow keys nudge the element.
@Component({
  selector: 'app-drag-controls',
  host: {
    '(window:pointerdown)': 'outside($event)',
    '(window:keydown)': 'key($event)',
    style: 'position: absolute; inset: 0; pointer-events: none; z-index: 40',
  },
  templateUrl: './drag-controls.html',
})
export class DragControls {
  protected drag = inject(DragState);
  private ui = inject(Ui);
  protected corners: Corner[] = ['nw', 'ne', 'sw', 'se'];
  private hold: {
    x: number;
    y: number;
    apply: (dx: number, dy: number, e: PointerEvent) => void;
  } | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | undefined;

  /** The active box with its real height, or null when something else (an arrow) is active. */
  protected box = computed<Box | null>(() => {
    const t = this.drag.active();
    if (t?.kind !== 'box') return null;
    const b = t.value();
    return { ...b, h: Number.isNaN(b.h) ? t.el.offsetHeight : b.h };
  });
  // The controls are drawn over the slide, outside a zoomed layout: slide pixels of a zoomed slide are multiplied by its zoom.
  protected zoom = computed(() => {
    const t = this.drag.active();
    return t ? zoomOf(t.el) : 1;
  });
  protected arrow = computed<Arrow | null>(() => {
    const t = this.drag.active();
    return t?.kind === 'arrow' ? t.value() : null;
  });

  protected cornerStyle(c: Corner) {
    const cursor = c === 'nw' || c === 'se' ? 'nwse-resize' : 'nesw-resize';
    return `${c.includes('n') ? 'top' : 'bottom'}: -6px; ${c.includes('w') ? 'left' : 'right'}: -6px; cursor: ${cursor}`;
  }

  // ---- handles: each pointerdown remembers how to turn pointer movement into a new value
  private begin(e: PointerEvent, apply: (dx: number, dy: number, e: PointerEvent) => void) {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    this.hold = { x: e.clientX, y: e.clientY, apply };
  }

  protected startResize(e: PointerEvent, corner: Corner) {
    const t = this.drag.active();
    const start = this.box();
    if (t?.kind !== 'box' || !start) return;
    this.begin(e, (dx, dy, ev) => t.value.set(resizeBox(start, corner, dx, dy, ev.shiftKey)));
  }

  protected startRotate(e: PointerEvent) {
    const t = this.drag.active();
    const start = this.box();
    if (t?.kind !== 'box' || !start) return;
    const canvas = t.el.closest('.canvas')!.getBoundingClientRect();
    const k = this.ui.canvasScale() * this.zoom();
    const center = { x: start.x + start.w / 2, y: start.y + start.h / 2 };
    this.begin(e, (_dx, _dy, ev) => {
      const pointer = { x: (ev.clientX - canvas.left) / k, y: (ev.clientY - canvas.top) / k };
      t.value.set({ ...t.value(), rot: rotationTo(center, pointer, ev.shiftKey) });
    });
  }

  protected startEnd(e: PointerEvent, which: 1 | 2) {
    const t = this.drag.active();
    if (t?.kind !== 'arrow') return;
    const start = t.value();
    this.begin(e, (dx, dy) => t.value.set(moveArrowEnd(start, which, dx, dy)));
  }

  protected onMove(e: PointerEvent) {
    if (!this.hold) return;
    const k = this.ui.canvasScale() * this.zoom();
    this.hold.apply((e.clientX - this.hold.x) / k, (e.clientY - this.hold.y) / k, e);
  }

  protected end(e: PointerEvent) {
    if (!this.hold) return;
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    this.hold = null;
    this.drag.active()?.commit();
  }

  // ---- keyboard and clicks elsewhere
  protected key(e: KeyboardEvent) {
    const t = this.drag.active();
    if (!t) return;
    if (e.key === 'Escape') {
      this.drag.active.set(null);
      return;
    }
    const d = nudgeDelta(e.key, e.shiftKey);
    if (!d || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    const v = t.value();
    if (t.kind === 'box')
      t.value.set({ ...(v as Box), x: (v as Box).x + d.dx, y: (v as Box).y + d.dy });
    else
      t.value.set({
        x1: (v as Arrow).x1 + d.dx,
        y1: (v as Arrow).y1 + d.dy,
        x2: (v as Arrow).x2 + d.dx,
        y2: (v as Arrow).y2 + d.dy,
      });
    // Holding a key nudges many times: write to the file once, when the keys rest.
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => t.commit(), 400);
  }

  protected outside(e: PointerEvent) {
    const t = this.drag.active();
    if (!t) return;
    const target = e.target as Element;
    if (target.closest('[data-drag-ui]') || t.el.contains(target) || target.closest('.drag-grab'))
      return;
    this.drag.active.set(null);
  }
}
