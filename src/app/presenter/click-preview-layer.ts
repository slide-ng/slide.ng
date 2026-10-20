import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { Drawings } from '../drawing/drawings';
import { Nav } from '../lib/nav';
import { Ui } from '../lib/ui-state';
import { PreviewMark, previewMarks } from './click-preview';

const AHEAD = 'slide-ng-click-ahead';
const NEXT = 'slide-ng-click-next';
const AT = 'data-slide-ng-click-at';
// A finished move of one of these properties can put an element somewhere else, so the badges are measured again.
const MOVES =
  /^(transform|translate|scale|rotate|top|left|right|bottom|width|height|margin|padding)/;

const BADGE = 16; // about the size of a badge, in slide pixels

interface Badge {
  at: number;
  isNext: boolean;
  x: number;
  y: number;
}

// The presenter's click preview (slide.ng's own): over the presenter's current slide, the parts that later clicks show
// are drawn greyed out and the next one highlighted (classes from styles/presenter.css), each with a badge holding
// its click. A click on a badge or on a greyed-out part goes to that click in every window. It sits in the canvas.
@Component({
  selector: 'app-click-preview',
  host: {
    style: 'position: absolute; inset: 0; pointer-events: none; z-index: 30',
    // While drawing, a pen tap on a badge is a stroke, not a jump.
    '[class.slide-ng-ghost-drawing]': 'drawing()',
  },
  template: `
    @for (b of badges(); track $index) {
      <button
        type="button"
        class="slide-ng-ghost-badge"
        [class.slide-ng-ghost-badge-next]="b.isNext"
        [style.left.px]="b.x"
        [style.top.px]="b.y"
        [attr.data-click]="b.at"
        [title]="'Go to click ' + b.at"
        (click)="go(b.at)"
      >
        {{ b.at }}
      </button>
    }
  `,
})
export class ClickPreviewLayer {
  private nav = inject(Nav);
  private ui = inject(Ui);
  private drawings = inject(Drawings);
  private host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected badges = signal<Badge[]>([]);
  protected drawing = () => this.drawings.available && this.drawings.enabled();
  private tagged = new Set<Element>();
  private moved = signal(0);
  private resized?: ResizeObserver;

  constructor() {
    // After the slide has applied its own click classes, so the measured places are the ones on screen.
    afterRenderEffect(() => {
      const ctx = this.nav.ctx();
      this.ui.canvasScale();
      this.moved();
      const marks =
        ctx && this.nav.ready() ? previewMarks(ctx.parts(), ctx.current(), ctx.total()) : [];
      untracked(() => this.apply(marks));
    });
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const canvas = this.host.parentElement!;
      const onClick = (e: Event) => this.clickPart(e);
      const remeasure = () => this.moved.update((n) => n + 1);
      const onMoved = (e: TransitionEvent) => {
        if (MOVES.test(e.propertyName)) remeasure();
      };
      // Captured, so a greyed-out part's own link or button does not run before the jump.
      canvas.addEventListener('click', onClick, true);
      canvas.addEventListener('transitionend', onMoved);
      // A picture or a web font that arrives later moves the content under the badges.
      canvas.addEventListener('load', remeasure, true);
      document.fonts?.addEventListener('loadingdone', remeasure);
      this.resized = new ResizeObserver(remeasure);
      for (const el of this.tagged) this.resized.observe(el);
      destroyRef.onDestroy(() => {
        canvas.removeEventListener('click', onClick, true);
        canvas.removeEventListener('transitionend', onMoved);
        canvas.removeEventListener('load', remeasure, true);
        document.fonts?.removeEventListener('loadingdone', remeasure);
        this.resized?.disconnect();
      });
    });
    destroyRef.onDestroy(() => this.apply([]));
  }

  protected go(at: number) {
    if (this.drawing()) return;
    this.nav.ctx()?.setCurrent(at);
  }

  // Only a part that is not on screen yet: a part already shown keeps its own clicks (links, buttons).
  private clickPart(e: Event) {
    if (this.drawing() || !(e.target instanceof Element)) return;
    const el = e.target.closest(`.${AHEAD}.slidev-vclick-hidden`);
    if (!el || !this.tagged.has(el)) return;
    e.preventDefault();
    e.stopPropagation();
    this.go(+el.getAttribute(AT)!);
  }

  private apply(marks: PreviewMark[]) {
    const keep = new Set(marks.map((m) => m.el));
    for (const el of this.tagged) {
      if (keep.has(el)) continue;
      el.classList.remove(AHEAD, NEXT);
      el.removeAttribute(AT);
      this.tagged.delete(el);
      this.resized?.unobserve(el);
    }
    const canvas = this.host.parentElement;
    if (!canvas) return this.badges.set([]);
    const box = canvas.getBoundingClientRect();
    const scale = box.width / (canvas.offsetWidth || 1) || 1;
    const badges: Badge[] = [];
    for (const { el, at, isNext } of marks) {
      el.classList.add(AHEAD);
      el.classList.toggle(NEXT, isNext);
      el.setAttribute(AT, String(at));
      if (!this.tagged.has(el)) this.resized?.observe(el);
      this.tagged.add(el);
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue; // not laid out (display: none, a switch's other child)
      const y = Math.max(0, (r.top - box.top) / scale);
      let x = Math.max(0, (r.left - box.left) / scale);
      // Parts that start at the same place (an empty switch above the next block) get their badges side by side.
      while (badges.some((o) => Math.abs(o.x - x) < BADGE && Math.abs(o.y - y) < BADGE)) x += BADGE;
      badges.push({ at, isNext, x, y });
    }
    this.badges.set(badges);
  }
}
