// A normal code fence -> highlighted HTML inside a <slide-ng-code-block-wrapper> component.
// The wrapper (src/app/code/code-block-wrapper.ts) adds the copy button, the title bar, the
// click-stepped line highlights and the maximum height.
import { codeToHtml, twoslashTransformer, warnSlidePrefix } from './highlighter.mjs';
import { cleanTitle, parseInfo } from './meta.mjs';
import { titleIcon, warnTitleIcon } from './title-icon.mjs';
import { attrs, protect } from '../protect.mjs';

const slidevCode = {
  pre(node) {
    this.addClassToHast(node, 'slidev-code');
    delete node.properties.tabindex;
  },
};

// Shiki's <pre>, made safe for Angular: ngNonBindable and no `{` `}` `@` left in the text.
// `info` is the whole fence info; a `twoslash` word in it turns on type popups (TypeScript decides the types).
export function highlightedPre(code, lang, info = '') {
  const twoslash = /\btwoslash\b/.test(info) ? twoslashTransformer() : null;
  let html;
  let found; // what twoslash found, read from the transformers' shared meta after it ran
  const keep = {
    pre() {
      found = this.meta.twoslash;
    },
  };
  try {
    html = codeToHtml(
      code,
      lang,
      twoslash
        ? { transformers: [twoslash, slidevCode, keep], meta: { __raw: info } }
        : { transformers: [slidevCode] },
    );
    if (found) {
      const missing = missingErrors(code, found.errors);
      if (missing.length)
        console.warn(
          `[slides] ${warnSlidePrefix()}twoslash: // @errors lists ${missing.join(', ')}, but the ${lang} block has no such error (check the code or the list)`,
        );
    }
  } catch (e) {
    // A code error in a twoslash block must not stop the whole build.
    console.warn(
      `[slides] ${warnSlidePrefix()}twoslash failed for a ${lang} block (${twoslashReason(e)}), showing it without types`,
    );
    html = codeToHtml(code, lang, { transformers: [slidevCode] });
  }
  return protect(html).replace('<pre ', '<pre ngNonBindable ');
}

/**
 * The error codes a twoslash block's `// @errors: 2322 2588` lists that TypeScript does not report. Twoslash runs with
 * `noErrorValidation` (an error the list leaves out is still drawn, as in 1.0), so this is only a warning.
 * @param {string} code @param {{ code?: number }[] | undefined} errors what twoslash found
 */
export function missingErrors(code, errors = []) {
  const listed = [...code.matchAll(/^[ \t]*\/\/[ \t]*@errors:[ \t]*([^\n]*)$/gm)].flatMap((m) =>
    m[1].split(/[\s,]+/).filter((c) => /^\d+$/.test(c)),
  );
  const found = new Set(errors.map((e) => String(e.code)));
  return [...new Set(listed)].filter((c) => !found.has(c));
}

// Twoslash's own errors have a title and a description, and their message starts with an empty line.
export function twoslashReason(e) {
  if (e?.title || e?.description) return [e.title, e.description].filter(Boolean).join(': ');
  const message = String(e?.message ?? e);
  return (
    message
      .split('\n')
      .map((l) => l.replace(/^#+\s*/, '').trim())
      .find(Boolean) ?? 'unknown error'
  );
}

/**
 * Why a step of the line ranges (`{3-5}`) picks no line of the block, or ''. Ranges use the numbers shown, so with
 * `startLine:10` a block's lines are 10, 11, ...; a step that picks none of them dims every line.
 * @param {string[]} ranges @param {string} code @param {unknown} [startLine]
 */
export function rangeOutsideLines(ranges, code, startLine) {
  const first = Number.isInteger(Number(startLine)) && startLine != null ? Number(startLine) : 1;
  const last = first + code.replace(/\n$/, '').split('\n').length - 1;
  for (const step of ranges) {
    if (!/^[\d\s,-]+$/.test(step) || /^\s*0\s*$/.test(step)) continue; // `all`, `*`, `hide`, `0` (no line)
    const picks = step.split(',').some((part) => {
      const [a, b = a] = part.split('-').map((n) => Number(n.trim()));
      return Number.isFinite(a) && Number.isFinite(b) && a <= last && b >= first;
    });
    if (!picks)
      return `the line range {${step}} is outside the lines shown (${first}-${last}${first !== 1 ? `, with startLine:${first}` : ''}), so it highlights no line; ranges use the numbers shown`;
  }
  return '';
}

// `ctx.headmatter` gives the deck-wide defaults (`lineNumbers`, `codeCopy`).
export function renderCode(fence, ctx = {}) {
  const { lang, title, ranges, options } = parseInfo(fence.info);
  const head = ctx.headmatter ?? {};
  warnTitleIcon(title);
  const outside = rangeOutsideLines(ranges, fence.code, options.startLine);
  if (outside) console.warn(`[slides] ${warnSlidePrefix()}${outside}`);
  const wrapperAttrs = attrs({
    ranges: ranges.join('|'),
    title: cleanTitle(title),
    icon: title ? titleIcon(title) : undefined,
    lines: options.lines ?? head.lineNumbers,
    startLine: options.startLine,
    maxHeight: options.maxHeight,
    at: options.at,
    finally: options.finally,
    noCopy: (head.codeCopy ?? true) === false || undefined,
  });
  return `<slide-ng-code-block-wrapper${wrapperAttrs}>${highlightedPre(fence.code, lang, fence.info)}</slide-ng-code-block-wrapper>`;
}
