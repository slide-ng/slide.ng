// Reads the deck with Slidev's parser. Its `load` function follows `src:` imports
// (also with a `#2,4-6` slide range) and merges the importing slide's frontmatter
// over the imported one, so we get one flat list of slides.
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { injectPreparserExtensionLoader, load } from '@slidev/parser/fs';
import { assertReadable, allowsOutsideRoot } from './outside-root.mjs';
import { mergeHeadmatter, resolveRoots } from './roots.mjs';
import { preparserExtensions } from './setup/node-setups.mjs';

// `sources` is optional: a { path: text } map that replaces reading files (used by tests).
// `options.theme` is the `--theme` flag. The result has `roots` (theme, addons, the deck's own folder) and a headmatter
// with the themes' defaults under it (see roots.mjs).
export async function parseDeck(file = 'slides.md', sources, options = {}) {
  const entry = resolve(file);
  if (!sources && !existsSync(entry))
    throw new Error(
      `${entry} not found. Run slide-ng in the deck's folder, name the file (slide-ng build talk.md), or start a deck with: slide-ng create my-deck`,
    );
  // setup/preparser.ts of the roots: the parser asks for them once it has read the headmatter (which says which roots there are).
  injectPreparserExtensionLoader(async (_, headmatter, filepath, mode) => {
    const found = resolveRoots({
      deckRoot: dirname(entry),
      headmatter,
      themeOverride: options.theme ?? (process.env.SLIDE_NG_THEME || undefined),
    });
    return preparserExtensions(found, { filepath, headmatter, mode });
  });
  let data;
  try {
    data = await load({ userRoot: dirname(entry), roots: [dirname(entry)] }, entry, sources);
  } catch (e) {
    // The headmatter is parsed strictly; its line is counted from the YAML, so say where that is in the file.
    if (e?.name !== 'YAMLParseError' || !e.linePos?.[0]) throw e;
    throw new Error(
      `${entry}:${e.linePos[0].line + 1}: the headmatter is not valid YAML: ${e.message.split('\n')[0].replace(/ at line \d+, column \d+:?$/, '')}`,
      { cause: e },
    );
  }
  const problems = [];
  const roots = resolveRoots({
    deckRoot: dirname(entry),
    headmatter: data.headmatter,
    themeOverride: options.theme ?? (process.env.SLIDE_NG_THEME || undefined),
  });
  // Imports (`src:`) must stay inside the deck or a theme folder, by real path, unless the deck's own headmatter opts out.
  // (A leading `/` in `src:` means the deck's folder, as in Slidev, so it cannot name a system path.)
  const allowOutsideRoot = allowsOutsideRoot(data.headmatter);
  const readRoots = [dirname(entry), ...roots.map((r) => r.dir).filter(Boolean)];
  for (const path of Object.keys(data.markdownFiles))
    assertReadable(path, 'The imported file', { roots: readRoots, allowOutsideRoot });
  const headmatter = mergeHeadmatter(roots, data.headmatter);
  // `defaults:` in the headmatter is the starting point of every slide's frontmatter.
  const defaults = headmatter.defaults ?? {};

  const slides = data.slides.map((s) => ({
    title: s.title,
    level: s.level,
    frontmatter: { ...defaults, ...s.frontmatter },
    content: s.content,
    note: s.note,
    file: s.source?.filepath, // the markdown file this slide came from (snippet paths start there)
    // Where the slide sits in that file, in lines: the dev server edits the file there.
    source: s.source && {
      filepath: s.source.filepath,
      start: s.source.start,
      contentStart: s.source.contentStart,
      end: s.source.end,
    },
  }));

  // A slide's frontmatter is parsed leniently, so a broken one would just lose keys: stop instead, as for the headmatter.
  data.slides.forEach((slide, i) => {
    const error = slide.source?.frontmatterDoc?.errors?.[0];
    if (!error) return;
    const line = slide.source.start + (error.linePos?.[0]?.line ?? 1); // start is the `---` line, counted from 1
    throw new Error(
      `${slide.source.filepath}:${line}: the frontmatter of slide ${i + 1} is not valid YAML: ${error.message.split('\n')[0].replace(/ at line \d+, column \d+:?$/, '')}`,
    );
  });

  // Import problems (missing file, circular import, bad range) are collected by the parser.
  for (const md of Object.values(data.markdownFiles))
    for (const e of md.errors ?? []) problems.push(`${md.filepath}:${e.row}: ${e.message}`);
  return {
    headmatter,
    entry,
    roots,
    root: dirname(entry),
    allowOutsideRoot,
    slides,
    files: Object.keys(data.markdownFiles),
    problems,
  };
}
