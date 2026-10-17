import { Directive, ElementRef, effect, inject, input, signal } from '@angular/core';
import { Ui } from '../lib/ui-state';
import { RENDER_CONTEXT, SLIDE_NO } from '../lib/slide-context';
import { Box, formatBox, moveBox, parseBox } from './drag-math';
import { DragState, DragTarget, zoomOf } from './drag-state';
import { resolvePos } from './resolve-pos';

// `<img slide-ng-drag="[x, y, w, h]">` or `slide-ng-drag="name"` (with `dragPos: { name: x,y,w,h }` in the frontmatter) or just `slide-ng-drag`.
// The element is put at that place on the slide, and can be moved with the mouse. The numbers are
// slide pixels. The generator adds `drag-site="N"`, which says which slide-ng-drag of the slide this is.
@Directive({
  selector: '[slide-ng-drag]',
  host: {
    '(pointerdown)': 'down($event)',
    '(pointermove)': 'move($event)',
    '(pointerup)': 'up($event)',
    '(pointercancel)': 'up($event)',
  },
})
export class SlideNgDrag implements Extract<DragTarget, { kind: 'box' }> {
  readonly text = input('', { alias: 'slide-ng-drag' });
  readonly site = input<string | null>(null, { alias: 'drag-site' });

  readonly kind = 'box' as const;
  readonly slideNo = inject(SLIDE_NO);
  readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly value = signal<Box>({ x: 0, y: 0, w: 0, h: NaN, rot: 0 });
  private placed = false; // has the element been given an absolute place yet?
  private grab: { x: number; y: number; start: Box } | null = null;
  private state = inject(DragState);
  private ui = inject(Ui, { optional: true });
  private editable = ['slide', 'presenter'].includes(inject(RENDER_CONTEXT)) && this.ui !== null;

  constructor() {
    // The place written in the slide (or chosen in this session) -> the box.
    effect(() => {
      const text =
        this.state.savedPos(this.slideNo, this.site()) ?? resolvePos(this.slideNo, this.text());
      const box = parseBox(text);
      if (box) this.value.set(box);
      this.placed = !!box;
    });
    effect(() => this.apply(this.value()));
    if (this.editable) this.el.style.cursor = 'move';
  }

  private apply(b: Box) {
    if (!this.placed) return;
    const s = this.el.style;
    s.position = 'absolute';
    s.left = `${b.x}px`;
    s.top = `${b.y}px`;
    s.width = `${b.w}px`;
    s.height = Number.isNaN(b.h) ? 'auto' : `${b.h}px`;
    s.margin = '0';
    s.transform = b.rot ? `rotate(${b.rot}deg)` : '';
  }

  /** Where the element is now, in slide pixels, for an element that has no place yet. */
  private natural(): Box {
    const canvas = this.el.closest('.canvas')!.getBoundingClientRect();
    const r = this.el.getBoundingClientRect();
    const k = this.ui!.canvasScale() * zoomOf(this.el); // a zoomed slide scales its pixels too
    return {
      x: (r.left - canvas.left) / k,
      y: (r.top - canvas.top) / k,
      w: r.width / k,
      h: NaN,
      rot: 0,
    };
  }

  protected down(e: PointerEvent) {
    if (!this.editable || e.button !== 0) return;
    e.preventDefault();
    if (!this.placed) {
      this.value.set(this.natural());
      this.placed = true;
    }
    this.el.setPointerCapture(e.pointerId);
    this.grab = { x: e.clientX, y: e.clientY, start: this.value() };
    this.state.active.set(this);
  }

  protected move(e: PointerEvent) {
    if (!this.grab) return;
    const k = this.ui!.canvasScale() * zoomOf(this.el); // a zoomed slide scales its pixels too
    this.value.set(
      moveBox(this.grab.start, (e.clientX - this.grab.x) / k, (e.clientY - this.grab.y) / k),
    );
  }

  protected up(e: PointerEvent) {
    if (!this.grab) return;
    this.el.releasePointerCapture?.(e.pointerId);
    const moved = this.grab.start.x !== this.value().x || this.grab.start.y !== this.value().y;
    this.grab = null;
    if (moved) this.commit();
  }

  commit() {
    this.state.save(this.slideNo, this.site(), formatBox(this.value(), 'plain'));
  }
}
