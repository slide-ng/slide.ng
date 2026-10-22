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
  'previousNo',
];
// A call may be optional (`$nav.clicksTotal?.()`).
const UNCALLED = new RegExp(
  `\\$(?:${SIGNALS.join('|')})\\b(?!\\s*(?:\\?\\.\\s*)?\\()|\\$(?:slidev\\.)?nav\\.(?:${NAV_SIGNALS.join('|')})\\b(?!\\s*(?:\\?\\.\\s*)?\\()`,
  'g',
);
// Where Angular reads expressions: interpolations, bindings in either quotes, `@let` and control flow (the whole condition,
// up to the block's `{`, so a call such as `$clicks()` inside it does not end the scan).
const EXPRESSIONS =
  /\{\{([\s\S]*?)\}\}|\s[[(*][\w.%-]+[\])]?=(?:"([^"]*)"|'([^']*)')|@let\s+[\w$]+\s*=([^;]*);|@(?:if|else if|switch|case|for)\s*\(([^{]*)\)\s*\{/g;

/** The uncalled signals of the global context in `markup` (code samples already removed), each once. */
export function uncalledGlobals(markup) {
  const found = new Set();
  for (const m of markup.matchAll(EXPRESSIONS))
    for (const name of m
      .slice(1)
      .find((g) => g != null)
      .matchAll(UNCALLED))
      found.add(name[0]);
  return [...found];
}

export function warnUncalledGlobals(markup, no) {
  for (const name of uncalledGlobals(markup))
    console.warn(
      `[slides] slide ${no}: ${name} is a signal here; write ${name}() (Vue reads it without the call)`,
    );
}

// The fields of `$nav` that are plain values, not signals: `$nav.total()` fails to build with "This expression is not callable"
// (TS2349), after the whole build.
const NAV_VALUES = {
  total: 'a number',
  slides: 'a list',
  tocSlides: 'a list',
  isPresenter: 'true or false',
};
const CALLED = new RegExp(
  `\\$(?:slidev\\.)?nav\\.(${Object.keys(NAV_VALUES).join('|')})\\b\\s*(?:\\?\\.\\s*)?\\(\\s*\\)`,
  'g',
);

/** The values of the global context that are called as if they were signals (`$nav.total()`), each once. */
export function calledValues(markup) {
  const found = new Map();
  for (const m of markup.matchAll(EXPRESSIONS))
    for (const call of m
      .slice(1)
      .find((g) => g != null)
      .matchAll(CALLED))
      found.set(call[0].replace(/\s+/g, ''), call[1]);
  return [...found];
}

export function assertNoCalledValues(markup, no) {
  const [first] = calledValues(markup);
  if (!first) return;
  const [call, name] = first;
  const plain = call.replace(/\??\.?\(\)$/, '');
  throw new Error(
    `slide ${no}: ${plain} is ${NAV_VALUES[name]}, not a signal: write ${plain} without the () (only the values that change, such as $nav.currentPage(), are called)`,
  );
}
