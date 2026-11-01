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
  templateUrl: './pane-resizers.html',
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

  /** The smallest and the biggest size each handle can give, for a screen reader and for Home and End. */
  protected limits = computed(() => {
    const b = this.boxes();
    const w = b ? b.grid.right - b.grid.left : Infinity;
    const h = b ? b.grid.bottom - b.grid.top : Infinity;
    return {
      width: [clampWidth(0, w), clampWidth(1e9, w)],
      rows: [clampRows(0, h), clampRows(1e9, h)],
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
    this.drag =
      kind === 'width'
        ? { kind, from: e.clientX, start: this.size().width }
        : { kind, from: e.clientY, start: this.shown('rows') };
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

  // The keyboard way (a window splitter): the arrow keys move the border 16 px (64 with Shift) the way they point, Home
  // and End give the notes their smallest and their biggest size.
  protected key(e: KeyboardEvent, kind: 'width' | 'rows') {
    const b = this.boxes();
    if (!b || e.altKey || e.ctrlKey || e.metaKey) return;
    const r = resizers(this.prefs.layout(), this.wide(), this.stacked());
    const step = e.shiftKey ? 64 : 16;
    const toward: Record<string, number> =
      kind === 'width' ? { ArrowLeft: -1, ArrowRight: 1 } : { ArrowUp: -1, ArrowDown: 1 };
    const by = toward[e.key];
    const [min, max] = this.limits()[kind];
    // Moving the border toward the notes makes them smaller.
    const grows = kind === 'width' ? !r.notesOnRight : !r.notesBelow;
    let size: number | null = null;
    if (by) size = this.shown(kind) + (grows ? by : -by) * step;
    else if (e.key === 'Home') size = min;
    else if (e.key === 'End') size = max;
    if (size == null) return;
    e.preventDefault();
    e.stopPropagation(); // not a move through the slides
    if (kind === 'width')
      this.prefs.setPaneSize({ width: clampWidth(size, b.grid.right - b.grid.left) });
    else this.prefs.setPaneSize({ rows: clampRows(size, b.grid.bottom - b.grid.top) });
  }

  // The size on screen (the CSS may hold the row smaller than the saved size).
  private shown(kind: 'width' | 'rows') {
    const b = this.boxes();
    if (kind === 'width' || !b) return this.size()[kind];
    return this.prefs.layout() === 2 ? b.main.bottom - b.main.top : b.note.bottom - b.note.top;
  }

  protected stop() {
    this.drag = null;
  }
}
