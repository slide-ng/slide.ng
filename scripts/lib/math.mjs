// Math with KaTeX, done while generating: `$inline$` and `$$ block $$` (also `$$ {1|3|all}` to step through rows).
// KaTeX is plain JavaScript, so the browser only needs its CSS.
import katex from 'katex';
import { splitRanges, parseOptions } from './code/meta.mjs';
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
  md = md.replace(INLINE, (_, latex) => put({ block: false, latex }));
  md = md.replace(/NGKEEP(\d+)X/g, (_, i) => kept[+i]);
  return { markdown: md, maths };
}

// The deck's own KaTeX options (setup/katex.ts), put over the defaults below.
let katexOptions = {};
export const setKatexOptions = (options = {}) => {
  katexOptions = options;
};

function render(latex, displayMode) {
  try {
    // `output: 'html'`: the MathML part is left out because Angular does not know MathML-only tags like <annotation>.
    return katex.renderToString(latex, {
      throwOnError: false,
      ...katexOptions,
      displayMode,
      output: 'html',
    });
  } catch (e) {
    console.warn(`[slides] math could not be drawn: ${e.message}`);
    return protect(latex);
  }
}

// KaTeX's HTML, made safe: no braces left, and ngNonBindable so `{{` in a formula stays text.
const safe = (html) => protect(html);

/** @param {{ block: boolean, latex: string, ranges?: string, options?: string }} item */
export function renderMath({ block, latex, ranges, options }) {
  // KaTeX's drawing is hidden from screen readers (no MathML), so the TeX source is read out instead.
  const drawn = `<span class="sr-only">${escapeCode(latex)}</span>${safe(render(latex, !!block))}`;
  if (!block) return `<span ngNonBindable>${drawn}</span>`;
  const o = parseOptions(options);
  const a = attrs({
    ranges: splitRanges(ranges).join('|'),
    at: o.at,
    finally: o.finally,
    startLine: o.startLine,
  });
  return `<slide-ng-katex-block-wrapper${a}><div ngNonBindable>${drawn}</div></slide-ng-katex-block-wrapper>`;
}
