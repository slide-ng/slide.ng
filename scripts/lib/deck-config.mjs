// The deck's options in a file of their own (docs/SYNTAX.md): `slide-ng.config.yaml` (or `.yml`, `.json`) next to the entry
// file. Its keys are those of the headmatter, and the headmatter goes over it key by key (lib/roots.mjs overlayHeadmatter).
// It is looked for in the entry file's folder only, and must really be there (a symbolic link that leads out is refused), so
// it is part of the deck as much as slides.md is: it can set what the headmatter can, `allowOutsideRoot` included, no more.
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { LineCounter, parseDocument } from 'yaml';
import { insideRoots } from './outside-root.mjs';
import { describeYamlError } from './yaml-errors.mjs';

/** The names looked for, in this order; the first one there is read. */
export const CONFIG_FILES = ['slide-ng.config.yaml', 'slide-ng.config.yml', 'slide-ng.config.json'];

// Keys of the first slide itself, not of the deck: in the headmatter they set that slide's layout, class and so on.
const SLIDE_KEYS = [
  'layout',
  'class',
  'src',
  'hide',
  'disabled',
  'routeAlias',
  'clicks',
  'clicksStart',
  'level',
  'hideInToc',
  'dragPos',
  'preload',
  'image',
  'url',
  'scale',
  'backgroundSize',
  'background',
  'layoutClass',
];

/** The config files a deck in `dir` can have, as paths (the generator watches them, also before one exists). */
export const configFiles = (dir) => CONFIG_FILES.map((name) => join(dir, name));

/**
 * The config file of the deck in `dir`, or null when it has none: `{ file, headmatter, lines, problems }`, with `lines` the
 * line of each top-level key and `problems` the warnings, with file and line. A file that is not valid YAML or JSON, or not a
 * map of keys, throws with its file and line. `sources` is parse-deck's { path: text } map, read before the disk.
 * @param {string} dir @param {Record<string, string>} [sources]
 */
export function readDeckConfig(dir, sources) {
  const found = configFiles(dir).filter((f) => (sources && f in sources) || existsSync(f));
  if (!found.length) return null;
  const file = found[0];
  const problems = found
    .slice(1)
    .map((f) => `${f}: not read, as ${basename(file)} is there too; keep one config file`);
  if (!insideRoots(file, [dir]))
    throw new Error(
      `${file} leads outside the deck's folder; the config file is read only from the folder of slides.md (docs/SECURITY-MODEL.md)`,
    );
  const text = sources?.[file] ?? readFileSync(file, 'utf8');
  const json = file.endsWith('.json');
  const lineCounter = new LineCounter();
  const doc = parseDocument(text, { lineCounter, uniqueKeys: true });
  let value;
  if (json) {
    try {
      value = text.trim() ? JSON.parse(text) : null;
    } catch (e) {
      const at = /line (\d+)/.exec(e.message)?.[1];
      const message = e.message
        .replace(/ in JSON at position \d+.*$/, '')
        .replace(/\s*\(line.*$/, '');
      throw new Error(
        `${file}${at ? `:${at}` : ''}: the config file is not valid JSON: ${message}`,
        { cause: e },
      );
    }
  } else {
    const error = doc.errors[0];
    if (error) {
      const { line, message } = describeYamlError(error, text, 1, 'config file');
      throw new Error(`${file}:${line}: the config file is not valid YAML: ${message}`, {
        cause: error,
      });
    }
    value = doc.toJS();
  }
  if (value == null) value = {};
  if (typeof value !== 'object' || Array.isArray(value))
    throw new Error(
      `${file}: the config file should hold the deck's options as keys, such as "title: My talk"`,
    );
  // The line of each top-level key; JSON is read by the YAML parser for this only (a JSON file is YAML too).
  const lines = Object.create(null);
  if (!doc.errors.length && Array.isArray(doc.contents?.items))
    for (const item of doc.contents.items) {
      const key = item.key?.toJSON?.() ?? item.key?.value;
      if (key != null && item.key.range) lines[key] = lineCounter.linePos(item.key.range[0]).line;
    }
  const headmatter = { ...value };
  for (const key of SLIDE_KEYS.filter((k) => Object.hasOwn(headmatter, k))) {
    delete headmatter[key];
    problems.push(
      `${file}${lines[key] ? `:${lines[key]}` : ''}: \`${key}\` belongs to the first slide, not to the deck, so the config file does not set it; write it in the first slide, or under \`defaults\` for every slide`,
    );
  }
  return { file, headmatter, lines, problems };
}

/** `file:line` of a top-level key of the config file `config` (readDeckConfig), or null when it does not set the key. */
export function configKeyPlace(config, key) {
  if (!config || !Object.hasOwn(config.lines, key)) return null;
  return `${config.file}:${config.lines[key]}`;
}
