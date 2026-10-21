// The <head> of the page, made from the headmatter: title, description, author, keywords, favicon, language,
// `htmlAttrs`, `seoMeta` (Open Graph and Twitter tags) and the PWA manifest link.
// The headmatter can come from someone else's deck, so every value is escaped and attribute names are checked.
import { themeColor } from '../build/pwa.mjs';
import { isRtl, normalizeLang } from './lang.mjs';
import { ROUTER_MODE_META, ROUTER_MODES } from './build-options.mjs';
import { plainText } from './plain-text.mjs';

const escapeHtml = (text) =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// seoMeta key -> [attribute that names the tag, tag name]
const SEO_KEYS = {
  ogTitle: ['property', 'og:title'],
  ogDescription: ['property', 'og:description'],
  ogImage: ['property', 'og:image'],
  ogImageAlt: ['property', 'og:image:alt'],
  ogImageWidth: ['property', 'og:image:width'],
  ogImageHeight: ['property', 'og:image:height'],
  ogImageType: ['property', 'og:image:type'],
  ogUrl: ['property', 'og:url'],
  ogType: ['property', 'og:type'],
  ogSiteName: ['property', 'og:site_name'],
  ogLocale: ['property', 'og:locale'],
  twitterCard: ['name', 'twitter:card'],
  twitterTitle: ['name', 'twitter:title'],
  twitterDescription: ['name', 'twitter:description'],
  twitterImage: ['name', 'twitter:image'],
  twitterImageAlt: ['name', 'twitter:image:alt'],
  twitterSite: ['name', 'twitter:site'],
  twitterCreator: ['name', 'twitter:creator'],
  twitterUrl: ['name', 'twitter:url'],
};

const meta = (attr, name, content) =>
  content == null || content === ''
    ? null
    : `<meta ${attr}="${escapeHtml(name)}" content="${escapeHtml(content)}">`;

/** `%s - My talk` with the title put in. Without `%s` the template is used as it is. */
export function applyTitleTemplate(template, title) {
  return template ? String(template).replace(/%s/g, title) : title;
}

/** The deck's title for the page: the headmatter `title`, put into `titleTemplate` when there is one. */
export function pageTitle(headmatter) {
  return applyTitleTemplate(headmatter.titleTemplate, String(headmatter.title ?? 'slide.ng'));
}

// A favicon is a web address, a data address, or a file of the public folder (with or without a leading slash).
export function faviconHref(favicon) {
  const value = String(favicon);
  if (/^(https?:\/\/|data:image\/)/i.test(value)) return value;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//')) return null; // javascript:, file: and the like
  return value.replace(/^\/+/, '');
}

const FAVICON_TYPES = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
};

// A short plain description from the markdown of `info` (the page's description and the PDF's subject).
export function describe(info) {
  return plainText(info).slice(0, 300);
}

/**
 * What goes into the page. `ogImage` is the address chosen for the Open Graph image (a given one, `og-image.png`, or
 * null). `warn` reports ignored values.
 * @param {Record<string, any>} headmatter
 * @param {{ ogImage?: string | null, pwa?: boolean, warn?: (message: string) => void }} [options]
 */
export function headParts(headmatter, { ogImage = null, pwa = false, warn = () => {} } = {}) {
  const seo =
    headmatter.seoMeta && typeof headmatter.seoMeta === 'object' ? headmatter.seoMeta : {};
  const title = pageTitle(headmatter);
  const description = headmatter.info ? describe(headmatter.info) : null;
  const keywords = Array.isArray(headmatter.keywords)
    ? headmatter.keywords.join(', ')
    : headmatter.keywords;

  const tags = [
    meta('name', 'description', description),
    meta('name', 'author', headmatter.author),
    meta('name', 'keywords', keywords),
    meta('property', 'og:title', seo.ogTitle ?? title),
    meta('property', 'og:description', seo.ogDescription ?? description),
    meta('property', 'og:image', ogImage ?? (seo.ogImage === 'auto' ? null : seo.ogImage)),
    // How the app routes, for `export --dist` (a build's `--router-mode` may differ from the headmatter it is exported with).
    meta(
      'name',
      ROUTER_MODE_META,
      ROUTER_MODES.includes(headmatter.routerMode) ? headmatter.routerMode : 'history',
    ),
  ];
  for (const [key, value] of Object.entries(seo)) {
    if (['ogTitle', 'ogDescription', 'ogImage'].includes(key)) continue;
    if (!SEO_KEYS[key]) {
      warn(`seoMeta.${key} is not a known key, ignored`);
      continue;
    }
    tags.push(meta(...SEO_KEYS[key], value));
  }
  if (pwa)
    tags.push(
      '<link rel="manifest" href="manifest.webmanifest">',
      `<meta name="theme-color" content="${themeColor(headmatter)}">`,
    );
  if (headmatter.favicon) {
    const href = faviconHref(headmatter.favicon);
    if (!href) warn('favicon must be a web address or a file of the public folder, ignored');
    else {
      const ext = (/\.\w+$/.exec(href.split('?')[0]) ?? [''])[0].toLowerCase();
      tags.push(
        `<link rel="icon" href="${escapeHtml(href)}"${FAVICON_TYPES[ext] ? ` type="${FAVICON_TYPES[ext]}"` : ''}>`,
      );
    }
  }
  return {
    title,
    lang: headmatter.lang ? String(headmatter.lang) : null,
    htmlAttrs: headmatter.htmlAttrs ?? {},
    tags: /** @type {string[]} */ (tags.filter(Boolean)),
    hasFavicon: Boolean(headmatter.favicon && faviconHref(headmatter.favicon)),
  };
}

// Attribute names are limited to plain names, and event handlers (`onload`) are not allowed.
function attributeText(attrs, warn) {
  return Object.entries(attrs).flatMap(([name, value]) => {
    if (!/^[a-z][\w:-]*$/i.test(name) || /^on/i.test(name)) {
      warn(`htmlAttrs.${name} is not allowed, ignored`);
      return [];
    }
    if (value === false || value == null) return [];
    return [value === true ? name : `${name}="${escapeHtml(value)}"`];
  });
}

/**
 * Puts the parts into `src/index.html`: the <html> attributes, the <title>, and the tags before </head>.
 * @param {string} template
 * @param {ReturnType<typeof headParts>} parts
 * @param {(message: string) => void} [warn]
 */
export function renderIndexHtml(template, parts, warn = () => {}) {
  // `lang` in the usual spelling (`pt_br` is `pt-BR`); a value that is not a language tag is written as it is.
  const lang = parts.lang ? normalizeLang(parts.lang) || parts.lang : null;
  // A right-to-left language (`ar`, `he`, `fa`, `ur`) turns the page around, unless `htmlAttrs.dir` says otherwise.
  const attrs = {
    lang: 'en',
    ...(lang && isRtl(lang) ? { dir: 'rtl' } : {}),
    ...parts.htmlAttrs,
    ...(lang ? { lang } : {}),
  };
  let html = template.replace(/<html[^>]*>/i, `<html ${attributeText(attrs, warn).join(' ')}>`);
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(parts.title)}</title>`);
  // The template's own icon is dropped when the deck has one.
  if (parts.hasFavicon) html = html.replace(/\s*<link rel="icon"[^>]*>/i, '');
  return html.replace(/<\/head>/i, `  ${parts.tags.join('\n  ')}\n</head>`);
}
