// A mistyped click animation preset (`slide-ng-click.fadee`, `clickAnimation: scael`) only loses its animation, without a
// word. Warn when a preset is one or two letters away from a built-in one (or from the `hide` modifier) and no CSS of the
// deck or its themes defines it
// (a preset of your own is the class `slidev-vclick-anim-<name>`, docs/SYNTAX.md "Click animation presets").
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { nearest } from './did-you-mean.mjs';

export const BUILTIN_PRESETS = ['fade', 'fade-in', 'up', 'down', 'left', 'right', 'scale', 'none'];

// The preset names the CSS files of the roots' styles/ folders define, read once per list of roots (one generation).
const cache = new WeakMap();
const warned = new WeakMap();
function ownPresets(roots) {
  if (!roots) return new Set();
  if (cache.has(roots)) return cache.get(roots);
  const names = new Set();
  const read = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) read(path);
      else if (/\.(css|scss|sass|less)$/.test(entry.name))
        for (const m of readFileSync(path, 'utf8').matchAll(/slidev-vclick-anim-([\w-]+)/g))
          names.add(m[1]);
    }
  };
  for (const root of roots) if (root.dir) read(join(root.dir, 'styles'));
  cache.set(roots, names);
  return names;
}

/**
 * The warnings for the presets of one slide: those of its elements (`click-anim="..."` in the generated markup,
 * `<slide-ng-clicks animation="...">`) and of its
 * and the deck's `clickAnimation`. `css` is the slide's own `<style>`.
 * @param {{ markup: string, frontmatter?: any, headmatter?: any, css?: string, roots?: { dir?: string }[] }} slide
 */
export function presetProblems({ markup, frontmatter = {}, headmatter = {}, css = '', roots }) {
  // Once per name in a generation: the headmatter's and `defaults`' presets reach every slide.
  const said = roots ? (warned.get(roots) ?? warned.set(roots, new Set()).get(roots)) : new Set();
  const split = (v) =>
    (Array.isArray(v) ? v : typeof v === 'string' ? [v] : [])
      .flatMap((x) => String(x).split(/[\s,.]+/))
      .filter(Boolean);
  const used = new Set([
    ...[...markup.matchAll(/\sclick-anim="([^"]*)"/g)].flatMap((m) => split(m[1])),
    ...[...markup.matchAll(/<slide-ng-clicks\b[^>]*?\sanimation="([^"]*)"/g)].flatMap((m) =>
      split(m[1]),
    ),
    ...split(frontmatter.clickAnimation),
    ...split(headmatter.clickAnimation),
  ]);
  const own = new Set([
    ...ownPresets(roots),
    ...[...css.matchAll(/slidev-vclick-anim-([\w-]+)/g)].map((m) => m[1]),
  ]);
  const problems = [];
  for (const name of used) {
    if (BUILTIN_PRESETS.includes(name) || own.has(name)) continue;
    // `.hide` is a modifier, not a preset: a typo of it (`.hidee`) shows the element at its click instead of hiding it.
    const near = nearest(name, [...BUILTIN_PRESETS, 'hide']);
    if (!near || said.has(name) || !said.add(name)) continue;
    problems.push(
      near === 'hide'
        ? `the click modifier "${name}" is not "hide" or a built-in preset, and no styles define .slidev-vclick-anim-${name}, so the element is shown at its click instead of hidden. Did you mean "hide"?`
        : `the click animation preset "${name}" is not built in and no styles define .slidev-vclick-anim-${name}, so it has no animation. Did you mean "${near}"?`,
    );
  }
  return problems;
}
