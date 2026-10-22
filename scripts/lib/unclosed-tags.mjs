// An element left open in a slide's raw HTML (`<div class="box">` with no `</div>`) makes Angular fail on a closing tag
// further on: the layout's around the slide ("Unexpected closing tag "sn-default""), or the `</p>` markdown puts after an
// open `<span>`. Neither names the element. The slide's template is read with Angular's own parser, and those errors are
// replaced by one that names the open element, the mistyped name of an element that is closed (`<slide-ng-clicsk>` ...
// `</slide-ng-clicks>`) or the closing tag that closes nothing.
import { HtmlParser, getHtmlTagDefinition } from '@angular/compiler';
import { nearest } from './did-you-mean.mjs';
import { BUILTIN_ELEMENTS } from './registry.mjs';

const parser = new HtmlParser();

// The outermost element that has no closing tag and needs one (`<p>` and `<li>` close themselves, `<img>` has none), or the
// outermost `@if`/`@for` block with no `}`. `@let` and other nodes are only looked into.
function firstUnclosed(nodes) {
  for (const node of nodes) {
    const isElement = Array.isArray(node.attrs) && node.startSourceSpan;
    const isBlock = Array.isArray(node.parameters) && node.startSourceSpan;
    if (
      (isElement &&
        node.endSourceSpan == null &&
        !node.isVoid &&
        !node.isSelfClosing &&
        !getHtmlTagDefinition(node.name).closedByParent) ||
      (isBlock && node.endSourceSpan == null)
    )
      return node;
    const inner = node.children && firstUnclosed(node.children);
    if (inner) return inner;
  }
  return null;
}

const UNEXPECTED = /^Unexpected closing tag "([^"]+)"/;
const shorten = (text) => {
  const one = text.replace(/\s+/g, ' ');
  return one.length > 80 ? `${one.slice(0, 77)}...` : one;
};
const plainTag = (name) => name.replace(/^:[^:]+:/, ''); // `:svg:g` is <g>

const INCOMPLETE_BLOCK = /^Incomplete block "([\w ]+)"/;

/**
 * Throws a slide-level error when `html` would fail on a closing tag because an element is open or a tag closes nothing, or
 * on a control-flow block that is not complete (`@if (x >= 1 {`: Angular's "Incomplete block", followed by a false "All
 * imports are unused"). `lineOf(text)` gives ` (slides.md:12)` for the line of the markdown that has `text`, or ''.
 */
export function assertClosedTags(html, tag, no, lineOf = () => '') {
  const { errors, rootNodes } = parser.parse(html, `slide-${no}.html`, {
    tokenizeExpansionForms: true,
    tokenizeBlocks: true,
    tokenizeLet: true,
  });
  const incomplete = errors.find((e) => INCOMPLETE_BLOCK.test(e.msg));
  if (incomplete) {
    // The block's start, up to its `{` (markdown may put the next tag on the same line).
    const line = html.slice(incomplete.span.start.offset).split('\n')[0];
    const first = (
      line.includes('{') ? line.slice(0, line.indexOf('{') + 1) : line.split('<')[0]
    ).trim();
    const opened = (first.match(/\(/g) ?? []).length > (first.match(/\)/g) ?? []).length;
    const why = opened
      ? 'its ( is never closed'
      : !first.includes('{')
        ? 'a { must follow its condition'
        : 'its condition goes in ( )';
    const name = /^@(else if|[a-z]+)/.exec(first)?.[1] ?? INCOMPLETE_BLOCK.exec(incomplete.msg)[1];
    throw new Error(
      `slide ${no}${lineOf(first)}: "${shorten(first)}" is not a complete @${name} block: ${why} (write @${name} (...) { ... }; an @ that is text is written &#64;)`,
    );
  }
  const closing = errors.filter((e) => UNEXPECTED.test(e.msg));
  if (!closing.length) return;
  const open = firstUnclosed(rootNodes);
  if (!open) {
    // A closing tag with nothing to close (`</div>` too many). The layout's own tag is Angular's to report.
    const stray = closing.map((e) => UNEXPECTED.exec(e.msg)[1]).find((name) => name !== tag);
    if (!stray) return;
    // A block element (`<div>`, `<ul>`) inside a `<p>` ends the `<p>` already, as in a browser.
    const why = stray === 'p' ? ' (a <div>, list or other block inside a <p> ends the <p>)' : '';
    throw new Error(
      `slide ${no}: </${stray}> has no <${stray}> open to close${why}; remove it, or add the <${stray}> it should close`,
    );
  }
  const shown = shorten(open.startSourceSpan.toString());
  if (!Array.isArray(open.attrs))
    throw new Error(
      `slide ${no}: ${shown} is never closed; add } where the @${open.name} block should end`,
    );
  const name = plainTag(open.name);
  // A closing tag inside the open element with a name close to its own: one of the two names is mistyped.
  const typo = closing
    .filter((e) => e.span.start.offset > open.startSourceSpan.start.offset)
    .map((e) => UNEXPECTED.exec(e.msg)[1])
    .find((other) => other !== tag && nearest(name, [other]));
  if (typo) {
    const fix = BUILTIN_ELEMENTS.includes(typo)
      ? ` Did you mean <${typo}>?`
      : BUILTIN_ELEMENTS.includes(name)
        ? ` Did you mean </${name}>?`
        : ' Write both names the same.';
    throw new Error(`slide ${no}: ${shown} is closed by </${typo}>, a different name.${fix}`);
  }
  throw new Error(
    `slide ${no}: ${shown} is never closed; add </${name}> where it should end (or write it as <${name} />)`,
  );
}
