// Roots: the folders a deck gets its look from. In this order, later ones win:
//   the built-in theme (src/app, always there)  <  `theme:`  <  each of `addons:`  <  the deck's own folder
// A theme or addon is a folder (or a package from node_modules) with any of these inside (see docs/THEMES.md):
//   layouts/  components/  layers/  styles/  public/  setup/  locales/  uno.config.mjs  theme.json
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { installCommand } from './install-root.mjs';

/** What a theme can bring, as folders. `public` is merged, the others are copied under their root. */
export const ROOT_FOLDERS = [
  'layouts',
  'components',
  'layers',
  'styles',
  'public',
  'setup',
  'locales',
];

const isDir = (path) => existsSync(path) && statSync(path).isDirectory();

/** Folders named like `./theme` or `/abs/theme` are paths; anything else is a package name. */
const isPath = (spec) => spec.startsWith('.') || isAbsolute(spec);

/** A theme or addon package that is not installed. `pkg` is what to install, `command` is the line to run. */
export class RootNotFoundError extends Error {
  constructor(kind, spec, pkg, command) {
    super(`The ${kind} "${spec}" was not found. Install it with: ${command}`);
    this.name = 'RootNotFoundError';
    this.kind = kind;
    this.spec = spec;
    this.pkg = pkg;
    this.command = command;
  }
}

// The official themes are packages in the separate slide-ng/themes repository (`@slide-ng/theme-<name>`).
const OFFICIAL_THEMES = ['seriph', 'shibainu', 'bricks', 'apple-basic', 'adev'];

// A scoped package name such as @scope/slide-ng-theme-x (the same rule as Slidev's resolver for the name).
const SAFE_SCOPED = /^@[a-z0-9~-][a-z0-9._~-]*\/[a-z0-9~-][a-z0-9._~-]*$/;
const SAFE_NAME = /^[a-z0-9~-][a-z0-9._~-]*$/;

/**
 * The package names tried for a name, in order (Slidev's rule with slide.ng's prefixes):
 * `ocean` as a theme is `@slide-ng/theme-ocean`, `slide-ng-theme-ocean`, then `ocean`. A scoped name is used as it is.
 */
export function candidateNames(spec, kind) {
  if (spec.startsWith('@')) return [spec];
  return [`@slide-ng/${kind}-${spec}`, `slide-ng-${kind}-${spec}`, spec];
}

/** What to install when a name is not found: the official scoped package, a scoped name itself, else `slide-ng-<kind>-<name>`. */
export function packageToInstall(spec, kind) {
  if (spec.startsWith('@')) return spec;
  if (kind === 'theme' && OFFICIAL_THEMES.includes(spec)) return `@slide-ng/theme-${spec}`;
  return `slide-ng-${kind}-${spec}`;
}

/**
 * Finds the folder of a theme or addon. `kind` is `theme` or `addon`; a name is looked for in the `node_modules` folders
 * from the deck's folder upwards (see `candidateNames`). Like Slidev: `@/x` is relative to the deck's folder, a name with a
 * slash that does not start with @ is a path, and a package that cannot be found throws a `RootNotFoundError` that carries
 * the install command. The official themes are packages like any other.
 */
export function findRootDir(spec, kind, deckRoot) {
  if (typeof spec !== 'string' || !spec.trim())
    throw new Error(`${kind}: expected a name or a path, got ${JSON.stringify(spec)}`);
  if (spec.startsWith('@/')) spec = `./${spec.slice(2)}`;
  else if (!spec.startsWith('@') && spec.includes('/') && !isAbsolute(spec))
    spec = `./${spec.replace(/^\.\//, '')}`;
  if (isPath(spec)) {
    const dir = resolve(deckRoot, spec);
    if (!isDir(dir)) throw new Error(`${kind} "${spec}" is not a folder (looked for ${dir})`);
    return realpathSync(dir);
  }
  if (!(spec.startsWith('@') ? SAFE_SCOPED : SAFE_NAME).test(spec))
    throw new Error(`Invalid ${kind} name "${spec}". Only valid npm package names are allowed.`);
  const names = candidateNames(spec, kind);
  for (let dir = resolve(deckRoot); ; dir = dirname(dir)) {
    for (const name of names)
      if (isDir(join(dir, 'node_modules', name)))
        return realpathSync(join(dir, 'node_modules', name));
    if (dirname(dir) === dir) break;
  }
  const pkg = packageToInstall(spec, kind);
  throw new RootNotFoundError(kind, spec, pkg, installCommand(deckRoot, pkg).command);
}

/**
 * theme.json of a root: `{ name, headmatter, layouts }`, with anything unusable left out. Missing file = empty.
 * @returns {{ name?: string, headmatter: any, layouts: Record<string, { props: string[], slots: string[], classProp: boolean }> }}
 */
