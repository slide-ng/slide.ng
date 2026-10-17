// Writes the TypeScript source of one generated slide component.
import { dirname, join, relative } from 'node:path';
import { COMPONENTS, LAYOUTS } from './registry.mjs';
import { layoutName } from './layouts.mjs';
import { extractStyles, scopeCss } from './scoped-style.mjs';
import { splitSlots } from './slots.mjs';
import { attr } from './protect.mjs';
import { toTemplate } from './to-template.mjs';
import { tagDragSites } from './drag-sites.mjs';
import { hasRootUrl, rebaseCss, rebaseHtml } from './asset-paths.mjs';
import { assertNoRenamedNames } from './renamed.mjs';
import { commonPipes } from './pipes.mjs';
import { commonDirectives } from './angular-imports.mjs';
import { setWarnSlide } from './code/highlighter.mjs';
import { localAssets } from './local-assets.mjs';

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
// Script addresses are replaced by `#`, like markdown-it does for links, and the author is told. The whole value is read
// (quotes of the other kind, `java&#115;cript:`, spaces and control characters inside the scheme, no quotes at all).
const URL_ATTR = /(\s(?:href|src|xlink:href)\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s>"']+))/gi;
const decodeRefs = (v) =>
  v
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&colon;/gi, ':')
    .replace(/&tab;|&newline;/gi, '');
// Spaces and control characters, which a browser drops inside a scheme.
// eslint-disable-next-line no-control-regex
const INVISIBLE = /[\s\u0000-\u001f]/g;
export function safeLinks(html, no) {
  return html.replace(URL_ATTR, (all, attr, dq, sq, bare) => {
    const value = decodeRefs(dq ?? sq ?? bare)
      .replace(INVISIBLE, '')
      .toLowerCase();
    if (!/^(?:javascript|vbscript|data:text\/html)/.test(value)) return all;
    console.warn(
      `[slides] slide ${no}: a javascript: (or similar) address was replaced by # (it would run code)`,
    );
    return `${attr}"#"`;
  });
}

export function keepSpaces(html) {
  return outsidePre(html, (part) => part.replace(/>([ \t]+)</g, '>&ngsp;<'));
}

// Browsers (and Vue) read the old entities without `;` (`Option&ltA>`, `&copy 2024`); Angular shows them as text. The common
// ones get their `;`, unless the letters go on to a longer entity (`&ltimes;`).
export function closeEntities(html) {
  return outsidePre(html, (part) =>
    part.replace(/&(lt|gt|amp|quot|copy|reg|nbsp)(?![a-zA-Z0-9]*;)/g, '&$1;'),
  );
}

// Runs `fn` on the parts of `html` outside <pre> blocks. A <pre> may hold another (a Twoslash popup inside the code), so the
// blocks are counted, not matched up to the first </pre>.
function outsidePre(html, fn) {
  let out = '';
  let depth = 0;
  let from = 0;
  for (const m of html.matchAll(/<pre[\s>]|<\/pre>/g)) {
    const opening = m[0] !== '</pre>';
    // The outside parts keep the `<` of <pre and the `>` of </pre>, so a space next to a code sample is seen as between tags.
    if (opening && depth++ === 0) {
      out += fn(html.slice(from, m.index + 1));
      from = m.index + 1;
    } else if (!opening && depth > 0 && --depth === 0) {
      out += html.slice(from, m.index + m[0].length - 1);
      from = m.index + m[0].length - 1;
    }
  }
  return out + (depth > 0 ? html.slice(from) : fn(html.slice(from)));
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
  // Text, numbers and booleans are attributes (an input with numberAttribute or booleanAttribute converts them); a list or
  // an object is bound as its value, since as text it would be `a,b` or `[object Object]`.
  const attrs = def.props
    .filter((p) => frontmatter[p] != null)
    .map((p) =>
      typeof frontmatter[p] === 'object'
        ? ` [${p}]="${attr(JSON.stringify(frontmatter[p]))}"`
        : ` ${p}="${attr(frontmatter[p])}"`,
    );
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

// A markdown link to another slide, `[pricing](/pricing)` or `[four](/4)`, moves inside the deck like <slide-ng-link>: with a
// base, hash routing or an offline folder a plain address would leave the deck.
export function slideLinks(html, aliases = []) {
  const names = new Set(aliases.map(String));
  return html.replace(/<a href="\/([\w-]+)(?:#[^"]*)?">([\s\S]*?)<\/a>/g, (link, to, text) =>
    /^\d+$/.test(to) || names.has(to) ? `<slide-ng-link to="${to}">${text}</slide-ng-link>` : link,
  );
}

