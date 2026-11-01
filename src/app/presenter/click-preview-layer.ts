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
import { T } from '../i18n/t';

const AHEAD = 'slide-ng-click-ahead';
const NEXT = 'slide-ng-click-next';
const HIDES = 'slide-ng-click-hides';
const AT = 'data-slide-ng-click-at';
// A finished move of one of these properties can put an element somewhere else, so the badges are measured again.
const MOVES =
  /^(transform|translate|scale|rotate|top|left|right|bottom|width|height|margin|padding)/;

// A badge is 24 by 24 screen pixels however small the presenter draws the slide (a target size a finger or a shaky hand
// can hit), so in slide pixels it is 24 divided by the canvas scale.
const BADGE = 24;

interface Badge {
  at: number;
  isNext: boolean;
  hides: boolean;
  /** from the inline start of the canvas: the left edge, or the right edge in a right-to-left part */
  x: number;
  y: number;
  rtl: boolean;
}

// The presenter's click preview (slide.ng's own): over the presenter's current slide, the parts that later clicks show
// are drawn greyed out and the next one highlighted (classes from styles/presenter.css), each with a badge holding
// its click. A click on a badge or on a greyed-out part goes to that click in every window. It sits in the canvas.
@Component({
  selector: 'app-click-preview',
  imports: [T],
  host: {
    style: 'position: absolute; inset: 0; pointer-events: none; z-index: 30',
    // While drawing, a pen tap on a badge is a stroke, not a jump.
    '[class.slide-ng-ghost-drawing]': 'drawing()',
  },
  templateUrl: './click-preview-layer.html',
})
export class ClickPreviewLayer {
  private nav = inject(Nav);
  private ui = inject(Ui);
  private drawings = inject(Drawings);
  private host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected badges = signal<Badge[]>([]);
  protected drawing = () => this.drawings.available && this.drawings.enabled();
  private tagged = new Set<Element>();
  /** Greyed-out parts hidden from screen readers here: they are not shown yet, and the next slide pane reads them already. */
  private muted = new Set<Element>();
  /** Greyed-out parts whose `inert` (slide-ng-click.ts: a part not revealed yet) is taken off while they are ghosts, so a
   *  click on one reaches clickPart; it is put back when the preview lets go of a part that is still not revealed. */
  private wokeUp = new Set<Element>();
  /** What a ghost holds is made inert here (links, buttons, inputs): hidden from screen readers, it must not be a Tab stop
   *  either. The ghost itself stays clickable; the badges are the keyboard path. Put back on each apply. */
  private sealed = new Set<Element>();
  /** A ghost (or a part around another ghost) that is itself focusable gets tabindex -1 here; its own value, to put back. */
  private untabbed = new Map<Element, string | null>();
  private moved = signal(0);
  private resized?: ResizeObserver;

