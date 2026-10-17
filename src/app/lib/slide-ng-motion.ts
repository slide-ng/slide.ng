// A small substitute for Slidev's v-motion (which uses @vueuse/motion). Moves an element
// between variants with CSS transitions:
//   <div slide-ng-motion :initial="{ x: -80 }" :enter="{ x: 0 }" :click-1="{ y: 30 }" :leave="{ x: 80 }">
// The generator turns the `:name="..."` attributes into one `[slide-ng-motion]` object.
// Not supported: springs, `hovered`/`tapped`/`variants`, keyframe arrays (see docs/STATUS.md).
import { Directive, ElementRef, OnDestroy, OnInit, effect, inject, input } from '@angular/core';
import { ClicksContext } from './clicks';
import { Nav } from './nav';
import { RENDER_CONTEXT, SLIDE_NO } from './slide-context';
import { Phase, Variants, mixVariants, toStyle, toTransition, touchedKeys } from './motion-style';
import { SlideNgClick } from './slide-ng-click';

@Directive({ selector: '[slide-ng-motion]' })
export class SlideNgMotion implements OnInit, OnDestroy {
  variants = input<Variants | string>({}, { alias: 'slide-ng-motion' });

  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private clicks = inject(ClicksContext);
  private nav = inject(Nav, { optional: true });
  private slideNo = inject(SLIDE_NO);
  private context = inject(RENDER_CONTEXT);
  private click = inject(SlideNgClick, { optional: true, self: true }); // slide-ng-click on the same element drives the phase
  private started = false;
  private keys: unknown[] = [];

  constructor() {
    effect(() => this.update());
  }

  private get all(): Variants {
    const v = this.variants();
    return typeof v === 'object' ? v : {};
  }

  // `click-N` variants add clicks to the slide, like slide-ng-click does.
  ngOnInit() {
    for (const key of Object.keys(this.all)) {
      const m = /^click-(\d+)(?:-(\d+))?$/.exec(key);
      if (!m) continue;
      const info = this.clicks.calculate(m[2] ? [+m[1], +m[2]] : +m[1]);
      const owner = {};
      this.keys.push(owner);
      this.clicks.register(owner, info);
    }
  }

  ngOnDestroy() {
    for (const k of this.keys) this.clicks.unregister(k);
  }

  private phase(): Phase {
    const current = this.nav?.no() ?? this.slideNo;
    if (this.slideNo < current) return 'leave';
    if (this.slideNo > current) return 'initial';
    const info = this.click?.info();
    if (info && this.click?.state.hidden())
      return this.clicks.current() >= info.end ? 'leave' : 'initial';
    return 'enter';
  }

  private update() {
    const variants = this.all;
    const keys = touchedKeys(variants);
    const live = ['slide', 'presenter'].includes(this.context);
    // Thumbnails and print show the end state, nothing moves there.
    const mixed = live
      ? mixVariants(variants, this.phase(), this.clicks.current())
      : mixVariants(variants, 'enter', 'all');
    const css = toStyle(mixed, keys);
    if (live && !this.started) {
      // Start from `initial` without animating, so that `enter` has something to move from.
      this.set(toStyle(mixVariants(variants, 'initial', 0), keys), '');
      void this.el.offsetWidth; // makes the browser take that state before we change it
    }
    this.started = true;
    this.set(
      css,
      live
        ? toTransition(
            mixed,
            Object.keys(css).map((k) => (k === 'transform' ? 'transform' : k)),
          )
        : '',
    );
  }

  private set(css: Record<string, string>, transition: string) {
    this.el.style.transition = transition;
    Object.assign(this.el.style, css);
  }
}
