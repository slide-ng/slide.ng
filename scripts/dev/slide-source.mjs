// Edits of one slide inside the text of its markdown file. No file access here, only text in and text out,
// so every case can be tested. A slide is described by the parser: lines `start` to `end` (end not included),
// and its content (without frontmatter and notes) starting at line `contentStart`.
import { parseDocument } from 'yaml';
import { dragName, setDragPosition, toPlainStyle } from '../lib/drag-sites.mjs';

// Work with \n inside, and give the file its own line ending back.
function withEol(text, edit) {
  const crlf = text.includes('\r\n');
  const result = edit(text.replace(/\r\n/g, '\n'));
  return result.text == null
    ? result
    : { text: crlf ? result.text.replace(/\n/g, '\r\n') : result.text };
}

/** Replace lines [from, to) of `text` with `replacement`. */
function spliceLines(text, from, to, replacement) {
  const lines = text.split('\n');
  lines.splice(from, to - from, ...(replacement === '' ? [] : replacement.split('\n')));
  return lines.join('\n');
}

/** The slide as written in the file: frontmatter, content and notes. */
export const sourceOf = (text, slide) =>
  text.replace(/\r\n/g, '\n').split('\n').slice(slide.start, slide.end).join('\n');

// The speaker note is the slide's last HTML comment when nothing but white space follows it (Slidev's parser).
function lastComment(raw) {
  const body = raw.replace(/\r\n/g, '\n').trimEnd();
  const last = [...body.matchAll(/<!--([\s\S]*?)-->/g)].at(-1);
  return last && last.index + last[0].length === body.length
    ? { body, last }
    : { body, last: null };
}

/** The note of a slide's markdown (as `sourceOf` returns it), or '' when it has none. */
export const noteOf = (raw) => lastComment(raw).last?.[1].trim() ?? '';

/**
 * A note as it can stand in the comment: `-->` inside it would end the comment early and spill the rest onto the slide, so
 * it is written `-- >`, as the presenter's note editor does.
 */
export const escapeNote = (note) => note.trim().replace(/--+>/g, (m) => m.replace(/>$/, ' >'));

/** The slide's markdown with `note` as its note: the old note is replaced, an empty note removes it. As Slidev writes it. */
export function replaceNote(raw, note) {
  const { body, last } = lastComment(raw);
  const rest = last ? body.slice(0, last.index).trimEnd() : body;
  const text = note.trim() ? `${rest}\n\n<!--\n${escapeNote(note)}\n-->` : rest;
  return raw.endsWith('\n') ? `${text}\n` : text;
}

/**
 * The file with this slide's lines replaced by `raw`. A slide without frontmatter begins right after a plain `---` line: its
 * text must start with a blank line there, or the parser would read `---` and the text below it as a frontmatter block.
 */
export const replaceSource = (text, slide, raw) =>
  withEol(text, (t) => {
    let body = raw.replace(/\r\n/g, '\n');
    let from = slide.start;
    if (slide.start > 0) {
      const hadFrontmatter = slide.contentStart > slide.start;
      const hasFrontmatter = /^---[ \t]*\n[\s\S]*?\n---[ \t]*(\n|$)/.test(body);
      // A slide that gains frontmatter: the `---` above it becomes the block's first line (no second separator).
      if (!hadFrontmatter && hasFrontmatter) from = slide.start - 1;
      // A slide that loses it keeps a separator, with a blank line so the text below is not read as frontmatter.
      else if (hadFrontmatter && !hasFrontmatter) body = `---\n\n${body.replace(/^\n+/, '')}`;
      else if (!hadFrontmatter && !/^(\n|---)/.test(body)) body = `\n${body}`;
    }
    // One blank line before the next slide's `---`, as `slide-ng format` writes it.
    const lines = t.split('\n');
    if (slide.end < lines.length && !body.endsWith('\n')) body = `${body}\n`;
    return { text: spliceLines(t, from, slide.end, body) };
  });

/** Set `path` (like ['dragPos', 'name']) in the slide's frontmatter, adding the block when the slide has none. */
function setFrontmatter(text, slide, path, value) {
  const hasBlock = slide.contentStart > slide.start;
  if (!hasBlock) {
    // The first slide opens its own block; later slides already have the `---` separator above them.
    const yaml = path.length === 2 ? `${path[0]}:\n  ${path[1]}: ${value}` : `${path[0]}: ${value}`;
    return {
      text: spliceLines(
        text,
        slide.start,
        slide.start,
        slide.start === 0 ? `---\n${yaml}\n---` : `${yaml}\n---`,
      ),
    };
  }
  const from = slide.start + 1,
    to = slide.contentStart - 1; // the lines between the two ---
  const doc = parseDocument(text.split('\n').slice(from, to).join('\n'));
  if (doc.errors.length) return { error: 'the frontmatter of this slide is not valid YAML' };
  try {
    doc.setIn(path, value);
  } catch {
    return { error: `${path[0]} in the frontmatter is not a map` };
  }
  return { text: spliceLines(text, from, to, doc.toString().trimEnd()) };
}

/**
 * Write a new place for drag site number `site`. A site that uses a name (`slide-ng-drag="square"`) is written to the
 * frontmatter's `dragPos`; the others are written into the markdown tag. Returns { text } or { error }.
 */
export function dragEdit(text, slide, site, pos) {
  return withEol(text, (t) => {
    const name = dragName(slide.content, site);
    if (name) return setFrontmatter(t, slide, ['dragPos', name], toPlainStyle(pos));
    const updated = setDragPosition(slide.content, site, pos);
    if (updated === null) return { error: 'no such slide-ng-drag, or the position is not numbers' };
    // `content` is the body without its trailing notes: find it inside the body lines.
    const body = t.split('\n').slice(slide.contentStart, slide.end).join('\n');
    const at = body.indexOf(slide.content);
    if (at < 0) return { error: 'could not find the slide text in the file' };
    const next = body.slice(0, at) + updated + body.slice(at + slide.content.length);
    return { text: spliceLines(t, slide.contentStart, slide.end, next) };
  });
}
