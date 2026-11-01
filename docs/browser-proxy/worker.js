// A proxy for the slide.ng deck browser, for Cloudflare Workers. It loads a page, drops the headers that refuse framing and
// keeps links and forms going through it, so a built deck can show sites like DuckDuckGo inside. Set the deck's headmatter to
// `browser: { proxy: https://<your worker>/?url=%s }` and DECK_ORIGINS (Settings > Variables) to the deck's address, such as
// https://you.github.io. See docs/SYNTAX.md, "Deck browser".

const DROP = [
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
  'cross-origin-opener-policy',
  'cross-origin-embedder-policy',
  'cross-origin-resource-policy',
  'strict-transport-security',
  'set-cookie',
];
const SEND = ['accept', 'accept-language', 'content-type', 'user-agent'];

const page = (status, text) =>
  new Response(text, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });

function targetOf(url) {
  const asked = url.searchParams.get('url');
  if (asked) return asked;
  const rest = url.pathname.slice(1).replace(/^(https?):\/+/i, '$1://');
  return rest ? rest + url.search : '';
}

export default {
  async fetch(request, env) {
    const self = new URL(request.url);
    let target;
    try {
      target = new URL(targetOf(self));
    } catch {
      return page(400, 'slide.ng deck browser proxy: add ?url=<page>');
    }
    if (target.protocol !== 'http:' && target.protocol !== 'https:')
      return page(400, 'Only http and https pages.');

    const decks = String(env.DECK_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    let from = '';
    try {
      from = new URL(request.headers.get('referer') ?? '').origin;
    } catch {}
    if (decks.length && from !== self.origin && !decks.includes(from))
      return page(403, 'This proxy only answers its own decks.');

    const through = (value, base) => {
      try {
        const u = new URL(value, base);
        return u.protocol === 'http:' || u.protocol === 'https:'
          ? `${self.origin}/${u.href}`
          : value;
      } catch {
        return value;
      }
    };

    const headers = new Headers();
    for (const name of SEND)
      if (request.headers.has(name)) headers.set(name, request.headers.get(name));
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
    });

    const out = new Headers(upstream.headers);
    for (const name of DROP) out.delete(name);
    const location = out.get('location');
    if (location) out.set('location', through(location, target));
    const response = new Response(upstream.body, { status: upstream.status, headers: out });
    if (!(out.get('content-type') ?? '').includes('text/html')) return response;

    const attr = (name) => ({
      element(el) {
        const value = el.getAttribute(name);
        if (value && !value.startsWith('#') && !/^(javascript|mailto|tel|data):/i.test(value))
          el.setAttribute(name, through(value, target));
        const goes = el.getAttribute('target');
        if (goes && /^_(blank|top|parent)$/i.test(goes)) el.setAttribute('target', '_self');
      },
    });
    return new HTMLRewriter()
      .on('head', { element: (el) => el.prepend(`<base href="${target.href}">`, { html: true }) })
      .on('meta[http-equiv]', {
        element(el) {
          if (/content-security-policy/i.test(el.getAttribute('http-equiv') ?? '')) el.remove();
        },
      })
      .on('a[href]', attr('href'))
      .on('area[href]', attr('href'))
      .on('form[action]', attr('action'))
      .on('form:not([action])', {
        element: (el) => el.setAttribute('action', through(target.href, target)),
      })
      .on('iframe[src]', attr('src'))
      .transform(response);
  },
};
