// One deck in several languages (docs/SYNTAX.md): `languages: { en: slides.md, tr: slides.tr.md }` in the headmatter of the
// entry file. Each file is read like a deck of its own, over the entry file's headmatter, and its slides are paired with the
// entry file's by number: the number is the address, so a switch of language keeps the slide.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { normalizeLang } from './lang.mjs';
import { assertReadable } from './outside-root.mjs';
import { parseDeck } from './parse-deck.mjs';
import { slideLine } from './slide-line.mjs';

/** Headmatter keys a translation does not take from the entry file: its list of files, and the interface language of its own. */
const NOT_INHERITED = ['languages', 'uiLang'];

/**
 * `file:line` of a headmatter key of `file` (`file` alone when the key or the file cannot be read).
 * @param {string} file @param {string} key @param {string} [text] the file's text, else it is read
 */
export function keyPlace(file, key, text) {
  try {
    const lines = (text ?? readFileSync(file, 'utf8')).split(/\r?\n/);
    const at = lines.findIndex((l, i) => i > 0 && new RegExp(`^${key}\\s*:`).test(l));
    return at < 0 ? file : `${file}:${at + 1}`;
  } catch {
    return file;
  }
}

/**
 * The languages of the entry file's headmatter: `[{ lang, file }]`, the entry file first, or null without `languages` (or
 * with one file only, which `warn` is told). A value that cannot be used throws, with the file and line of `languages`.
 * @param {Record<string, unknown>} headmatter @param {string} entry @param {(m: string) => void} warn
 * @param {{ text?: string, exists?: (f: string) => boolean, allowOutsideRoot?: boolean }} [options]
 */
export function readLanguages(headmatter, entry, warn, options = {}) {
  const value = headmatter.languages;
  if (value == null) return null;
  const where = keyPlace(entry, 'languages', options.text);
  const exists = options.exists ?? existsSync;
  if (typeof value !== 'object' || Array.isArray(value))
    throw new Error(
      `${where}: languages should map language tags to files, such as { en: slides.md, tr: slides.tr.md }`,
    );
  const list = [];
  for (const [key, name] of Object.entries(value)) {
    const lang = normalizeLang(key);
    if (!lang)
      throw new Error(`${where}: languages: "${key}" is not a language tag such as tr or pt-BR`);
    if (typeof name !== 'string' || !/\.md$/i.test(name.trim()))
      throw new Error(
        `${where}: languages.${key} should name a markdown file, such as slides.${lang}.md`,
      );
    if (list.some((l) => l.lang === lang))
      throw new Error(`${where}: languages lists ${lang} twice`);
    const file = resolve(dirname(entry), name.trim());
    if (list.some((l) => l.file === file))
      throw new Error(`${where}: languages lists ${name.trim()} for two languages`);
    assertReadable(file, `languages.${key}`, {
      roots: [dirname(entry)],
      allowOutsideRoot: options.allowOutsideRoot,
    });
    if (file !== resolve(entry) && !exists(file))
      throw new Error(`${where}: languages.${key}: ${name.trim()} not found`);
    list.push({ lang, file });
  }
  const own = list.findIndex((l) => l.file === resolve(entry));
  if (own < 0) {
    const lang = normalizeLang(headmatter.lang) || 'en';
    if (list.some((l) => l.lang === lang))
      throw new Error(
        `${where}: languages does not list this file, and its language ${lang} names another file`,
      );
    warn(`${where}: languages does not list this file; it is used as ${lang}`);
    list.unshift({ lang, file: resolve(entry) });
  } else list.unshift(...list.splice(own, 1));
  if (list.length === 1) {
    warn(`${where}: languages lists only this file, so there is no language to switch to`);
    return null;
  }
  return list;
}

/** The headmatter a translation starts from: the entry file's as written, without the keys that are its own. */
export function baseHeadmatter(ownHeadmatter) {
  const base = { ...ownHeadmatter };
  for (const key of NOT_INHERITED) delete base[key];
  return base;
}

/**
 * The language `--lang` asks for when it is one of the deck's, else null (and `warn` says why `--lang` does nothing).
 * @param {{ lang: string }[]} languages @param {string | undefined} flag @param {(m: string) => void} warn
 */
export function pickedLanguage(languages, flag, warn) {
  if (!flag) return null;
  const lang = normalizeLang(flag);
  if (languages.some((l) => l.lang === lang)) return lang;
  warn(
    `--lang ${flag} is not one of the deck's languages (${languages.map((l) => l.lang).join(', ')}); it starts in ${languages[0].lang}`,
  );
  return null;
}

const place = (slide, root) =>
  slide.source
    ? `${relative(root, slide.source.filepath) || slide.source.filepath}:${slideLine(slide.source)}`
    : '';
const named = (slides, from, root) =>
  slides
    .map((s, i) => `slide ${from + i}${place(s, root) ? ` (${place(s, root)})` : ''}`)
    .join(', ');

/**
 * The slides of a translation, one for each slide of the entry file. Slide n is the translation's slide n, with the entry
 * slide's frontmatter under its own (so layout, routeAlias and clicks are the same in every language; its `title` is left
 * out, the translation's heading names the slide). Where the translation has no slide n, the entry file's slide object
 * itself is used and n - 1 is in `fallbacks`. Slides past the entry file's last are left out. Both are told to `warn`, with
 * files and lines.
 * @param {any[]} entrySlides @param {any[]} slides @param {{ root: string, entry: string, file: string, lang: string, entryLang: string }} names
 * @param {(m: string) => void} warn
 * @returns {{ slides: any[], fallbacks: number[] }}
 */