  constructor() {
    // After the slide has applied its own click classes, so the measured places are the ones on screen.
    afterRenderEffect(() => {
      this.badges();
      if (!this.refocus) return;
      this.refocus = false;
      untracked(() => this.moveFocus());
    });
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

  protected go(at: number, e?: MouseEvent) {
    if (this.drawing()) return;
    // From the keyboard the badge goes away with the jump: the focus moves on to the badge of the click after it.
    if (e?.detail === 0) this.refocus = true;
    this.nav.ctx()?.setCurrent(at);
  }
  private refocus = false;

  // The next badge (the lowest click), or the current slide's pane when there is none left, so the focus is not lost.
  private moveFocus() {
    const next = Array.from(this.host.querySelectorAll<HTMLElement>('.slide-ng-ghost-badge')).sort(
      (a, b) => +a.dataset['click']! - +b.dataset['click']!,
    )[0];
    if (next) return next.focus({ preventScroll: true });
    const pane = this.host.closest<HTMLElement>('[role="region"]');
    if (!pane) return;
    if (!pane.hasAttribute('tabindex')) pane.setAttribute('tabindex', '-1');
    pane.focus({ preventScroll: true });
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
    this.unseal();
    const keep = new Set(marks.map((m) => m.el));
    for (const el of this.tagged) {
      if (keep.has(el)) continue;
      el.classList.remove(AHEAD, NEXT, HIDES);
      el.removeAttribute(AT);
      this.mute(el, false);
      this.wake(el, false);
      this.tagged.delete(el);
      this.resized?.unobserve(el);
    }
    const canvas = this.host.parentElement;
    if (!canvas) return this.badges.set([]);
    const box = canvas.getBoundingClientRect();
    const scale = box.width / (canvas.offsetWidth || 1) || 1;
    this.host.style.setProperty('--slide-ng-badge-unscale', String(1 / scale));
    const size = BADGE / scale;
    const badges: Badge[] = [];
    for (const { el, at, isNext, hides } of marks) {
      el.classList.add(AHEAD);
      el.classList.toggle(NEXT, isNext);
      el.classList.toggle(HIDES, !!hides);
      el.setAttribute(AT, String(at));
      this.mute(el, el.classList.contains('slidev-vclick-hidden'));
      this.wake(el, el.classList.contains('slidev-vclick-hidden'));
      if (!this.tagged.has(el)) this.resized?.observe(el);
      this.tagged.add(el);
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue; // not laid out (display: none, a switch's other child)
      const y = Math.max(0, (r.top - box.top) / scale);
      // At the part's inline start: its left edge, or its right edge when it reads right to left.
      const rtl = getComputedStyle(el).direction === 'rtl';
      let x = Math.max(0, (rtl ? box.right - r.right : r.left - box.left) / scale);
      // Parts that start at the same place (an empty switch above the next block) get their badges side by side.
      while (
        badges.some((o) => o.rtl === rtl && Math.abs(o.x - x) < size && Math.abs(o.y - y) < size)
      )
        x += size;
      badges.push({ at, isNext, hides: !!hides, x, y, rtl });
    }
    for (const el of this.tagged) if (this.isGhost(el)) this.seal(el);
    this.badges.set(badges);
  }

  private isGhost(el: Element) {
    return this.tagged.has(el) && el.classList.contains('slidev-vclick-hidden');
  }

  // A ghost takes no focus and its content is inert, but a ghost inside it keeps its own click: the part around it is
  // only taken out of the Tab order and its other children are made inert.
  private seal(el: Element) {
    if ((el as HTMLElement).tabIndex >= 0 && !this.untabbed.has(el)) {
      this.untabbed.set(el, el.getAttribute('tabindex'));
      el.setAttribute('tabindex', '-1');
    }
    for (const child of el.children) {
      if (this.isGhost(child)) continue;
      if ([...this.tagged].some((g) => g !== child && child.contains(g) && this.isGhost(g)))
        this.seal(child);
      else if (!child.hasAttribute('inert')) {
        child.setAttribute('inert', '');
        this.sealed.add(child);
      }
    }
  }

  // Only what seal changed is put back: the content of a part that is no longer a ghost is focusable again.
  private unseal() {
    for (const el of this.sealed) el.removeAttribute('inert');
    this.sealed.clear();
    for (const [el, tabindex] of this.untabbed)
      if (tabindex == null) el.removeAttribute('tabindex');
      else el.setAttribute('tabindex', tabindex);
    this.untabbed.clear();
  }

  // Only the aria-hidden set here is taken off again, not one the deck wrote.
  private mute(el: Element, on: boolean) {
    if (on && !this.muted.has(el) && !el.hasAttribute('aria-hidden')) {
      el.setAttribute('aria-hidden', 'true');
      this.muted.add(el);
    } else if (!on && this.muted.delete(el)) el.removeAttribute('aria-hidden');
  }

  // An inert element takes no clicks at all, so a ghost could not be clicked to go to its click. Only the inert taken off
  // here is put back, and only on a part that is still not revealed (a revealed one is not inert any more).
  private wake(el: Element, on: boolean) {
    if (on) {
      if (el.hasAttribute('inert')) {
        el.removeAttribute('inert');
        this.wokeUp.add(el);
      }
    } else if (this.wokeUp.delete(el) && el.classList.contains('slidev-vclick-hidden'))
      el.setAttribute('inert', '');
  }
}