// True when the markup has a tag the deck's `customElements` setting names: a list of names, where `sl-*` is a prefix, or `true`.
export function usesCustomElements(markup, setting) {
  if (!setting) return false;
  const tags = [...markup.matchAll(/<([a-z][\w.]*-[\w.-]*)/g)].map((m) => m[1]);
  if (setting === true) return tags.length > 0;
  const names = [setting].flat().map(String);
  return tags.some((tag) =>
    names.some((n) => (n.endsWith('*') ? tag.startsWith(n.slice(0, -1)) : tag === n)),
  );
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
  setWarnSlide(no);
  const { markdown, css } = extractStyles(tagDragSites(slide.content));
  if (/@apply\b/.test(css))
    console.warn(
      `[slides] slide ${no}: @apply in a <style> does nothing here (there is no UnoCSS directive transformer); put the classes on the element, or write the CSS out`,
    );
  warnInlineControlFlow(markdown, no);
  const layer = (name) =>
    deck.layers?.includes(name) ? `<app-slide-layer name="${name}"></app-slide-layer>` : '';
  const layout = `${openTag(def, slide.frontmatter)}${body(markdown, def, no, { file: slide.file, root: deck.root, roots: deck.roots?.map((r) => r.dir), allowOutsideRoot: deck.allowOutsideRoot, headmatter: deck.headmatter, codeblocks: deck.transformers?.codeblocks, slide: slideInfo(slide, no) }, layoutKey)}</${def.tag}>`;
  const base = deck.assetBase ?? '/'; // where the deck is served from in a build; `/public` files get it in front
  const aliases = (deck.slides ?? []).map((sl) => sl.frontmatter?.routeAlias).filter(Boolean);
  const html = safeLinks(
    closeEntities(
      keepSpaces(
        rebaseHtml(
          localAssets(
            slideLinks(layer('slide-bottom') + layout + layer('slide-top'), aliases),
            {
              file: slide.file ?? slide.source?.filepath,
              root: deck.root,
              publics: (deck.roots ?? []).map((r) => join(r.dir, 'public')),
            },
            (deck.localAssets ??= new Set()),
          ),
          base,
        ),
      ),
    ),
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
  // A drag position by name (`slide-ng-drag="square"`, `pos="square"`) is looked up in the slide's `dragPos`.
  const dragPos = slide.frontmatter.dragPos ?? {};
  const named = [
    ...markup.matchAll(/\sslide-ng-drag="([A-Za-z][\w-]*)"/g),
    ...markup.matchAll(/<slide-ng-drag(?:-arrow)?\b[^>]*?\spos="([A-Za-z][\w-]*)"/g),
  ];
  for (const m of named)
    if (!Object.hasOwn(dragPos, m[1]))
      console.warn(
        `[slides] slide ${no}: the drag position "${m[1]}" is not in this slide's dragPos; it starts where the layout puts it`,
      );
  // UnoCSS here has no variant groups and no `--uno:` directive (docs/SYNTAX.md): say so instead of dropping the styles.
  if (/\sclass="[^"]*[\w-]:\(/.test(markup))
    console.warn(
      `[slides] slide ${no}: variant groups such as hover:(a b) are not supported; write hover:a hover:b`,
    );
  if (/--uno(?:css)?:/.test(css))
    console.warn(
      `[slides] slide ${no}: --uno: in a <style> is not supported; put the utility classes on the element instead`,
    );
  // Vue's `<template #name>` slot is an inert HTML <template> here: its content never shows.
  if (/<template\s+(?:#|v-slot)/.test(markup))
    console.warn(
      `[slides] slide ${no}: <template #...> is Vue's slot syntax and shows nothing here; use <div at="1"> children in <slide-ng-switch> and <div dark> / <div light> in <slide-ng-light-or-dark>`,
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
        (c) =>
          `import { ${c.className}${c.alias ? ` as ${c.alias}` : ''} } from '${c.importPath ?? `../../app/${c.file}`}';`,
      ),
    ),
    ...Object.entries(fromAngular).map(
      ([pkg, names]) => `import { ${names.join(', ')} } from '${pkg}';`,
    ),
  ];

  // Web components (`<model-viewer>`, `<sl-button>`) are not Angular components: the deck lists them in `customElements`
  // (names, `sl-*`, or `true` for any), and only the slides that use one get Angular's CUSTOM_ELEMENTS_SCHEMA, so a mistyped
  // component name elsewhere is still an error.
  const schema = usesCustomElements(markup, deck.headmatter?.customElements);
  const { clicksStart, clicks } = slide.frontmatter;
  const providers = ['ClicksContext'];
  if (clicksStart) providers.push(`{ provide: CLICKS_START, useValue: ${+clicksStart} }`);
  if (clicks) providers.push(`{ provide: CLICKS_TOTAL, useValue: ${+clicks} }`);
  if (base === './' && hasRootUrl(css))
    console.warn(
      `[slides] slide ${no}: url(/...) in a <style> is not found in an offline folder (the build cannot rewrite it there); use the picture in an inline style="background-image: url(/...)" or an <img> instead`,
    );
  const styles = scopeCss(rebaseCss(css, base), slideName(no));

  // Where the slide is in the markdown: the build runner adds it to Angular's errors (cli/runtime.mjs).
  const where = slide.source
    ? `${relative(deck.root ?? dirname(slide.source.filepath), slide.source.filepath) || 'slides.md'}:${Math.max(1, slide.source.start)}`
    : 'slides.md';
  return `// GENERATED from ${where} (slide ${no}) - do not edit
import { ${schema ? 'CUSTOM_ELEMENTS_SCHEMA, ' : ''}Component${styles ? ', ViewEncapsulation' : ''} } from '@angular/core';
import { CLICKS_START, CLICKS_TOTAL, ClicksContext } from '../../app/lib/clicks';
import { SlideBase } from '../../app/lib/slide-base';
${importLines.join('\n')}

@Component({
  selector: '${slideName(no)}',
  imports: [${[...imports.map((c) => c.alias ?? c.className), ...Object.values(fromAngular).flat()].join(', ')}],
  providers: [${providers.join(', ')}],${schema ? '\n  schemas: [CUSTOM_ELEMENTS_SCHEMA],' : ''}
  template: ${JSON.stringify(html)},${styles ? `\n  styles: [${JSON.stringify(styles)}],\n  encapsulation: ViewEncapsulation.None,` : ''}
})
export default class ${slideClass(no)} extends SlideBase {}
`;
}
