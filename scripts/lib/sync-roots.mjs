// Copies the folders of the roots into `src/slides/generated/roots/<id>/`, so that Angular compiles them like the rest of
// the app (a theme in node_modules is TypeScript that the build would not touch otherwise, and imports in it must find
// `@angular/core`). The `public` folders are merged into `generated/public/` (later roots win), which is served as the site's root.
// Files are only written when their content changed, so the dev server does not rebuild for nothing.
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT_FOLDERS } from './roots.mjs';

// Symbolic links, dependencies and git data are not copied: a theme could point a link anywhere on the disk.
const skip = (name, path) =>
  name === 'node_modules' || name === '.git' || lstatSync(path).isSymbolicLink();

// Every file under `dir` as a path relative to it.
function listFiles(dir, base = dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (skip(name, path)) return [];
    return lstatSync(path).isDirectory() ? listFiles(path, base) : [relative(base, path)];
  });
}

/**
 * Makes `to` hold the same files as `from`: new and changed files are written, and files only in `to` are removed when `prune`.
 * `rewrite` gives other text for some source files (by their full path), copied instead of the file.
 */
export function syncTree(from, to, prune = true, rewrite = new Map()) {
  const wanted = new Set(listFiles(from));
  for (const file of wanted) {
    const text = rewrite.get(join(from, file));
    const source = text === undefined ? readFileSync(join(from, file)) : Buffer.from(text);
    const target = join(to, file);
    if (existsSync(target) && readFileSync(target).equals(source)) continue;
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, source);
  }
  if (prune && existsSync(to))
    for (const file of listFiles(to)) if (!wanted.has(file)) rmSync(join(to, file));
}

/**
 * Copies every root. Returns, for the logs, `{ id, folders }` of each. `generated` is the folder `src/slides/generated`.
 * `rewrite` maps source files to the text to copy instead (styles with UnoCSS directives written out).
 */
export function syncRoots(roots, generated, rewrite = new Map()) {
  const target = join(generated, 'roots');
  const publicDir = join(generated, 'public');
  mkdirSync(target, { recursive: true });
  mkdirSync(publicDir, { recursive: true });
  // The folders of roots that are gone, and the public files of the last run, are cleared first (public is rebuilt from all roots).
  for (const id of readdirSync(target))
    if (!roots.some((r) => r.id === id)) rmSync(join(target, id), { recursive: true });
  const publicWanted = new Set();

  const result = roots.map((root) => {
    const folders = ROOT_FOLDERS.filter(
      (f) => existsSync(join(root.dir, f)) && lstatSync(join(root.dir, f)).isDirectory(),
    );
    for (const folder of ROOT_FOLDERS) {
      const from = join(root.dir, folder);
      if (!folders.includes(folder)) {
        if (folder !== 'public')
          rmSync(join(target, root.id, folder), { recursive: true, force: true });
        continue;
      }
      if (folder === 'public') {
        syncTree(from, publicDir, false);
        listFiles(from).forEach((f) => publicWanted.add(f));
      } else syncTree(from, join(target, root.id, folder), true, rewrite);
    }
    return { id: root.id, folders };
  });
  for (const file of listFiles(publicDir))
    if (!publicWanted.has(file)) rmSync(join(publicDir, file));
  return result;
}
