import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { PresenterPrefs } from './prefs';
import { clampRows, clampWidth, resizers } from './pane-sizes';
import { T } from '../i18n/t';

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
interface Drag {
  kind: 'width' | 'rows';
  from: number;
  start: number;
}

// The drag handles on the borders of the presenter's notes pane (Slidev's notes resizers). One changes the width of the
// notes column, the other the height of the notes row (in layout 2: the current slide's row). They sit over the grid,
// placed from where the panes are, so the same two handles serve the three layouts. Sizes are kept per layout.
@Component({
  selector: 'app-pane-resizers',
  imports: [T],
  host: { class: 'contents' },
  template: `
    @if (handles(); as h) {
      @if (h.width) {
        <div
          id="pane-resize-width"
          class="pane-resizer pane-resizer-col"
          role="separator"
          aria-orientation="vertical"
          [title]="'presenter.resizeNotes' | t"
          [attr.aria-valuenow]="size().width"
          [style.left.px]="h.width.x"
          [style.top.px]="h.width.top"
          [style.height.px]="h.width.length"
          (pointerdown)="start($event, 'width')"
          (pointermove)="move($event)"
          (pointerup)="stop()"
          (pointercancel)="stop()"
        ></div>
      }
      @if (h.rows) {
        <div
          id="pane-resize-rows"
          class="pane-resizer pane-resizer-row"
          role="separator"
          aria-orientation="horizontal"
          [title]="'presenter.resizeNotesHeight' | t"
          [attr.aria-valuenow]="size().rows"
          [style.top.px]="h.rows.y"
          [style.left.px]="h.rows.left"
          [style.width.px]="h.rows.length"
          (pointerdown)="start($event, 'rows')"
          (pointermove)="move($event)"
          (pointerup)="stop()"
          (pointercancel)="stop()"
        ></div>
      }
    }
  `,
})
export class PaneResizers {
  grid = input.required<HTMLElement>();
  note = input.required<HTMLElement>();
  main = input.required<HTMLElement>();
  next = input.required<HTMLElement>();

  private prefs = inject(PresenterPrefs);
  protected size = this.prefs.paneSize;
  private boxes = signal<{ grid: Box; note: Box; main: Box; next: Box } | null>(null);
  private drag: Drag | null = null;
  // Layout 1's two media cases in presenter.css.
  private wide = signal(false);
  private stacked = signal(false);

  protected handles = computed(() => {
    const b = this.boxes();
    if (!b) return null;
    const r = resizers(this.prefs.layout(), this.wide(), this.stacked());
    const rel = (box: Box) => ({
      left: box.left - b.grid.left,
      right: box.right - b.grid.left,
      top: box.top - b.grid.top,
      bottom: box.bottom - b.grid.top,
    });
    const note = rel(b.note),
      next = rel(b.next),
      main = rel(b.main);
    const layout = this.prefs.layout();
    // The column border runs along the whole column the notes share: with the slide in layout 3, with the next step in
    // layout 1 on a wide page.
    const column =
      layout === 3
        ? { top: note.top, bottom: main.bottom }
        : r.notesOnRight
          ? { top: next.top, bottom: note.bottom }
          : note;
    return {
      width: r.width && {
        x: r.notesOnRight ? note.left : note.right,
        top: column.top,
        length: column.bottom - column.top,
      },
      rows: r.rows && {
        // Layout 2: the border between the current slide and the next step; otherwise the notes' own edge.
        y: layout === 2 ? next.top : r.notesBelow ? note.top : note.bottom,
        left: layout === 2 ? next.left : note.left,
        length: layout === 2 ? next.right - next.left : note.right - note.left,
      },
    };
  });

  constructor() {
    const measure = () => {
      const box = (e: HTMLElement) => e.getBoundingClientRect();
      this.boxes.set({
        grid: box(this.grid()),
        note: box(this.note()),
        main: box(this.main()),
        next: box(this.next()),
      });
    };
    const wide = matchMedia('(min-aspect-ratio: 1/1)');
    const stacked = matchMedia('(max-aspect-ratio: 3/5)');
    const media = () => {
      this.wide.set(wide.matches);
      this.stacked.set(stacked.matches);
    };
    media();
    wide.addEventListener('change', media);
    stacked.addEventListener('change', media);
    const observer = new ResizeObserver(measure);
    effect(() => {
      observer.disconnect();
      for (const e of [this.grid(), this.note(), this.main(), this.next()]) observer.observe(e);
    });
    // A new layout or size moves the panes without resizing every one of them.
    effect(() => {
      this.prefs.layout();
      this.size();
      requestAnimationFrame(measure);
    });
    inject(DestroyRef).onDestroy(() => {
      observer.disconnect();
      wide.removeEventListener('change', media);
      stacked.removeEventListener('change', media);
    });
  }

  protected start(e: PointerEvent, kind: 'width' | 'rows') {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const b = this.boxes();
    // The row starts from what is on screen (the CSS may hold it smaller than the saved size).
    const shown = !b
      ? this.size().rows
      : this.prefs.layout() === 2
        ? b.main.bottom - b.main.top
        : b.note.bottom - b.note.top;
    this.drag =
      kind === 'width'
        ? { kind, from: e.clientX, start: this.size().width }
        : { kind, from: e.clientY, start: shown };
  }

  protected move(e: PointerEvent) {
    const d = this.drag,
      b = this.boxes();
    if (!d || !b) return;
    const r = resizers(this.prefs.layout(), this.wide(), this.stacked());
    if (d.kind === 'width') {
      const delta = e.clientX - d.from;
      const width = clampWidth(
        r.notesOnRight ? d.start - delta : d.start + delta,
        b.grid.right - b.grid.left,
      );
      this.prefs.setPaneSize({ width });
    } else {
      const delta = e.clientY - d.from;
      const rows = clampRows(
        r.notesBelow ? d.start - delta : d.start + delta,
        b.grid.bottom - b.grid.top,
      );
      this.prefs.setPaneSize({ rows });
    }
  }

  protected stop() {
    this.drag = null;
  }
}
