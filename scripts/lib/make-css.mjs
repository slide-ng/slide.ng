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

/** A UnoCSS generator with the base settings and those of the roots. */
export const unoGenerator = (extraConfigs = []) =>
  createGenerator(mergeUnoConfigs(config, extraConfigs));

// Attributify reads every `name="value"` as utilities. Only the deck's own files (the slides, themes and addons) are read that
// way, as in Slidev; in the app's source a `size="2"` or a `visible` attribute is not a utility.
const withoutAttributify = (config) => ({
  ...config,
  presets: config.presets.filter((p) => p.name !== '@unocss/preset-attributify'),
});

export async function makeCss(deckFiles, extraConfigs = [], appFiles = []) {
  const merged = mergeUnoConfigs(config, extraConfigs);
  const uno = await createGenerator(merged);
  const plain = await createGenerator(withoutAttributify(merged));
  // UnoCSS finds class names in plain text, so we hand it the files as one string. A generated slide holds its template as a
  // JSON string: `\"` is read as `"`, so attributify (`flex=\"~\"`) is found there too.
  const read = (files) => {
    const text = files.map((f) => readFileSync(f, 'utf8').replace(/\\"/g, '"')).join('\n');
    return `${text}\n${boundClasses(text)}`;
  };
  const deck = read(deckFiles);
  const inputs = componentInputs(
    deckFiles.filter((f) => f.endsWith('.ts')).map((f) => readFileSync(f, 'utf8')),
  );
  const tokens = await uno.applyExtractors(withoutForeignAttributes(deck, inputs));
  await plain.applyExtractors(deck, undefined, tokens);
  await plain.applyExtractors(read(appFiles), undefined, tokens);
  const { css } = await uno.generate(tokens);
  return css;
}

// The attributes of a slide.ng component are its inputs (`<slide-ng-mermaid scale="0.8">`, `<slide-ng-toc columns="2">`) and
// those in an inline SVG draw it (`<text font-size="14">`). Read by attributify they would become CSS for every element with
// that attribute (`[scale~="0.8"]` shrinks every such diagram), so attributify does not see them. Their classes are still
// found: the deck is also read without attributify.
// The SVG elements are found by name too, outside an `<svg>` literal: a `setup/mermaid-renderer.ts` that builds
// `<text font-size="14">` in a string would otherwise give `[font-size~="14"]` for the whole page.
// The inputs of the deck's own components (`components/`, themes, addons; `inputs`, from componentInputs) are hidden the same
// way: `<stat-row grid />` sets the `grid` input, it is not `display: grid` for every element with a `grid` attribute.
// In a generated slide a line break between two attributes is written `\n`.
const attrRE = String.raw`(?:\s|\\n)+([^\s=>"'/\\][^\s=>"']*)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+))?`;
const attrsRE = `(?:${attrRE})*`;
const SVG_ELEMENTS =
  'text|tspan|textPath|rect|circle|ellipse|line|polyline|polygon|path|g|use|symbol|marker|defs|stop|linearGradient|radialGradient|pattern|clipPath|mask|filter|fe[A-Z]\\w*';
export function withoutForeignAttributes(text, inputs = new Map()) {
  const tags = (re) => (part) => part.replace(re, '<$1');
  let out = text
    .replace(
      /<svg(?=[\s/>])(?:[^>]*\/>|[\s\S]*?<\/svg>)/g,
      tags(new RegExp(`<([\\w:-]+)${attrsRE}`, 'g')),
    )
    .replace(new RegExp(`<(slide-ng-[\\w-]+)${attrsRE}`, 'g'), '<$1')
    .replace(new RegExp(`<(${SVG_ELEMENTS})(?=[\\s/>]|\\\\n)${attrsRE}`, 'g'), '<$1');
  if (inputs.size) {
    const names = [...inputs.keys()].map((n) => n.replace(/[-]/g, '\\-')).join('|');
    out = out.replace(
      new RegExp(`<(${names})(?=[\\s/>]|\\\\n)(${attrsRE})`, 'g'),
      (_, tag, attrs) =>
        `<${tag}${attrs.replace(new RegExp(attrRE, 'g'), (attr, name) => (inputs.get(tag).has(name) ? '' : attr))}`,
    );
  }
  return out;
}

/** The inputs of the components in `sources` (the text of .ts files), by element selector: `stat-row` -> {label, grid}. */
export function componentInputs(sources) {
  const found = new Map();
  for (const source of sources) {
    const selectors = [...source.matchAll(/\bselector:\s*['"`]([a-z][\w-]*)['"`]/g)].map(
      (m) => m[1],
    );
    if (!selectors.length) continue;
    const names = [
      ...source.matchAll(/\b(\w+)\s*=\s*(?:input|model)(?:\.required)?\s*[<(]/g),
      ...source.matchAll(/@Input\([^)]*\)\s*(?:set\s+)?(\w+)/g),
    ].map((m) => m[1]);
    for (const selector of selectors) {
      const set = found.get(selector) ?? new Set();
      names.forEach((n) => set.add(n));
      found.set(selector, set);
    }
  }
  return found;
}

// `[class.font-bold]="on"` (in a slide, a template or a `host`) names a class UnoCSS cannot split out of the binding: the
// names are handed to it on their own as well.
export function boundClasses(text) {
  return [...text.matchAll(/\[class\.([^\]\s"'=]+)\]/g)].map((m) => m[1]).join(' ');
}
