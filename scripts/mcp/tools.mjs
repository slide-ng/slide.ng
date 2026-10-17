// The tools of the MCP server. Each one reads the deck with the same parser as the generator and changes slides.md as plain
// text, the way the dev server's side editor does (scripts/dev/slide-source.mjs). Every change is checked by parsing the new
// text again before anything is written, and only files inside the deck's folder are ever written.
import { existsSync, readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { stringify } from 'yaml';
import { z } from 'zod';
import { confine, safeWrite } from '../dev/auth.mjs';
import { assertNoWidening } from '../dev/escalation.mjs';
import { replaceSource, sourceOf } from '../dev/slide-source.mjs';
import { assertReadable } from '../lib/outside-root.mjs';
import { parseDeck } from '../lib/parse-deck.mjs';
import { insertSlide, moveSlide, removeSlide } from './deck-edit.mjs';

const slideNo = z.number().int().min(1).describe('slide number, counting from 1');

/** What must stay the same for a slide after an edit of other slides. */
const fingerprint = (s) => JSON.stringify([s.frontmatter, s.content, s.note]);

async function load(ctx, sources) {
  return parseDeck(ctx.entry, sources);
}

function pick(deck, no) {
  const slide = deck.slides[no - 1];
  if (!slide?.source)
    throw new Error(`there is no slide ${no} (the deck has ${deck.slides.length})`);
  return slide;
}

// A file of the project that may be written: inside the deck's folder, a .md file that exists.
function writableFile(ctx, slide) {
  const file = confine(ctx.root, relative(ctx.root, slide.source.filepath), {
    write: true,
  });
  if (!file || !file.endsWith('.md') || !existsSync(file))
    throw new Error('this slide is not in a markdown file of the project');
  return file;
}

// Structural edits work on the entry file only, so every slide must come from it.
function entryOnly(ctx, deck) {
  if (deck.slides.some((s) => s.source?.filepath !== ctx.entry)) {
    throw new Error(
      'this deck imports slides with src:, so slides cannot be inserted, removed or moved here; edit the files by hand',
    );
  }
}

/** Parses `text` as the new content of `file`, checks the slides against `expected` (fingerprints), then writes it. */
async function commit(ctx, file, text, expected) {
  const check = await load(ctx, { [file]: text });
  const got = check.slides.map(fingerprint);
  if (got.length !== expected.length || got.some((g, i) => g !== expected[i])) {
    throw new Error('the edit would change other slides than intended, so nothing was written');
  }
  await assertNoWidening(ctx, file, text);
  safeWrite(file, text);
  return check;
}

const summary = (deck, no) => ({
  slides: deck.slides.length,
  no,
  title: deck.slides[no - 1]?.title ?? null,
});

export const TOOLS = [
  {
    name: 'list_slides',
    description:
      'List the slides of the deck: number, title, layout, whether it has speaker notes, and the file it is in.',
    schema: {},
    async run(ctx) {
      const deck = await load(ctx);
      return deck.slides.map((s, i) => ({
        no: i + 1,
        title: s.title ?? null,
        layout: s.frontmatter.layout ?? (i === 0 ? 'cover' : 'default'),
        hasNotes: Boolean(s.note),
        file: relative(ctx.root, s.file),
      }));
    },
  },
  {
    name: 'get_outline',
    description:
      'The outline of the deck: the titles of the slides with their heading level, and the same as an indented text.',
    schema: {},
    async run(ctx) {
      const deck = await load(ctx);
      const items = deck.slides.flatMap((s, i) =>
        s.title ? [{ no: i + 1, title: s.title, level: s.level ?? 1 }] : [],
      );
      return {
        items,
        text: items
          .map((o) => `${'  '.repeat(Math.max(0, o.level - 1))}${o.no}. ${o.title}`)
          .join('\n'),
      };
    },
  },
  {
    name: 'get_slide',
    description:
      'One slide: its markdown exactly as written in the file (frontmatter, content, notes), and what the parser made of it.',
    schema: { no: slideNo },
    async run(ctx, { no }) {
      const deck = await load(ctx);
      const slide = pick(deck, no);
      // parseDeck already refuses imports that leave the deck; the read checks again, so no path reaches readFileSync unchecked.
      assertReadable(slide.source.filepath, 'The slide file', {
        roots: [ctx.root, ...(deck.roots ?? []).map((r) => r.dir)],
        allowOutsideRoot: deck.allowOutsideRoot,
      });
      const text = readFileSync(slide.source.filepath, 'utf8');
      return {
        no,
        file: relative(ctx.root, slide.file),
        markdown: sourceOf(text, slide.source),
        title: slide.title ?? null,
        frontmatter: slide.frontmatter,
        notes: slide.note ?? null,
      };
    },
  },
  {
    name: 'update_slide',
    description:
      'Replace one slide with new markdown (frontmatter, content and notes, as in get_slide). It must stay one slide.',
    schema: {
      no: slideNo,
      markdown: z.string().describe('the new text of the slide, without a trailing --- separator'),
    },
    async run(ctx, { no, markdown }) {
      const deck = await load(ctx);
      const slide = pick(deck, no);
      const file = writableFile(ctx, slide);
      const text = replaceSource(readFileSync(file, 'utf8'), slide.source, markdown).text;
      // The other slides must look the same afterwards, and this one may change.
      const expected = deck.slides.map(fingerprint);
      const after = await load(ctx, { [file]: text });
      if (after.slides.length !== deck.slides.length)
        throw new Error(
          'the new text is not exactly one slide (it has --- separators, or frontmatter for a slide that had none); use insert_slide to add slides',
        );
      expected[no - 1] = fingerprint(after.slides[no - 1]);
      return summary(await commit(ctx, file, text, expected), no);
    },
  },
  {
    name: 'insert_slide',
    description:
      'Insert a new slide after slide `after` (it cannot go before slide 1, which carries the headmatter).',
    schema: {
      after: slideNo.describe('the new slide goes after this slide number'),
      markdown: z
        .string()
        .describe('the content of the new slide (and its notes in an HTML comment)'),
      frontmatter: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('frontmatter keys such as { layout: "center" }'),
    },
    async run(ctx, { after, markdown, frontmatter }) {
      const deck = await load(ctx);
      entryOnly(ctx, deck);
      const head =
        frontmatter && Object.keys(frontmatter).length
          ? `---\n${stringify(frontmatter)}---\n`
          : '---\n';
      const text = insertSlide(
        readFileSync(ctx.entry, 'utf8'),
        deck.slides.map((s) => s.source),
        after,
        `${head}\n${markdown.trim()}`,
      );
      const check = await load(ctx, { [ctx.entry]: text });
      const expected = deck.slides.map(fingerprint);
      expected.splice(after, 0, fingerprint(check.slides[after] ?? {}));
      return summary(await commit(ctx, ctx.entry, text, expected), after + 1);
    },
  },
  {
    name: 'remove_slide',
    description: 'Remove a slide (not slide 1, which carries the headmatter).',
    schema: { no: slideNo },
    async run(ctx, { no }) {
      const deck = await load(ctx);
      entryOnly(ctx, deck);
      const text = removeSlide(
        readFileSync(ctx.entry, 'utf8'),
        deck.slides.map((s) => s.source),
        no,
      );
      const expected = deck.slides.map(fingerprint);
      expected.splice(no - 1, 1);
      const after = await commit(ctx, ctx.entry, text, expected);
      // Name the slide that was removed, not the one that now has its number.
      return {
        slides: after.slides.length,
        removed: { no, title: deck.slides[no - 1]?.title ?? null },
      };
    },
  },
  {
    name: 'move_slide',
    description:
      'Move slide `from` so that it becomes slide `to` (slide 1 cannot be moved, nor anything before it).',
    schema: { from: slideNo, to: slideNo },
    async run(ctx, { from, to }) {
      const deck = await load(ctx);
      entryOnly(ctx, deck);
      const text = moveSlide(
        readFileSync(ctx.entry, 'utf8'),
        deck.slides.map((s) => s.source),
        from,
        to,
      );
      const expected = deck.slides.map(fingerprint);
      expected.splice(to - 1, 0, ...expected.splice(from - 1, 1));
      return summary(await commit(ctx, ctx.entry, text, expected), to);
    },
  },
];