export function readManifest(dir) {
  const file = join(dir, 'theme.json');
  if (!existsSync(file)) return { headmatter: {}, layouts: {} };
  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`${file} is not valid JSON (${e.message})`, { cause: e });
  }
  const wrong = []; // values of the wrong type, said once (they are ignored)
  const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const object = (v, where) => {
    if (isObject(v)) return v;
    if (v !== undefined && where) wrong.push(`"${where}" should be an object`);
    return {};
  };
  // A key that is not set stays undefined, so a layout that replaces a built-in one keeps the built-in value (scan-roots.mjs).
  const names = (list, where) => {
    if (list === undefined) return undefined;
    if (!Array.isArray(list)) {
      wrong.push(`"${where}" should be a list of names, like ["image"]`);
      return undefined;
    }
    const good = list.filter((p) => typeof p === 'string' && /^[A-Za-z][\w-]*$/.test(p));
    if (good.length < list.length) wrong.push(`"${where}" has entries that are not names`);
    return good;
  };
  const layout = (name, value) => {
    const l = object(value, `layouts.${name}`);
    return {
      props: names(l.props, `layouts.${name}.props`),
      slots: names(l.slots, `layouts.${name}.slots`),
      classProp: l.classProp === undefined ? undefined : Boolean(l.classProp),
    };
  };
  const layouts = Object.fromEntries(
    Object.entries(object(data.layouts, 'layouts')).map(([name, l]) => [name, layout(name, l)]),
  );
  if (data.name !== undefined && typeof data.name !== 'string') wrong.push('"name" should be text');
  const unknown = Object.keys(object(data)).filter(
    (k) => !['name', 'headmatter', 'layouts', '$schema'].includes(k),
  );
  if (unknown.length)
    warnOnce(
      `[slides] ${file}: ${unknown.map((k) => `"${k}"`).join(', ')} is not read (settings such as colorSchema and fonts go under "headmatter")`,
    );
  const headmatter = object(data.headmatter, 'headmatter');
  if (wrong.length) warnOnce(`[slides] ${file}: ${wrong.join('; ')}; ignored`);
  return {
    name: typeof data.name === 'string' ? data.name : undefined,
    headmatter,
    layouts,
  };
}

const safeId = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'root';

// theme.json is read several times in one build (the deck, the generator, the setup files): each message is said once.
const said = new Set();
function warnOnce(message) {
  if (said.has(message)) return;
  said.add(message);
  console.warn(message);
}

/**
 * The roots of a deck, in order: theme, addons, deck. Built-in theme is not listed (it is the base everything sits on).
 * `themeOverride` is the `--theme` flag. `theme: default` (or `none`) means no extra theme.
 * A theme or addon that is not installed is an error (`RootNotFoundError`, with the install command), like in Slidev.
 * @param {{ deckRoot: string, headmatter: any, themeOverride?: string }} options
 */
export function resolveRoots({ deckRoot, headmatter, themeOverride }) {
  const roots = [];
  const theme = themeOverride ?? headmatter.theme;
  if (theme && theme !== 'default' && theme !== 'none') {
    const dir = findRootDir(theme, 'theme', deckRoot);
    roots.push({
      id: `theme-${safeId(theme)}`,
      kind: 'theme',
      spec: theme,
      dir,
      manifest: readManifest(dir),
    });
  }
  const addons = Array.isArray(headmatter.addons) ? headmatter.addons : [];
  addons.forEach((spec, i) => {
    const dir = findRootDir(spec, 'addon', deckRoot);
    roots.push({
      id: `addon-${i + 1}-${safeId(spec)}`,
      kind: 'addon',
      spec,
      dir,
      manifest: readManifest(dir),
    });
  });
  // A package whose `files` leaves the folders out installs empty: say so instead of a later "is not a known element".
  for (const r of roots)
    if (!existsSync(join(r.dir, 'theme.json')) && !ROOT_FOLDERS.some((f) => isDir(join(r.dir, f))))
      warnOnce(
        `[slides] ${r.kind} "${r.spec}" (${r.dir}) has none of ${ROOT_FOLDERS.join(', ')} or theme.json: if it is a package, check that its package.json "files" lists them`,
      );
  roots.push({
    id: 'deck',
    kind: 'deck',
    spec: '.',
    dir: resolve(deckRoot),
    manifest: readManifest(resolve(deckRoot)), // a deck can declare the inputs and slots of its own layouts too
  });
  return roots;
}

// Like Slidev, these headmatter objects are merged key by key (a deck that sets `fonts.mono` keeps the theme's `fonts.sans`).
const MERGED_OBJECTS = ['fonts', 'drawings', 'htmlAttrs', 'themeConfig'];
const plain = (v) => v && typeof v === 'object' && !Array.isArray(v);

/** Headmatters put over each other, the last wins. `defaults` and the objects above are merged key by key, the rest replaced. */
export function overlayHeadmatter(...layers) {
  /** @type {any} */
  const merged = {};
  let defaults = {};
  for (const source of layers) {
    const { defaults: d, ...rest } = source;
    for (const key of MERGED_OBJECTS)
      if (plain(rest[key]) && plain(merged[key])) rest[key] = { ...merged[key], ...rest[key] };
    Object.assign(merged, rest);
    defaults = { ...defaults, ...(d && typeof d === 'object' ? d : {}) };
  }
  if (Object.keys(defaults).length) merged.defaults = defaults;
  return merged;
}

/** The headmatter with the themes' defaults underneath it. `defaults` (per-slide defaults) and `fonts` are merged key by key. */
export function mergeHeadmatter(roots, headmatter) {
  const merged = overlayHeadmatter(...roots.map((r) => r.manifest.headmatter), headmatter);
  // A theme made for one mode (`colorSchema: light` or `dark` in its theme.json) has no colours for the other, so it keeps
  // its mode, as in Slidev; a deck that asks for `auto` is told why its toggle is gone.
  const fixed = roots
    .map((r) => r.manifest.headmatter.colorSchema)
    .findLast((c) => c === 'light' || c === 'dark');
  if (fixed && merged.colorSchema !== fixed) {
    if (headmatter.colorSchema !== undefined)
      warnOnce(
        `[slides] colorSchema: ${headmatter.colorSchema} is not used: the theme only has ${fixed} colours, so the deck stays ${fixed}`,
      );
    merged.colorSchema = fixed;
  }
  return merged;
}
