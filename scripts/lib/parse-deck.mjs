// Reads the deck with Slidev's parser. Its `load` function follows `src:` imports
// (also with a `#2,4-6` slide range) and merges the importing slide's frontmatter
// over the imported one, so we get one flat list of slides.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { injectPreparserExtensionLoader, load } from '@slidev/parser/fs';
import { assertReadable, allowsOutsideRoot } from './outside-root.mjs';
import { mergeHeadmatter, resolveRoots } from './roots.mjs';
import { preparserExtensions } from './setup/node-setups.mjs';
import { themeConfigVars } from './theme-config.mjs';
import { describeYamlError } from './yaml-errors.mjs';
import { frontmatterSlip } from './frontmatter-slips.mjs';
import { slideLine } from './slide-line.mjs';

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
    // The headmatter is parsed strictly; its line is counted from the YAML, so say where that is in the file. It runs from the
    // first line after the opening --- to the next ---.
    if (e?.name !== 'YAMLParseError' || !e.linePos?.[0]) throw e;
    const lines = (sources?.[entry] ?? readFileSync(entry, 'utf8')).split(/\r?\n/);
    const end = lines.findIndex((l, i) => i > 0 && /^---\s*$/.test(l));
    const raw = lines.slice(1, end === -1 ? undefined : end).join('\n');
    const { line, message } = describeYamlError(e, raw, 2, 'headmatter');
    throw new Error(`${entry}:${line}: the headmatter is not valid YAML: ${message}`, { cause: e });
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
    // A `title:` on the slide that imports this one (`src:`) wins over the imported slide's own title.
    title: s.frontmatter?.title != null ? String(s.frontmatter.title) : s.title,
    // `level` in the frontmatter, or in the headmatter's `defaults`, wins over the heading's level
    level:
      (s.frontmatter?.level ?? defaults.level) != null
        ? +(s.frontmatter?.level ?? defaults.level)
        : s.level,
    frontmatter: { ...defaults, ...s.frontmatter },
    // The last slide written as `---` then `# B` (no frontmatter, no blank line) keeps the `---` in its content: drop it.
    content: s.content.replace(/^---[ \t]*\n/, ''),
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

  // Slidev's MDC syntax (`mdc: true`, `comark: true`) is not supported: say so instead of showing the syntax as text.
  for (const key of ['mdc', 'comark'])
    if (data.headmatter[key])
      problems.push(
        `${entry}: \`${key}: true\` is not supported (MDC syntax such as :span[x]{.c} stays text); use HTML with classes instead`,
      );

  // `themeConfig` keys that cannot be a CSS variable are skipped (lib/theme-config.mjs); the theme's defaults are checked too.
  for (const p of themeConfigVars(headmatter.themeConfig).problems) problems.push(`${entry}: ${p}`);
  // `progressBar` (slide.ng's own): anything but these draws no bar, which is easy to miss.
  const bar = data.headmatter.progressBar;
  const barObject = bar != null && typeof bar === 'object' && !Array.isArray(bar);
  if (bar != null && ![true, false, 'top', 'bottom'].includes(bar) && !barObject)
    problems.push(
      `${entry}: \`progressBar: ${JSON.stringify(bar)}\` is not used: write true, top, bottom or { position, height, color, track, clicks, minutes }`,
    );
  else if (barObject && bar.position != null && !['top', 'bottom'].includes(bar.position))
    problems.push(
      `${entry}: \`progressBar.position: ${JSON.stringify(bar.position)}\` is not used: write top or bottom (bottom is used)`,
    );

  // Old Slidev decks pick Prism; code here is always Shiki, so Prism theme CSS no longer applies.
  if (data.headmatter.highlighter && data.headmatter.highlighter !== 'shiki')
    problems.push(
      `${entry}: \`highlighter: ${data.headmatter.highlighter}\` is not used: code is highlighted with Shiki (pick its colours in setup/shiki.ts); CSS written for Prism tokens does not apply`,
    );

  // A slide's frontmatter is parsed leniently, so a broken one would just lose keys: stop instead, as for the headmatter.
  data.slides.forEach((slide, i) => {
    const error = slide.source?.frontmatterDoc?.errors?.[0];
    if (!error) return;
    // `start` is the index of the opening `---` line (from 0), so the frontmatter's first line is line start + 2 of the file.
    const { line, message } = describeYamlError(
      error,
      slide.source.frontmatterRaw ?? '',
      slide.source.start + 2,
      'frontmatter',
    );
    throw new Error(
      `${slide.source.filepath}:${line}: the frontmatter of slide ${i + 1} is not valid YAML: ${message}`,
    );
  });

  const read = new Map();
  const fileLines = (path) => {
    if (!read.has(path))
      try {
        read.set(path, (sources?.[path] ?? readFileSync(path, 'utf8')).split(/\r?\n/));
      } catch {
        read.set(path, []);
      }
    return read.get(path);
  };
  // `---` straight followed by `# Title` and text reads the lines up to the next `---` as frontmatter, as in Slidev; they are
  // not `key: value` pairs, so the slide's text is lost. Say so.
  data.slides.forEach((slide, i) => {
    const raw = slide.frontmatterRaw ?? '';
    const value = (slide.source ?? slide).frontmatterDoc?.toJS?.();
    // Text reads as a YAML string; a heading alone reads as a comment, so there are no keys at all. Frontmatter with keys is
    // real, and a `# ...` line in it is a comment (Slidev's starter begins with `# You can also start simply with 'default'`).
    const hasKeys = value != null && typeof value === 'object' && Object.keys(value).length > 0;
    const text =
      (value != null && typeof value !== 'object') ||
      (!hasKeys &&
        raw.split('\n').some((l) => /^#{1,6}\s+\S/.test(l) && !/^#\s*[\w-]+\s*:/.test(l)));
    const file = slide.source?.filepath ?? entry;
    if (!text) {
      // A frontmatter with keys that lost its closing `---`, or a last slide's frontmatter that never had one.
      const slip = frontmatterSlip({
        raw,
        keys: hasKeys,
        content: slide.content.replace(/^---[ \t]*\n/, ''),
        start: slide.source?.start ?? 0,
        lines: fileLines(file),
      });
      if (slip) problems.push(`${file}:${slip.line}: slide ${i + 1}: ${slip.message}`);
      return;
    }
    const first = raw.split('\n').find((l) => l.trim()) ?? '';
    problems.push(
      `${file}:${slideLine(slide.source)}: slide ${i + 1}: the lines after "---" (${first.trim().slice(0, 40)}) were read as frontmatter, so they are not shown; put an empty line after "---" to start a slide with text`,
    );
  });

  // Import problems (missing file, circular import, bad range) are collected by the parser.
  // The dev server shows them in the page too (`importProblems`), and watches for a missing file to be made (`missing`).
  const importProblems = [];
  const missing = [];
  for (const md of Object.values(data.markdownFiles))
    for (const e of md.errors ?? []) {
      importProblems.push(`${md.filepath}:${e.row}: ${e.message}`);
      const notFound = /^Imported markdown file not found: (.+)$/.exec(e.message);
      if (notFound) missing.push(notFound[1]);
    }
  problems.push(...importProblems);
  // The parser leaves out slides with `hide:` or `disabled:`; their routeAlias names no slide, so links to it are worth a warning.
  const hiddenAliases = Object.values(data.markdownFiles)
    .flatMap((md) => md.slides)
    .filter(
      (s) => (s.frontmatter?.hide || s.frontmatter?.disabled) && s.frontmatter.routeAlias != null,
    )
    .map((s) => String(s.frontmatter.routeAlias));
  return {
    headmatter,
    entry,
    roots,
    root: dirname(entry),
    allowOutsideRoot,
    slides,
    hiddenAliases,
    files: Object.keys(data.markdownFiles),
    missing,
    problems,
    importProblems,
  };
}
