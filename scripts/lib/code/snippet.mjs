// `<<< ./file.ts#region ts {2|3}` : put a file's text (or one region of it) in a code block.
// Port of Slidev's snippet.ts. `@/` means the project root.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { assertReadable } from '../outside-root.mjs';

// `<<< path#region lang [title] {ranges}{options}`, each part after the path optional, in that order. The language is the word
// after the file name; it cannot start with `{` (the ranges) or `[` (the title). The title may have spaces and a `~icon~`.
export const SNIPPET_LINE =
  /^<<<[ \t]*(\S.*?)(#[\w-]+)?(?:[ \t]+([^\s{[][^\s{[]*))?(?:[ \t]*(\[[^\]]*\]))?[ \t]*(\{.*)?$/;

// Comment styles that can mark a region: [start, end] for several languages.
const MARKERS = [
  [/^\s*\/\/\s*#?region\b\s*(.*?)\s*$/, /^\s*\/\/\s*#?endregion\b\s*(.*?)\s*$/],
  [/^\s*<!--\s*#?region\b\s*(.*?)\s*-->/, /^\s*<!--\s*#?endregion\b\s*(.*?)\s*-->/],
  [/^\s*\/\*\s*#region\b\s*(.*?)\s*\*\//, /^\s*\/\*\s*#endregion\b\s*(.*?)\s*\*\//],
  [/^\s*#[rR]egion\b\s*(.*?)\s*$/, /^\s*#[eE]nd ?[rR]egion\b\s*(.*?)\s*$/],
  [/^\s*#\s*#?region\b\s*(.*?)\s*$/, /^\s*#\s*#?endregion\b\s*(.*?)\s*$/],
];

// Lines of the region called `name`, markers left out. null when there is none.
export function findRegion(lines, name) {
  for (const [start, end] of MARKERS) {
    const from = lines.findIndex((l) => start.exec(l)?.[1] === name);
    if (from < 0) continue;
    let depth = 1; // regions of the same name may nest
    for (let i = from + 1; i < lines.length; i++) {
      if (start.exec(lines[i])?.[1] === name) depth++;
      const closing = end.exec(lines[i])?.[1];
      if ((closing === name || closing === '') && --depth === 0) return lines.slice(from + 1, i);
    }
  }
  return null;
}

// Remove the indentation that every line has in common.
export function dedent(lines) {
  const indents = lines.filter((l) => l.trim()).map((l) => /^[ \t]*/.exec(l)[0].length);
  const cut = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(cut));
}

/** Every snippet file read since the set was last cleared (generate.mjs clears it before each run). */
export const snippetFiles = new Set();

// `line` is the whole `<<<` line, `file` the markdown file it is in, `root` the project folder.
// `options.roots` adds the folders of themes and addons; `options.allowOutsideRoot` is the deck's explicit opt-in. Without it a
// file whose real place is outside those folders is an OutsideRootError (a symlink that leads out counts as outside).
// Returns { code, lang, meta, path, partial } (`partial`: only a region of the file) or throws with a readable message.
export function resolveSnippet(line, file, root, options = {}) {
  const m = SNIPPET_LINE.exec(line.trim());
  if (!m) return null;
  const [, name, region = '', lang = '', title = '', rest = ''] = m;
  const meta = `${title} ${rest}`;
  const path = name.startsWith('@/') ? resolve(root, name.slice(2)) : resolve(dirname(file), name);
  assertReadable(path, 'The code snippet', {
    roots: options.roots ?? [root],
    allowOutsideRoot: options.allowOutsideRoot,
  });
  snippetFiles.add(path); // the dev server watches it (also while it is missing: creating it fixes the slide)
  if (!existsSync(path) || !statSync(path).isFile()) {
    // In a file imported with `src:` a path starts at that file's folder; `@/` starts at the deck's.
    const fromDeck = resolve(root, name);
    const hint = /\s/.test(name)
      ? ' (the line is read as: <<< path#region lang [title] {ranges}{options})'
      : !name.startsWith('@/') && !isAbsolute(name) && dirname(file) !== resolve(root)
        ? existsSync(fromDeck)
          ? ` (a path is relative to the file the <<< is in; for the deck's ${name.replace(/^\.\//, '')} write <<< @/${relative(root, fromDeck).replace(/\\/g, '/')})`
          : " (a path is relative to the file the <<< is in; @/ starts at the deck's folder)"
        : '';
    throw new Error(`Code snippet not found: ${path}${hint}`);
  }
  let lines = readFileSync(path, 'utf8').replace(/\r/g, '').replace(/\n$/, '').split('\n');
  if (region) {
    const found = findRegion(lines, region.slice(1));
    if (found) lines = dedent(found);
    else
      console.warn(
        `[slides] region "${region.slice(1)}" not found in ${path}, using the whole file`,
      );
  }
  return {
    code: lines.join('\n'),
    lang: lang.trim() || extname(name).slice(1),
    meta: meta.trim(),
    path,
    partial: !!region,
  };
}
