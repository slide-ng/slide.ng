// Builds the CSS for every UnoCSS class name found in the given files.
// We call UnoCSS from this script (instead of its own command) because the dev server
// does a full page reload when its CSS file is rewritten, and we only write when the CSS changed.
import { readFileSync, readdirSync } from 'node:fs';
import { createGenerator } from '@unocss/core';
import config from '../../uno.config.mjs';

// Every .ts file under a folder (layouts and components use class names too).
export function tsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((f) => f.isFile() && f.name.endsWith('.ts'))
    .map((f) => `${f.parentPath}/${f.name}`);
}

// A theme's uno.config.mjs adds to the base settings: presets, rules and safelist are appended, shortcuts and theme are merged.
export function mergeUnoConfigs(base, extras) {
  const merged = {
    ...base,
    presets: [...(base.presets ?? [])],
    rules: [...(base.rules ?? [])],
    safelist: [...(base.safelist ?? [])],
    variants: [...(base.variants ?? [])],
    shortcuts: { ...base.shortcuts },
    theme: { ...base.theme },
  };
  for (const extra of extras) {
    merged.presets.push(...(extra.presets ?? []));
    merged.rules.push(...(extra.rules ?? []));
    merged.safelist.push(...(extra.safelist ?? []));
    merged.variants.push(...(extra.variants ?? []));
    Object.assign(merged.shortcuts, extra.shortcuts);
    Object.assign(merged.theme, extra.theme);
  }
  return merged;
}

export async function makeCss(files, extraConfigs = []) {
  const uno = await createGenerator(mergeUnoConfigs(config, extraConfigs));
  // UnoCSS finds class names in plain text, so we hand it the files as one string.
  const text = files.map((f) => readFileSync(f, 'utf8')).join('\n');
  const { css } = await uno.generate(`${text}\n${boundClasses(text)}`);
  return css;
}

// `[class.font-bold]="on"` (in a slide, a template or a `host`) names a class UnoCSS cannot split out of the binding: the
// names are handed to it on their own as well.
export function boundClasses(text) {
  return [...text.matchAll(/\[class\.([^\]\s"'=]+)\]/g)].map((m) => m[1]).join(' ');
}
