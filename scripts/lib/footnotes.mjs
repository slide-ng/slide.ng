// Footnotes: `text[^1]` and `[^1]: the note`. The notes are numbered by first use and
// listed at the bottom of the slide. The numbers are plain text (not links), because a
// `#fragment` link would make the router leave the slide.

/** Cuts the definitions out and leaves a placeholder where each note is used. @param {string} markdown */
export function extractFootnotes(markdown) {
  const defs = new Map();
  // `[^id]: text`, and the lines under it that are indented
  const md = markdown.replace(
    /^\[\^([^\]\s]+)\]:[ \t]*(.*(?:\n(?: {2,}|\t).*)*)$/gm,
    (_, id, text) => {
      defs.set(id, text.replace(/\n[ \t]+/g, ' ').trim());
      return '';
    },
  );
  const used = [];
  const withRefs = md.replace(/\[\^([^\]\s]+)\]/g, (whole, id) => {
    if (!defs.has(id)) return whole; // not defined: stays as written
    if (!used.includes(id)) used.push(id);
    return `NGFOOT${used.indexOf(id) + 1}X`;
  });
  return { markdown: withRefs, notes: used.map((id) => defs.get(id)) };
}

/**
 * Writes the numbers and the list. `inline` turns a note's markdown into safe HTML.
 * @param {string} html @param {string[]} notes @param {(note: string) => string} inline
 */
export function finishFootnotes(html, notes, inline) {
  // The class names and the `[1]` are markdown-it-footnote's (Slidev's), so CSS written for them applies.
  html = html.replace(/NGFOOT(\d+)X/g, '<sup class="footnote-ref">[$1]</sup>');
  if (!notes.length) return html;
  const items = notes.map((n) => `<li class="footnote-item">${inline(n)}</li>`).join('');
  return `${html}\n<hr class="footnotes-sep" /><section class="footnotes"><ol class="footnotes-list">${items}</ol></section>`;
}
