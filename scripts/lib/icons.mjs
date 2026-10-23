// Icon tags: <carbon-apps />, <mdi-account-circle class="text-red" /> become
// <span class="i-carbon:apps"></span>, which UnoCSS draws from the installed @iconify-json set.
// To add a set: `npm i -D @iconify-json/<set>` (see docs/SYNTAX.md). Nothing else to configure.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * The icon sets that are installed, like ['carbon', 'mdi', 'ph']. Without `dir` they are looked for the way Node finds a
 * package (and UnoCSS loads the icons): in `node_modules` here and in every folder above, so the sets a deck installs next to
 * its slides.md count too (the app is built in <deck>/.slide-ng/app).
 */
export function installedSets(dir) {
  if (dir) return existsSync(dir) ? readdirSync(dir) : [];
  const sets = new Set();
  for (let at = resolve('.'); ; at = dirname(at)) {
    for (const set of installedSets(join(at, 'node_modules', '@iconify-json'))) sets.add(set);
    if (dirname(at) === at) return [...sets];
  }
}

// The icon names of an installed set, or null when the set is not found. Read once per file version.
const namesCache = new Map();
export function iconNames(set) {
  for (let at = resolve('.'); ; at = dirname(at)) {
    const file = join(at, 'node_modules', '@iconify-json', set, 'icons.json');
    if (existsSync(file)) {
      const stamp = statSync(file).mtimeMs;
      const known = namesCache.get(file);
      if (known?.stamp === stamp) return known.names;
      let names = null;
      try {
        const json = JSON.parse(readFileSync(file, 'utf8'));
        names = new Set([...Object.keys(json.icons ?? {}), ...Object.keys(json.aliases ?? {})]);
      } catch {
        // an unreadable set is not checked
      }
      namesCache.set(file, { stamp, names });
      return names;
    }
    if (dirname(at) === at) return null;
  }
}

const TAG =
  /<(\/?)([a-z][a-z0-9]*(?:-[a-z0-9]+)+)((?:\s+[^\s=>/"']+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*(\/?)>/g;

/** @param {string} html @param {string[]} [sets] */
export function rewriteIcons(html, sets = installedSets()) {
  // The longest set name wins, so `simple-icons-x` is not read as set `simple`.
  const bySize = [...sets].sort((a, b) => b.length - a.length);
  return html.replace(TAG, (tag, slash, name, attrs, selfClose) => {
    const set = bySize.find((s) => name.startsWith(`${s}-`) && name.length > s.length + 1);
    if (!set) return tag;
    if (slash) return '</span>';
    const icon = `i-${set}:${name.slice(set.length + 1)}`;
    // An existing class attribute is kept and gets the icon class added.
    let found = false;
    let rest = attrs.replace(/(\sclass\s*=\s*)(["'])(.*?)\2/, (_, eq, q, value) => {
      found = true;
      // `inline` (Slidev's starter writes it on icons) would make the span lose its size: an icon is inline-block already.
      return `${eq}${q}${icon} ${value.replace(/(^|\s)inline(?=\s|$)/g, '$1inline-block')}${q}`;
    });
    if (!found) rest = ` class="${icon}"${attrs}`;
    return selfClose ? `<span${rest}></span>` : `<span${rest}>`;
  });
}
