// The `index.html` of a theme, an addon or the deck, merged into the page like Slidev does: the inside of its <head> goes
// before </head>, the inside of its <body> after the app. The file is the deck's own code (like `components/`), so it is not escaped.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { rebase } from './asset-paths.mjs';

const ATTRIBUTE = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+)))?/g;

/** The attributes of a tag's text (`lang="de" class="a" hidden`), as written. */
export function parseAttributes(text) {
  const attrs = {};
  for (const [, name, ...values] of text.matchAll(ATTRIBUTE))
    attrs[name.toLowerCase()] = values.find((v) => v !== undefined) ?? true;
  return attrs;
}

// `class` values are joined; any other attribute takes the later value.
const mergeAttributes = (into, attrs) => {
  for (const [name, value] of Object.entries(attrs))
    into[name] =
      name === 'class' && typeof into.class === 'string' && typeof value === 'string'
        ? `${into.class} ${value}`
        : value;
  return into;
};

const attributeText = (attrs) =>
  Object.entries(attrs)
    .map(([name, value]) => (value === true ? name : `${name}="${value.replace(/"/g, '&quot;')}"`))
    .join(' ');

/** The inside of the <head> and of the <body> of a page, trimmed, and the attributes of <html> and <body>. */
export function indexHtmlParts(html) {
  const inside = (tag) =>
    (new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(html)?.[1] ?? '').trim();
  const attrs = (tag) =>
    parseAttributes(new RegExp(`<${tag}\\b([^>]*)>`, 'i').exec(html)?.[1] ?? '');
  return {
    head: inside('head'),
    body: inside('body'),
    htmlAttrs: attrs('html'),
    bodyAttrs: attrs('body'),
  };
}

// `src="/x.js"` and `href="/brand.css"` name a file of `public/` from the site root: like `/x.svg` in a slide, the base goes in
// front (`/talk/x.js`, `x.js` in an offline folder). `//host/x.js` and `https://...` are left alone.
const ROOT_ADDRESS = /(\s(?:src|href)\s*=\s*)(["'])\/(?!\/)([^"']*)\2/gi;
export const rebaseRootAddresses = (html, base) =>
  base === '/'
    ? html
    : html.replace(
        ROOT_ADDRESS,
        (_, name, quote, rest) => `${name}${quote}${rebase(`/${rest}`, base)}${quote}`,
      );

// Angular's critical CSS step (beasties) looks for every linked stylesheet in the compiled app and warns for the files of
// `public/`, which are copied later. The deck's stylesheets are loaded as they are written, so it is told to skip them.
const skipBeasties = (html) =>
  html.replace(
    /<link\b(?=[^>]*\brel\s*=\s*["']?stylesheet\b)(?![^>]*data-beasties-skip)/gi,
    '$& data-beasties-skip',
  );

/** The parts of the `index.html` of every root that has one, joined in root order (theme, addons, deck). */
export function rootIndexHtml(roots, base = '/') {
  const head = [];
  const body = [];
  const htmlAttrs = {};
  const bodyAttrs = {};
  for (const root of roots) {
    const file = join(root.dir, 'index.html');
    if (!existsSync(file)) continue;
    const parts = indexHtmlParts(readFileSync(file, 'utf8'));
    if (parts.head) head.push(skipBeasties(rebaseRootAddresses(parts.head, base)));
    if (parts.body) body.push(skipBeasties(rebaseRootAddresses(parts.body, base)));
    mergeAttributes(htmlAttrs, parts.htmlAttrs);
    mergeAttributes(bodyAttrs, parts.bodyAttrs);
  }
  return { head: head.join('\n'), body: body.join('\n'), htmlAttrs, bodyAttrs };
}

// The key of a head tag that replaces an earlier one (as Slidev's unhead does): `<title>`, or a `<meta>` by its name or
// property and its `media` (a light and a dark `theme-color` are two tags). Open Graph arrays (several `og:image`,
// `article:tag`, ...) are meant to repeat: they have no key and are all kept.
const TAG = /<title\b[^>]*>[\s\S]*?<\/title>\s*|<meta\b[^>]*>\s*/gi;
const REPEATED =
  /^(og:(image|video|audio)(:.*)?|og:locale:alternate|(article|book):(tag|author)|music:.*|video:(actor|director|writer|tag)(:.*)?)$/;
function tagKey(tag) {
  if (/^<title/i.test(tag)) return 'title';
  const attrs = parseAttributes(tag.replace(/^<meta\b|\/?>\s*$/gi, ''));
  const name = attrs.name ?? attrs.property;
  if (typeof name !== 'string' || REPEATED.test(name.toLowerCase())) return null;
  return `meta:${name.toLowerCase()}:${typeof attrs.media === 'string' ? attrs.media : ''}`;
}

/**
 * Puts the `<title>` and `<meta>` tags of `added` (the index.html parts) over the page's: a page tag with the same key as
 * an added one is removed, and of added tags with the same key the last one is kept. The page's own tags are left alone.
 */
export function replaceHeadTags(page, added) {
  const last = new Map();
  for (const m of added.matchAll(TAG)) {
    const key = tagKey(m[0]);
    if (key) last.set(key, m.index);
  }
  const ownHead = page.replace(/<\/head>[\s\S]*$/i, '');
  const own = ownHead.replace(TAG, (tag) => (last.has(tagKey(tag)) ? '' : tag));
  const kept = added.replace(TAG, (tag, index) => {
    const key = tagKey(tag);
    return key && last.get(key) !== index ? '' : tag;
  });
  return { page: own + page.slice(ownHead.length), added: kept };
}

/**
 * Puts the parts into the page: the head before </head> (its `<title>` and `<meta>` replace the page's, see replaceHeadTags), the body after
 * the app's element, and the attributes on <html> and <body>. The page's own attributes (from the headmatter: `lang`,
 * `htmlAttrs`) win, except those named in `defaults` (the `lang="en"` the headmatter did not ask for); `class` values are joined.
 */
export function injectIndexHtml(
  page,
  { head, body, htmlAttrs = {}, bodyAttrs = {} },
  defaults = [],
) {
  let html = page;
  if (head) {
    const replaced = replaceHeadTags(html, head);
    html = replaced.page.replace(/<\/head>/i, () => `${replaced.added}\n</head>`);
  }
  if (body) html = html.replace(/<\/app-root>/i, () => `</app-root>\n${body}`);
  for (const [tag, attrs] of [
    ['html', htmlAttrs],
    ['body', bodyAttrs],
  ]) {
    if (!Object.keys(attrs).length) continue;
    html = html.replace(new RegExp(`<${tag}\\b([^>]*)>`, 'i'), (_, own) => {
      const pageAttrs = parseAttributes(own);
      for (const name of defaults) if (name in attrs) delete pageAttrs[name];
      const merged = { ...pageAttrs };
      for (const [name, value] of Object.entries(attrs))
        if (name === 'class' || !(name in merged)) mergeAttributes(merged, { [name]: value });
      return `<${tag} ${attributeText(merged)}>`;
    });
  }
  return html;
}
