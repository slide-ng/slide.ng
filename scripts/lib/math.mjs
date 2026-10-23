// Math with KaTeX, done while generating: `$inline$` and `$$ block $$` (also `$$ {1|3|all}` to step through rows).
// KaTeX is plain JavaScript, so the browser only needs its CSS.
import katex from 'katex';
import { Marked } from 'marked';
import { splitRanges, parseOptions, rangeOutside } from './code/meta.mjs';
import { attrs, escapeCode, protect } from './protect.mjs';

// $$ {ranges} {options} <newline> latex <newline> $$      or a single line: $$ latex $$
const BLOCK =
  /^\$\$[ \t]*(?:\{([\w,|*-]+)\})?[ \t]*(\{[^}\n]*\})?[ \t]*\n([\s\S]*?)\n?[ \t]*\$\$[ \t]*$/gm;
const BLOCK_ONE_LINE = /^\$\$[ \t]*([^\n{][^\n]*?)[ \t]*\$\$[ \t]*$/gm;
// $latex$ : no space after the first $ or before the last, and the last is not followed by a digit (so "$5 and $10" is text)
// interpolations, opening tags (with their bindings) and control-flow lines
const ANGULAR = /\{\{[\s\S]*?\}\}|<[A-Za-z][^<>]*>|^[ \t]*@[A-Za-z]+[^\n]*$/gm;
const INLINE = /(?<![\\$])\$(?![\s$])((?:\\.|[^$\\\n])+?)(?<![\s\\])\$(?!\d)/g;

/** Cuts the math out of the markdown. Each piece is replaced by a word NGMATH<n>X; `maths` lists them. */
export function extractMath(markdown) {
  const maths = [];
  const put = (item) => `NGMATH${maths.push(item) - 1}X`;
  let md = markdown.replace(
    BLOCK,
    (_, ranges, options, latex) => `\n${put({ block: true, latex, ranges, options })}\n`,
  );
  md = md.replace(BLOCK_ONE_LINE, (_, latex) => `\n${put({ block: true, latex })}\n`);
  // `$` in Angular code is not math: `[class.x]="$first"`, `{{ '$' + n }}`, `@for (...; let l = $last)`.
  // Those pieces are set aside while inline math is looked for, then put back.
  const kept = [];
  md = md.replace(ANGULAR, (code) => `NGKEEP${kept.push(code) - 1}X`);
  const restore = (text) => text.replace(/NGKEEP(\d+)X/g, (_, i) => kept[+i]);
  // `${{a}} + b$`: what was set aside inside a formula is math again.
  md = md.replace(INLINE, (_, latex) => put({ block: false, latex: restore(latex) }));
  md = restore(md);
  return { markdown: md, maths };
}

// The deck's own KaTeX options (setup/katex.ts), put over the defaults below.
let katexOptions = {};
export const setKatexOptions = (options = {}) => {
  katexOptions = options;
};

// `where()`: `slide N (file:line): ` for the warnings, when known (only worked out when there is a warning).
function render(latex, displayMode, where = () => '') {
  try {
    // `output: 'html'`: the MathML part is left out because Angular does not know MathML-only tags like <annotation>.
    return katex.renderToString(latex, {
      throwOnError: false,
      // KaTeX's own strict warnings name no formula; say which one (a deck's setup/katex.ts `strict` still wins).
      strict: (code, message) => {
        console.warn(`[slides] ${where()}math "${latex.trim().slice(0, 50)}": ${message}`);
        return 'ignore';
      },
      ...katexOptions,
      displayMode,
      output: 'html',
    });
  } catch (e) {
    console.warn(`[slides] ${where()}math could not be drawn: ${e.message}`);
    return protect(latex);
  }
}

// KaTeX's HTML, made safe: no braces left, and ngNonBindable so `{{` in a formula stays text.
const safe = (html) => protect(html);

/**
 * How many rows the steps of a math block (`$$ {1|3}`) can pick: the rows of its environment (`\begin{aligned}`), split
 * by `\\`. Every `\\` counts (also in a nested matrix), so this is never too few. 0 without an environment, where
 * KaTeX draws no rows and the steps change nothing.
 */
export function mathRows(latex) {
  if (!/\\begin\{/.test(latex)) return 0;
  return (latex.match(/\\\\(?!\s*\\end\b)/g) ?? []).length + 1;
}

/**
 * @param {{ block: boolean, latex: string, ranges?: string, options?: string }} item
 * @param {() => string} [where] `slide N (file:line): ` for the warnings
 */
export function renderMath({ block, latex, ranges, options }, where = () => '') {
  // KaTeX's drawing is hidden from screen readers (no MathML), so the TeX source is read out instead.
  const drawn = `<span class="sr-only">${escapeCode(latex)}</span>${safe(render(latex, !!block, where))}`;
  if (!block) return `<span ngNonBindable>${drawn}</span>`;
  const o = parseOptions(options);
  const rows = mathRows(latex);
  const outside = rows ? rangeOutside(splitRanges(ranges), rows, o.startLine, 'row') : '';
  if (outside) console.warn(`[slides] ${where()}math: ${outside}`);
  const a = attrs({
    ranges: splitRanges(ranges).join('|'),
    at: o.at,
    finally: o.finally,
    startLine: o.startLine,
  });
  return `<slide-ng-katex-block-wrapper${a}><div ngNonBindable>${drawn}</div></slide-ng-katex-block-wrapper>`;
}

// Titles go into innerHTML (table of contents, <slide-ng-title-renderer>), so raw HTML in a title is shown as text.
const titleMarked = new Marked({
  renderer: {
    html: ({ text }) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
  },
});

// Text for innerHTML; unlike escapeCode not protected for an Angular template, since a title's HTML is not one.
const texSource = (latex) =>
  latex.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** A slide title as HTML: inline markdown and `$math$` drawn by KaTeX, raw HTML escaped. Null when there is no title. */
export function titleHtml(title) {
  if (title == null) return null;
  // parseInline runs on the whole string so that emphasis, links or code around a formula still pair up;
  // NGMATHnX is plain alphanumerics, so marked leaves it alone and we swap it for the KaTeX output after.
  const { markdown, maths } = extractMath(String(title));
  return titleMarked.parseInline(markdown, { async: false }).replace(
    /NGMATH(\d+)X/g,
    // As in the slide's body (renderMath): the drawing says nothing to a screen reader, so its TeX is read out instead.
    (_, i) =>
      `<span class="sr-only">${texSource(maths[+i].latex)}</span>${render(maths[+i].latex, false)}`,
  );
}
