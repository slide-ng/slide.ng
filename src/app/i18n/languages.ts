// A deck in several languages (headmatter `languages`, docs/SYNTAX.md). The generator writes the slides, the headmatter and
// the interface text of each language; the generated languages.ts picks the one of this page when the app loads, before
// anything reads them. Angular's LOCALE_ID is fixed at start too, so a switch stores the choice and loads the page again at
// the same address. Only a deck with `languages` loads this file (the generated languages.ts of other decks only names its
// type).
import { scopedKey } from '../lib/deck-scope';

/** One language of the deck, as the generator writes it. */
export interface DeckLanguage {
  /** The language tag (`tr`, `pt-BR`): `<html lang>` and the key in `languages`. */
  readonly lang: string;
  /** `<html dir>`: `rtl` for a right-to-left language or the `htmlAttrs.dir` of that file, '' for none. */
  readonly dir: string;
  /** The page's title in that language (its `title` and `titleTemplate`). */
  readonly title: string;
}

/** The reader's choice, in localStorage of this deck only (deck-scope.ts), like the other settings. */
const KEY = 'slide-ng-language';

/** Fired on the window just before the page loads again for a language: the memory router keeps its place then. */
export const LANGUAGE_RELOAD = 'slide-ng-language-reload';

/** The language stored for this deck, or null (none, or storage blocked). */
export function storedLanguage(): string | null {
  try {
    return localStorage.getItem(scopedKey(KEY));
  } catch {
    return null;
  }
}

/** Load the page again at the same address, in the language that is stored now. */
function reload() {
  window.dispatchEvent(new Event(LANGUAGE_RELOAD));
  location.reload();
}

/**
 * The language of this page: the stored choice when it is one of the deck's, else `fallback`. Sets `<html lang>`, `dir` and
 * the title for it, and loads the page again when another window of this deck (the presenter, the audience) switches.
 */
export function pickLanguage(languages: readonly DeckLanguage[], fallback: string): string {
  const stored = storedLanguage();
  const picked =
    languages.find((l) => l.lang === stored) ??
    languages.find((l) => l.lang === fallback) ??
    languages[0];
  const html = document.documentElement;
  html.lang = picked.lang;
  if (picked.dir) html.dir = picked.dir;
  else html.removeAttribute('dir');
  document.title = picked.title;
  window.addEventListener('storage', (e) => {
    if (e.key !== scopedKey(KEY) || e.newValue == null || e.newValue === picked.lang) return;
    if (languages.some((l) => l.lang === e.newValue)) reload();
  });
  return picked.lang;
}

/** Switch to `lang`: store it and load the page again (the same slide, the same address). */
export function chooseLanguage(lang: string, load = reload) {
  try {
    localStorage.setItem(scopedKey(KEY), lang);
  } catch {
    return; // storage blocked: the page could not start in it
  }
  load();
}

/** The name of a language in that language, with a capital (`Türkçe`, `Français`); the tag when the browser has no name. */
export function languageName(lang: string): string {
  try {
    const name = new Intl.DisplayNames([lang], { type: 'language' }).of(lang) ?? lang;
    return name.charAt(0).toLocaleUpperCase(lang) + name.slice(1);
  } catch {
    return lang;
  }
}
