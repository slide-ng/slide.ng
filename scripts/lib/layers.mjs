// Global and per-slide layers: `src/app/layers/{global-top,global-bottom,slide-top,slide-bottom,custom-nav-controls}.ts`.
// A deck adds a file with that name (a standalone component, `export default class`) and it shows on the slides
// (`custom-nav-controls` in the navigation bar instead, one per root that has it).
// This finds out which files exist and writes generated/layers.ts, which imports exactly those.
import { existsSync } from 'node:fs';

export const LAYER_NAMES = [
  'global-top',
  'global-bottom',
  'slide-top',
  'slide-bottom',
  'custom-nav-controls',
];
// Drawn for every root that has the file (weakest first, as Slidev's nav-controls), not only for the strongest one.
const EVERY_ROOT = 'custom-nav-controls';
const camel = (name) => name.replace(/-(\w)/g, (_, c) => c.toUpperCase());

/** @returns {string[]} the layer names that have a file in `dir` */
export function findLayers(dir = 'src/app/layers') {
  return LAYER_NAMES.filter((name) => existsSync(`${dir}/${name}.ts`));
}

/**
 * Layer files by name -> import path (relative to src/slides/generated/). Folders are given from the weakest to the
 * strongest, so a deck's `layers/` beats a theme's. `src/app/layers` is the older place and stays supported.
 * `custom-nav-controls` maps to the list of all its files instead, in that order.
 * @param {{ dir: string, importDir: string }[]} sources
 * @returns {Record<string, string | string[]>}
 */
export function findLayerFiles(sources) {
  const files = {};
  for (const { dir, importDir } of sources)
    for (const name of findLayers(dir)) {
      const path = `${importDir}/${name}`;
      files[name] = name === EVERY_ROOT ? [...(files[name] ?? []), path] : path;
    }
  return files;
}

/** The source of generated/layers.ts. `found` is a list of names in src/app/layers, or a map from name to import path. */
export function layersSource(found) {
  const files = Array.isArray(found)
    ? Object.fromEntries(found.map((n) => [n, `../../app/layers/${n}`]))
    : found;
  const navFiles = [files[EVERY_ROOT] ?? []].flat();
  const navNames = navFiles.map((_, i) => `${camel(EVERY_ROOT)}${i}`);
  const names = LAYER_NAMES.filter((n) => n !== EVERY_ROOT);
  const imports = [
    ...names.filter((n) => files[n]).map((n) => `import ${camel(n)} from '${files[n]}';`),
    ...navFiles.map((f, i) => `import ${navNames[i]} from '${f}';`),
  ];
  const entries = names.map((n) => `  '${n}': ${files[n] ? camel(n) : 'null'},`);
  return `// GENERATED: the layer components found in layers folders - do not edit
import type { Type } from '@angular/core';
${imports.join('\n')}

export const LAYERS: Record<string, Type<unknown> | null> = {
${entries.join('\n')}
};

/** Every root's custom-nav-controls, weakest root first. */
export const NAV_CONTROLS: Type<unknown>[] = [${navNames.join(', ')}];
`;
}
