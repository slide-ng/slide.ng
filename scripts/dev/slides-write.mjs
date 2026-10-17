// Changes slides.md (or a file it imports) on request of the page: a slide-ng-drag moved, or the side editor saved.
// The page only says "slide 3"; which file and which lines is found here, from the parser. A path never comes from a request.
import { existsSync, readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { parseDeck } from '../lib/parse-deck.mjs';
import { confine, safeWrite } from './auth.mjs';
import { assertNoWidening } from './escalation.mjs';
import { HttpError } from './http-error.mjs';
import { dragEdit, replaceSource, sourceOf } from './slide-source.mjs';

/** The slide, the markdown file it is in, and that file's text, read now. */
async function locate(ctx, no) {
  if (!Number.isInteger(no) || no < 1) throw new HttpError(400, 'bad slide number');
  const deck = await parseDeck(ctx.entry);
  const slide = deck.slides[no - 1];
  if (!slide?.source) throw new HttpError(404, 'no such slide');
  const file = confine(ctx.root, relative(ctx.root, slide.source.filepath), {
    write: true,
  });
  if (!file || !file.endsWith('.md') || !existsSync(file))
    throw new HttpError(403, 'this slide is not in a file of the project');
  return {
    slide: { ...slide.source, content: slide.content },
    file,
    text: readFileSync(file, 'utf8'),
  };
}

async function save(ctx, file, result) {
  if (result.error) throw new HttpError(422, result.error);
  await assertNoWidening(ctx, file, result.text);
  safeWrite(file, result.text);
}

/** A slide-ng-drag element was moved: write its new place. */
export async function writeDrag(ctx, no, site, pos) {
  const { slide, file, text } = await locate(ctx, no);
  await save(ctx, file, dragEdit(text, slide, site, pos));
}

/** The raw markdown of a slide for the side editor. */
export async function readSlide(ctx, no) {
  const { slide, text } = await locate(ctx, no);
  return sourceOf(text, slide);
}

/**
 * The side editor saved: replace the slide's lines. `base` is the slide's text as the editor last read it; when the file
 * changed since (another editor, git, the MCP server inserted a slide before it), slide `no` may be another slide now, so
 * nothing is written (409).
 */
export async function writeSlide(ctx, no, raw, base) {
  const { slide, file, text } = await locate(ctx, no);
  if (typeof base === 'string' && sourceOf(text, slide) !== base)
    throw new HttpError(409, `slide ${no} changed in the file since the editor read it`);
  await save(ctx, file, replaceSource(text, slide, raw));
}