export function pairSlides(entrySlides, slides, names, warn) {
  const { root, lang, entryLang } = names;
  const file = relative(root, names.file) || names.file;
  const entry = relative(root, names.entry) || names.entry;
  const extra = Math.abs(slides.length - entrySlides.length);
  if (extra) {
    const head = `${file}: ${lang} has ${slides.length} ${slides.length === 1 ? 'slide' : 'slides'} and ${entry} has ${entrySlides.length}`;
    if (slides.length < entrySlides.length)
      warn(
        `${head}: ${named(entrySlides.slice(slides.length), slides.length + 1, root)} of ${entry} ${extra === 1 ? 'has' : 'have'} no counterpart in ${lang}, so ${lang} shows the ${entryLang} slide`,
      );
    else
      warn(
        `${head}: ${named(slides.slice(entrySlides.length), entrySlides.length + 1, root)} of ${file} ${extra === 1 ? 'has' : 'have'} no counterpart in ${entry} and ${extra === 1 ? 'is' : 'are'} left out (slide numbers are the addresses, the same in every language)`,
      );
  }
  const fallbacks = [];
  const paired = entrySlides.map((base, i) => {
    const own = slides[i];
    if (!own) return (fallbacks.push(i), base);
    const { title, ...inherited } = base.frontmatter ?? {};
    return { ...own, frontmatter: { ...inherited, ...own.frontmatter } };
  });
  return { slides: paired, fallbacks };
}

/**
 * The file of `lang` of a parsed deck with `languages`, parsed over the entry file's headmatter (the deck itself for the
 * entry file's language), or null when the deck has no such language. Its slides are the file's own, not paired.
 */
export async function languageDeck(deck, lang) {
  const languages = readLanguages(deck.ownHeadmatter, deck.entry, () => {}, {
    allowOutsideRoot: deck.allowOutsideRoot,
  });
  const found = languages?.find((l) => l.lang === normalizeLang(lang));
  if (!found) return null;
  if (found.file === deck.entry) return deck;
  const t = await parseDeck(found.file, undefined, { base: baseHeadmatter(deck.ownHeadmatter) });
  t.headmatter.lang = found.lang;
  return t;
}

/**
 * The deck as a page in `lang` shows it (`export --lang tr`): the slides of that language paired with the entry file's
 * (pairSlides), and its headmatter. The deck itself without `languages` or for a language it does not have.
 */
export async function deckInLanguage(deck, lang) {
  const t = lang ? await languageDeck(deck, lang) : null;
  if (!t || t === deck) return deck;
  const names = { root: deck.root, entry: deck.entry, file: t.entry, lang: '', entryLang: '' };
  return { ...t, slides: pairSlides(deck.slides, t.slides, names, () => {}).slides };
}

/** The module of a translation's slide: `slide-003.tr`; a fallback is the entry file's own `slide-003`. */
export const languageSlideFile = (name, lang, fallback) => (fallback ? name : `${name}.${lang}`);

/**
 * `src/slides/generated/languages.ts`: the deck's languages and the one this page starts in. `languages` is
 * `[{ lang, dir, title }]`, empty for a deck in one language (then nothing of the switch is in the app).
 */
export function languagesSource(languages, defaultLang) {
  if (!languages.length)
    return `// GENERATED - do not edit: the deck has one language (no \`languages\` in its headmatter)
import type { Type } from '@angular/core';
import type { DeckLanguage } from '../../app/i18n/languages';

export const LANGUAGES: readonly DeckLanguage[] = [];
export const DEFAULT_LANGUAGE = '';
export const LANGUAGE = '';
export const LANGUAGE_MENU: (() => Promise<Type<unknown>>) | null = null;
`;
  return `// GENERATED from the headmatter's \`languages\` - do not edit
import type { Type } from '@angular/core';
import { DeckLanguage, pickLanguage } from '../../app/i18n/languages';

/** The deck's languages, the entry file's first. */
export const LANGUAGES: readonly DeckLanguage[] = ${JSON.stringify(languages, null, 2)};
/** The language a page starts in when the reader has chosen none: the entry file's, or \`--lang\`. */
export const DEFAULT_LANGUAGE = ${JSON.stringify(defaultLang)};
/** The language of this page: the reader's choice (kept in the browser), else DEFAULT_LANGUAGE. */
export const LANGUAGE: string = pickLanguage(LANGUAGES, DEFAULT_LANGUAGE);
/** The menu of the bar (its own chunk), for the nav bar. */
export const LANGUAGE_MENU: (() => Promise<Type<unknown>>) | null = () =>
  import('../../app/ui/language-menu').then((m) => m.LanguageMenu);
`;
}

/** The names a generated index.ts exports (index-source.mjs); a deck in several languages takes them from one language. */
export const INDEX_EXPORTS = [
  'NOT_FOUND',
  'HEADMATTER',
  'INFO_HTML',
  'DRAWINGS',
  'DOWNLOAD',
  'PWA',
  'SLIDES',
];

/** `index.ts` of a deck in several languages: the exports of `deck.<lang>.ts` for the language this page starts in. */
export function languageIndexSource(langs) {
  const imports = langs.map((lang, i) => `import * as L${i} from './deck.${lang}';`);
  const map = langs.map((lang, i) => `${JSON.stringify(lang)}: L${i}`).join(', ');
  return `// GENERATED from the headmatter's \`languages\` - do not edit
// The deck in the language this page starts in (languages.ts); each language is in deck.<lang>.ts.
import { LANGUAGE } from './languages';
${imports.join('\n')}

const DECKS: Record<string, typeof L0> = { ${map} };
const DECK = DECKS[LANGUAGE] ?? L0;

${INDEX_EXPORTS.map((name) => `export const ${name} = DECK.${name};`).join('\n')}
`;
}
