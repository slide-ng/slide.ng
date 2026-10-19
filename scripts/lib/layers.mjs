// Global and per-slide layers: `src/app/layers/{global-top,global-bottom,slide-top,slide-bottom,custom-nav-controls}.ts`.
// A deck adds a file with that name (a standalone component, `export default class`) and it shows on the slides
// (`custom-nav-controls` in the navigation bar instead).
// This finds out which files exist and writes generated/layers.ts, which imports exactly those.
import { existsSync } from 'node:fs';

export const LAYER_NAMES = [
  'global-top',
  'global-bottom',
  'slide-top',
  'slide-bottom',
  'custom-nav-controls',
];
const camel = (name) => name.replace(/-(\w)/g, (_, c) => c.toUpperCase());

/** @returns {string[]} the layer names that have a file in `dir` */
export function findLayers(dir = 'src/app/layers') {
  return LAYER_NAMES.filter((name) => existsSync(`${dir}/${name}.ts`));
}

/**
 * Layer files by name -> import path (relative to src/slides/generated/). Folders are given from the weakest to the
 * strongest, so a deck's `layers/` beats a theme's. `src/app/layers` is the older place and stays supported.
 * @param {{ dir: string, importDir: string }[]} sources
 * @returns {Record<string, string>}
 */
export function findLayerFiles(sources) {
  const files = {};
  for (const { dir, importDir } of sources)
    for (const name of findLayers(dir)) files[name] = `${importDir}/${name}`;
  return files;
}

/** The source of generated/layers.ts. `found` is a list of names in src/app/layers, or a map from name to import path. */
export function layersSource(found) {
  const files = Array.isArray(found)
    ? Object.fromEntries(found.map((n) => [n, `../../app/layers/${n}`]))
    : found;
  const imports = Object.keys(files).map((n) => `import ${camel(n)} from '${files[n]}';`);
  const entries = LAYER_NAMES.map((n) => `  '${n}': ${files[n] ? camel(n) : 'null'},`);
  return `// GENERATED: the layer components found in layers folders - do not edit
import type { Type } from '@angular/core';
${imports.join('\n')}

export const LAYERS: Record<string, Type<unknown> | null> = {
${entries.join('\n')}
};
`;
}
