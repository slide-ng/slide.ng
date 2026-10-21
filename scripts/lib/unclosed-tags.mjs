// An element left open in a slide's raw HTML (`<div class="box">` with no `</div>`) makes Angular fail on the closing tag
// of the layout around the slide ("Unexpected closing tag "sn-default""), which names neither the element nor the line.
// The slide's template is read with Angular's own parser, and only that error is replaced by one that names the element.
import { HtmlParser, getHtmlTagDefinition } from '@angular/compiler';

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

/** Throws a slide-level error when `html` would fail on the closing `</tag>` of its layout because an element is open. */
export function assertClosedTags(html, tag, no) {
  const { errors, rootNodes } = parser.parse(html, `slide-${no}.html`, {
    tokenizeExpansionForms: true,
    tokenizeBlocks: true,
    tokenizeLet: true,
  });
  if (!errors.some((e) => e.msg.startsWith(`Unexpected closing tag "${tag}"`))) return;
  const open = firstUnclosed(rootNodes);
  if (!open) return; // Angular's own message, then
  const start = open.startSourceSpan.toString().replace(/\s+/g, ' ');
  const shown = start.length > 80 ? `${start.slice(0, 77)}...` : start;
  if (!Array.isArray(open.attrs))
    throw new Error(
      `slide ${no}: ${shown} is never closed; add } where the @${open.name} block should end`,
    );
  const name = open.name.replace(/^:[^:]+:/, ''); // `:svg:g` is <g>
  throw new Error(
    `slide ${no}: ${shown} is never closed; add </${name}> where it should end (or write it as <${name} />)`,
  );
}
