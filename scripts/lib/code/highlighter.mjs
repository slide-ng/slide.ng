// Shiki, used while generating. The slides come out as finished HTML, so the browser
// never loads a highlighter. Light and dark colours are both written (as CSS variables) and
// the page picks one (see src/styles/code.css), like Slidev's `shiki` setup.
import { bundledLanguages, createHighlighter } from 'shiki';

const DEFAULT_THEMES = { light: 'vitesse-light', dark: 'vitesse-dark' };

// Names that Shiki does not know, mapped to ones it does. A deck can add more (headmatter `codeAliases`).
const BUILTIN_ALIASES = { ng: 'angular-ts', 'ng-html': 'angular-html', txt: 'text', plain: 'text' };

// Shiki draws these without loading a grammar.
const PLAIN = ['text', 'plaintext', 'ansi'];

let highlighter = null;
let aliases = BUILTIN_ALIASES;
let themes = DEFAULT_THEMES;
let singleTheme = null; // a `theme` from setup/shiki.ts: one theme for light and dark
let setupOptions = {}; // the other options of setup/shiki.ts (transformers, colorReplacements, ...)
let grammarNames = new Set(); // languages from setup/shiki.ts
let twoslash = null; // the Twoslash transformer, made only when the deck uses it (it starts a TypeScript program)

const resolveAlias = (lang) => aliases[lang] ?? lang;

/**
 * Load the themes and the languages the deck uses. Call once before highlighting.
 * `setup` is the merged `setup/shiki.ts` of the roots (lib/setup/node-setups.mjs): Shiki options, extra language names and grammars.
 * @param {{ langs?: Iterable<string>, headmatter?: any, twoslash?: boolean, setup?: { options?: Record<string, any>, langNames?: string[], grammars?: { name: string, input: any }[] } }} [options]
 */
export async function initHighlighter({
  langs = [],
  headmatter = {},
  twoslash: useTwoslash = false,
  setup = {},
} = {}) {
  const {
    theme,
    themes: setupThemes,
    defaultColor: _ignored,
    transformers: _t,
    ...rest
  } = setup.options ?? {};
  singleTheme = theme ?? null;
  themes = setupThemes ?? headmatter.shiki?.themes ?? DEFAULT_THEMES;
  setupOptions = { ...rest, transformers: setup.options?.transformers ?? [] };
  aliases = { ...BUILTIN_ALIASES, ...headmatter.codeAliases };
  const grammars = setup.grammars ?? [];
  const names = [
    ...new Set([...langs, ...(setup.langNames ?? []), 'ts', 'js', 'html', 'css'].map(resolveAlias)),
  ];
  highlighter = await createHighlighter({
    themes: singleTheme ? [singleTheme] : Object.values(themes),
    langs: [...names.filter((n) => n in bundledLanguages), ...grammars.map((g) => g.input)],
  });
  grammarNames = new Set(grammars.map((g) => g.name));
  twoslash = null;
  if (useTwoslash) {
    const { transformerTwoslash } = await import('@shikijs/twoslash');
    // Only blocks with `twoslash` after the language are processed (explicitTrigger), as in Slidev.
    // `^?` queries get a line of their own: as popups they lay over the next lines of code.
    twoslash = transformerTwoslash({
      explicitTrigger: true,
      rendererRich: { queryRendering: 'line' },
      twoslashOptions: {
        compilerOptions: { ignoreDeprecations: '6.0' },
        handbookOptions: { noErrorValidation: true },
      },
    });
  }
}

export const twoslashTransformer = () => twoslash;

// The language to draw with, or 'text' (and a warning) when it is not loaded.
function usableLang(lang) {
  const name = resolveAlias(lang || 'text');
  if (
    PLAIN.includes(name) ||
    grammarNames.has(name) ||
    highlighter.getLoadedLanguages().includes(name)
  )
    return name;
  console.warn(`[slides] code language "${lang}" is not loaded, showing it as plain text`);
  return 'text';
}

export const themeOptions = () =>
  singleTheme ? { theme: singleTheme } : { themes, defaultColor: false };

// A finished <pre class="shiki ..."> for the code. The transformers of setup/shiki.ts run first, then the ones given here.
export function codeToHtml(code, lang, extra = {}) {
  const { transformers: own = [], ...more } = extra;
  const { transformers: fromSetup, ...options } = setupOptions;
  return highlighter.codeToHtml(code, {
    lang: usableLang(lang),
    ...options,
    ...themeOptions(),
    ...more,
    transformers: [...fromSetup, ...own],
  });
}

// Tokens, for Shiki Magic Move.
export function codeToTokens(code, lang) {
  return highlighter.codeToTokens(code, { lang: usableLang(lang), ...themeOptions() });
}
