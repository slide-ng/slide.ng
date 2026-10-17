// Turns the markdown of ONE slide into an Angular template string.
//
// The hard part: markdown converters mangle Angular syntax (`@if (x) {`,
// `[prop]="v"`, `{{ x }}`). So we hide that syntax behind placeholders,
// run the markdown converter, then put the syntax back untouched.
import { marked } from 'marked';
import { extractFences } from './fences.mjs';
import { renderFence } from './code/render-fence.mjs';
import { escapeCode, protect } from './protect.mjs';
import { extractMath, renderMath } from './math.mjs';
import { rewriteDirectives } from './directives.mjs';
import { markAlerts } from './alerts.mjs';
import { extractFootnotes, finishFootnotes } from './footnotes.mjs';
import { rewriteIcons } from './icons.mjs';
import { applyAttrSugar } from './attr-sugar.mjs';

export { escapeCode, protect };

// A tag that uses Angular syntax: [x]="..", (x)="..", *x, #x or @x on it.
const ANGULAR_TAG = '<[a-z][\\w-]*\\s[^>\\n]*[\\[(*#@][^>\\n]*>';

// The tags that start an HTML block in CommonMark even with text after them on the line.
const BLOCK_TAGS = new Set(
  'address article aside blockquote body caption center col colgroup dd details dialog dir div dl dt fieldset figcaption figure footer form frame frameset h1 h2 h3 h4 h5 h6 head header hr html iframe legend li link main menu menuitem nav noframes ol optgroup option p param search section summary table tbody td tfoot th thead title tr track ul'.split(
    ' ',
  ),
);

// A tag or `@let` written over several lines (as Prettier formats a tag with many bindings) is joined into one line, so the
// rules below see it whole. Only a tag that starts its line and ends a later line with `>` or `/>` is joined.
const MULTILINE_TAG = /^([ \t]*)<([a-z][\w-]*)([^<>]*\n[^<>]*?)(\/?>)[ \t]*$/gm;
const MULTILINE_LET = /^([ \t]*)@let\b([^;]*\n[^;]*);[ \t]*$/gm;
const oneLine = (s) => s.trim().replace(/\s*\n\s*/g, ' ');
const joinLines = (md) =>
  md
    .replace(MULTILINE_TAG, (_, ws, name, attrs, end) => `${ws}<${name} ${oneLine(attrs)}${end}`)
    .replace(MULTILINE_LET, (_, ws, body) => `${ws}@let ${oneLine(body)};`);

/** @param {string} markdown @param {{ file?: string, root?: string, headmatter?: any }} [ctx] file, root: where snippet paths start; headmatter: deck-wide code settings */
export function toTemplate(markdown, ctx = {}) {
  const kept = []; // Angular syntax we put back at the end
  const keep = (s) => `NGKEEP${kept.push(s) - 1}X`;
  // A line that is only an HTML comment is left alone by the markdown converter.
  const hide = (s) => `<!--${keep(s)}-->`;

  // 1. Code fences and inline code are plain text: set them aside first.
  let { markdown: md, fences } = extractFences(markdown, ctx);
  const inlines = [];
  // In a table row, `\|` is how a cell writes a pipe, also inside code (as in GitHub's tables).
  md = md.replace(/(?<!\\)(`+)(.+?)\1/g, (_, __, code, at, all) => {
    const row = /^[ \t]*\|/.test(all.slice(all.lastIndexOf('\n', at) + 1));
    return `NGCODE${inlines.push(row ? code.replace(/\\\|/g, '|') : code) - 1}X`;
  });

  // A type in prose, `Promise<void>` or `Map<string, number>`, is text, not a tag (Angular would stop at `</p>`): a word right
  // before `<` and a type name inside mark it.
  md = md.replace(
    /(\w)<((?:void|string|number|boolean|any|unknown|never|null|undefined|object|[A-Z]\w*)(?:\[\])?(?:\s*,\s*[\w[\]]+)*)>/g,
    '$1&lt;$2&gt;',
  );

  // Math is cut out too, so markdown does not read the `_` and `*` in formulas.
  const math = extractMath(md);
  md = math.markdown;

  // Footnote definitions are cut out here and listed again at the end.
  const footnotes = extractFootnotes(md);
  md = footnotes.markdown;

  // 2. Hide Angular syntax. The Vue-like forms of slide-ng-mark and slide-ng-motion, and icon tags, are rewritten into plain HTML first.
  md = rewriteIcons(rewriteDirectives(joinLines(md)));
  md = md.replace(/^[ \t]*(\}[ \t]*)?(@\w+.*\{|\})[ \t]*$/gm, hide); // @if (..) {   }   } @else {
  md = md.replace(/^[ \t]*@let\s.*;[ \t]*$/gm, hide); // @let x = 1;
  // A tag alone on a line. An opening tag becomes a placeholder tag, so that (like the same tag without bindings) it starts an HTML
  // block and the lines up to the next empty line stay as they are; a self-closing tag becomes a comment.
  md = md.replace(new RegExp(`^[ \\t]*${ANGULAR_TAG}[ \\t]*$`, 'gm'), (line) =>
    /\/>[ \t]*$/.test(line) ? hide(line) : `<ngkeep${kept.push(line) - 1}>`,
  );
  // A tag that starts a line with more after it: a block element (`<div [x]>..`) starts an HTML block, as in markdown;
  // any other tag (`<span [title]>..`, a component) stays in the paragraph.
  md = md.replace(
    new RegExp(`^([ \\t]*)(${ANGULAR_TAG})(?=[ \\t]*\\S)`, 'gm'),
    (_, ws, tag) =>
      ws + (BLOCK_TAGS.has(/^<([\w-]+)/.exec(tag)[1].toLowerCase()) ? hide(tag) : keep(tag)),
  );
  md = md.replace(new RegExp(ANGULAR_TAG, 'g'), keep); // tag inside a paragraph
  // {{ interpolation }}; `\|` (how a table cell writes a pipe) is a plain `|` for Angular
  md = md.replace(/\{\{[\s\S]*?\}\}/g, (m) => keep(m.replace(/\\\|/g, '|')));

  // 3. Markdown -> HTML, then make the remaining braces and @ harmless.
  let html = protect(applyAttrSugar(markAlerts(marked.parse(md, { async: false }))));
  // Angular decodes `&#123;&#123;` back to `{{` and reads an interpolation: the first brace of a pair is written as one.
  html = html.replace(/&#123;(?=&#123;)/g, "{{ '{' }}");
  html = finishFootnotes(html, footnotes.notes, (note) =>
    protect(marked.parseInline(note, { async: false })),
  );

  // 4. Put everything back.
  html = html.replace(/<p>NGMATH(\d+)X<\/p>/g, (_, i) => renderMath(math.maths[+i]));
  html = html.replace(/NGMATH(\d+)X/g, (_, i) => renderMath(math.maths[+i]));
  html = html.replace(/<p>NGFENCE(\d+)X<\/p>/g, (_, i) => renderFence(fences[+i], ctx));
  html = html.replace(/NGFENCE(\d+)X/g, (_, i) => renderFence(fences[+i], ctx)); // in a tight list item
  html = html.replace(
    /NGCODE(\d+)X/g,
    (_, i) => `<code ngNonBindable>${escapeCode(inlines[+i])}</code>`,
  );
  return html
    .replace(/<ngkeep(\d+)>/g, (_, i) => kept[+i])
    .replace(/<!--NGKEEP(\d+)X-->/g, (_, i) => kept[+i])
    .replace(/NGKEEP(\d+)X/g, (_, i) => kept[+i]);
}
