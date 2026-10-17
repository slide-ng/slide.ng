// A picture next to slides.md, written as Slidev decks do (`![](./images/x.png)`, `<img src="../shared/logo.svg">`): Vite
// bundled those, while the app only serves `public/`. A relative address that `public/` does not have, and that names a file in
// the deck's folder, is served from the build's `_local/` folder instead (generate.mjs copies the file there).
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

export const LOCAL_FOLDER = '_local';

const RELATIVE = /(\s(?:src|poster|href|data)=)(["'])(\.{1,2}\/[^"'#?]+)([#?][^"']*)?\2/g;

/**
 * Rewrites the relative addresses of `html` that name a file of the deck's folder. `ctx.file` is the markdown file of the slide,
 * `ctx.root` the deck's folder and `ctx.publics` the `public/` folders of the roots; `found` collects deck-relative paths.
 */
export function localAssets(html, ctx, found) {
  if (!ctx.file || !ctx.root) return html;
  const root = realpathSync(ctx.root);
  return html.replace(RELATIVE, (match, attr, quote, address, rest = '') => {
    const inPublic = (ctx.publics ?? []).some((p) => existsSync(join(p, address)));
    if (inPublic) return match; // the browser finds it next to the page, as before
    let decoded;
    try {
      decoded = decodeURI(address);
    } catch {
      decoded = address; // a literal `%` (`./50%.png`), not an escape
    }
    const target = resolve(dirname(ctx.file), decoded);
    if (!existsSync(target) || !statSync(target).isFile() || /\.md$/i.test(target)) return match;
    const rel = relative(root, realpathSync(target));
    if (!rel || rel.startsWith('..') || isAbsolute(rel)) return match; // outside the deck: not served
    const path = rel.split(sep).join('/');
    found.add(path);
    return `${attr}${quote}/${LOCAL_FOLDER}/${encodeURI(path)}${rest}${quote}`;
  });
}

/** Copies the collected files to `out` (the generated `local-assets` folder), only when changed, and removes the rest. */
export function copyLocalAssets(root, paths, out) {
  mkdirSync(out, { recursive: true });
  const same = (a, b) => {
    if (!existsSync(b)) return false;
    const x = statSync(a),
      y = statSync(b);
    return x.size === y.size && Math.trunc(x.mtimeMs) === Math.trunc(y.mtimeMs);
  };
  for (const path of paths) {
    const from = join(root, path),
      to = join(out, path);
    if (same(from, to)) continue;
    mkdirSync(dirname(to), { recursive: true });
    cpSync(from, to, { preserveTimestamps: true });
  }
  const keep = new Set([...paths].map((p) => join(out, p)));
  for (const f of readdirSync(out, { recursive: true, withFileTypes: true }))
    if (f.isFile() && !keep.has(join(f.parentPath, f.name))) rmSync(join(f.parentPath, f.name));
}
