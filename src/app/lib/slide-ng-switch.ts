// <slide-ng-switch> shows one child at a time, one per click. Port of Slidev's SlideNgSwitch, where the
// children are slots named 1, 2, 5-7. Here the children are elements with an `at` attribute:
//   <slide-ng-switch><div at="1">first</div><div at="2">second</div><div at="3-5">third, for 3 clicks</div></slide-ng-switch>
// `unmount` takes the hidden children out of the page; `transition="fade"` (or another slide transition name) animates the change.
// A name that is not built in runs Vue's classes (`swing-enter-from`, `swing-enter-active`, ...) with the deck's CSS, as in Slidev.
// Slidev's `tag` and `childTag` have no use here: the children are the elements written inside, not slots to wrap.
import {
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  booleanAttribute,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { ClicksContext, RawSingleAt } from './clicks';
import { Nav } from './nav';
import { RENDER_CONTEXT } from './slide-context';
import { Running, classTransitionSide } from './class-transition';
import {
  animationsFor,
  isClassTransition,
  resolveTransition,
  transitionDuration,
} from './transitions';

interface Slot {
  el: Element;
  start: number;
  end: number;
}

// `transition` as written: a name, or a bare `transition` / "true" for a fade; "false" or nothing is none.
export function switchTransition(value: unknown): string | false {
  if (value == null || value === false || value === 'false') return false;
  if (value === true || value === '' || value === 'true') return 'fade';
  return String(value);
}

// Slidev's rule: a single number lasts until the next slot starts; `a-b` is explicit.
export function parseSlots(items: { el: Element; at: string }[]): Slot[] {
  const sorted = [...items].sort((a, b) => parseInt(b.at) - parseInt(a.at)); // biggest start first
  let lastStart: number | undefined;
  return sorted.map(({ el, at }) => {
    if (/^\d+$/.test(at)) {
      const slot = { el, start: +at, end: lastStart ?? +at + 1 };
      lastStart = +at;
      return slot;
    }
    const [start, end] = at.split('-').map(Number);
    if (!Number.isFinite(start) || !Number.isFinite(end))
      throw new Error(`Invalid range for slide-ng-switch: ${at}`);
    lastStart = start;
    return { el, start, end };
  });
}

@Component({
  selector: 'slide-ng-switch',
  template: '<ng-content />',
  host: { style: 'display: block' },
})
export class SlideNgSwitch implements OnInit, OnDestroy {
  at = input<RawSingleAt>('+1');
  unmount = input(false, { transform: booleanAttribute });
  transition = input<string | false, unknown>(false, { transform: switchTransition });
  private ctx = inject(ClicksContext);
  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private injector = inject(Injector);
  private nav = inject(Nav);
  // Only the real slide animates; thumbnails and print show the state at once.
  private animates = ['slide', 'presenter'].includes(inject(RENDER_CONTEXT));
  private leaving = new Map<Element, Animation | Omit<Running, 'left'>>();
  private entering = new Map<Element, Omit<Running, 'left'>>();
  private places = new Map<Element, Comment>(); // where an unmounted child goes back

  ngOnInit() {
    const items = Array.from(this.el.children)
      .filter((c) => c.hasAttribute('at'))
      .map((el) => ({ el, at: el.getAttribute('at')! }));
    const slots = parseSlots(items);
    const size = Math.max(...slots.map((s) => s.end)) - 1;
    const info = this.ctx.calculateSince(this.at(), size);
    // The switch changes where a child starts or ends, counted from the switch's own first click.
    const steps = info ? slots.flatMap((s) => [s.start, s.end].map((c) => info.start + c - 1)) : [];
    if (info) this.ctx.register(this, info, { el: this.el, steps });

    for (const { el, start, end } of slots) {
      el.classList.add('slidev-vclick-target');
      el.setAttribute('data-slidev-clicks-start', String(start));
      el.setAttribute('data-slidev-clicks-end', String(end));
      if (this.unmount()) {
        const place = document.createComment('slide-ng-switch');
        el.before(place);
        this.places.set(el, place);
      }
      let shown: boolean | undefined;
      effect(
        () => {
          // 1 = the click where the switch starts; before that nothing is shown.
          const offset = info ? this.ctx.current() - info.start + 1 : 0;
          const visible = start <= offset && offset < end;
          el.classList.toggle('slidev-vclick-current', offset === start);
          el.classList.toggle('slidev-vclick-prior', offset >= end);
          if (visible === shown) return;
          const animate = shown !== undefined && this.animates;
          shown = visible;
          untracked(() => (visible ? this.show(el, animate) : this.hide(el, animate)));
        },
        { injector: this.injector },
      );
    }
  }

  // The animation for this change, as Slidev's TransitionGroup would run it (going back uses the backward name of a pair).
  private animation(kind: 'enter' | 'leave') {
    const resolved = this.resolved();
    if (!resolved || isClassTransition(resolved)) return null;
    const ms = transitionDuration();
    const pair = animationsFor(resolved.name, ms);
    if (!pair) return null;
    const options = kind === 'enter' ? pair.enterOptions : pair.leaveOptions;
    return { keyframes: pair[kind], options: { duration: ms, easing: 'ease', ...options } };
  }

  private resolved() {
    return resolveTransition(this.transition() || null, this.nav.direction() < 0);
  }

  // A custom name: the deck's CSS classes, one side at a time.
  private classSide(el: Element, kind: 'enter' | 'leave') {
    const resolved = this.resolved();
    if (!resolved || !isClassTransition(resolved) || !(el instanceof HTMLElement)) return null;
    return classTransitionSide(el, resolved, kind);
  }

  private show(el: Element, animate: boolean) {
    this.leaving.get(el)?.cancel();
    this.leaving.delete(el);
    this.entering.get(el)?.cancel();
    this.entering.delete(el);
    const place = this.places.get(el);
    if (place && el.previousSibling !== place) place.after(el);
    el.classList.remove('slidev-vclick-display-none');
    if (!animate) return;
    const enter = this.animation('enter');
    if (enter) {
      el.animate(enter.keyframes, enter.options);
      return;
    }
    const side = this.classSide(el, 'enter');
    if (!side) return;
    this.entering.set(el, side);
    void side.finished.then(() => this.entering.get(el) === side && this.entering.delete(el));
  }

  private hide(el: Element, animate: boolean) {
    this.entering.get(el)?.cancel();
    this.entering.delete(el);
    const done = () => {
      el.classList.add('slidev-vclick-display-none');
      if (this.places.has(el)) el.remove();
    };
    const leave = animate ? this.animation('leave') : null;
    if (leave) {
      const animation = el.animate(leave.keyframes, { ...leave.options, fill: 'forwards' });
      this.leaving.set(el, animation);
      animation.onfinish = () => {
        this.leaving.delete(el);
        animation.cancel();
        done();
      };
      return;
    }
    const side = animate ? this.classSide(el, 'leave') : null;
    if (!side) return done();
    this.leaving.set(el, side);
    // Shown again before the end (`show` cancels the side and removes it here): it stays.
    void side.finished.then(() => {
      if (this.leaving.get(el) !== side) return;
      this.leaving.delete(el);
      done();
    });
  }

  ngOnDestroy() {
    this.ctx.unregister(this);
  }
}
