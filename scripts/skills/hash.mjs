// The drift guard of the agent skill. skills/GENERATION.md lists, for every file of the skill, the repository files it was
// written from, and the hash of each of them at the time a person last checked the skill against them. If a source file
// changes, its hash no longer matches and the skill file is "stale" until someone re-reads the source and updates the hash.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const SKILL_DIR = 'skills/slide-ng';
export const GENERATION_FILE = 'skills/GENERATION.md';
const BEGIN = '<!-- skills-hash:begin -->';
const END = '<!-- skills-hash:end -->';
const TABLE_BEGIN = '<!-- skills-table:begin -->';
const TABLE_END = '<!-- skills-table:end -->';

// The contributors table in the README is written by the all-contributors bot; it is not something the skill is written from.
const CONTRIBUTORS =
  /<!-- ALL-CONTRIBUTORS-LIST:START[^>]*-->[\s\S]*?<!-- ALL-CONTRIBUTORS-LIST:END -->/g;

/** The hash of one source file; line endings and the all-contributors table do not count. */
export function hashFile(root, path) {
  const text = readFileSync(join(root, path), 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(CONTRIBUTORS, '');
  return createHash('sha256').update(text).digest('hex');
}

/** One hash for a list of sources (their names and contents, in sorted order). */
export function hashSources(root, sources) {
  const hash = createHash('sha256');
  for (const path of [...sources].sort()) hash.update(`${path}\0${hashFile(root, path)}\0`);
  return hash.digest('hex');
}

/** The manifest inside GENERATION.md: `{ algorithm, files: { "<file of the skill>": { sources: { path: hash }, hash } } }`. */
export function parseManifest(text) {
  const start = text.indexOf(BEGIN);
  const end = text.indexOf(END);
  if (start < 0 || end < start) throw new Error(`GENERATION.md has no ${BEGIN} ... ${END} block`);
  const block = text.slice(start + BEGIN.length, end);
  const json = /```json\n([\s\S]*?)\n```/.exec(block);
  if (!json) throw new Error('GENERATION.md: the hash block has no json code fence');
  const manifest = JSON.parse(json[1]);
  if (manifest.algorithm !== 'sha256' || typeof manifest.files !== 'object')
    throw new Error('GENERATION.md: the hash block must have "algorithm": "sha256" and "files"');
  return manifest;
}

const tableOf = (manifest) =>
  [
    '| file of the skill | derived from |',
    '| --- | --- |',
    ...Object.entries(manifest.files).map(
      ([file, entry]) =>
        `| \`${file}\` | ${Object.keys(entry.sources)
          .map((s) => `\`${s}\``)
          .join(', ')} |`,
    ),
  ].join('\n');

/** GENERATION.md with the manifest (and the table made from it) written back. */
export function renderManifest(text, manifest) {
  const json = `${BEGIN}\n\`\`\`json\n${JSON.stringify(manifest, null, 2)}\n\`\`\`\n${END}`;
  const table = `${TABLE_BEGIN}\n${tableOf(manifest)}\n${TABLE_END}`;
  const swap = (source, begin, end, replacement) => {
    const a = source.indexOf(begin);
    const b = source.indexOf(end);
    if (a < 0 || b < a) throw new Error(`GENERATION.md has no ${begin} ... ${end} block`);
    return source.slice(0, a) + replacement + source.slice(b + end.length);
  };
  return swap(swap(text, BEGIN, END, json), TABLE_BEGIN, TABLE_END, table);
}

/** Every markdown file that belongs to the skill, relative to the skill folder, with `/`. */
export function skillFiles(root) {
  const base = join(root, SKILL_DIR);
  const files = ['SKILL.md'];
  const refs = join(base, 'references');
  if (existsSync(refs))
    for (const f of readdirSync(refs).sort()) if (f.endsWith('.md')) files.push(`references/${f}`);
  return files;
}

/**
 * Compares the recorded hashes with the files now.
 * @returns {{ stale: {file: string, changed: string[]}[], problems: string[] }}
 */
export function checkDrift(root) {
  const manifest = parseManifest(readFileSync(join(root, GENERATION_FILE), 'utf8'));
  const stale = [];
  const problems = [];
  const listed = Object.keys(manifest.files);
  for (const file of skillFiles(root))
    if (!listed.includes(file))
      problems.push(`${SKILL_DIR}/${file} is not listed in ${GENERATION_FILE}`);
  for (const file of listed) {
    if (!existsSync(join(root, SKILL_DIR, file)))
      problems.push(`${GENERATION_FILE} lists ${SKILL_DIR}/${file}, which does not exist`);
    const entry = manifest.files[file];
    const sources = Object.keys(entry.sources ?? {});
    if (!sources.length) problems.push(`${file} has no source files in ${GENERATION_FILE}`);
    const changed = [];
    for (const source of sources) {
      if (!existsSync(join(root, source))) {
        changed.push(`${source} (missing)`);
        continue;
      }
      if (hashFile(root, source) !== entry.sources[source]) changed.push(source);
    }
    if (changed.length) stale.push({ file: `${SKILL_DIR}/${file}`, changed });
  }
  return { stale, problems };
}

/** A copy of GENERATION.md's text with every hash recomputed from the sources now. */
export function updatedGeneration(root) {
  const path = join(root, GENERATION_FILE);
  const text = readFileSync(path, 'utf8');
  const manifest = parseManifest(text);
  for (const [file, entry] of Object.entries(manifest.files)) {
    const sources = Object.keys(entry.sources);
    for (const source of sources) {
      if (!existsSync(join(root, source)))
        throw new Error(`${file}: the source ${source} does not exist`);
      entry.sources[source] = hashFile(root, source);
    }
    entry.hash = hashSources(root, sources);
  }
  return renderManifest(text, manifest);
}

/** The text to print for a failed check. */
export function describeDrift({ stale, problems }) {
  const lines = [];
  if (stale.length) {
    lines.push('These skill files are stale: a document they were written from has changed.');
    for (const s of stale) lines.push(`  ${s.file}\n      changed: ${s.changed.join(', ')}`);
    lines.push(
      '',
      'Read the changed documents, update the skill files to match, then record the new hashes with:',
      '  npm run update:skills-hash',
    );
  }
  if (problems.length) lines.push('', 'Problems in the skill:', ...problems.map((p) => `  ${p}`));
  return lines.join('\n');
}
