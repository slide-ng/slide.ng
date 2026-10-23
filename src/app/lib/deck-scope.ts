/**
 * Pages of one origin share one localStorage, one sessionStorage per tab (iframes included) and every BroadcastChannel
 * name. Several decks can live on one origin: built together (`build a.md b.md` puts them at `/a/` and `/b/`), project pages
 * of one GitHub Pages site, or any folder opened from disk (file://, all one origin). So the storage keys and the sync
 * channel carry the deck's scope, as Slidev scopes its shared state and drawings by deck; two decks then neither follow each
 * other's slides nor share drawings or settings.
 *
 * The scope is the deck's base address (its `<base href>`), or the page's folder for file://. A deck at the root (`/`, as
 * in the dev server) has the empty scope, so it keeps the old names.
 */
export function deckScope(
  loc: Pick<Location, 'protocol' | 'pathname'> = location,
  base: string | null = document.querySelector('base')?.href ?? null,
): string {
  if (loc.protocol === 'file:')
    return `@${loc.pathname.slice(0, loc.pathname.lastIndexOf('/') + 1)}`;
  if (!base) return '';
  let path: string;
  try {
    path = new URL(base).pathname;
  } catch {
    return '';
  }
  path = path.slice(0, path.lastIndexOf('/') + 1);
  return path === '/' ? '' : `@${path}`;
}

/** A localStorage or sessionStorage key (or channel name) of this deck only, see deckScope. */
export const scopedKey = (key: string): string => `${key}${deckScope()}`;
