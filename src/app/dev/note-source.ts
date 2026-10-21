// The speaker note inside the markdown of one slide, read and replaced as text. The note is the last HTML comment, when
// nothing but white space follows it (the rule of @slidev/parser's parseSlide), so the presenter can edit only that part.

const COMMENT = /<!--([\s\S]*?)-->/g;
// The frontmatter (or a ```yaml block in its place) the parser takes off before it looks for the note, as its matter() does.
const FRONTMATTER = /^---.*\n[\s\S]*?---|^\s*```ya?ml[\s\S]*?```/;

/** Where the note is in `raw`: its text (trimmed) and the comment's span; null when the slide has no note. */
function findNote(raw: string): { text: string; start: number; end: number } | null {
  // A `<!--` inside the frontmatter is not the start of a note.
  const from = FRONTMATTER.exec(raw)?.[0].length ?? 0;
  const comments = [...raw.slice(from).matchAll(COMMENT)];
  const last = comments.at(-1);
  if (!last || last.index === undefined) return null;
  const start = from + last.index;
  const end = start + last[0].length;
  if (raw.slice(end).trim() !== '') return null;
  return { text: last[1].trim(), start, end };
}

/** The note of a slide's markdown, '' when it has none. */
export function noteOf(raw: string): string {
  return findNote(raw.replace(/\r\n/g, '\n'))?.text ?? '';
}

/**
 * The slide's markdown with its note set to `note`. An empty note removes the comment; a slide without one gets it at the
 * end, after a blank line (as Slidev writes it). Everything else stays as it was.
 */
export function withNote(raw: string, note: string): string {
  const text = raw.replace(/\r\n/g, '\n');
  const found = findNote(text);
  // `-->` inside the note would end the comment early and spill the rest onto the slide.
  const body = note
    .replace(/\r\n/g, '\n')
    .trim()
    .replace(/--+>/g, (m) => m.replace(/>$/, ' >'));
  const comment = body ? `<!--\n${body}\n-->` : '';
  if (found) {
    const before = text.slice(0, found.start).replace(/\s+$/, '');
    const after = text.slice(found.end);
    if (!comment) return before + (after.includes('\n') ? '\n' : '');
    return `${before}\n\n${comment}${after}`;
  }
  if (!comment) return text;
  const trailing = /\n*$/.exec(text)?.[0] ?? '';
  return `${text.replace(/\s+$/, '')}\n\n${comment}${trailing ? '\n' : ''}`;
}
