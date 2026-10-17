// Files of the deck's `public/` folder are written with a leading slash in slides (`![](/photo.png)`). That only works when
// the deck sits at the root of its host. A production build puts the deck's base in front (`/talk/photo.png`), and an
// offline folder (`./`) makes it relative to the page, so the folder works from any place on disk.

// Code samples show text, they are not addresses.
const CODE = /(<pre[\s\S]*?<\/pre>|<code(?:\s[^>]*)?>[\s\S]*?<\/code>)/;

const ROOT = '\\/(?!\\/)'; // a slash that is not the start of `//host`

/** The new address of `/photo.png` for a base: `/talk/photo.png`, or `photo.png` for `./`. */
export const rebase = (path, base) => (base === './' ? path.slice(1) : base + path.slice(1));

// Attributes that hold one address, and CSS `url(...)`.
const ATTRIBUTE = new RegExp(`(\\s(?:src|poster|data)=)(["'])${ROOT}([^"']*)\\2`, 'g');
// A link to a file of `public/` (`[map](/map.pdf)`): an address with a file extension. `/4` or `/pricing` is a slide.
const FILE_LINK = new RegExp(
  `(\\shref=)(["'])${ROOT}([^"'#?]*\\.[\\w]{1,8}(?:[#?][^"']*)?)\\2`,
  'g',
);
// `srcset="/a.webp 1x, /b.webp 2x"`: each address of the list.
const SRCSET = /(\ssrcset=)(["'])([^"']*)\2/g;
// A quoted address may hold spaces (`url('/team photo.png')`), an unquoted one may not.
const CSS_URL = new RegExp(
  `(url\\(\\s*)(?:(["'])${ROOT}([^"']*)\\2|()${ROOT}([^)"'\\s]*))(\\s*\\))`,
  'g',
);
const cssUrl = (base) => (_, open, quote, quoted, bare, rest, close) =>
  `${open}${quote ?? ''}${rebase(`/${quoted ?? rest}`, base)}${quote ?? ''}${close}`;
/** Whether some CSS names a `public/` file with a root address (`url(/x.png)`). */
export const hasRootUrl = (css) => new RegExp(CSS_URL.source).test(css);

/**
 * Puts the base in front of root-relative addresses in a slide's HTML: `src`, `poster`, `data` and `srcset` attributes, links to
 * files (`href="/map.pdf"`) and `url()` in inline styles.
 * Code samples are left alone. `base` is `/` (dev server: nothing changes), `/talk/` or `./`.
 */
export function rebaseHtml(html, base) {
  if (base === '/') return html;
  return html
    .split(CODE)
    .map((part, i) =>
      i % 2
        ? part
        : part
            .replace(
              ATTRIBUTE,
              (_, name, quote, rest) => `${name}${quote}${rebase(`/${rest}`, base)}${quote}`,
            )
            .replace(
              FILE_LINK,
              (_, name, quote, rest) => `${name}${quote}${rebase(`/${rest}`, base)}${quote}`,
            )
            .replace(SRCSET, (_, name, quote, list) => {
              const items = list
                .split(',')
                .map((item) =>
                  item.replace(
                    /^(\s*)\/(?!\/)(\S*)/,
                    (__, ws, path) => `${ws}${rebase(`/${path}`, base)}`,
                  ),
                );
              return `${name}${quote}${items.join(',')}${quote}`;
            })
            .replace(CSS_URL, cssUrl(base)),
    )
    .join('');
}

/**
 * The same for the CSS of a slide's `<style>`. The Angular build treats a relative `url()` in a component's styles as a file to
 * bundle, so with `./` the addresses are left as they are; a path base is a plain absolute address and is safe.
 */
export function rebaseCss(css, base) {
  if (base === '/' || base === './') return css;
  return css.replace(CSS_URL, cssUrl(base));
}
