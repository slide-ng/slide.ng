// The pictures a slide shows, for `preloadImages` (the app loads the pictures of the next slides before they are shown).
// Port of Slidev's extractImagesUsage, read from the slide's finished HTML instead of its markdown, so the addresses are the
// ones the page asks for: with the build's base, `_local/` for files next to slides.md and `remote-assets/` for downloads.
import { rebase } from './asset-paths.mjs';

// Code samples show text, they are not pictures.
const CODE = /<pre[\s\S]*?<\/pre>|<code(?:\s[^>]*)?>[\s\S]*?<\/code>/g;
const IMG_SRC = /<img\b[^>]*?\ssrc=(["'])([^"']+)\1/gi;
const STYLE = /\sstyle=(?:"([^"]*)"|'([^']*)')/gi; // url('x') inside style="..." and the other way round
const CSS_URL = /url\(\s*(?:&quot;|["'])?([^)"'&]+?)(?:&quot;|["'])?\s*\)/g;
// What Slidev takes a frontmatter `background` for a picture by (a colour or a gradient is not one).
const IMAGE_EXTENSIONS = /\.(?:png|jpe?g|gif|svg|webp|avif|ico|bmp|tiff?)$/i;

const decode = (url) => url.trim().replace(/&amp;/g, '&');
const usable = (url) => url && !/^(?:data:|blob:|#)/.test(url) && !url.includes('{{');

/**
 * The picture addresses of one slide, without duplicates: `<img src>`, `url()` in inline styles, and the frontmatter's `image`,
 * `backgroundImage` and `background` (image layouts, cover). `base` is the build's base, which a frontmatter `/pic.png` gets in
 * front as the layouts do in the page. Empty when the slide says `preload: false`.
 */
export function slideImages(html, frontmatter = {}, base = '/') {
  if (frontmatter.preload === false) return [];
  const found = new Set();
  for (const key of ['image', 'backgroundImage', 'background']) {
    const value = frontmatter[key];
    if (typeof value !== 'string' || !usable(value.trim())) continue;
    const url = value.trim();
    if (key === 'background' && !(IMAGE_EXTENSIONS.test(url) || /^(?:\/|https?:)/.test(url)))
      continue;
    found.add(url.startsWith('/') && !url.startsWith('//') ? rebase(url, base) : url);
  }
  const text = html.replace(CODE, '');
  for (const [, , src] of text.matchAll(IMG_SRC)) if (usable(decode(src))) found.add(decode(src));
  for (const [, double, single] of text.matchAll(STYLE))
    for (const [, url] of (double ?? single).matchAll(CSS_URL))
      if (usable(decode(url))) found.add(decode(url));
  return [...found];
}
