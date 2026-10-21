// Reads the layouts and components that themes, addons and the deck bring (folders `layouts/` and `components/` of a root)
// and merges them into the tables of registry.mjs, so a slide can use them like the built-in ones.
// Files are read as text: a standalone component needs `selector: '...'` and `export class Name`.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { COMPONENTS, LAYOUTS } from './registry.mjs';
import { pipeNames } from './pipes.mjs';

// `@Component({ ... }) export class Name` (also @Directive and @Pipe): each decorator with the class right after it, so a
// helper component that is not exported (declared first in the file) keeps its own selector and does not take the next one's.
const DECORATED = /@(Component|Directive|Pipe)\(\{([\s\S]*?)\}\)\s*(export\s+)?class\s+(\w+)/g;
const exported = (source, kinds, key) =>
  [...source.matchAll(DECORATED)].flatMap(([, kind, meta, isExported, className]) => {
    const value = new RegExp(`${key}:\\s*['"]([^'"]+)['"]`).exec(meta)?.[1];
    return kinds.includes(kind) && isExported && value ? [{ value, className }] : [];
  });

/** `[{ selector, className }]` for every component or directive declared in some source text. */
export function declarations(source) {
  return exported(source, ['Component', 'Directive'], 'selector').map(({ value, className }) => ({
    selector: value,
    className,
  }));
}

/** `[{ name, className }]` for every pipe declared in some source text (`@Pipe({ name: 'initials' }) export class InitialsPipe`). */
export function pipeDeclarations(source) {
  return exported(source, ['Pipe'], 'name').map(({ value, className }) => ({
    name: value,
    className,
  }));
}

/**
 * The text a slide must contain for this selector to be in use: `<my-tag` for a tag, ` my-thing` (or `*my-thing`,
 * `[my-thing]`) for `[my-thing]`, `<button ... appRipple` for `button[appRipple]`. A list (`a, [b]`) matches any of its parts.
 */
export function selectorTest(selector) {
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const attr = (name) => `[\\s[*]${escape(name)}[\\s=>/\\]]`;
  const parts = selector.split(',').flatMap((part) => {
    const [, tag, attrs] = /^\s*([\w-]*)((?:\[[^\]]+\])*)/.exec(part);
    const name = /\[([\w-]+)/.exec(attrs)?.[1];
    if (tag && name) return [`<${escape(tag)}(?=\\s)[^>]*?${attr(name)}`]; // the attribute may come first
    if (tag) return [`<${escape(tag)}[\\s>/]`];
    return name ? [attr(name)] : [];
  });
  return new RegExp(parts.join('|') || '(?!)');
}

const tsFilesIn = (dir) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'))
        .sort()
    : [];

/**
 * The layouts and components of the roots on top of the built-in ones. Import paths are relative to
 * `src/slides/generated/`, where the roots are copied (see sync-roots.mjs). A later root wins over an earlier one.
 * @returns {{ layouts: Record<string, any>, components: any[], problems: string[] }}
 */
export function scanRoots(roots) {
  const layouts = { ...LAYOUTS };
  const components = [...COMPONENTS];
  const problems = [];

  for (const root of roots) {
    for (const file of tsFilesIn(join(root.dir, 'layouts'))) {
      const name = file.slice(0, -3);
      const text = readFileSync(join(root.dir, 'layouts', file), 'utf8');
      const found = declarations(text)[0];
      if (!found && !text.includes('@Component')) continue; // a helper file (an ejected theme has background.ts)
      if (!found) {
        problems.push(
          `${root.id}/layouts/${file}: no component with a selector and an exported class, ignored`,
        );
        continue;
      }
      // A layout that replaces a built-in one keeps its inputs, unless theme.json says otherwise.
      const base = layouts[name] ?? { props: [], slots: [], classProp: false };
      const declared = root.manifest.layouts[name] ?? {};
      layouts[name] = {
        className: found.className,
        tag: found.selector,
        importPath: `./roots/${root.id}/layouts/${name}`,
        props: declared.props ?? base.props,
        slots: declared.slots ?? base.slots,
        classProp: declared.classProp ?? base.classProp,
      };
    }
    for (const file of tsFilesIn(join(root.dir, 'components'))) {
      const text = readFileSync(join(root.dir, 'components', file), 'utf8');
      // A pipe is in use when a slide's expressions name it (`{{ x | initials }}`).
      for (const p of pipeDeclarations(text)) {
        const known = components.findIndex(
          (c) => c.pipe === p.name || (c.className === p.className && !c.importPath),
        );
        if (known >= 0) components.splice(known, 1);
        components.push({
          className: p.className,
          pipe: p.name,
          importPath: `./roots/${root.id}/components/${file.slice(0, -3)}`,
          test: { test: (markup) => pipeNames(markup).has(p.name) },
        });
      }
      for (const d of declarations(text)) {
        // The same selector, or the class name of a built-in one: the later root replaces it. Two roots may both have a
        // `Badge` class with other selectors: both stay (one is imported under another name, see below).
        const known = components.findIndex(
          (c) => c.selector === d.selector || (c.className === d.className && !c.importPath),
        );
        if (known >= 0) components.splice(known, 1);
        components.push({
          className: d.className,
          selector: d.selector,
          importPath: `./roots/${root.id}/components/${file.slice(0, -3)}`,
          test: selectorTest(d.selector),
        });
      }
    }
  }
  // A class name that two files export gets an `as` name in the slides that import it (`Badge` and `Badge_2`).
  // (Copies: the built-in entries are shared by every scan.)
  for (const name of Object.keys(layouts)) layouts[name] = { ...layouts[name] };
  components.forEach((c, i) => (components[i] = { ...c }));
  const seen = new Map();
  for (const c of [...Object.values(layouts), ...components]) {
    const from = c.importPath ?? c.file;
    const first = seen.get(c.className);
    if (first === undefined) seen.set(c.className, from);
    else if (first !== from) {
      let n = 2;
      while (seen.has(`${c.className}_${n}`)) n++;
      c.alias = `${c.className}_${n}`;
      seen.set(c.alias, from);
    }
  }
  return { layouts, components, problems };
}
