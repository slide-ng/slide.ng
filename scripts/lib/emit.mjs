// Writes the TypeScript source of one generated slide component.
import { dirname, relative } from 'node:path';
import { COMPONENTS, LAYOUTS } from './registry.mjs';
import { layoutName } from './layouts.mjs';
import { extractStyles, scopeCss } from './scoped-style.mjs';
import { splitSlots } from './slots.mjs';
import { attr } from './protect.mjs';
import { toTemplate } from './to-template.mjs';
import { tagDragSites } from './drag-sites.mjs';
import { rebaseCss, rebaseHtml } from './asset-paths.mjs';
import { assertNoRenamedNames } from './renamed.mjs';
import { commonPipes } from './pipes.mjs';
import { commonDirectives } from './angular-imports.mjs';

const pad = (no) => String(no).padStart(3, '0');
export const slideName = (no) => `slide-${pad(no)}`;
export const slideClass = (no) => `Slide${pad(no)}`;

// Angular drops text that is only whitespace, so `**bold** *italic*` read "bolditalic". Like Vue's `condense`, a space
// between two tags on one line is kept (`&ngsp;` is Angular's kept space); a line break between blocks still goes.
// Code samples are left alone (Angular keeps whitespace inside <pre> itself).
// `Status: @if (on) { yes } @else { no }` is shown as text: control flow must start its own line. Say so (code samples aside).
export function warnInlineControlFlow(markdown, no) {
  const prose = markdown
    .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, '')
    .replace(/`[^`\n]*`/g, '');
  for (const line of prose.split('\n')) {
    const at = line.search(/@(?:if|for|switch|defer)\s*\(/);
    if (at > 0 && line.slice(0, at).trim() && !/^\s*\}/.test(line))
      console.warn(
        `[slides] slide ${no}: "${line.trim().slice(0, 60)}" has @if/@for in the middle of a line, which is shown as text; put "@if (...) {" and "}" on lines of their own`,
      );
  }
}

// A static href or src in an Angular template is not sanitized, so `[x](javascript:...)` would run when clicked.
// Script addresses are replaced by `#`, like markdown-it does for links, and the author is told.
const SCRIPT_URL =
  /(\s(?:href|src|xlink:href)\s*=\s*)(["'])\s*(?:javascript|vbscript|data:text\/html)[^"']*\2/gi;
export function safeLinks(html, no) {
  return html.replace(SCRIPT_URL, (_, attr, quote) => {
    console.warn(
      `[slides] slide ${no}: a javascript: (or similar) address was replaced by # (it would run code)`,
    );
    return `${attr}${quote}#${quote}`;
  });
}

export function keepSpaces(html) {
  return html
    .split(/(<pre[\s>][\s\S]*?<\/pre>)/)
    .map((part, i) => (i % 2 ? part : part.replace(/>([ \t]+)</g, '>&ngsp;<')))
    .join('');
}
export { layoutName };

// What a transformer in setup/transformers.ts is told about the slide.
export const slideInfo = (slide, no) => ({
  no,
  index: no - 1,
  title: slide.title,
  frontmatter: slide.frontmatter,
  source: slide.source,
});

// The layout's opening tag: frontmatter keys the layout knows become attributes (= inputs).
function openTag(def, frontmatter) {
  const attrs = def.props
    .filter((p) => frontmatter[p] != null)
    .map((p) => ` ${p}="${attr(frontmatter[p])}"`);
  if (frontmatter.class)
    attrs.push(` ${def.classProp ? 'contentClass' : 'class'}="${attr(frontmatter.class)}"`);
  return `<${def.tag}${attrs.join('')}>`;
}

// The slide body. `::name::` lines cut it into slots; a named slot is projected into the layout.
function body(markdown, def, no, ctx, layout) {
  return splitSlots(markdown)
    .map(([name, text]) => {
      if (name === 'default') return toTemplate(text, ctx);
      if (!def.slots.includes(name)) {
        console.warn(
          `[slides] slide ${no}: layout "${layout}" has no slot "${name}", showing it as normal content`,
        );
        return toTemplate(text, ctx);
      }
      return `<ng-container ngProjectAs="[${name}]">${toTemplate(text, ctx)}</ng-container>`;
    })
    .join('');
}

/**
 * @param {any} slide @param {number} no
 * @param {{ root?: string, headmatter?: any, layers?: string[], layouts?: Record<string, any>, components?: any[], assetBase?: string }} [deck]
 *   where `@/` is, the deck-wide settings, the layouts and components to use (the built-in ones unless a theme adds more),
 *   and the base that `/public` addresses get in a build (`/talk/`, `./`; default `/`, no change)
 */
export function slideSource(slide, no, deck = {}) {
  const layouts = deck.layouts ?? LAYOUTS;
  const layoutKey = slide.layout ?? layoutName(slide.frontmatter, no - 1, layouts);
  const def = layouts[layoutKey];
  const { markdown, css } = extractStyles(tagDragSites(slide.content));
  warnInlineControlFlow(markdown, no);
  const layer = (name) =>
    deck.layers?.includes(name) ? `<app-slide-layer name="${name}"></app-slide-layer>` : '';
  const layout = `${openTag(def, slide.frontmatter)}${body(markdown, def, no, { file: slide.file, root: deck.root, roots: deck.roots?.map((r) => r.dir), allowOutsideRoot: deck.allowOutsideRoot, headmatter: deck.headmatter, codeblocks: deck.transformers?.codeblocks, slide: slideInfo(slide, no) }, layoutKey)}</${def.tag}>`;
  const base = deck.assetBase ?? '/'; // where the deck is served from in a build; `/public` files get it in front
  const html = safeLinks(
    keepSpaces(rebaseHtml(layer('slide-bottom') + layout + layer('slide-top'), base)),
    no,
  );

  // Look for components outside code samples only (code is just text). A `<code>` written in HTML is live Angular.
  const markup = html
    .replace(/<pre[\s\S]*?<\/pre>/g, '')
    .replace(/<code ngNonBindable>[\s\S]*?<\/code>/g, '');
  assertNoRenamedNames(
    markup,
    no,
    (deck.components ?? []).flatMap((c) => (c.selector ? [c.selector] : [])),
  );
  // Angular removes <script> elements from templates without a word; say so, and where code goes instead.
  if (/<script[\s>]/i.test(markup))
    console.warn(
      `[slides] slide ${no}: <script> is removed (an Angular template cannot run one); put the code in a component in components/ or in setup/main.ts`,
    );
  const used = (deck.components ?? COMPONENTS).filter((c) => c.test.test(markup));
  const pipes = commonPipes(markup);
  const directives = commonDirectives(markup);
  const fromAngular = { ...directives };
  if (pipes.length)
    fromAngular['@angular/common'] = [...(directives['@angular/common'] ?? []), ...pipes];
  const imports = [def, ...used];
  const importLines = [
    ...new Set(
      imports.map(
        (c) => `import { ${c.className} } from '${c.importPath ?? `../../app/${c.file}`}';`,
      ),
    ),
    ...Object.entries(fromAngular).map(
      ([pkg, names]) => `import { ${names.join(', ')} } from '${pkg}';`,
    ),
  ];

  const { clicksStart, clicks } = slide.frontmatter;
  const providers = ['ClicksContext'];
  if (clicksStart) providers.push(`{ provide: CLICKS_START, useValue: ${+clicksStart} }`);
  if (clicks) providers.push(`{ provide: CLICKS_TOTAL, useValue: ${+clicks} }`);
  const styles = scopeCss(rebaseCss(css, base), slideName(no));

  // Where the slide is in the markdown: the build runner adds it to Angular's errors (cli/runtime.mjs).
  const where = slide.source
    ? `${relative(deck.root ?? dirname(slide.source.filepath), slide.source.filepath) || 'slides.md'}:${Math.max(1, slide.source.start)}`
    : 'slides.md';
  return `// GENERATED from ${where} (slide ${no}) - do not edit
import { Component${styles ? ', ViewEncapsulation' : ''} } from '@angular/core';
import { CLICKS_START, CLICKS_TOTAL, ClicksContext } from '../../app/lib/clicks';
import { SlideBase } from '../../app/lib/slide-base';
${importLines.join('\n')}

@Component({
  selector: '${slideName(no)}',
  imports: [${[...imports.map((c) => c.className), ...Object.values(fromAngular).flat()].join(', ')}],
  providers: [${providers.join(', ')}],
  template: ${JSON.stringify(html)},${styles ? `\n  styles: [${JSON.stringify(styles)}],\n  encapsulation: ViewEncapsulation.None,` : ''}
})
export default class ${slideClass(no)} extends SlideBase {}
`;
}
