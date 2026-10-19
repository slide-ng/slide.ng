// Slidev's slide hooks for code inside a slide: `onSlideEnter`, `onSlideLeave` and `isSlideActive()` (Slidev's
// `useIsSlideActive`). Call them in an injection context: a field or the constructor of a component or directive.
import {
  DestroyRef,
  Injector,
  Signal,
  afterNextRender,
  assertInInjectionContext,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { Nav } from './nav';
import { RENDER_CONTEXT, SLIDE_NO } from './slide-context';

/** Gets the slide shown now and the one shown before (undefined when there was none), both 1-based, as in Slidev. */
export type SlideHook = (to: number, from: number | undefined) => void;

// The hooks follow the slide that is presented; thumbnails, the next slide preview and print draw other slides.
const isLive = (context: string) => context === 'slide' || context === 'presenter';

/** True while the slide it is called in is the one on screen. In print every slide is the one on screen. */
export function isSlideActive(): Signal<boolean> {
  assertInInjectionContext(isSlideActive);
  const no = inject(SLIDE_NO);
  const context = inject(RENDER_CONTEXT);
  const nav = inject(Nav, { optional: true });
  if (context === 'print') return computed(() => true);
  if (!nav || !isLive(context)) return computed(() => false);
  return computed(() => nav.no() === no);
}

/** Runs `fn` when this slide becomes the one on screen, also when it already is once the component is drawn. */
export function onSlideEnter(fn: SlideHook): void {
  assertInInjectionContext(onSlideEnter);
  const no = inject(SLIDE_NO);
  watchShown((to, from) => to === no && fn(to, from));
}

/** Runs `fn` when another slide is shown after this one. */
export function onSlideLeave(fn: SlideHook): void {
  assertInInjectionContext(onSlideLeave);
  const no = inject(SLIDE_NO);
  watchShown((to, from) => from === no && fn(to, from));
}

// Like Slidev's watch on the current slide number, started once mounted: `fn` gets every change of the shown slide.
function watchShown(fn: SlideHook) {
  const context = inject(RENDER_CONTEXT);
  const nav = inject(Nav, { optional: true });
  const injector = inject(Injector);
  if (!nav || !isLive(context)) return;
  // A slide created by a move starts from the slide shown before it, as in Slidev, where slides stay mounted.
  let from: number | undefined;
  // A slide that leaves without a transition is destroyed before its effect sees the new number: tell it then.
  inject(DestroyRef).onDestroy(() => {
    const to = untracked(nav.no);
    if (from !== undefined && to !== from) fn(to, from);
  });
  afterNextRender(
    () =>
      effect(
        () => {
          const to = nav.no();
          untracked(() => fn(to, from ?? (nav.previousNo() !== to ? nav.previousNo() : undefined)));
          from = to;
        },
        { injector },
      ),
    { injector },
  );
}
