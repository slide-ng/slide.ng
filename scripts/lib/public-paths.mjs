// A picture written with a leading slash (`![](/photo.png)`, `image: /photo.png`) is a file of `public/`, which is served as the
// site's root. One that no `public/` folder has is a broken picture on the slide, without a word: say so. `/public/photo.png`
// is the usual slip (the folder's name is not part of the address).
import { existsSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { CODE } from './asset-paths.mjs';
import { LOCAL_FOLDER } from './local-assets.mjs';

// `src`, `poster` and `srcset` attributes, and `url()` in inline styles.
const PICTURE =
  /\s(?:src|poster)=(["'])\/(?!\/)([^"']*)\1|url\(\s*(["']?)\/(?!\/)([^"')\s]*)\3\s*\)/g;
const SRCSET = /\ssrcset=(["'])([^"']*)\1/g;
// The frontmatter keys of the layouts that hold a picture.
const PICTURE_KEYS = ['image', 'background', 'backgroundImage'];
// Folders the generator fills itself.
const GENERATED = [`${LOCAL_FOLDER}/`, 'remote-assets/'];

function picturePaths(html, frontmatter) {
  const paths = [];
  for (const part of html.split(CODE).filter((_, i) => i % 2 === 0)) {
    for (const m of part.matchAll(PICTURE)) paths.push(m[2] ?? m[4]);
    for (const m of part.matchAll(SRCSET))
      for (const item of m[2].split(','))
        if (/^\s*\/(?!\/)/.test(item)) paths.push(item.trim().split(/\s/)[0].slice(1));
  }
  for (const key of PICTURE_KEYS) {
    const value = frontmatter?.[key];
    if (typeof value === 'string' && /^\/(?!\/)/.test(value.trim()))
      paths.push(value.trim().slice(1));
  }
  return paths;
}

// The same with a relative address (`./logo.png`, `../shared/x.svg`), which starts at the folder of the slide's markdown file.
const RELATIVE_PICTURE = /\s(?:src|poster)=(["'])(\.{1,2}\/[^"']*)\1/g;

function relativePicturePaths(html, frontmatter) {
  const paths = [];
  for (const part of html.split(CODE).filter((_, i) => i % 2 === 0)) {
    for (const m of part.matchAll(RELATIVE_PICTURE)) paths.push(m[2]);
    for (const m of part.matchAll(SRCSET))
      for (const item of m[2].split(','))
        if (/^\s*\.{1,2}\//.test(item)) paths.push(item.trim().split(/\s/)[0]);
  }
  for (const key of PICTURE_KEYS) {
    const value = frontmatter?.[key];
    if (typeof value === 'string' && /^\.{1,2}\//.test(value.trim())) paths.push(value.trim());
  }
  return paths;
}

/**
 * Warns about the pictures of a slide that are not there: a root address (`/x.png`) that none of `publics` (the roots'
 * `public/` folders) has, and a relative one (`./x.png`) that is neither next to `file` (the slide's markdown file) nor in a
 * `public/` folder. `name` is how the warning names that file (`slides.md`).
 */
export function warnMissingPublicFiles(html, frontmatter, no, publics, { file, name } = {}) {
  const isFile = (path) => existsSync(path) && statSync(path).isFile();
  if (file)
    for (const raw of new Set(relativePicturePaths(html, frontmatter))) {
      const address = raw.split(/[?#]/)[0];
      let path;
      try {
        path = decodeURI(address);
      } catch {
        path = address;
      }
      if (isFile(resolve(dirname(file), path)) || publics.some((p) => isFile(join(p, path))))
        continue;
      console.warn(
        `[slides] slide ${no}: the picture "${address}" is not found (a relative address starts at the folder of ${name ?? basename(file)})`,
      );
    }
  const has = (path) =>
    publics.some((p) => existsSync(join(p, path)) && statSync(join(p, path)).isFile());
  for (const raw of new Set(picturePaths(html, frontmatter))) {
    const address = raw.split(/[?#]/)[0];
    if (!address || GENERATED.some((g) => address.startsWith(g))) continue;
    let path;
    try {
      path = decodeURI(address);
    } catch {
      path = address;
    }
    if (has(path)) continue;
    const inner = path.replace(/^public\//, '');
    console.warn(
      path !== inner
        ? `[slides] slide ${no}: "/${address}" names the public/ folder, which is the site's root: write "/${address.slice('public/'.length)}"${has(inner) ? '' : ` (and put ${inner} in public/)`}`
        : `[slides] slide ${no}: the picture "/${address}" is not in public/ (an address that starts with / is a file of the public/ folder next to slides.md)`,
    );
  }
}
