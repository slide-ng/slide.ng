// The deck browser's proxy for a built deck, as one fetch handler that runs on Cloudflare Workers, Netlify and Vercel edge
// functions and Deno Deploy (see the files next to this one). It loads a page, drops the headers that refuse framing, and
// sends links and forms back through itself, so a deck on any static host can show sites like DuckDuckGo inside. Pages it
// shows are sandboxed, each on an origin of its own that cannot reach the deck or the other pages, and their cookies are
// dropped: nobody should sign in to anything through it. It refuses addresses written as local or private; it does not look up
// names, so run it on an edge host (which cannot reach a private network), not on a machine inside one.

const DROP = [
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
  'cross-origin-opener-policy',
  'cross-origin-embedder-policy',
  'cross-origin-resource-policy',
  'strict-transport-security',
  'set-cookie',
  'content-encoding',
  'content-length',
];
const SEND = ['accept', 'accept-language', 'content-type', 'user-agent'];
const FORM_FIELD = '__slide_ng_url';
const SANDBOX =
  'sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads';

const PRIVATE_V4 =
  /^(0|10|127)\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\.|^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./;

export function isPrivateHost(hostname) {
  const host = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');
  if (!host.includes('.') && !host.includes(':')) return true;
  if (host === 'localhost' || /\.(localhost|local|internal|lan|home|arpa)$/.test(host)) return true;
  if (/^[\d.]+$/.test(host)) return PRIVATE_V4.test(host);
  if (host.includes(':')) {
    const mapped = /^::ffff:([\d.]+)$/.exec(host)?.[1];
    if (mapped) return PRIVATE_V4.test(mapped);
    return /^(::1?|::ffff:.*|f[cd].*|fe[89ab].*)$/.test(host);
  }
  return false;
}

const text = (status, body) =>
  new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });

const web = (value, base) => {
  try {
    const u = new URL(value, base);
    return (u.protocol === 'http:' || u.protocol === 'https:') && !isPrivateHost(u.hostname)
      ? u
      : null;
  } catch {
    return null;
  }
};

function targetOf(self) {
  const form = self.searchParams.get(FORM_FIELD);
  if (form) {
    const params = new URLSearchParams(self.search);
    params.delete(FORM_FIELD);
    const u = web(form);
    if (u) u.search = params.toString();
    return u;
  }
  return web(self.searchParams.get('url') ?? '');
}

