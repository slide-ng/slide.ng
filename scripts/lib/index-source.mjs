// Writes generated/index.ts: the list of slides with their metadata, and the deck's headmatter.
import { marked } from 'marked';
import { layoutName } from './layouts.mjs';
import { safeLinks, slideClass, slideName } from './emit.mjs';
import { checkRouteAlias, checkUniqueAliases } from './route-alias.mjs';
import { noteToHtml } from './note-html.mjs';
import { downloadTarget } from '../export/filename.mjs';
import { pwaEnabled } from '../build/pwa.mjs';
import { titleHtml } from './math.mjs';
import { BIDI_CONTROLS, plainTitle } from './plain-text.mjs';
import { LAYOUTS } from './registry.mjs';

export { plainTitle };

// What the app needs to know about one slide, besides its component.
function metaOf(slide, index, rubyMap) {
  const f = slide.frontmatter;
  return {
    title: slide.title == null ? null : plainTitle(slide.title),
    titleHtml:
      slide.title == null
        ? null
        : safeLinks(titleHtml(String(slide.title).replace(BIDI_CONTROLS, '')), index + 1), // inline markdown and $math$ as HTML
    level: slide.level ?? null,
    layout: slide.layout ?? layoutName(f, index),
    note: slide.note ?? null,
    noteHtml: noteToHtml(slide.note, rubyMap),
    routeAlias: checkRouteAlias(f.routeAlias, index + 1),
    hideInToc: Boolean(f.hideInToc),
    transition: f.transition ?? null,
    images: slide.images ?? [], // set by slideSource (slide-images.mjs)
    frontmatter: f,
  };
}

export function indexSource(deck) {
  // `notesAutoRuby` in the headmatter wraps listed words in <ruby> in the note HTML of every slide.
  const rubyMap = deck.headmatter?.notesAutoRuby;
  const imports = deck.slides.map(
    (_, i) => `import ${slideClass(i + 1)} from './${slideName(i + 1)}';`,
  );
  const metas = deck.slides.map((s, i) => metaOf(s, i, rubyMap));
  checkUniqueAliases(metas.map((m) => m.routeAlias));
  const entries = metas.map(
    (meta, i) => `  { ${JSON.stringify(meta).slice(1, -1)}, component: ${slideClass(i + 1)} },`,
  );
  // `info:` in the headmatter is markdown for the info dialog; we turn it into HTML here.
  const info =
    typeof deck.headmatter.info === 'string'
      ? marked.parse(deck.headmatter.info, { async: false })
      : null;
  // The page for an address with no slide: the `404` layout, so a theme's or the deck's own replaces the built-in one.
  const notFound = deck.layouts?.['404'] ?? LAYOUTS['404'];
  const notFoundFrom = notFound.importPath ?? `../../app/${notFound.file}`;
  return `// GENERATED from slides.md - do not edit
import type { SlideMeta } from '../../app/lib/slide-meta';
import { ${notFound.className} as NotFoundPage } from '${notFoundFrom}';
${imports.join('\n')}

/** Shown for an address that matches no slide. */
export const NOT_FOUND = NotFoundPage;

export const HEADMATTER: Record<string, unknown> = ${JSON.stringify(deck.headmatter)};
export const INFO_HTML: string | null = ${JSON.stringify(info)};
/** Drawings saved in .slide-ng/drawings (only with \`drawings: { persist: true }\`): slide number -> SVG markup. */
export const DRAWINGS: Record<number, string> = ${JSON.stringify(deck.drawings ?? {})};

/** Headmatter "download": the PDF the nav bar offers (a file next to the page, or a web address), or null. */
export const DOWNLOAD: string | null = ${JSON.stringify(downloadTarget(deck.headmatter, deck.entry))};

/** Headmatter "pwa": register the offline service worker (a build writes sw.js; the dev server has none). */
export const PWA: boolean = ${pwaEnabled(deck.headmatter)};

export const SLIDES: SlideMeta[] = [
${entries.join('\n')}
];
`;
}
