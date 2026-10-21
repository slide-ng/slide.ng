// Headmatter `preloadImages` (port of Slidev's usePreloadImages): after each move, in idle time, the pictures of the slide on
// screen, the one before and the next `ahead` ones (default 3) are loaded, so they are ready when their slide is shown; 3 seconds
// after the page has loaded, every slide's, unless the connection is slow or saves data. At most two pictures load at a time, and
// the ones near the slide on screen go first, so on a slow network the rest of the deck does not hold up the current slide.
// The generator lists each slide's pictures (scripts/lib/slide-images.mjs); `preload: false` on a slide leaves its own out.
// `preloadProgress` and `preloadComplete` say how far it is; a picture that fails counts as done.
import { DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { HEADMATTER, SLIDES } from '../../slides/generated';

const RETRY_LIMIT = 2;
const AT_ONCE = 2;
// Pictures that are done: loaded, or given up on after the retries (a missing file), so the progress still reaches 1.
const settled = new Set<string>();
const loading = new Set<string>();
// `first`: a picture of the slides around the one on screen, which goes before the rest of the deck (also when it is retried).
interface Wanted {
  key: string;
  url: string;
  first: boolean;
}
// Pictures waiting for a free place, the most wanted first.
const waiting: Wanted[] = [];
const retries = new Map<string, number>();
const settledCount = signal(0);
const settle = (key: string) => {
  settled.add(key);
  retries.delete(key);
  settledCount.set(settled.size);
};

const absolute = (url: string) => {
  try {
    return new URL(url, document.baseURI).href;
  } catch {
    return url;
  }
};
const imagesOf = (no: number) => SLIDES[no - 1]?.images ?? [];
const totalImages = () => new Set(SLIDES.flatMap((s) => s.images ?? []).map(absolute)).size;

/**
 * The progress from the pictures that are done (loaded or failed) and the deck's total: 1 without pictures, and 1 when
 * preloading is off (`on` false), since nothing is left to wait for.
 */
export function progressOf(done: number, total: number, on: boolean): number {
  return !on || total === 0 ? 1 : Math.min(done / total, 1);
}

/** How much of the deck's pictures is done (loaded, or failed after the retries), from 0 to 1. */
export const preloadProgress = computed(() =>
  progressOf(settledCount(), totalImages(), preloadAhead(HEADMATTER['preloadImages']) !== null),
);
/** Every picture of the deck is done, or preloading is off. */
export const preloadComplete = computed(() => preloadProgress() >= 1);

/** How many slides ahead to load: `preloadImages: false` gives null (off), `{ ahead: n }` gives n (0 too), anything else 3. */
export function preloadAhead(setting: unknown): number | null {
  if (setting === false) return null;
  const ahead = (setting as { ahead?: unknown } | null)?.ahead;
  return typeof ahead === 'number' && Number.isFinite(ahead) && ahead >= 0 ? Math.floor(ahead) : 3;
}

/** The slides whose pictures are loaded while slide `no` is shown: itself, the one before, and `ahead` after it. */
export function preloadWindow(no: number, total: number, ahead: number): number[] {
  const list = [no, no - 1];
  for (let i = 1; i <= ahead; i++) list.push(no + i);
  return list.filter((n) => n >= 1 && n <= total);
}

/** True for a connection that asks to save data or is slow (2g, 3g): the whole deck's pictures are then not loaded ahead. */
export function slowConnection(connection?: {
  saveData?: boolean;
  effectiveType?: string;
}): boolean {
  return (
    !!connection &&
    (connection.saveData === true ||
      ['slow-2g', '2g', '3g'].includes(connection.effectiveType ?? ''))
  );
}

/** Asks for a picture; `first` puts it before the ones already waiting (the slides around the one on screen). Exported for the spec. */
export function preloadImage(url: string, first = false): void {
  const key = absolute(url);
  if (settled.has(key) || loading.has(key)) return;
  const at = waiting.findIndex((w) => w.key === key);
  if (at !== -1) {
    if (!first) return;
    waiting.splice(at, 1);
  }
  if (first) waiting.unshift({ key, url, first });
  else waiting.push({ key, url, first });
  next();
}

function next(): void {
  while (loading.size < AT_ONCE && waiting.length) load(waiting.shift()!);
}

function load({ key, url, first }: Wanted): void {
  loading.add(key);
  const img = new Image();
  img.onload = () => {
    loading.delete(key);
    settle(key);
    next();
  };
  img.onerror = () => {
    loading.delete(key);
    // A failed load is tried again twice (a flaky network), not forever (a missing file).
    const attempts = retries.get(key) ?? 0;
    if (attempts < RETRY_LIMIT) {
      retries.set(key, attempts + 1);
      setTimeout(() => preloadImage(url, first), 1000 * (attempts + 1));
    } else settle(key);
    next();
  };
  img.src = url;
}

const whenIdle = (run: () => void) =>
  typeof requestIdleCallback === 'function'
    ? requestIdleCallback(run, { timeout: 1000 })
    : setTimeout(run, 1);

/** Starts preloading for a view that shows slide `no()`. Call it in an injection context (a component's constructor). */
export function preloadImages(no: () => number): void {
  const ahead = preloadAhead(HEADMATTER['preloadImages']);
  if (ahead === null) return;
  effect(() => {
    const current = no();
    untracked(() =>
      whenIdle(() =>
        // In reverse, as each one goes to the front: the slide on screen ends up first.
        preloadWindow(current, SLIDES.length, ahead)
          .flatMap(imagesOf)
          .reverse()
          .forEach((url) => preloadImage(url, true)),
      ),
    );
  });
  if (
    slowConnection(
      (navigator as { connection?: { saveData?: boolean; effectiveType?: string } }).connection,
    )
  )
    return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const all = () =>
    (timer = setTimeout(
      () =>
        whenIdle(() =>
          SLIDES.forEach((_, i) => imagesOf(i + 1).forEach((url) => preloadImage(url))),
        ),
      3000,
    ));
  if (document.readyState === 'complete') all();
  else window.addEventListener('load', all, { once: true });
  inject(DestroyRef).onDestroy(() => {
    window.removeEventListener('load', all);
    clearTimeout(timer);
  });
}
