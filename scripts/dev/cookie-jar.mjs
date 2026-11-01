import { isIP } from 'node:net';
import { Cookie, CookieJar, getPublicSuffix } from 'tough-cookie';

// The cookies of the pages the deck browser shows through the proxy. They stay here, in memory, until the dev server stops, and
// never reach the browser, so a page cannot read or send the cookies of another site. A request gets only the cookies its
// site's rules allow: the proxy judges SameSite itself, with the page that started the request as the one on top.

const MAX_COOKIES = 3000;
const MAX_SIZE = 4096;

export function siteOf(url) {
  const host = new URL(url).hostname.replace(/^\[|\]$/g, '');
  return isIP(host) ? host : (getPublicSuffix(host, { allowSpecialUseDomain: true }) ?? host);
}

// `from` is the address of the page that asked, or null when the user did: a typed address, a tile, the deck itself.
// 'strict': the same site or the user asked. 'lax': another site sent the user here with a link. 'none': another site asked.
export function sameSiteContext({ target, from, navigate, method }) {
  if (from === null) return 'strict';
  try {
    if (siteOf(from) === siteOf(target)) return 'strict';
  } catch {
    // an address that is not one counts as another site
  }
  return navigate && /^(GET|HEAD)$/i.test(method) ? 'lax' : 'none';
}

export function createCookieJar() {
  const jar = new CookieJar(undefined, {
    rejectPublicSuffixes: true,
    prefixSecurity: 'silent',
    allowSpecialUseDomain: true,
    allowSecureOnLocal: true,
  });

  const parse = (text) => {
    if (typeof text !== 'string' || text.length > MAX_SIZE) return null;
    const cookie = Cookie.parse(text);
    if (cookie) cookie.sameSite ??= 'lax';
    return cookie ?? null;
  };

  async function put(text, url, options) {
    const cookie = parse(text);
    if (!cookie || (await jar.store.getAllCookies()).length >= MAX_COOKIES) return;
    try {
      await jar.setCookie(cookie, url, options);
    } catch {
      // refused like a browser would: another site's domain, SameSite from another site, HttpOnly from a script
    }
  }

  return {
    async store(setCookies, url, context) {
      for (const text of setCookies) await put(text, url, { sameSiteContext: context, http: true });
    },
    header: (url, context) => jar.getCookieString(url, { sameSiteContext: context, http: true }),
    // What `document.cookie` shows a page: no HttpOnly cookies.
    visible: (url) => jar.getCookieString(url, { sameSiteContext: 'strict', http: false }),
    fromScript: (text, url) => put(text, url, { sameSiteContext: 'strict', http: false }),
    clear: () => jar.removeAllCookies(),
  };
}
