// The interface language (docs/UI-STRINGS.md): the headmatter's `lang` (or `uiLang`) picks it, `locales/<lang>.json` of the
// built-in theme and of every root translate it key by key (later roots win), and `lang` picks the Angular locale of the
// `date`, `number` and `currency` pipes. Writes `src/slides/generated/ui-text.ts`.
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { transform } from 'esbuild';
import { angularLocale, baseLang, normalizeLang, uiLangOf } from './lang.mjs';

/** Where the translations that come with slide.ng live (a `locales/` folder like a root's). */
export const BUILT_IN_LOCALES = 'src/app/i18n';
const ENGLISH_FILE = 'src/app/i18n/en.ts';

/**
 * The `locales/` files of `dirs` for a language, weakest first: in each folder every prefix of the tag, so `pt.json`
 * then `pt-BR.json`, or `zh.json`, `zh-Hans.json` then `zh-Hans-CN.json`.
 */
export function localeFiles(dirs, lang) {
  const parts = lang.split('-');
  const names = parts.map((_, i) => `${parts.slice(0, i + 1).join('-')}.json`);
  return dirs.flatMap((dir) =>
    names.map((name) => join(dir, 'locales', name)).filter((f) => existsSync(f)),
  );
}

const placeholders = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

/**
 * What is wrong with a translation compared with English: keys English does not have, values that are not text, and
 * placeholders that were lost or added. An empty list means it is fine (keys may be missing: those stay English).
 * @param {Record<string, string>} english @param {unknown} data
 */
export function checkTranslation(english, data) {
  if (!data || typeof data !== 'object' || Array.isArray(data))
    return ['should be an object of "key": "text" pairs'];
  const problems = [];
  for (const [key, value] of Object.entries(data)) {
    if (!(key in english)) problems.push(`"${key}" is not a key of the interface`);
    else if (typeof value !== 'string') problems.push(`"${key}" should be text`);
    else {
      const wanted = placeholders(english[key]);
      if (placeholders(value).join() !== wanted.join())
        problems.push(
          `"${key}" should have ${wanted.length ? wanted.map((p) => `{${p}}`).join(' ') : 'no placeholders'}`,
        );
    }
  }
  return problems;
}

/**
 * The translations of the files, merged key by key (later files win). A key with a problem is left out, so it stays English,
 * and the problem is passed to `warn`. A file that is not JSON stops the build, like a broken theme.json.
 */
export function readTranslations(files, english, warn) {
  const merged = {};
  for (const file of files) {
    let data;
    try {
      data = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      throw new Error(`${file} is not valid JSON (${e.message})`, { cause: e });
    }
    const problems = checkTranslation(english, data);
    problems.forEach((p) => warn(`${file}: ${p}; it stays in English`));
    if (!data || typeof data !== 'object' || Array.isArray(data)) continue;
    for (const [key, value] of Object.entries(data))
      if (!problems.some((p) => p.startsWith(`"${key}"`))) merged[key] = value;
  }
  return merged;
}

// Whether Angular ships locale data for an id, looked up from the app's own @angular/common.
const require = createRequire(pathToFileURL(join(process.cwd(), 'package.json')));
export function hasAngularLocale(id) {
  try {
    require.resolve(`@angular/common/locales/${id}`);
    return true;
  } catch {
    return false;
  }
}

/** English, read from `src/app/i18n/en.ts` (TypeScript, so esbuild removes the types first). */
export async function readEnglish(file = ENGLISH_FILE) {
  const { code } = await transform(readFileSync(file, 'utf8'), { loader: 'ts', format: 'esm' });
  const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  return (await import(url)).EN;
}

/** `src/slides/generated/ui-text.ts`: the translated texts and the locale of the pipes, whose data is registered here. */
export function uiTextSource({ locale, translations }) {
  const data =
    locale === 'en-US'
      ? ''
      : `import { registerLocaleData } from '@angular/common';
import data from '@angular/common/locales/${locale}';

registerLocaleData(data);
`;
  return `// GENERATED: the interface text of the deck's language (locales/<lang>.json) and the locale of \`lang\` - do not edit
${data}
/** LOCALE_ID: the locale of \`lang\` for the date, number and currency pipes. */
export const LOCALE = ${JSON.stringify(locale)};

/** The translated texts; every other key is English (src/app/i18n/en.ts). */
export const UI_TRANSLATIONS: Record<string, string> = ${JSON.stringify(translations, null, 2)};
`;
}

/**
 * Everything for the deck: reads English, the translations of the built-in theme and the roots, and finds the locale.
 * @param {{ headmatter: any, roots: { dir: string }[] }} deck
 */
export async function deckUiText(deck, warn) {
  const lang = uiLangOf(deck.headmatter);
  const english = await readEnglish();
  const files = localeFiles([BUILT_IN_LOCALES, ...deck.roots.map((r) => r.dir)], lang);
  if (deck.headmatter.uiLang != null && !files.length && baseLang(lang) !== 'en')
    warn(
      `uiLang: ${lang} has no locales/${lang}.json in the deck or its theme, so the interface stays in English`,
    );
  const translations = readTranslations(files, english, warn);
  const locale = angularLocale(deck.headmatter.lang, hasAngularLocale);
  if (
    deck.headmatter.lang != null &&
    locale === 'en-US' &&
    baseLang(normalizeLang(deck.headmatter.lang)) !== 'en'
  )
    warn(
      `lang: ${deck.headmatter.lang} has no Angular locale data, so dates and numbers are formatted in English`,
    );
  return { lang, locale, translations };
}
