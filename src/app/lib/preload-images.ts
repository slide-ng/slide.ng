// Headmatter `preloadImages` (port of Slidev's usePreloadImages): after each move, in idle time, the pictures of the slide on
// screen, the one before and the next `ahead` ones (default 3) are loaded, so they are ready when their slide is shown; 3 seconds
// later, every slide's. The generator lists each slide's pictures (scripts/lib/slide-images.mjs); `preload: false` on a slide
// leaves its own out. `preloadProgress` and `preloadComplete` say how far it is.
import { DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { HEADMATTER, SLIDES } from '../../slides/generated';

const RETRY_LIMIT = 2;
const loaded = new Set<string>();
const loading = new Set<string>();
const retries = new Map<string, number>();
const loadedCount = signal(0);

const absolute = (url: string) => {
  try {
    return new URL(url, document.baseURI).href;
  } catch {
    return url;
  }
};
const imagesOf = (no: number) => SLIDES[no - 1]?.images ?? [];
const totalImages = () => new Set(SLIDES.flatMap((s) => s.images ?? []).map(absolute)).size;

/** How much of the deck's pictures has loaded, from 0 to 1 (1 for a deck without pictures). */
export const preloadProgress = computed(() => {
  const total = totalImages();
  return total === 0 ? 1 : loadedCount() / total;
});
/** Every picture of the deck has loaded. */
export const preloadComplete = computed(() => preloadProgress() >= 1);

/** How many slides ahead to load: `preloadImages: false` gives null (off), `{ ahead: n }` gives n, anything else 3. */
export function preloadAhead(setting: unknown): number | null {
  if (setting === false) return null;
  const ahead = (setting as { ahead?: unknown } | null)?.ahead;
  return typeof ahead === 'number' && ahead > 0 ? Math.floor(ahead) : 3;
}

/** The slides whose pictures are loaded while slide `no` is shown: itself, the one before, and `ahead` after it. */
export function preloadWindow(no: number, total: number, ahead: number): number[] {
  const list = [no, no - 1];
  for (let i = 1; i <= ahead; i++) list.push(no + i);
  return list.filter((n) => n >= 1 && n <= total);
}

function preloadImage(url: string): void {
  const key = absolute(url);
  if (loaded.has(key) || loading.has(key)) return;
  loading.add(key);
  const img = new Image();
  img.onload = () => {
    loading.delete(key);
    loaded.add(key);
    retries.delete(key);
    loadedCount.set(loaded.size);
  };
  img.onerror = () => {
    loading.delete(key);
    // A failed load is tried again twice (a flaky network), not forever (a missing file).
    const attempts = retries.get(key) ?? 0;
    if (attempts < RETRY_LIMIT) {
      retries.set(key, attempts + 1);
      setTimeout(() => preloadImage(url), 1000 * (attempts + 1));
    }
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
        preloadWindow(current, SLIDES.length, ahead).forEach((n) =>
          imagesOf(n).forEach(preloadImage),
        ),
      ),
    );
  });
  const all = setTimeout(
    () => SLIDES.forEach((_, i) => imagesOf(i + 1).forEach(preloadImage)),
    3000,
  );
  inject(DestroyRef).onDestroy(() => clearTimeout(all));
}
