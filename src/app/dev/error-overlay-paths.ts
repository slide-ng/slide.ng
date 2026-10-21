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
    .replace(/src\/slides\/generated\/slide-(\d+)\.ts(:\d+:\d+)?/g, (match, no) => {
      const where = slides[+no - 1];
      return where ? `${match} (slide ${+no}, ${where})` : match;
    });
}

/** Rewrites the paths in each error overlay that the dev server puts on the page. */
export function watchErrorOverlay(rootDirs: Record<string, string>, slides: readonly string[]) {
  if (!Object.keys(rootDirs).length && !slides.length) return;
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
  new MutationObserver((changes) => {
    for (const change of changes)
      for (const node of change.addedNodes)
        if (node instanceof Element && node.localName === 'vite-error-overlay') rewrite(node);
  }).observe(document.body, { childList: true });
}