export function rewriteHtml(html, target, through) {
  const escape = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const own = /<base\b[^>]*\shref\s*=\s*(["'])(.*?)\1/i.exec(html)?.[2];
  const baseUrl = (own && web(own.replace(/&amp;/g, '&'), target)) || target;
  const link = (value) => {
    const raw = value.replace(/&amp;/g, '&').trim();
    if (!raw || /^(javascript|mailto|tel|data|blob):/i.test(raw)) return value;
    if (raw.startsWith('#')) return escape(through(target) + raw);
    const u = web(raw, baseUrl);
    return u ? escape(through(u)) : value;
  };
  const tag = (t) => {
    if (/^<meta\b/i.test(t) && /http-equiv\s*=\s*["']?content-security-policy/i.test(t)) return '';
    if (/^<meta\b/i.test(t) && /\sname\s*=\s*["']?referrer/i.test(t)) return '';
    if (/^<base\b/i.test(t)) return '';
    if (/^<meta\b/i.test(t) && /http-equiv\s*=\s*["']?refresh/i.test(t))
      return t.replace(
        /(\scontent\s*=\s*(["'])\s*\d+\s*[;,]\s*url\s*=\s*['"]?)([^'"]*?)(['"]?\2)/i,
        (_, a, _q, v, z) => `${a}${link(v)}${z}`,
      );
    let out = t
      .replace(/\s(integrity|nonce|referrerpolicy)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/(\srel\s*=\s*["'][^"']*?)\bnoreferrer\b/gi, '$1')
      .replace(/(\starget\s*=\s*)(["']?)_(blank|top|parent)\2/gi, '$1$2_self$2');
    if (/^<(a|area)\b/i.test(out))
      out = out.replace(/(\shref\s*=\s*)(["'])(.*?)\2/i, (_, a, q, v) => `${a}${q}${link(v)}${q}`);
    if (/^<iframe\b/i.test(out))
      out = out.replace(/(\ssrc\s*=\s*)(["'])(.*?)\2/i, (_, a, q, v) => `${a}${q}${link(v)}${q}`);
    if (/^<form\b/i.test(out)) {
      const action = /\saction\s*=\s*(["'])(.*?)\1/i.exec(out)?.[2] ?? '';
      const goes = web(action.replace(/&amp;/g, '&') || target.href, baseUrl) ?? target;
      const get = !/\smethod\s*=\s*["']?post/i.test(out);
      const to = get ? through(null) : through(goes);
      out = /\saction\s*=/i.test(out)
        ? out.replace(/(\saction\s*=\s*)(["'])(.*?)\2/i, `$1$2${escape(to)}$2`)
        : out.replace(/^<form\b/i, `<form action="${escape(to)}"`);
      if (get)
        out += `<input type="hidden" name="${FORM_FIELD}" value="${escape(goes.origin + goes.pathname)}">`;
    }
    return out;
  };
  let out = html.replace(
    /(<(script|style|textarea|title)\b[^>]*>)([\s\S]*?)(<\/\2\s*>)|<!--[\s\S]*?-->|<[a-z][^>"']*(?:(?:"[^">]*"|'[^'>]*')[^>"']*)*>/gi,
    (whole, open, _name, body, close) =>
      open ? open + body + close : whole.startsWith('<!--') ? whole : tag(whole),
  );
  const base = `<base href="${escape(baseUrl.href)}">`;
  const head = /<head(\s[^>]*)?>/i.exec(out);
  return head
    ? out.slice(0, head.index + head[0].length) + base + out.slice(head.index + head[0].length)
    : base + out;
}

/**
 * @param {Request} request
 * @param {{ decks?: string[], fetch?: typeof fetch }} [options]
 */
export async function proxy(request, { decks = [], fetch: get = fetch } = {}) {
  const self = new URL(request.url);
  const target = targetOf(self);
  if (!target) return text(400, 'slide.ng deck browser proxy: add ?url=<a public web page>');

  const allowed = decks.map((d) => d.trim().replace(/\/$/, '')).filter(Boolean);
  const referer = request.headers.get('referer');
  let from = '';
  try {
    from = referer ? new URL(referer).origin : '';
  } catch {}
  if (allowed.length && from !== self.origin && !allowed.includes(from))
    return text(403, 'This proxy only answers its own decks.');

  const through = (u) =>
    `${self.origin}${self.pathname}${u ? `?url=${encodeURIComponent(u.href)}` : ''}`;
  const headers = new Headers();
  for (const name of SEND) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const post = request.method !== 'GET' && request.method !== 'HEAD';
  let upstream;
  try {
    upstream = await get(target.href, {
      method: request.method,
      headers,
      body: post ? await request.arrayBuffer() : undefined,
      redirect: 'manual',
    });
  } catch {
    return text(502, `Could not load ${target.href}`);
  }

  const out = new Headers(upstream.headers);
  for (const name of DROP) out.delete(name);
  const location = out.get('location');
  const moved = location && web(location, target);
  if (moved) out.set('location', through(moved));
  const refresh = /^(\s*\d+\s*[;,]\s*url\s*=\s*)(.+)$/i.exec(out.get('refresh') ?? '');
  const next = refresh && web(refresh[2].trim().replace(/^['"]|['"]$/g, ''), target);
  if (next) out.set('refresh', refresh[1] + through(next));
  out.set('content-security-policy', SANDBOX);
  out.set('referrer-policy', 'strict-origin-when-cross-origin');
  const type = out.get('content-type') ?? '';
  if (!/text\/html|application\/xhtml/i.test(type) || request.method === 'HEAD')
    return new Response(upstream.body, { status: upstream.status, headers: out });
  const charset = /charset=([\w-]+)/i.exec(type)?.[1] ?? 'utf-8';
  let decoder;
  try {
    decoder = new TextDecoder(charset);
  } catch {
    decoder = new TextDecoder();
  }
  const html = decoder.decode(await upstream.arrayBuffer());
  out.set('content-type', 'text/html; charset=utf-8');
  return new Response(rewriteHtml(html, target, through), {
    status: upstream.status,
    headers: out,
  });
}

export const decksFrom = (value) => String(value ?? '').split(',');
