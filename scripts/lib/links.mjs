// How a markdown link is written out, as in Slidev: a link to a slide moves inside the deck, a link to a web page opens a
// new tab. Only links written in markdown; an <a> written as HTML is left as it is.
import { Renderer } from 'marked';

const DIGITS = /^\d+$/;
// `/5`, `./5`, `#/5` (the address with hash routing), or the same with a routeAlias. A `#part` after it is dropped.
const SLIDE_ADDRESS = /^(?:\.?\/|#\/)([\w-]+)(?:#.*)?$/;

/** The slide a link points to (a number or a routeAlias), or null when it is not a slide. @param {string} href @param {string[]} [aliases] */
export function slideTarget(href, aliases = []) {
  if (DIGITS.test(href)) return href;
  const to = SLIDE_ADDRESS.exec(href)?.[1];
  return to && (DIGITS.test(to) || aliases.includes(to)) ? to : null;
}

/**
 * A marked `renderer` for links. With `slides`, a link to a slide becomes <slide-ng-link> (the notes are plain HTML, where
 * that tag would do nothing, so they leave it out).
 * @param {{ slides?: boolean, aliases?: string[] }} [options]
 */
export function linkRenderer({ slides = true, aliases = [] } = {}) {
  return {
    /** @this {Renderer} @param {import('marked').Tokens.Link} token */
    link(token) {
      const to = slides && slideTarget(token.href, aliases);
      if (to)
        return `<slide-ng-link to="${to}">${this.parser.parseInline(token.tokens)}</slide-ng-link>`;
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
