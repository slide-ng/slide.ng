// How a markdown link is written out, as in Slidev: a link to a slide moves inside the deck, a link to a web page opens a
// new tab. An <a href="/3"> written as HTML is turned into a link to the slide the same way (htmlSlideLinks).
import { Renderer } from 'marked';
import { RESERVED } from './route-alias.mjs';

const DIGITS = /^\d+$/;
// `/5`, `./5`, `#/5` (the address with hash routing), or the same with a routeAlias. A `#part` after it is dropped. An alias
// may be any one name of an address (`./café`, `./🚀`, `./My%20Alias`), but not one that would need escaping in markup.
const SLIDE_ADDRESS = /^(?:\.?\/|#\/)([^\s/?#.\\"'<>{}&`]+)(?:#.*)?$/;

/** The number or name after `/`, `./` or `#/` (decoded), or the href itself when it is a number; else null. */
function addressName(href) {
  if (DIGITS.test(href)) return href;
  const name = SLIDE_ADDRESS.exec(href)?.[1];
  if (!name) return null;
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

/** The slide a link points to (a number or a routeAlias), or null when it is not a slide. @param {string} href @param {string[]} [aliases] */
export function slideTarget(href, aliases = []) {
  const to = addressName(href);
  return to && (DIGITS.test(to) || aliases.includes(to)) ? to : null;
}

/**
 * Why a link that looks like one to a slide does not reach one, or null: a number past the last slide, an alias of a
 * hidden slide, or (for `./name` and `#/name`; `/name` may be a page of the site) a name that is no routeAlias.
 * @param {string} href @param {{ aliases?: string[], total?: number, hidden?: string[] }} deck
 */
export function brokenSlideLink(href, { aliases = [], total, hidden = [] }) {
  const to = addressName(href);
  if (!to) return null;
  if (DIGITS.test(to))
    return total && (+to < 1 || +to > total)
      ? `the link "${href}" goes to slide ${+to}, but the deck has ${total} slides (it opens slide ${Math.min(Math.max(+to, 1), total)})`
      : null;
  if (aliases.includes(to)) return null;
  if (hidden.includes(to))
    return `the link "${href}" names the routeAlias of a slide with hide: or disabled:, which is not in the deck`;
  // `./overview`, `./presenter`, ... are pages of the app: a plain link opens them.
  if (RESERVED.includes(to)) return null;
  return /^(?:\.\/|#\/)/.test(href)
    ? `the link "${href}" names no slide (no slide has routeAlias "${to}"), so it is a plain link`
    : null;
}

/**
 * A marked `renderer` for links. With `slides`, a link to a slide becomes <slide-ng-link> (the notes are plain HTML, where
 * that tag would do nothing, so they leave it out). `warn` gets what is wrong with a link to a slide (see brokenSlideLink).
 * @param {{ slides?: boolean, aliases?: string[], total?: number, hidden?: string[], warn?: (message: string) => void }} [options]
 */
export function linkRenderer({ slides = true, aliases = [], total, hidden, warn } = {}) {
  return {
    /** @this {Renderer} @param {import('marked').Tokens.Link} token */
    link(token) {
      const problem = slides && warn && brokenSlideLink(token.href, { aliases, total, hidden });
      if (problem) warn(problem);
      const to = slides && slideTarget(token.href, aliases);
      if (to)
        return `<slide-ng-link to="${to.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">${this.parser.parseInline(token.tokens)}</slide-ng-link>`;
      // `./#results` is the heading `#results` of this slide (the deck scrolls to it); `./` would leave the page.
      if (token.href.startsWith('./#'))
        return Renderer.prototype.link.call(this, { ...token, href: token.href.slice(2) });
      const html = Renderer.prototype.link.call(this, token);
      // A web page opens in a new tab, so the deck stays where it is.
      return /^https?:/i.test(token.href)
        ? html.replace(/^(<a [^>]*)>/, '$1 target="_blank" rel="noopener">')
        : html;
    },
  };
}

const HTML_LINK = /<a(\s[^>]*)?>([\s\S]*?)<\/a\s*>/gi;
const HTML_ATTR = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
// The attributes that can move to <slide-ng-link> as they are; with any other (target, rel, a binding) the <a> is kept.
const MOVABLE = new Set(['href', 'class', 'id', 'style']);

/**
 * An `<a href="/3">` (or `./3`, `#/3`, a routeAlias) written as HTML in a slide's markup becomes `<slide-ng-link to="3">`, as a
 * markdown link does: a plain href would leave the deck with `routerMode: hash`, a `--base` or an offline build. An <a> with
 * other attributes is left as it is, with a warning, unless it is a `#/3` in a deck with `routerMode: hash`, where it works as
 * it is (also in a new tab). `warn` gets the message and which `<a>` of that href it is (`{ href, nth }`, nth from 0), so the
 * warning can name its line.
 * @param {string} html
 * @param {{ aliases?: string[], total?: number, hidden?: string[], hash?: boolean, warn?: (message: string, at: { href: string, nth: number }) => void }} [deck]
 */
export function htmlSlideLinks(html, { aliases = [], total, hidden, hash = false, warn } = {}) {
  const seen = new Map();
  return html.replace(HTML_LINK, (whole, attrText = '', inner) => {
    const attrs = [...attrText.matchAll(HTML_ATTR)].map((m) => ({
      name: m[1].toLowerCase(),
      value: m[2] ?? m[3] ?? m[4],
      raw: m[0],
    }));
    const href = attrs.find((a) => a.name === 'href')?.value;
    if (href == null) return whole;
    // Only a link that reaches a slide is looked at: a markdown link to no slide is an <a> here too, and was warned about.
    // A bare `5` is a relative address in HTML (only markdown reads it as slide 5, as Slidev does).
    const to = !DIGITS.test(href) && slideTarget(href, aliases);
    if (!to) return whole;
    const at = { href, nth: seen.get(href) ?? 0 };
    seen.set(href, at.nth + 1);
    const problem = warn && brokenSlideLink(href, { aliases, total, hidden });
    if (problem) warn(problem, at);
    if (attrs.some((a) => !MOVABLE.has(a.name))) {
      const inHash = href.startsWith('#/');
      if (inHash && hash) return whole; // the address of the slide in this deck, also in a new tab
      warn?.(
        `<a href="${href}"> is an HTML link to a slide with other attributes, so it is left as it is: ${inHash ? 'without routerMode: hash' : 'with routerMode: hash, a --base or an offline build'} it does not reach the slide. Write it as [text](${href}) or <slide-ng-link to="${to}">`,
        at,
      );
      return whole;
    }
    const rest = attrs.filter((a) => a.name !== 'href').map((a) => ` ${a.raw}`);
    return `<slide-ng-link to="${to.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"${rest.join('')}>${inner}</slide-ng-link>`;
  });
}
