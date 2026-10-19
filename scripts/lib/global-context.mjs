// Slidev's global context in a slide's markup (`$clicks`, `$page`, `$nav`, ...) is a set of fields of SlideBase here
// (src/app/lib/slide-base.ts). The values that change are signals, so Vue's `{{ $clicks }}` must be written `{{ $clicks() }}`.

// The signals, and the signals of `$nav` (Nav keeps Slidev's names).
const SIGNALS = ['clicks', 'page', 'renderContext'];
const NAV_SIGNALS = [
  'currentPage',
  'currentLayout',
  'currentFrontmatter',
  'clicks',
  'clicksTotal',
  'hasNext',
  'hasPrev',
  'no',
];
const UNCALLED = new RegExp(
  `\\$(?:${SIGNALS.join('|')})\\b(?!\\s*\\()|\\$(?:slidev\\.)?nav\\.(?:${NAV_SIGNALS.join('|')})\\b(?!\\s*\\()`,
  'g',
);
// Where Angular reads expressions: interpolations, bindings and control flow (the whole condition, up to the
// block's `{`, so a call such as `$clicks()` inside it does not end the scan).
const EXPRESSIONS =
  /\{\{([\s\S]*?)\}\}|\s[[(*][\w.-]+[\])]?="([^"]*)"|@(?:if|else if|switch|case|for)\s*\(([^{]*)\)\s*\{/g;

/** The uncalled signals of the global context in `markup` (code samples already removed), each once. */
export function uncalledGlobals(markup) {
  const found = new Set();
  for (const m of markup.matchAll(EXPRESSIONS))
    for (const name of (m[1] ?? m[2] ?? m[3]).matchAll(UNCALLED)) found.add(name[0]);
  return [...found];
}

export function warnUncalledGlobals(markup, no) {
  for (const name of uncalledGlobals(markup))
    console.warn(
      `[slides] slide ${no}: ${name} is a signal here; write ${name}() (Vue reads it without the call)`,
    );
}
