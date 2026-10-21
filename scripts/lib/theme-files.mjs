// The generator's part of the theme contract (docs/THEMES.md): copies the roots into the app, and writes
// `layers.ts`, `setup.ts` and `theme.css` from what they bring. Also returns their UnoCSS settings and files for class scanning.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fontsCss } from './fonts.mjs';
import { themeConfigCss } from './theme-config.mjs';
import { findLayerFiles, layersSource } from './layers.mjs';
import { unoGenerator } from './make-css.mjs';
import { scanRoots } from './scan-roots.mjs';
import { syncRoots } from './sync-roots.mjs';
import { applyDirectivesOrWarn, hasDirectives } from './uno-directives.mjs';

// The browser side setup files (docs/SETUP.md): the name of the file, and the helper of src/app/setup/index.ts that turns the files into providers.
// `providers.ts` is the older way and default-exports an array itself.
const BROWSER_SETUPS = [
  ['main', 'mainProviders'],
  ['root', 'rootProviders'],
  ['shortcuts', 'shortcutsProviders'],
  ['context-menu', 'contextMenuProviders'],
  ['mermaid', 'mermaidProviders'],
  ['mermaid-renderer', 'mermaidRendererProviders'],
  ['monaco', 'monacoProviders'],
  ['code-runners', 'codeRunnerProviders'],
  ['routes', 'routesProviders'],
];

/** `src/slides/generated/setup.ts`: the providers that roots bring in `setup/*.ts`. Weakest root first, so the deck has the last word. */
export function setupSource(roots) {
  const has = (r, name) => existsSync(join(r.dir, 'setup', `${name}.ts`));
  const imports = [];
  const list = [];
  // `providers.ts` and `code-runners.ts` are in root order together: both can give a CODE_RUNNERS entry, and the later one wins.
  roots.forEach((r, i) => {
    if (has(r, 'providers')) {
      imports.push(`import providers${i} from './roots/${r.id}/setup/providers';`);
      list.push(`...providers${i}`);
    }
    if (has(r, 'code-runners')) {
      imports.push(`import codeRunners${i} from './roots/${r.id}/setup/code-runners';`);
      list.push(`...codeRunnerProviders([codeRunners${i}])`);
    }
  });
  for (const [name, helper] of BROWSER_SETUPS) {
    if (name === 'code-runners') continue;
    const names = roots
      .filter((r) => has(r, name))
      .map((r) => {
        const id = `${name.replace(/-(\w)/g, (_, c) => c.toUpperCase())}${imports.length}`;
        imports.push(`import ${id} from './roots/${r.id}/setup/${name}';`);
        return id;
      });
    if (names.length) list.push(`...${helper}([${names.join(', ')}])`);
  }
  const helpers = BROWSER_SETUPS.filter(([, h]) => list.some((l) => l.startsWith(`...${h}(`))).map(
    ([, h]) => h,
  );
  return `// GENERATED: providers from the setup/*.ts of themes, addons and the deck - do not edit
import type { EnvironmentProviders, Provider } from '@angular/core';
${helpers.length ? `import { ${helpers.join(', ')} } from '../../app/setup';\n` : ''}${imports.join('\n')}

export const SETUP_PROVIDERS: (Provider | EnvironmentProviders)[] = [${list.join(', ')}];
`;
}

// The CSS files of the roots' styles/ folders that use UnoCSS directives (`@apply`, `--uno:`), written out with the deck's
// UnoCSS settings: a map from the source file to its new text, for syncRoots to copy instead.
async function stylesWithDirectives(roots, uno) {
  const rewrite = new Map();
  for (const r of roots) {
    const dir = join(r.dir, 'styles');
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir, { recursive: true })) {
      const file = join(dir, String(f));
      if (!String(f).endsWith('.css')) continue;
      const css = readFileSync(file, 'utf8');
      if (hasDirectives(css)) rewrite.set(file, await applyDirectivesOrWarn(css, uno, file));
    }
  }
  return rewrite;
}

/**
 * `src/slides/generated/theme.css`: the deck's `fonts`, then the style sheets of the roots (`styles/index.css`), weakest first, then
 * the `themeConfig` variables (lib/theme-config.mjs).
 */
/** @param {{ id: string, dir: string }[]} roots @param {Record<string, any>} [headmatter] @param {string | null} [fontFaces] */
export function themeCss(roots, headmatter = {}, fontFaces = null) {
  const imports = roots
    .filter((r) => existsSync(join(r.dir, 'styles', 'index.css')))
    .map((r) => `@import './roots/${r.id}/styles/index.css';`);
  // An @import must come before the rules, so the font @import is written first and the font rules after the roots' imports.
  const lines = (fontsCss(headmatter, fontFaces) + themeConfigCss(headmatter.themeConfig))
    .split('\n')
    .filter(Boolean);
  const text = [
    ...lines.filter((l) => l.startsWith('@import')),
    ...imports,
    ...lines.filter((l) => !l.startsWith('@import')),
  ].join('\n');
  return text ? `${text}\n` : '/* no theme styles */\n';
}

/**
 * Does everything for the roots of `deck`: loads UnoCSS settings, copies the roots, finds layouts, components and layers.
 * Sets `deck.layouts`, `deck.components` and `deck.layers`. `write(path, text)` is the generator's change-only writer.
 * Returns the roots' UnoCSS settings and a UnoCSS generator made with them.
 */
export async function applyRoots(deck, out, write, warn) {
  // A root's uno.config.mjs is plain JavaScript that default-exports (part of) a UnoCSS config.
  const unoConfigs = [];
  for (const root of deck.roots) {
    const file = join(root.dir, 'uno.config.mjs');
    if (existsSync(file))
      unoConfigs.push((await import(`${pathToFileURL(file).href}?v=${Date.now()}`)).default);
  }
  const uno = await unoGenerator(unoConfigs);

  const generated = resolve(out);
  syncRoots(deck.roots, generated, await stylesWithDirectives(deck.roots, uno));
  // Where each copy came from, so a build error in `roots/deck/components/x.ts` can name the author's own file (cli/runtime.mjs).
  write(
    `${out}roots.json`,
    JSON.stringify(Object.fromEntries(deck.roots.map((r) => [r.id, r.dir])), null, 2) + '\n',
  );
  const scanned = scanRoots(deck.roots);
  scanned.problems.forEach(warn);
  deck.layouts = scanned.layouts;
  deck.components = scanned.components;

  // `src/app/layers` is the older place for layers; roots come after it and win.
  const layerFiles = findLayerFiles([
    { dir: 'src/app/layers', importDir: '../../app/layers' },
    ...deck.roots.map((r) => ({ dir: join(r.dir, 'layers'), importDir: `./roots/${r.id}/layers` })),
  ]);
  deck.layers = Object.keys(layerFiles);
  write(`${out}layers.ts`, layersSource(layerFiles));
  write(`${out}setup.ts`, setupSource(deck.roots));
  write(`${out}theme.css`, themeCss(deck.roots, deck.headmatter, deck.fontFaces));
  return { unoConfigs, uno };
}
