// Language tags of the headmatter (`lang`, `uiLang`): their spelling, the direction of the script, and the Angular locale.

/** Languages written right to left: their decks get `dir="rtl"` unless `htmlAttrs.dir` says otherwise. */
export const RTL_LANGS = ['ar', 'he', 'fa', 'ur'];

/** A language tag in the usual spelling: `pt_br` is `pt-BR`, `zh-hans` is `zh-Hans`. Empty for nothing usable. */
export function normalizeLang(value) {
  if (value == null) return '';
  const parts = String(value).trim().replace(/_/g, '-').split('-').filter(Boolean);
  if (!parts.length || !parts.every((p) => /^[A-Za-z0-9]{1,8}$/.test(p))) return '';
  return parts
    .map((p, i) =>
      i === 0
        ? p.toLowerCase()
        : p.length === 2
          ? p.toUpperCase()
          : p.length === 4
            ? p[0].toUpperCase() + p.slice(1).toLowerCase()
            : p.toLowerCase(),
    )
    .join('-');
}

/** The language part of a tag: `pt-BR` is `pt`. */
export const baseLang = (tag) => tag.split('-')[0];

/** The interface language: `uiLang`, else `lang`, else English. */
export function uiLangOf(headmatter) {
  return normalizeLang(headmatter.uiLang) || normalizeLang(headmatter.lang) || 'en';
}

/** True for a language written right to left. */
export const isRtl = (lang) => RTL_LANGS.includes(baseLang(normalizeLang(lang)));

/**
 * The Angular locale for `lang`: the tag itself when Angular has data for it, else its language, else `en-US` (Angular's
 * own, which needs no data). `has(id)` says whether `@angular/common/locales/<id>` exists.
 */
export function angularLocale(lang, has) {
  const tag = normalizeLang(lang);
  if (!tag || tag === 'en' || tag === 'en-US') return 'en-US';
  if (has(tag)) return tag;
  if (baseLang(tag) !== 'en' && has(baseLang(tag))) return baseLang(tag);
  return 'en-US';
}
