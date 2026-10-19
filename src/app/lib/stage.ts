import { ComponentRef, ViewContainerRef } from '@angular/core';
import { mountSlide } from './mount-slide';
import { RenderContext } from './slide-context';
import { SlideBase } from './slide-base';
import { Running, classTransition } from './class-transition';
import {
  ResolvedTransition,
  animationsFor,
  isClassTransition,
  transitionDuration,
} from './transitions';

/**
 * Puts slides on the canvas, one at a time, and plays the transition between two of them.
 * While a transition runs, the old and the new slide are both in the page (stacked, see styles.css).
 */
export class Stage {
  private current?: ComponentRef<SlideBase>;
  private leaving: ComponentRef<SlideBase>[] = [];
  private pendingSwap?: () => void; // a view transition that has not swapped the slides yet
  private running: Running[] = []; // class transitions (a custom name) that have not ended

  constructor(
    private host: ViewContainerRef,
    private canvas: HTMLElement,
    private context: RenderContext = 'slide',
    private mount = mountSlide, // replaceable in tests
  ) {}

  /** Removes the slide on screen (the 404 page takes its place). */
  clear() {
    this.finish();
    this.current?.destroy();
    this.current = undefined;
  }

  /** Shows slide `no`. `transition` is resolved for this direction (see transitions.ts) or null. */
  show(no: number, transition: ResolvedTransition | null): SlideBase {
    this.finish(); // a transition still running is cut short
    const old = this.current;
    if (!old || !transition) old?.destroy();
    this.current = this.mount(this.host, no, this.context);
    this.current.changeDetectorRef.detectChanges(); // draw it now, so an animation can start on real content

    if (old && transition?.name === 'view-transition') this.viewTransition(old, this.current);
    else if (old && transition && isClassTransition(transition))
      this.classes(old, this.current, transition);
    else if (old && transition) this.animate(old, this.current, transition.name);
    return this.current.instance;
  }

  // The new slide is created at once but stays out of the page. The browser takes a picture of the old page,
  // we remove the old slide and reveal the new one, and the browser cross-fades between the two.
  private viewTransition(old: ComponentRef<SlideBase>, entering: ComponentRef<SlideBase>) {
    if (!('startViewTransition' in document)) return old.destroy(); // no support: switch without animation
    const element: HTMLElement = entering.location.nativeElement;
    let done = false;
    const swap = () => {
      if (done) return;
      done = true;
      this.pendingSwap = undefined;
      old.destroy();
      element.style.display = '';
    };
    // display:none, not visibility:hidden: a hidden element still counts when the browser captures the old page, so a
    // view-transition-name shared by both slides was a duplicate and the browser skipped the transition.
    element.style.display = 'none';
    this.pendingSwap = swap;
    (
      document as Document & { startViewTransition(update: () => void): unknown }
    ).startViewTransition(swap);
  }

  private animate(old: ComponentRef<SlideBase>, entering: ComponentRef<SlideBase>, name: string) {
    const ms = transitionDuration();
    const pair = animationsFor(name, ms);
    if (!pair) {
      old.destroy();
      return;
    }
    this.canvas.dataset['transition'] = name; // visible to tests and to CSS
    this.leaving.push(old);
    const options = { duration: ms, easing: 'ease' } as const;
    // The entering slide holds its first frame during a delay; the leaving one holds its last frame until removed.
    const enter = entering.location.nativeElement.animate(pair.enter, {
      ...options,
      fill: 'backwards',
      ...pair.enterOptions,
    });
    const leave = old.location.nativeElement.animate(pair.leave, {
      ...options,
      fill: 'forwards',
      ...pair.leaveOptions,
    });
    // Both are done (fade-out delays the entering one): the old slide can go.
    Promise.all([enter.finished, leave.finished]).then(
      () => this.cleanUp(old),
      () => {},
    ); // cancelled: finish() cleans
  }

  // A name that is not built in (or an object with class names): the deck's CSS classes do the work, as in Slidev.
  private classes(
    old: ComponentRef<SlideBase>,
    entering: ComponentRef<SlideBase>,
    transition: ResolvedTransition,
  ) {
    this.canvas.dataset['transition'] = transition.name;
    this.leaving.push(old);
    const run = classTransition(
      entering.location.nativeElement,
      old.location.nativeElement,
      transition,
    );
    this.running.push(run);
    run.finished.then(() => {
      this.running = this.running.filter((r) => r !== run);
      this.cleanUp(old);
    });
  }

  private cleanUp(old: ComponentRef<SlideBase>) {
    if (!this.leaving.includes(old)) return;
    old.destroy();
    this.leaving = this.leaving.filter((r) => r !== old);
    if (!this.leaving.length) delete this.canvas.dataset['transition'];
  }

  // Cut a running transition short: remove the old slides now and stop the animations.
  private finish() {
    this.pendingSwap?.();
    this.running.forEach((run) => run.cancel());
    this.running = [];
    this.leaving.forEach((ref) => ref.destroy());
    this.leaving = [];
    delete this.canvas.dataset['transition'];
    this.current?.location.nativeElement.getAnimations().forEach((a: Animation) => a.cancel());
  }
}
