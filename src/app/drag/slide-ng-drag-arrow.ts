import { Component, ElementRef, computed, effect, inject, input, signal } from '@angular/core';
import { RENDER_CONTEXT, SLIDE_NO } from '../lib/slide-context';
import { Ui } from '../lib/ui-state';
import { Arrow, formatArrow, moveArrow, parseArrow } from './drag-math';
import { DragState, DragTarget, zoomOf } from './drag-state';
import { resolvePos } from './resolve-pos';

// `<slide-ng-drag-arrow pos="x,y,width,height" />` (Slidev's spelling): an arrow from (x, y) to (x + width, y + height). Drag it by its line; its
// two ends get handles (see drag-controls.ts). `pos` may also be a name from the frontmatter's `dragPos`.
@Component({
  selector: 'slide-ng-drag-arrow',
  host: { style: 'position: absolute; inset: 0; pointer-events: none; display: block' },
  templateUrl: './slide-ng-drag-arrow.html',
})
export class SlideNgDragArrow implements Extract<DragTarget, { kind: 'arrow' }> {
  readonly pos = input('');
  readonly site = input<string | null>(null, { alias: 'drag-site' });
  readonly color = input('currentColor');
  readonly width = input(2);

  readonly kind = 'arrow' as const;
  readonly slideNo = inject(SLIDE_NO);
  readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly value = signal<Arrow>({ x1: 0, y1: 0, x2: 0, y2: 0 });
  protected arrow = computed(() => (this.known() ? this.value() : null));
  protected markerId = `drag-arrow-${Math.random().toString(36).slice(2, 8)}`;
  private known = signal(false);
  private state = inject(DragState);
  private ui = inject(Ui, { optional: true });
  protected editable = ['slide', 'presenter'].includes(inject(RENDER_CONTEXT)) && this.ui !== null;
  private grab: { x: number; y: number; start: Arrow } | null = null;

  constructor() {
    effect(() => {
      const text =
        this.state.savedPos(this.slideNo, this.site()) ?? resolvePos(this.slideNo, this.pos());
      const a = parseArrow(text);
      if (a) this.value.set(a);
      this.known.set(!!a);
    });
  }

  protected down(e: PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    this.grab = { x: e.clientX, y: e.clientY, start: this.value() };
    this.state.active.set(this);
  }

  protected move(e: PointerEvent) {
    if (!this.grab) return;
    const k = this.ui!.canvasScale() * zoomOf(this.el);
    this.value.set(
      moveArrow(this.grab.start, (e.clientX - this.grab.x) / k, (e.clientY - this.grab.y) / k),
    );
  }

  protected up(e: PointerEvent) {
    if (!this.grab) return;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    const moved =
      this.grab.start !== this.value() &&
      formatArrow(this.grab.start) !== formatArrow(this.value());
    this.grab = null;
    if (moved) this.commit();
  }

  commit() {
    this.state.save(this.slideNo, this.site(), formatArrow(this.value()));
  }
}
