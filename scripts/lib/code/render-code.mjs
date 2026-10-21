// A normal code fence -> highlighted HTML inside a <slide-ng-code-block-wrapper> component.
// The wrapper (src/app/code/code-block-wrapper.ts) adds the copy button, the title bar, the
// click-stepped line highlights and the maximum height.
import { codeToHtml, twoslashTransformer } from './highlighter.mjs';
import { cleanTitle, parseInfo } from './meta.mjs';
import { titleIcon } from './title-icon.mjs';
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
  try {
    html = codeToHtml(
      code,
      lang,
      twoslash
        ? { transformers: [twoslash, slidevCode], meta: { __raw: info } }
        : { transformers: [slidevCode] },
    );
  } catch (e) {
    // A code error in a twoslash block must not stop the whole build.
    console.warn(
      `[slides] twoslash failed for a ${lang} block (${e.message.split('\n')[0]}), showing it without types`,
    );
    html = codeToHtml(code, lang, { transformers: [slidevCode] });
  }
  return protect(html).replace('<pre ', '<pre ngNonBindable ');
}

// `ctx.headmatter` gives the deck-wide defaults (`lineNumbers`, `codeCopy`).
export function renderCode(fence, ctx = {}) {
  const { lang, title, ranges, options } = parseInfo(fence.info);
  const head = ctx.headmatter ?? {};
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
