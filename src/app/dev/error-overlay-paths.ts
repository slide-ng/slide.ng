import { StandingError, fillOverlay, overlayContent } from './build-error';

// The dev server's error overlay (the `vite-error-overlay` element) names the files Angular compiled: the copies of a deck's
// or theme's folders in `src/slides/generated/roots/<id>/`, and the generated slides. Like the terminal (cli/runtime.mjs),
// the page names the author's own file instead: the folder each copy came from, and the markdown line of a slide.

/**
 * `text` with the paths of copies replaced by the author's files. `rootDirs`: root id -> its folder; `slides`: where each
 * slide is in the markdown (`slides.md:12`), by slide number - 1.
 */
export function withDeckPaths(
  text: string,
  rootDirs: Record<string, string>,
  slides: readonly string[],
): string {
  return text
    .replace(/\S*src\/slides\/generated\/roots\/([\w.-]+)\/([^\s:]+)/g, (match, id, rest) =>
      Object.hasOwn(rootDirs, id) ? `${rootDirs[id].replace(/[\\/]$/, '')}/${rest}` : match,
    )
    .replace(
      /src\/slides\/generated\/slide-(\d+)\.ts(:\d+:\d+)?(?!\d|:\d| \(slide)/g,
      (match, no) => {
        const where = slides[+no - 1];
        return where ? `${match} (slide ${+no}, ${where})` : match;
      },
    );
}

/** Whether the overlay on the page is about the error the companion server holds: the same first line (the stored one may
 * have a did-you-mean added) and the same place in the generated file. */
export function sameError(overlay: { message: string; file: string }, stored: StandingError) {
  const first = (text: string) => text.trim().split('\n')[0].trim();
  const shown = first(overlay.message);
  const place = (text: string) => /:(\d+:\d+)/.exec(text)?.[1];
  return (
    !!shown &&
    first(stored.error).startsWith(shown) &&
    (!place(overlay.file) ||
      !place(stored.file ?? '') ||
      place(overlay.file) === place(stored.file ?? ''))
  );
}

/**
 * Rewrites the paths in each error overlay that the dev server puts on the page, then shows the error as the companion server
 * holds it (`standing`, GET /build-error), so the overlay reads the same as after a reload and as in the terminal: with the
 * did-you-mean and the markdown line of the error. While the generator's error stands, that one is shown instead of the
 * Angular error of the last good slides. The companion hears of the error a moment after the page does, so it is asked a few
 * times.
 */
export function watchErrorOverlay(
  rootDirs: Record<string, string>,
  slides: readonly string[],
  standing?: () => Promise<StandingError | null | undefined>,
  { tries = 12, everyMs = 250 } = {},
) {
  if (!Object.keys(rootDirs).length && !slides.length) return () => {};
  const rewrite = (overlay: Element) => {
    const root = overlay.shadowRoot;
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.parentElement?.tagName === 'STYLE') continue;
      const text = node.textContent ?? '';
      const next = withDeckPaths(text, rootDirs, slides);
      if (next !== text) node.textContent = next;
    }
  };
  const fill = async (overlay: Element) => {
    const read = (selector: string) =>
      overlay.shadowRoot?.querySelector(selector)?.textContent ?? '';
    for (let i = 0; standing && i < tries && overlay.isConnected; i++) {
      const answer = await standing().catch(() => null);
      const content = overlayContent(answer);
      if (
        content &&
        answer &&
        (answer.problem ||
          sameError({ message: read('.message-body'), file: read('.file') }, answer))
      )
        return fillOverlay(overlay, content);
      await new Promise((done) => setTimeout(done, everyMs));
    }
  };
  const observer = new MutationObserver((changes) => {
    for (const change of changes)
      for (const node of change.addedNodes)
        if (node instanceof Element && node.localName === 'vite-error-overlay') {
          rewrite(node);
          void fill(node);
        }
  });
  observer.observe(document.body, { childList: true });
  return () => observer.disconnect();
}
