/**
 * The line (from 1) a slide starts on in its file: its `---`. The parser's `start` (from 0) is that line for a slide with
 * frontmatter, and the line after the `---` for one without.
 * @param {{ start: number, contentStart: number } | undefined} source
 */
export const slideLine = (source) =>
  Math.max(1, source ? (source.contentStart > source.start ? source.start + 1 : source.start) : 1);
