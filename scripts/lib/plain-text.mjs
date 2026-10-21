// Markdown as plain text: slide titles for the tab title, the live region, the goto list and the PDF outline, and the
// deck's `info` for the page description and the PDF subject.
import { extractMath } from './math.mjs';

// Bidi embedding, override and isolate characters: in a title they would reorder the text around it in the table of
// contents, the tab title or the PDF outline (`annexe\u202Egpj.exe` shows as `annexeexe.jpg`), so titles drop them.
export const BIDI_CONTROLS = /[\u202A-\u202E\u2066-\u2069]/g;

// A heading's markdown as text for the tab title, the outline and the overview: `[a](b)` is `a`, `code` and **b** lose their marks,
// and HTML tags go. `$math$` is its TeX source without the dollars (what a screen reader hears on the slide), and its
// `_` or `*` are not taken for emphasis.
export function plainTitle(title) {
  const { markdown, maths } = extractMath(String(title).replace(BIDI_CONTROLS, ''));
  // A markdown escape (`\*`) is that character as text, so it is set aside before the marks are looked for.
  const escaped = [];
  return markdown
    .replace(/\\([!-/:-@[-`{-~])/g, (_, c) => `NGESC${escaped.push(c) - 1}X`)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/(\*\*|\*|~~)(\S(?:.*?\S)?)\1/g, '$2')
    .replace(/(?<!\w)(__|_)(\S(?:.*?\S)?)\1(?!\w)/g, '$2')
    .replace(/<(rt|rp)\b[^>]*>[\s\S]*?<\/\1>/gi, '') // a ruby reading is not part of the title text
    .replace(/<\/?[A-Za-z][^>]*>/g, '') // H<sub>2</sub>O is H2O
    .replace(/NGESC(\d+)X/g, (_, i) => escaped[+i])
    .replace(/NGMATH(\d+)X/g, (_, i) => maths[+i].latex.trim())
    .trim();
}

// Line marks of a markdown block: a heading's #, a quote's >, a list item's marker. A rule (---) is dropped.
const LINE_MARKS =
  /^[ \t]{0,3}(?:(?:>[ \t]?)+|#{1,6}(?=[ \t]|$)[ \t]*|(?:[-*+]|\d{1,9}[.)])[ \t]+)*/;
const HEADING = /^[ \t]{0,3}#{1,6}[ \t]/;
const RULE = /^[ \t]{0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;

/** A block of markdown (`info`) as one line of text: only markdown's own marks go, so `C#`, `#42` and snake_case stay. */
export function plainText(markdown) {
  const lines = String(markdown)
    .split(/\r?\n/)
    .filter((line) => !RULE.test(line))
    .map((line) =>
      // A heading may close with #s too: `## Title ##`.
      (HEADING.test(line) ? line.replace(/[ \t]+#+[ \t]*$/, '') : line).replace(LINE_MARKS, ''),
    );
  return plainTitle(lines.join('\n')).replace(/\s+/g, ' ').trim();
}
