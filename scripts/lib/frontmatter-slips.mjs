// A frontmatter whose closing `---` is missing reads the slide's text as YAML. Text that is not `key: value` is a YAML error
// (yaml-errors.mjs names it), but a heading is a YAML comment, so `---`, `layout: section`, `# Part 1` and the next `---` give a
// section slide without its heading, and the slide after it moves into the section's layout. The other way round, the last
// slide written `---` and `layout: end` with no closing `---` is no frontmatter at all: "layout: end" is shown as text.

// A heading, not a commented-out key (`# layoutClass: gap-16`, `# TODO: ...`).
const HEADING = /^(#{1,6})\s+\S/;
const KEY_COMMENT = /^#\s*[\w-]+\s*:/;
// A note to self (`# TODO later`, `# FIXME: ...`), which is written in frontmatter on purpose. Only these markers with one `#`:
// `# Notes` or `## Todo app` can be a slide's real heading, which is what this check is for.
const NOTE_COMMENT = /^#\s*(?:todo|fixme|xxx|hack|wip)\b/i;
// The frontmatter keys a slide's text would hardly start with.
const SLIDE_KEY =
  /^(?:layout|class|transition|background|image|clicks|clicksStart|hide|disabled|hideInToc|level|routeAlias|src|zoom|dragPos)\s*:\s*\S/;

/**
 * What looks like a frontmatter that lost its closing `---`, or null. `raw` is the frontmatter's YAML, `keys` whether it set
 * any key, `content` the slide's text, `start` the line of its `---` (from 0), `lines` the lines of the file.
 * Returns `{ line, message }`, the line counted from 1.
 * @param {{ raw?: string, keys: boolean, content?: string, start: number, lines?: string[] }} slide
 */
export function frontmatterSlip({ raw = '', keys, content = '', start, lines = [] }) {
  if (keys) {
    const yaml = raw.split('\n');
    // A heading after the last key: after an empty line, or a `##` one (a comment is rarely written so).
    let last = -1;
    yaml.forEach((l, i) => {
      if (l.trim() && !/^\s*#/.test(l)) last = i;
    });
    for (let i = last + 1; i < yaml.length; i++) {
      const heading = HEADING.exec(yaml[i]);
      if (!heading || KEY_COMMENT.test(yaml[i]) || NOTE_COMMENT.test(yaml[i].trim())) continue;
      const afterGap = yaml.slice(last + 1, i).some((l) => !l.trim());
      if (afterGap || heading[1].length > 1)
        return {
          line: start + 2 + i,
          message: `"${yaml[i].trim().slice(0, 40)}" is in the frontmatter, where it is a YAML comment and is not shown; if it is the slide's text, the "---" that ends the frontmatter is missing above it`,
        };
    }
    return null;
  }
  const first =
    content
      .split('\n')
      .find((l) => l.trim())
      ?.trim() ?? '';
  if (!SLIDE_KEY.test(first)) return null;
  // Right under the `---`, as frontmatter is written (after an empty line it is the slide's text by choice).
  const at = lines.findIndex((l, i) => i >= start && l.trim() === first);
  if (at < 1 || !/^---\s*$/.test(lines[at - 1])) return null;
  return {
    line: at + 1,
    message: `"${first.slice(0, 40)}" is shown as the slide's text; to make it frontmatter, end it with a "---" line`,
  };
}
